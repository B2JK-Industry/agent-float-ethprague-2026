// US-114b GitHub P1 enrichment. EPIC §8.2 P1 endpoint set:
//
//   GET /repos/{o}/{r}/actions/runs?per_page=50          ciPassRate
//   GET /repos/{o}/{r}/issues?labels=bug&state=all       bugHygiene
//   GET /repos/{o}/{r}/releases?per_page=100             releaseCadence
//   GET /repos/{o}/{r}/contents/SECURITY.md              repoHygiene+
//   GET /repos/{o}/{r}/contents/.github/dependabot.yml   repoHygiene+
//   GET /repos/{o}/{r}/branches/{default}/protection     repoHygiene+
//
// This module enriches a GithubP0Signals payload (from US-114) with the
// per-repo P1 fields. Score engine flips its null_p1 stubs to computed
// the moment any of these fields land. Engine signature unchanged.
//
// Per launch prompt: P1 ships only after Stream A + Stream C have at
// least one P0 each merged so Bench Mode demo scaffold exists.

import { NetworkUnavailable, retryableFetch, type RetryOptions } from '../../network/retry.js';
import type { FetchLike } from '../../sourcify/types.js';
import type { GithubP0Signals, GithubRepoP0 } from './types.js';

export interface FetchGithubP1EnrichmentOptions {
  readonly pat: string;
  readonly fetchImpl?: FetchLike;
  readonly retry?: RetryOptions | true;
  readonly baseUrl?: string;
  // Window for releaseCadence calculation. Default 365 days.
  readonly releaseWindowSeconds?: number;
  // Anchor for releaseCadence comparison. Pure-function discipline —
  // callers must inject (no Date.now() inside the fetcher).
  readonly nowSeconds: number;
}

const DEFAULT_BASE = 'https://api.github.com';
const DEFAULT_RELEASE_WINDOW_SECONDS = 365 * 24 * 60 * 60;

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

interface FetchAttempt<T> {
  readonly kind: 'ok' | 'absent' | 'error';
  readonly value?: T;
  readonly httpStatus?: number;
  readonly message?: string;
}

async function probeJson<T>(
  fetchImpl: FetchLike,
  url: string,
  pat: string,
  parse: (body: unknown) => T | null,
): Promise<FetchAttempt<T>> {
  let response: Response;
  try {
    response = await fetchImpl(url, { method: 'GET', headers: authHeaders(pat) });
  } catch (err) {
    if (err instanceof NetworkUnavailable) {
      return { kind: 'error', message: `network: ${err.message}` };
    }
    return { kind: 'error', message: `network: ${err instanceof Error ? err.message : String(err)}` };
  }
  if (response.status === 404) return { kind: 'absent', httpStatus: 404 };
  if (response.status >= 200 && response.status < 300) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { kind: 'error', httpStatus: response.status, message: 'invalid_json' };
    }
    const parsed = parse(body);
    if (parsed === null) return { kind: 'error', httpStatus: response.status, message: 'parse_null' };
    return { kind: 'ok', value: parsed };
  }
  return { kind: 'error', httpStatus: response.status, message: `http_${response.status}` };
}

interface WorkflowRunsBody {
  readonly workflow_runs?: ReadonlyArray<{ readonly conclusion?: unknown }>;
}

function parseWorkflowRuns(raw: unknown): { successful: number; total: number } | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as WorkflowRunsBody;
  const runs = Array.isArray(o.workflow_runs) ? o.workflow_runs : null;
  if (runs === null) return null;
  let successful = 0;
  for (const run of runs) {
    if (run && typeof run === 'object' && 'conclusion' in run && run.conclusion === 'success') {
      successful += 1;
    }
  }
  return { successful, total: runs.length };
}

function parseBugIssues(raw: unknown): { closed: number; total: number } | null {
  if (!Array.isArray(raw)) return null;
  let closed = 0;
  for (const item of raw) {
    if (item && typeof item === 'object' && 'state' in item && (item as { state: unknown }).state === 'closed') {
      closed += 1;
    }
  }
  return { closed, total: raw.length };
}

function parseReleasesLast12m(raw: unknown, cutoffSec: number): number | null {
  if (!Array.isArray(raw)) return null;
  let count = 0;
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const publishedAt = (r as { published_at?: unknown }).published_at;
    if (typeof publishedAt !== 'string') continue;
    const ms = Date.parse(publishedAt);
    if (!Number.isFinite(ms)) continue;
    if (Math.floor(ms / 1000) >= cutoffSec) count += 1;
  }
  return count;
}

function parseFilePresence(raw: unknown): boolean {
  if (typeof raw !== 'object' || raw === null) return false;
  const o = raw as { type?: unknown };
  return o.type === 'file';
}

function parseBranchProtectionPresence(raw: unknown): boolean {
  // The protection endpoint returns an object on success, 404 if no
  // protection. Any 200 OK with object body signals protection enabled.
  return typeof raw === 'object' && raw !== null;
}

async function fetchOneRepoEnrichment(
  fetchImpl: FetchLike,
  pat: string,
  baseUrl: string,
  repo: GithubRepoP0,
  cutoffSec: number,
): Promise<GithubRepoP0> {
  const fn = repo.fullName;
  const branch = repo.defaultBranch ?? 'main';

  const [runs, bugIssues, releases, security, dependabot, branchProt] = await Promise.all([
    probeJson(fetchImpl, `${baseUrl}/repos/${fn}/actions/runs?per_page=50`, pat, parseWorkflowRuns),
    probeJson(
      fetchImpl,
      `${baseUrl}/repos/${fn}/issues?labels=bug&state=all&per_page=100`,
      pat,
      parseBugIssues,
    ),
    probeJson(
      fetchImpl,
      `${baseUrl}/repos/${fn}/releases?per_page=100`,
      pat,
      (b) => parseReleasesLast12m(b, cutoffSec),
    ),
    probeJson(fetchImpl, `${baseUrl}/repos/${fn}/contents/SECURITY.md`, pat, (b) =>
      parseFilePresence(b) ? { exists: true } : null,
    ),
    probeJson(
      fetchImpl,
      `${baseUrl}/repos/${fn}/contents/.github/dependabot.yml`,
      pat,
      (b) => (parseFilePresence(b) ? { exists: true } : null),
    ),
    probeJson(
      fetchImpl,
      `${baseUrl}/repos/${fn}/branches/${branch}/protection`,
      pat,
      (b) => (parseBranchProtectionPresence(b) ? { exists: true } : null),
    ),
  ]);

  const errorCount =
    (runs.kind === 'error' ? 1 : 0) +
    (bugIssues.kind === 'error' ? 1 : 0) +
    (releases.kind === 'error' ? 1 : 0) +
    (security.kind === 'error' ? 1 : 0) +
    (dependabot.kind === 'error' ? 1 : 0) +
    (branchProt.kind === 'error' ? 1 : 0);
  let p1Status: 'ok' | 'partial' | 'error';
  if (errorCount === 0) p1Status = 'ok';
  else if (errorCount === 6) p1Status = 'error';
  else p1Status = 'partial';

  // 404s on contents endpoints surface as "absent" → field is false (the
  // file isn't there). 404 on branch-protection is treated identically per
  // EPIC §10.2 ("404 → 0").
  const enriched: GithubRepoP0 = {
    ...repo,
    ciRuns: runs.kind === 'ok' ? runs.value ?? null : null,
    bugIssues: bugIssues.kind === 'ok' ? bugIssues.value ?? null : null,
    releasesLast12m: releases.kind === 'ok' ? releases.value ?? null : null,
    hasSecurity: security.kind === 'ok',
    hasDependabot: dependabot.kind === 'ok',
    hasBranchProtection: branchProt.kind === 'ok',
    p1FetchStatus: p1Status,
    ...(p1Status !== 'ok'
      ? { p1ErrorReason: [runs, bugIssues, releases, security, dependabot, branchProt].find((p) => p.kind === 'error')?.message ?? 'partial' }
      : {}),
  };
  return enriched;
}

// Enriches an existing GithubP0Signals payload with per-repo P1 fields.
// Pure on inputs except for the network calls. Per-repo failures degrade
// inside `p1FetchStatus`; the function never throws and never produces a
// top-level error — score engine reads the per-repo field discriminator.
export async function fetchGithubP1Enrichment(
  p0: GithubP0Signals,
  options: FetchGithubP1EnrichmentOptions,
): Promise<GithubP0Signals> {
  if (!options.pat || options.pat.length === 0) {
    // Mirror US-114 contract: missing PAT → return P0 unchanged with an
    // explanatory note in p1ErrorReason. Caller (orchestrator) decides
    // whether to surface the @daniel blocker.
    return {
      ...p0,
      repos: p0.repos.map((r) => ({
        ...r,
        p1FetchStatus: 'error' as const,
        p1ErrorReason: 'missing_pat',
      })),
    };
  }

  const baseFetch: FetchLike = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const retryOpts = resolveRetryOptions(options.retry);
  const fetchImpl: FetchLike = retryOpts ? retryableFetch(baseFetch, retryOpts) : baseFetch;
  const baseUrl = options.baseUrl ?? DEFAULT_BASE;
  const releaseWindow = options.releaseWindowSeconds ?? DEFAULT_RELEASE_WINDOW_SECONDS;
  const cutoffSec = options.nowSeconds - releaseWindow;

  const enrichedRepos = await Promise.all(
    p0.repos.map((r) => fetchOneRepoEnrichment(fetchImpl, options.pat, baseUrl, r, cutoffSec)),
  );

  return { ...p0, repos: enrichedRepos };
}
