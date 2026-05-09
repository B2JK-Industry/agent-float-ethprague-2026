// Per-record evaluator for the `com.github` ENS text record. Reads at
// most two GitHub REST endpoints (`/users/{login}` and the user repo
// list capped to top-N by recency) and projects them into the shared
// EvaluatorResult shape used by the Bench-mode runner. Trust is
// structurally locked at the EPIC §9 unverified factor (0.6) — GitHub
// ownership is a self-asserted claim until cross-signing ships.
//
// Rate-limit budget per evaluation: 2 requests in steady state. The
// hard ceiling is the `repoCap` threshold + 2 (only relevant if a
// future override widens the engine to per-repo probes); the runtime
// stays well under the launch-prompt cap of 12 calls per evaluation.
//
// `ctx.fetch` is the shared rate-limited fetch from `eval/fetch.ts` —
// it injects the `Authorization: Bearer ${GITHUB_TOKEN}` header for
// `api.github.com` automatically when the env var is set. The engine
// detects the absence of `GITHUB_TOKEN` and downgrades the result
// confidence to `partial` so the orchestrator can show the user that
// scoring ran on the anonymous rate-limit path (60 req/h shared,
// brittle under load).

import { performance } from 'node:perf_hooks';

import {
  EMPTY_RESULT,
  type AntiSignalEntry,
  type EngineContext,
  type EngineParams,
  type EvaluatorConfidence,
  type EvaluatorResult,
  type Evidence,
  type RecordEngine,
  type ResolvedRecord,
  type SignalEntry,
} from './types.js';

const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_MONTH = 30 * SECONDS_PER_DAY;
const MS_PER_DAY = SECONDS_PER_DAY * 1000;
const MS_PER_MONTH = SECONDS_PER_MONTH * 1000;

const GITHUB_BASE = 'https://api.github.com';
// GitHub login validation (mirrors the rules that GitHub enforces on
// signup): 1-39 chars, alphanumeric or single-hyphen separators, no
// leading/trailing hyphen.
const GITHUB_OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

const TRUST_DISCOUNT_UNVERIFIED = 0.6;

// Threshold keys live in `EngineParams.thresholds` (Record<string,
// number>). Daniel can override any of them via the central
// `config/evaluator-weights.json` without code changes — the params
// merger in `eval/params.ts` does the layering.
const THRESHOLD_KEYS = {
  repoCap: 'repoCap',
  accountAgeCapMonths: 'accountAgeCapMonths',
  publicReposCap: 'publicReposCap',
  followersCap: 'followersCap',
  starsCap: 'starsCap',
  recentPushDays: 'recentPushDays',
  // Seniority weights (sum should equal ~1.0 — engine renormalizes
  // defensively if Daniel overrides without rebalancing).
  senAccountAge: 'senAccountAge',
  senPublicRepos: 'senPublicRepos',
  senLicenseRatio: 'senLicenseRatio',
  senLanguageDiversity: 'senLanguageDiversity',
  senNonForkRatio: 'senNonForkRatio',
  senFollowers: 'senFollowers',
  // Relevance weights.
  relRecentPushRatio: 'relRecentPushRatio',
  relMostRecentFreshness: 'relMostRecentFreshness',
  relFollowers: 'relFollowers',
  relStars: 'relStars',
  relTopics: 'relTopics',
} as const;

const DEFAULT_THRESHOLDS: Record<string, number> = {
  // Network budget.
  [THRESHOLD_KEYS.repoCap]: 20,
  // Normalisation caps — values above these saturate to 1.0.
  [THRESHOLD_KEYS.accountAgeCapMonths]: 36,
  [THRESHOLD_KEYS.publicReposCap]: 30,
  [THRESHOLD_KEYS.followersCap]: 100,
  [THRESHOLD_KEYS.starsCap]: 100,
  [THRESHOLD_KEYS.recentPushDays]: 90,
  // Seniority weights — calibrated so a fresh single-repo subject
  // (Artemstar, ~5.5mo account, 1 unlicensed repo, 0 followers)
  // lands in [0.05, 0.18] while leaving headroom for veteran
  // subjects to clear 0.5+. Sum = 1.00.
  [THRESHOLD_KEYS.senAccountAge]: 0.25,
  [THRESHOLD_KEYS.senPublicRepos]: 0.2,
  [THRESHOLD_KEYS.senLicenseRatio]: 0.25,
  [THRESHOLD_KEYS.senLanguageDiversity]: 0.1,
  [THRESHOLD_KEYS.senNonForkRatio]: 0.1,
  [THRESHOLD_KEYS.senFollowers]: 0.1,
  // Relevance weights — recency-dominated. Sum = 1.00.
  [THRESHOLD_KEYS.relRecentPushRatio]: 0.4,
  [THRESHOLD_KEYS.relMostRecentFreshness]: 0.2,
  [THRESHOLD_KEYS.relFollowers]: 0.15,
  [THRESHOLD_KEYS.relStars]: 0.15,
  [THRESHOLD_KEYS.relTopics]: 0.1,
};

const DEFAULT_PARAMS: EngineParams = {
  weight: 1,
  trustFloor: 0,
  // Trust ceiling reflects the EPIC §9 lock: GitHub claims are
  // structurally unverified in v1, so the per-record trust never
  // exceeds 0.6 regardless of how rich the evidence is.
  trustCeiling: TRUST_DISCOUNT_UNVERIFIED,
  timeoutMs: 4000,
  thresholds: DEFAULT_THRESHOLDS,
};

interface RawUser {
  readonly login: string;
  readonly created_at: string | null;
  readonly public_repos: number;
  readonly followers: number;
}

interface RawRepo {
  readonly name: string;
  readonly fork: boolean;
  readonly archived: boolean;
  readonly language: string | null;
  readonly stargazers_count: number;
  readonly topics: ReadonlyArray<string>;
  readonly license: { spdx_id?: string | null } | null;
  readonly pushed_at: string | null;
  readonly created_at: string | null;
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function readNumber(obj: Record<string, unknown>, key: string): number {
  const v = obj[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function readString(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  return typeof v === 'string' ? v : null;
}

function readBool(obj: Record<string, unknown>, key: string): boolean {
  return obj[key] === true;
}

function parseUser(raw: unknown): RawUser | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const login = readString(obj, 'login');
  if (login === null) return null;
  return {
    login,
    created_at: readString(obj, 'created_at'),
    public_repos: readNumber(obj, 'public_repos'),
    followers: readNumber(obj, 'followers'),
  };
}

function parseRepo(raw: unknown): RawRepo | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const name = readString(obj, 'name');
  if (name === null) return null;
  const license = obj['license'];
  return {
    name,
    fork: readBool(obj, 'fork'),
    archived: readBool(obj, 'archived'),
    language: readString(obj, 'language'),
    stargazers_count: readNumber(obj, 'stargazers_count'),
    topics: Array.isArray(obj['topics']) ? (obj['topics'] as ReadonlyArray<string>) : [],
    license:
      typeof license === 'object' && license !== null
        ? (license as { spdx_id?: string | null })
        : null,
    pushed_at: readString(obj, 'pushed_at'),
    created_at: readString(obj, 'created_at'),
  };
}

function parseRepoList(raw: unknown): ReadonlyArray<RawRepo> {
  if (!Array.isArray(raw)) return [];
  const out: RawRepo[] = [];
  for (const item of raw) {
    const parsed = parseRepo(item);
    if (parsed !== null) out.push(parsed);
  }
  return out;
}

function ageMonths(isoDate: string | null, nowMs: number): number {
  if (isoDate === null) return 0;
  const ts = Date.parse(isoDate);
  if (!Number.isFinite(ts)) return 0;
  return Math.max(0, (nowMs - ts) / MS_PER_MONTH);
}

function daysSince(isoDate: string | null, nowMs: number): number {
  if (isoDate === null) return Number.POSITIVE_INFINITY;
  const ts = Date.parse(isoDate);
  if (!Number.isFinite(ts)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (nowMs - ts) / MS_PER_DAY);
}

function readThreshold(thresholds: Record<string, number>, key: string, fallback: number): number {
  const v = thresholds[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

interface FetchOk<T> {
  readonly kind: 'ok';
  readonly value: T;
}
interface FetchAbsent {
  readonly kind: 'absent';
}
interface FetchErr {
  readonly kind: 'error';
  readonly status: number;
  readonly message: string;
  readonly rateLimited: boolean;
}
type FetchOutcome<T> = FetchOk<T> | FetchAbsent | FetchErr;

async function fetchJson<T>(
  ctx: EngineContext,
  url: string,
  parse: (body: unknown) => T | null,
): Promise<FetchOutcome<T>> {
  let res;
  try {
    res = await ctx.fetch(url, {
      headers: { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' },
      signal: ctx.signal,
    });
  } catch (err) {
    return {
      kind: 'error',
      status: 0,
      message: `network: ${err instanceof Error ? err.message : String(err)}`,
      rateLimited: false,
    };
  }
  if (res.status === 404) return { kind: 'absent' };
  // GitHub primary rate limit returns 403 with X-RateLimit-Remaining: 0,
  // and secondary rate limit returns 429. Both are recoverable in
  // principle but not within a 4s engine budget — surface as error.
  const remaining = res.headers.get('x-ratelimit-remaining');
  const rateLimited =
    res.status === 429 || (res.status === 403 && remaining !== null && remaining === '0');
  if (!res.ok) {
    return {
      kind: 'error',
      status: res.status,
      message: `github: HTTP ${res.status}`,
      rateLimited,
    };
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch (err) {
    return {
      kind: 'error',
      status: res.status,
      message: `github: malformed JSON (${err instanceof Error ? err.message : String(err)})`,
      rateLimited: false,
    };
  }
  const parsed = parse(body);
  if (parsed === null) {
    return { kind: 'error', status: res.status, message: 'github: parse returned null', rateLimited: false };
  }
  return { kind: 'ok', value: parsed };
}

function authedTokenPresent(): boolean {
  const v = process.env['GITHUB_TOKEN'];
  return typeof v === 'string' && v.length > 0;
}

interface ComputeOutput {
  readonly seniority: number;
  readonly relevance: number;
  readonly seniorityBreakdown: SignalEntry[];
  readonly relevanceBreakdown: SignalEntry[];
  readonly antiSignals: AntiSignalEntry[];
  readonly evidence: Evidence[];
}

interface ComputeInput {
  readonly user: RawUser;
  readonly repos: ReadonlyArray<RawRepo>;
  readonly thresholds: Record<string, number>;
  readonly nowMs: number;
}

function compute(input: ComputeInput): ComputeOutput {
  const { user, repos, thresholds, nowMs } = input;

  const accountAgeCapMonths = readThreshold(thresholds, THRESHOLD_KEYS.accountAgeCapMonths, 36);
  const publicReposCap = readThreshold(thresholds, THRESHOLD_KEYS.publicReposCap, 30);
  const followersCap = readThreshold(thresholds, THRESHOLD_KEYS.followersCap, 100);
  const starsCap = readThreshold(thresholds, THRESHOLD_KEYS.starsCap, 100);
  const recentPushDays = readThreshold(thresholds, THRESHOLD_KEYS.recentPushDays, 90);

  // Active repos (non-archived, non-fork) form the denominator for
  // ratio-style signals — archived+fork repos shouldn't drag a
  // subject down on hygiene/recency they were never going to update.
  const activeRepos = repos.filter((r) => !r.archived && !r.fork);
  const totalRepos = repos.length;
  const denominator = Math.max(1, activeRepos.length);

  const accountAgeValue = clamp01(
    ageMonths(user.created_at, nowMs) / Math.max(1, accountAgeCapMonths),
  );
  const publicReposValue = clamp01(user.public_repos / Math.max(1, publicReposCap));
  const followersValue = clamp01(user.followers / Math.max(1, followersCap));

  const licenseCount = activeRepos.reduce(
    (acc, r) => acc + (r.license?.spdx_id !== null && r.license?.spdx_id !== undefined ? 1 : 0),
    0,
  );
  const licenseRatioValue = clamp01(licenseCount / denominator);

  const distinctLanguages = new Set<string>();
  for (const r of activeRepos) if (r.language !== null) distinctLanguages.add(r.language);
  // 5+ distinct languages saturates the diversity signal.
  const languageDiversityValue = clamp01(distinctLanguages.size / 5);

  const nonForkRatioValue = totalRepos === 0 ? 0 : clamp01(activeRepos.length / totalRepos);

  const recentCutoffDays = recentPushDays;
  let recentlyPushed = 0;
  let mostRecentDays = Number.POSITIVE_INFINITY;
  let totalStars = 0;
  let topicHits = 0;
  for (const r of activeRepos) {
    const d = daysSince(r.pushed_at, nowMs);
    if (d <= recentCutoffDays) recentlyPushed += 1;
    if (d < mostRecentDays) mostRecentDays = d;
    totalStars += r.stargazers_count;
    if (r.topics.length > 0) topicHits += 1;
  }
  const recentPushRatioValue = clamp01(recentlyPushed / denominator);
  // mostRecentFreshness: 1.0 if pushed today, 0.0 if pushed >365d ago.
  const mostRecentFreshnessValue = Number.isFinite(mostRecentDays)
    ? clamp01(1 - mostRecentDays / 365)
    : 0;
  const starsValue = clamp01(totalStars / Math.max(1, starsCap));
  const topicsValue = activeRepos.length === 0 ? 0 : clamp01(topicHits / denominator);

  const senWeights = {
    accountAge: readThreshold(thresholds, THRESHOLD_KEYS.senAccountAge, 0.25),
    publicRepos: readThreshold(thresholds, THRESHOLD_KEYS.senPublicRepos, 0.2),
    licenseRatio: readThreshold(thresholds, THRESHOLD_KEYS.senLicenseRatio, 0.25),
    languageDiversity: readThreshold(thresholds, THRESHOLD_KEYS.senLanguageDiversity, 0.1),
    nonForkRatio: readThreshold(thresholds, THRESHOLD_KEYS.senNonForkRatio, 0.1),
    followers: readThreshold(thresholds, THRESHOLD_KEYS.senFollowers, 0.1),
  };
  const relWeights = {
    recentPushRatio: readThreshold(thresholds, THRESHOLD_KEYS.relRecentPushRatio, 0.4),
    mostRecentFreshness: readThreshold(thresholds, THRESHOLD_KEYS.relMostRecentFreshness, 0.2),
    followers: readThreshold(thresholds, THRESHOLD_KEYS.relFollowers, 0.15),
    stars: readThreshold(thresholds, THRESHOLD_KEYS.relStars, 0.15),
    topics: readThreshold(thresholds, THRESHOLD_KEYS.relTopics, 0.1),
  };

  const senSum = Object.values(senWeights).reduce((a, b) => a + b, 0) || 1;
  const relSum = Object.values(relWeights).reduce((a, b) => a + b, 0) || 1;

  const seniorityBreakdown: SignalEntry[] = [
    { name: 'accountAge', value: accountAgeValue, weight: senWeights.accountAge / senSum, raw: { months: ageMonths(user.created_at, nowMs), capMonths: accountAgeCapMonths } },
    { name: 'publicRepos', value: publicReposValue, weight: senWeights.publicRepos / senSum, raw: { count: user.public_repos, cap: publicReposCap } },
    { name: 'licenseRatio', value: licenseRatioValue, weight: senWeights.licenseRatio / senSum, raw: { withLicense: licenseCount, denominator } },
    { name: 'languageDiversity', value: languageDiversityValue, weight: senWeights.languageDiversity / senSum, raw: { distinct: distinctLanguages.size } },
    { name: 'nonForkRatio', value: nonForkRatioValue, weight: senWeights.nonForkRatio / senSum, raw: { active: activeRepos.length, total: totalRepos } },
    { name: 'followers', value: followersValue, weight: senWeights.followers / senSum, raw: { followers: user.followers, cap: followersCap } },
  ];

  const relevanceBreakdown: SignalEntry[] = [
    { name: 'recentPushRatio', value: recentPushRatioValue, weight: relWeights.recentPushRatio / relSum, raw: { recent: recentlyPushed, denominator, days: recentPushDays } },
    { name: 'mostRecentFreshness', value: mostRecentFreshnessValue, weight: relWeights.mostRecentFreshness / relSum, raw: { mostRecentDays: Number.isFinite(mostRecentDays) ? mostRecentDays : null } },
    { name: 'followers', value: followersValue, weight: relWeights.followers / relSum, raw: { followers: user.followers, cap: followersCap } },
    { name: 'stars', value: starsValue, weight: relWeights.stars / relSum, raw: { totalStars, cap: starsCap } },
    { name: 'topics', value: topicsValue, weight: relWeights.topics / relSum, raw: { repos: topicHits, denominator } },
  ];

  const seniority = seniorityBreakdown.reduce((acc, s) => acc + s.value * s.weight, 0);
  const relevance = relevanceBreakdown.reduce((acc, s) => acc + s.value * s.weight, 0);

  const antiSignals: AntiSignalEntry[] = [];
  if (totalRepos > 0 && activeRepos.length === 0) {
    antiSignals.push({
      name: 'allReposArchivedOrFork',
      penalty: 0,
      reason: 'every public repo is archived or a fork — neither contributes to active-author signals',
    });
  }
  if (user.public_repos === 0) {
    antiSignals.push({
      name: 'zeroPublicRepos',
      penalty: 0,
      reason: 'GitHub user has no public repositories — both axes degrade to account metadata only',
    });
  }

  const evidence: Evidence[] = [
    { label: 'login', value: user.login, source: 'github', link: `https://github.com/${user.login}` },
    {
      label: 'accountCreated',
      value: user.created_at ?? 'unknown',
      source: 'github',
    },
    { label: 'publicRepos', value: String(user.public_repos), source: 'github' },
    { label: 'followers', value: String(user.followers), source: 'github' },
    {
      label: 'topReposScanned',
      value: String(repos.length),
      source: 'github',
    },
  ];

  return {
    seniority: clamp01(seniority),
    relevance: clamp01(relevance),
    seniorityBreakdown,
    relevanceBreakdown,
    antiSignals,
    evidence,
  };
}

function isValidLogin(raw: string): boolean {
  return GITHUB_OWNER_RE.test(raw);
}

async function evaluate(
  record: ResolvedRecord,
  ctx: EngineContext,
  params: EngineParams,
): Promise<EvaluatorResult> {
  const start = performance.now();
  const raw = record.raw?.trim() ?? '';

  // Absent record: short-circuit. EMPTY_RESULT is the canonical
  // "nothing to evaluate" shape. No GitHub API calls spent.
  if (raw.length === 0) {
    return EMPTY_RESULT(record.key, params.weight, performance.now() - start, []);
  }

  if (!isValidLogin(raw)) {
    const empty = EMPTY_RESULT(
      record.key,
      params.weight,
      performance.now() - start,
      [`invalid github login: ${JSON.stringify(raw)}`],
    );
    return empty;
  }

  const repoCap = readThreshold(params.thresholds, THRESHOLD_KEYS.repoCap, 20);
  const userUrl = `${GITHUB_BASE}/users/${encodeURIComponent(raw)}`;
  const reposUrl = `${GITHUB_BASE}/users/${encodeURIComponent(raw)}/repos?per_page=100&sort=updated`;

  const [userOutcome, reposOutcome] = await Promise.all([
    fetchJson(ctx, userUrl, parseUser),
    fetchJson(ctx, reposUrl, (b) => parseRepoList(b)),
  ]);

  const errors: string[] = [];
  let confidence: EvaluatorConfidence = authedTokenPresent() ? 'complete' : 'partial';

  if (userOutcome.kind === 'absent') {
    // GitHub login claimed but the account does not exist — the
    // strongest possible anti-signal for a com.github record. Surface
    // as a degraded zero rather than EMPTY_RESULT so the breakdown
    // can render the "claimed login does not exist" anti-signal.
    const result: EvaluatorResult = {
      recordKey: record.key,
      exists: true,
      validity: 0,
      liveness: 0,
      seniority: 0,
      relevance: 0,
      trust: TRUST_DISCOUNT_UNVERIFIED,
      weight: params.weight,
      signals: {
        seniorityBreakdown: [],
        relevanceBreakdown: [],
        antiSignals: [
          {
            name: 'githubAccountNotFound',
            penalty: 1,
            reason: `GitHub user ${JSON.stringify(raw)} returned 404 — claim cannot be substantiated`,
          },
        ],
      },
      evidence: [{ label: 'login', value: raw, source: 'github' }],
      confidence: 'degraded',
      durationMs: performance.now() - start,
      cacheHit: false,
      errors: [`github user not found: ${raw}`],
    };
    return result;
  }

  if (userOutcome.kind === 'error') {
    if (userOutcome.rateLimited) confidence = 'degraded';
    else confidence = 'partial';
    errors.push(`user fetch: ${userOutcome.message}`);
  }

  if (reposOutcome.kind === 'error') {
    if (reposOutcome.rateLimited) confidence = 'degraded';
    else if (confidence === 'complete') confidence = 'partial';
    errors.push(`repos fetch: ${reposOutcome.message}`);
  }

  // Synthetic minimum-viable user when the user fetch errored but we
  // got repos back (or vice versa). The compute function tolerates
  // the empty/zero case — both axes simply collapse toward 0.
  const user: RawUser =
    userOutcome.kind === 'ok'
      ? userOutcome.value
      : { login: raw, created_at: null, public_repos: 0, followers: 0 };

  const reposAll = reposOutcome.kind === 'ok' ? reposOutcome.value : [];
  const repos = reposAll.slice(0, Math.max(1, repoCap));

  const out = compute({ user, repos, thresholds: params.thresholds, nowMs: Date.now() });

  // Trust is structurally locked — never returns above the unverified
  // factor regardless of how rich the evidence is. The trustCeiling
  // param is the override knob, but in v1 it is always 0.6 per
  // EPIC §9.
  const trust = Math.min(TRUST_DISCOUNT_UNVERIFIED, params.trustCeiling);

  // Validity: 1 if the claimed login resolves to an existing GitHub
  // user (we got a 200 on /users/{login}). Liveness: 1 if at least
  // one active repo was pushed within `recentPushDays`. Both are
  // boolean signals downstream UI can chip-render without re-deriving
  // from breakdowns.
  const validity = userOutcome.kind === 'ok' ? 1 : 0;
  const recentlyActive = repos.some(
    (r) =>
      !r.archived &&
      !r.fork &&
      daysSince(r.pushed_at, Date.now()) <= readThreshold(params.thresholds, THRESHOLD_KEYS.recentPushDays, 90),
  );
  const liveness: 0 | 1 = recentlyActive ? 1 : 0;

  return {
    recordKey: record.key,
    exists: true,
    validity,
    liveness,
    seniority: out.seniority,
    relevance: out.relevance,
    trust,
    weight: params.weight,
    signals: {
      seniorityBreakdown: out.seniorityBreakdown,
      relevanceBreakdown: out.relevanceBreakdown,
      antiSignals: out.antiSignals,
    },
    evidence: out.evidence,
    confidence,
    durationMs: performance.now() - start,
    cacheHit: false,
    errors,
  };
}

export const comGithubEngine: RecordEngine = {
  key: 'com.github',
  defaultParams: DEFAULT_PARAMS,
  evaluate,
};

// Test-only export so the calibration test can exercise the pure
// scoring math without round-tripping through fetch mocks.
export const __testing = {
  compute,
  parseUser,
  parseRepoList,
  isValidLogin,
  TRUST_DISCOUNT_UNVERIFIED,
  THRESHOLD_KEYS,
  DEFAULT_THRESHOLDS,
};
