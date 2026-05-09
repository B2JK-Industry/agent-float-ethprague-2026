import { NetworkUnavailable, retryableFetch, type RetryOptions } from '../../network/retry.js';
import type { FetchLike } from '../../sourcify/types.js';
import type {
  GithubP0Error,
  GithubP0Result,
  GithubP0Signals,
  GithubRepoP0,
  GithubUser,
} from './types.js';

export interface FetchGithubP0SourceOptions {
  readonly pat: string;
  readonly fetchImpl?: FetchLike;
  readonly retry?: RetryOptions | true;
  // Override base URL (default https://api.github.com). Tests pin a fixture
  // host; future proxies redirect.
  readonly baseUrl?: string;
  // Cap on top-N repos sorted by `updated`. Default 20 per EPIC Section 8.2.
  readonly repoCap?: number;
  // Bytes threshold for "substantial README". Default 200 per EPIC
  // Section 10.2 repoHygiene definition.
  readonly readmeBytesThreshold?: number;
}

const DEFAULT_BASE = 'https://api.github.com';
const DEFAULT_REPO_CAP = 20;
const DEFAULT_README_THRESHOLD = 200;

const GITHUB_OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

const TEST_DIR_CANDIDATES = ['test', 'tests', '__tests__', 'spec'] as const;

function resolveRetryOptions(retry: RetryOptions | true | undefined): RetryOptions | undefined {
  if (retry === undefined) return undefined;
  if (retry === true) return {};
  return retry;
}

function authHeaders(pat: string): Record<string, string> {
  return {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${pat}`,
    'x-github-api-version': '2022-11-28',
  };
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
  readonly reason: GithubP0Error['reason'];
  readonly httpStatus?: number;
  readonly message: string;
  readonly cause?: unknown;
}

type ProbeResult<T> = FetchOk<T> | FetchAbsent | FetchErr;

function classifyHttp(status: number): { reason: GithubP0Error['reason']; message: string } | null {
  if (status >= 200 && status < 300) return null;
  if (status === 404) return { reason: 'not_found', message: 'github: 404' };
  if (status === 429 || (status === 403 && /* rate-limit overlay */ true)) {
    // GitHub uses 403 + X-RateLimit-Remaining: 0 for primary rate limit; we
    // can't peek headers from here without complicating the type, so we
    // treat 403 as rate_limited too. Misclassifying a permission 403 as
    // rate_limited only delays a retry — it does not poison the score.
    return { reason: 'rate_limited', message: `github: rate limited (HTTP ${status})` };
  }
  if (status >= 500) return { reason: 'server_error', message: `github: server error (HTTP ${status})` };
  return { reason: 'server_error', message: `github: unexpected HTTP ${status}` };
}

async function probe<T>(
  fetchImpl: FetchLike,
  url: string,
  pat: string,
  parse: (body: unknown) => T | null,
): Promise<ProbeResult<T>> {
  let response: Response;
  try {
    response = await fetchImpl(url, { method: 'GET', headers: authHeaders(pat) });
  } catch (err) {
    if (err instanceof NetworkUnavailable) {
      return { kind: 'error', reason: 'network_error', message: `github: ${err.message}`, cause: err.lastError };
    }
    return {
      kind: 'error',
      reason: 'network_error',
      message: `github: network error - ${err instanceof Error ? err.message : String(err)}`,
      cause: err,
    };
  }

  if (response.status === 404) return { kind: 'absent' };

  const httpClass = classifyHttp(response.status);
  if (httpClass !== null) {
    return { kind: 'error', reason: httpClass.reason, message: httpClass.message, httpStatus: response.status };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (err) {
    return {
      kind: 'error',
      reason: 'malformed_response',
      message: `github: invalid JSON - ${err instanceof Error ? err.message : String(err)}`,
      cause: err,
    };
  }

  const parsed = parse(body);
  if (parsed === null) {
    return { kind: 'error', reason: 'malformed_response', message: 'github: parse returned null' };
  }
  return { kind: 'ok', value: parsed };
}

function parseString(raw: unknown): string | null {
  return typeof raw === 'string' ? raw : null;
}

function parseUser(raw: unknown): GithubUser | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const login = parseString(obj['login']);
  if (login === null) return null;
  return {
    login,
    createdAt: parseString(obj['created_at']),
    publicRepos: typeof obj['public_repos'] === 'number' ? obj['public_repos'] : 0,
    followers: typeof obj['followers'] === 'number' ? obj['followers'] : 0,
  };
}

interface RawRepo {
  readonly name: string;
  readonly full_name: string;
  readonly created_at: string | null;
  readonly pushed_at: string | null;
  readonly archived: boolean;
  readonly default_branch: string | null;
  readonly license: { spdx_id?: string | null } | null;
  readonly topics?: ReadonlyArray<string>;
}

function parseRepoListItem(raw: unknown): RawRepo | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const name = parseString(o['name']);
  const fullName = parseString(o['full_name']);
  if (name === null || fullName === null) return null;
  const license =
    typeof o['license'] === 'object' && o['license'] !== null
      ? (o['license'] as { spdx_id?: string | null })
      : null;
  return {
    name,
    full_name: fullName,
    created_at: parseString(o['created_at']),
    pushed_at: parseString(o['pushed_at']),
    archived: typeof o['archived'] === 'boolean' ? o['archived'] : false,
    default_branch: parseString(o['default_branch']),
    license,
    topics: Array.isArray(o['topics']) ? (o['topics'] as ReadonlyArray<string>) : [],
  };
}

function parseRepoList(raw: unknown): ReadonlyArray<RawRepo> | null {
  if (!Array.isArray(raw)) return null;
  const out: RawRepo[] = [];
  for (const item of raw) {
    const parsed = parseRepoListItem(item);
    if (parsed) out.push(parsed);
  }
  return out;
}

function parseContentsFile(raw: unknown): { size: number } | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (o['type'] !== 'file') return null;
  const size = typeof o['size'] === 'number' ? o['size'] : null;
  return size !== null ? { size } : null;
}

function parseContentsAny(raw: unknown): { kind: 'dir' } | { kind: 'file'; size: number } | null {
  if (Array.isArray(raw)) return { kind: 'dir' };
  const file = parseContentsFile(raw);
  if (file !== null) return { kind: 'file', size: file.size };
  return null;
}

async function probeTestDir(
  fetchImpl: FetchLike,
  pat: string,
  baseUrl: string,
  fullName: string,
): Promise<boolean> {
  const probes = await Promise.all(
    TEST_DIR_CANDIDATES.map((dir) =>
      probe<{ exists: true }>(fetchImpl, `${baseUrl}/repos/${fullName}/contents/${dir}`, pat, (body) => {
        const v = parseContentsAny(body);
        return v?.kind === 'dir' ? { exists: true } : null;
      }),
    ),
  );
  return probes.some((p) => p.kind === 'ok');
}

async function fetchRepoP0(
  fetchImpl: FetchLike,
  pat: string,
  baseUrl: string,
  raw: RawRepo,
  readmeBytesThreshold: number,
): Promise<GithubRepoP0> {
  // Fan out the three contents probes per repo in parallel:
  // - test directories (4 concurrent inside probeTestDir)
  // - README.md
  // - LICENSE
  const [hasTestDir, readmeProbe, licenseProbe] = await Promise.all([
    probeTestDir(fetchImpl, pat, baseUrl, raw.full_name),
    probe<{ size: number }>(fetchImpl, `${baseUrl}/repos/${raw.full_name}/contents/README.md`, pat, (body) => {
      const v = parseContentsAny(body);
      return v?.kind === 'file' ? { size: v.size } : null;
    }),
    probe<{ exists: true }>(fetchImpl, `${baseUrl}/repos/${raw.full_name}/contents/LICENSE`, pat, (body) => {
      const v = parseContentsAny(body);
      return v?.kind === 'file' ? { exists: true } : null;
    }),
  ]);

  const hasReadme = readmeProbe.kind === 'ok';
  const readmeBytes = readmeProbe.kind === 'ok' ? readmeProbe.value.size : null;
  const hasSubstantialReadme = readmeBytes !== null && readmeBytes > readmeBytesThreshold;
  const hasLicense = licenseProbe.kind === 'ok';

  // Per-repo soft-failure (audit-round-7 P1 #7): mark partial whenever
  // EITHER hygiene probe errors (rate-limited, transport failure, 5xx).
  // The prior code required BOTH to error — so a single-probe failure
  // silently downgraded the corresponding flag to `false` and reported
  // `fetchStatus: 'ok'`, conflating "we couldn't fetch the LICENSE" with
  // "this repo has no LICENSE file". A score that's structurally
  // discounted by missing data deserves the "partial" provenance label
  // so the drawer can render a degraded pill instead of a clean zero.
  // Test-dir probe stays best-effort — fetch errors there are folded
  // into the boolean directly per probeTestDir's contract.
  const readmeErrored = readmeProbe.kind === 'error';
  const licenseErrored = licenseProbe.kind === 'error';
  const probeErrored = readmeErrored || licenseErrored;

  return {
    name: raw.name,
    fullName: raw.full_name,
    createdAt: raw.created_at,
    pushedAt: raw.pushed_at,
    archived: raw.archived,
    defaultBranch: raw.default_branch,
    license: raw.license?.spdx_id ?? null,
    topics: raw.topics ?? [],
    hasTestDir,
    hasSubstantialReadme: hasReadme && hasSubstantialReadme,
    readmeBytes,
    hasLicense,
    ...(probeErrored
      ? {
          fetchStatus: 'partial' as const,
          errorReason: readmeErrored
            ? (readmeProbe as FetchErr).message
            : (licenseProbe as FetchErr).message,
        }
      : { fetchStatus: 'ok' as const }),
  };
}

// Fetches the GitHub P0 surface for one owner. Per launch prompt: returns
// kind:'error' reason:'missing_pat' when GITHUB_PAT is empty so the
// orchestrator can render the @daniel blocker; per-repo failures degrade
// inside the per-repo record's `fetchStatus` rather than aborting the
// whole call.
export async function fetchGithubP0Source(
  owner: string,
  options: FetchGithubP0SourceOptions,
): Promise<GithubP0Result> {
  if (!options.pat || options.pat.length === 0) {
    return {
      kind: 'error',
      reason: 'missing_pat',
      message: 'github: GITHUB_PAT is required for the P0 fetcher',
    };
  }
  if (!GITHUB_OWNER_RE.test(owner)) {
    return {
      kind: 'error',
      reason: 'invalid_owner',
      message: `github: invalid owner ${JSON.stringify(owner)}`,
    };
  }

  const baseFetch: FetchLike = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const retryOpts = resolveRetryOptions(options.retry);
  const fetchImpl: FetchLike = retryOpts ? retryableFetch(baseFetch, retryOpts) : baseFetch;
  const baseUrl = options.baseUrl ?? DEFAULT_BASE;
  const repoCap = options.repoCap ?? DEFAULT_REPO_CAP;
  const readmeBytesThreshold = options.readmeBytesThreshold ?? DEFAULT_README_THRESHOLD;

  const userProbe = await probe<GithubUser>(fetchImpl, `${baseUrl}/users/${owner}`, options.pat, parseUser);
  // Hard-stop on rate_limited / server_error at the user-level fetch — that
  // signals a system-wide problem; we don't want to spend repo-fetch
  // budget on something that will fail anyway.
  if (userProbe.kind === 'error') {
    if (userProbe.reason === 'rate_limited' || userProbe.reason === 'server_error') {
      return surfaceTopLevelError(userProbe);
    }
    if (userProbe.reason === 'network_error') return surfaceTopLevelError(userProbe);
  }

  const reposProbe = await probe<ReadonlyArray<RawRepo>>(
    fetchImpl,
    `${baseUrl}/users/${owner}/repos?per_page=100&sort=updated`,
    options.pat,
    parseRepoList,
  );
  if (reposProbe.kind === 'error') {
    if (reposProbe.reason === 'rate_limited' || reposProbe.reason === 'server_error') {
      return surfaceTopLevelError(reposProbe);
    }
    if (reposProbe.reason === 'network_error') return surfaceTopLevelError(reposProbe);
  }

  const reposRaw = reposProbe.kind === 'ok' ? reposProbe.value.slice(0, repoCap) : [];

  const reposP0 = await Promise.all(
    reposRaw.map(async (r) => {
      try {
        return await fetchRepoP0(fetchImpl, options.pat, baseUrl, r, readmeBytesThreshold);
      } catch (err) {
        return {
          name: r.name,
          fullName: r.full_name,
          createdAt: r.created_at,
          pushedAt: r.pushed_at,
          archived: r.archived,
          defaultBranch: r.default_branch,
          license: r.license?.spdx_id ?? null,
          topics: r.topics ?? [],
          hasTestDir: false,
          hasSubstantialReadme: false,
          readmeBytes: null,
          hasLicense: false,
          fetchStatus: 'error' as const,
          errorReason: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );

  const value: GithubP0Signals = {
    owner,
    user: userProbe.kind === 'ok' ? userProbe.value : null,
    repos: reposP0,
  };
  return { kind: 'ok', value };
}

function surfaceTopLevelError(p: FetchErr): GithubP0Error {
  if (p.cause === undefined) {
    if (p.httpStatus === undefined) return { kind: 'error', reason: p.reason, message: p.message };
    return { kind: 'error', reason: p.reason, message: p.message, httpStatus: p.httpStatus };
  }
  if (p.httpStatus === undefined) {
    return { kind: 'error', reason: p.reason, message: p.message, cause: p.cause };
  }
  return { kind: 'error', reason: p.reason, message: p.message, httpStatus: p.httpStatus, cause: p.cause };
}
