import { describe, expect, it, vi } from 'vitest';

import type { GithubP0Signals, GithubRepoP0 } from '../../../src/sources/github/types.js';
import { fetchGithubP1Enrichment } from '../../../src/sources/github/p1.js';

const PAT = 'ghp_test';
const NOW = 1778198400; // 2026-05-09 00:00 UTC

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function repo(name: string): GithubRepoP0 {
  return {
    name,
    fullName: `owner/${name}`,
    createdAt: null,
    pushedAt: null,
    archived: false,
    defaultBranch: 'main',
    license: null,
    topics: [],
    hasTestDir: false,
    hasSubstantialReadme: false,
    readmeBytes: null,
    hasLicense: false,
    fetchStatus: 'ok',
  };
}

const baseP0: GithubP0Signals = {
  owner: 'owner',
  user: { login: 'owner', createdAt: null, publicRepos: 0, followers: 0 },
  repos: [repo('a'), repo('b')],
};

function makeRouter(routes: ReadonlyArray<{ test: RegExp; handler: (url: string) => Response | Promise<Response> }>) {
  return vi.fn(async (input: string) => {
    for (const r of routes) {
      if (r.test.test(input)) return r.handler(input);
    }
    throw new Error(`unrouted url: ${input}`);
  });
}

describe('fetchGithubP1Enrichment', () => {
  describe('input validation', () => {
    it('returns p0 with missing_pat marker on every repo when PAT is empty', async () => {
      const result = await fetchGithubP1Enrichment(baseP0, { pat: '', nowSeconds: NOW });
      for (const r of result.repos) {
        expect(r.p1FetchStatus).toBe('error');
        expect(r.p1ErrorReason).toBe('missing_pat');
      }
    });
  });

  describe('happy path', () => {
    it('populates ciRuns / bugIssues / releasesLast12m / hasSecurity / hasDependabot / hasBranchProtection per repo', async () => {
      const fetchImpl = makeRouter([
        { test: /\/actions\/runs/, handler: () => jsonResponse(200, { workflow_runs: [{ conclusion: 'success' }, { conclusion: 'success' }, { conclusion: 'failure' }] }) },
        { test: /\/issues\?labels=bug/, handler: () => jsonResponse(200, [{ state: 'closed' }, { state: 'closed' }, { state: 'open' }]) },
        { test: /\/releases/, handler: () => jsonResponse(200, [
          { published_at: new Date((NOW - 86400 * 30) * 1000).toISOString() },
          { published_at: new Date((NOW - 86400 * 200) * 1000).toISOString() },
          { published_at: new Date((NOW - 86400 * 400) * 1000).toISOString() }, // > 12mo, dropped
        ]) },
        { test: /\/contents\/SECURITY\.md/, handler: () => jsonResponse(200, { type: 'file' }) },
        { test: /\/contents\/\.github\/dependabot\.yml/, handler: () => jsonResponse(404, {}) },
        { test: /\/branches\/[^/]+\/protection/, handler: () => jsonResponse(200, { required_pull_request_reviews: {} }) },
      ]);
      const result = await fetchGithubP1Enrichment(baseP0, { pat: PAT, fetchImpl, nowSeconds: NOW });
      const r = result.repos[0]!;
      expect(r.ciRuns).toEqual({ successful: 2, total: 3 });
      expect(r.bugIssues).toEqual({ closed: 2, total: 3 });
      expect(r.releasesLast12m).toBe(2);
      expect(r.hasSecurity).toBe(true);
      expect(r.hasDependabot).toBe(false);
      expect(r.hasBranchProtection).toBe(true);
      expect(r.p1FetchStatus).toBe('ok');
    });

    // audit-round-7 P1 #13 (workflows) regression: in-progress runs
    // (`conclusion: null`) and cancelled/skipped runs were inflating
    // the denominator, under-reporting the pass-rate.
    it('excludes in-progress / cancelled / skipped runs from ciRuns total (audit-round-7 P1 #13)', async () => {
      const fetchImpl = makeRouter([
        { test: /\/actions\/runs/, handler: () => jsonResponse(200, {
          workflow_runs: [
            { conclusion: 'success' },
            { conclusion: 'success' },
            { conclusion: 'failure' },
            { conclusion: null }, // in-progress — excluded
            { conclusion: 'cancelled' }, // cancelled — excluded
            { conclusion: 'skipped' }, // skipped — excluded
          ],
        }) },
        { test: /\/issues\?labels=bug/, handler: () => jsonResponse(200, []) },
        { test: /\/releases/, handler: () => jsonResponse(200, []) },
        { test: /\/contents\//, handler: () => jsonResponse(404, {}) },
        { test: /\/branches\//, handler: () => jsonResponse(404, {}) },
      ]);
      const r = (await fetchGithubP1Enrichment(baseP0, { pat: PAT, fetchImpl, nowSeconds: NOW })).repos[0]!;
      // Only success + failure count: 2 success out of 3 evaluated = the
      // honest pass-rate. Without the filter, total would have been 6
      // and the ratio 2/6 = 0.33.
      expect(r.ciRuns).toEqual({ successful: 2, total: 3 });
    });

    // audit-round-7 P1 #13 (PRs) regression: GitHub's `/issues` endpoint
    // returns BOTH issues and pull requests; rows representing PRs carry
    // a `pull_request` object. Counting PRs as bug issues inflated the
    // total and made the closed-ratio look worse than reality.
    it('filters pull requests out of bugIssues counts (audit-round-7 P1 #13)', async () => {
      const fetchImpl = makeRouter([
        { test: /\/actions\/runs/, handler: () => jsonResponse(200, { workflow_runs: [] }) },
        { test: /\/issues\?labels=bug/, handler: () => jsonResponse(200, [
          { state: 'closed' },
          { state: 'open' },
          // PR with a bug label — must NOT count toward bugIssues.
          { state: 'open', pull_request: { url: 'https://api.github.com/repos/o/r/pulls/1' } },
          { state: 'closed', pull_request: { url: 'https://api.github.com/repos/o/r/pulls/2' } },
        ]) },
        { test: /\/releases/, handler: () => jsonResponse(200, []) },
        { test: /\/contents\//, handler: () => jsonResponse(404, {}) },
        { test: /\/branches\//, handler: () => jsonResponse(404, {}) },
      ]);
      const r = (await fetchGithubP1Enrichment(baseP0, { pat: PAT, fetchImpl, nowSeconds: NOW })).repos[0]!;
      // 2 issues (1 closed + 1 open), 2 PRs filtered out.
      expect(r.bugIssues).toEqual({ closed: 1, total: 2 });
    });

    // audit-round-7 P1 #13 (branch protection) regression: branch names
    // containing slashes (e.g. `release/v1`) used to break the URL by
    // being parsed as path segments, so the endpoint returned 404 →
    // false negative for the protection flag. encodeURIComponent fixes.
    it('encodes default-branch name in the protection URL (audit-round-7 P1 #13)', async () => {
      const slashRepo: GithubRepoP0 = { ...repo('a'), defaultBranch: 'release/v1' };
      const slashP0: GithubP0Signals = { ...baseP0, repos: [slashRepo] };
      let capturedProtUrl = '';
      const fetchImpl = makeRouter([
        { test: /\/actions\/runs/, handler: () => jsonResponse(200, { workflow_runs: [] }) },
        { test: /\/issues\?labels=bug/, handler: () => jsonResponse(200, []) },
        { test: /\/releases/, handler: () => jsonResponse(200, []) },
        { test: /\/contents\//, handler: () => jsonResponse(404, {}) },
        { test: /\/branches\/[^/]+\/protection/, handler: (url) => {
          capturedProtUrl = url;
          return jsonResponse(200, { required_pull_request_reviews: {} });
        } },
      ]);
      const result = await fetchGithubP1Enrichment(slashP0, { pat: PAT, fetchImpl, nowSeconds: NOW });
      // URL encodes `release/v1` as `release%2Fv1`, keeping the path
      // grammar `/branches/{enc}/protection` valid. Without this, the
      // URL parses as `/branches/release/v1/protection` and the router
      // wouldn't have matched.
      expect(capturedProtUrl).toContain('/branches/release%2Fv1/protection');
      expect(result.repos[0]?.hasBranchProtection).toBe(true);
    });

    it('honours custom releaseWindowSeconds for the publishing-cutoff', async () => {
      const fetchImpl = makeRouter([
        { test: /\/actions\/runs/, handler: () => jsonResponse(200, { workflow_runs: [] }) },
        { test: /\/issues\?labels=bug/, handler: () => jsonResponse(200, []) },
        { test: /\/releases/, handler: () => jsonResponse(200, [
          // 100 days ago — outside a 30-day window, inside default 365-day.
          { published_at: new Date((NOW - 86400 * 100) * 1000).toISOString() },
        ]) },
        { test: /\/contents\//, handler: () => jsonResponse(404, {}) },
        { test: /\/branches\//, handler: () => jsonResponse(404, {}) },
      ]);
      const r = (await fetchGithubP1Enrichment(baseP0, { pat: PAT, fetchImpl, nowSeconds: NOW, releaseWindowSeconds: 30 * 86400 })).repos[0]!;
      expect(r.releasesLast12m).toBe(0);
      const r2 = (await fetchGithubP1Enrichment(baseP0, { pat: PAT, fetchImpl, nowSeconds: NOW })).repos[0]!;
      expect(r2.releasesLast12m).toBe(1);
    });
  });

  describe('per-repo failure isolation', () => {
    it('marks p1FetchStatus partial when some endpoints error and others succeed', async () => {
      const fetchImpl = makeRouter([
        { test: /\/actions\/runs/, handler: () => jsonResponse(503, {}) }, // error
        { test: /\/issues\?labels=bug/, handler: () => jsonResponse(200, []) }, // ok
        { test: /\/releases/, handler: () => jsonResponse(200, []) }, // ok
        { test: /\/contents\/SECURITY\.md/, handler: () => jsonResponse(404, {}) }, // absent
        { test: /\/contents\/\.github\/dependabot\.yml/, handler: () => jsonResponse(404, {}) },
        { test: /\/branches\/[^/]+\/protection/, handler: () => jsonResponse(404, {}) },
      ]);
      const r = (await fetchGithubP1Enrichment(baseP0, { pat: PAT, fetchImpl, nowSeconds: NOW })).repos[0]!;
      expect(r.p1FetchStatus).toBe('partial');
      expect(r.ciRuns).toBeNull();
      expect(r.bugIssues).toEqual({ closed: 0, total: 0 });
    });

    it('marks p1FetchStatus error when every endpoint fails', async () => {
      const fetchImpl = vi.fn(async () => jsonResponse(503, {}));
      const r = (await fetchGithubP1Enrichment(baseP0, { pat: PAT, fetchImpl, nowSeconds: NOW })).repos[0]!;
      expect(r.p1FetchStatus).toBe('error');
    });

    it('treats 404 on contents endpoints as "absent" → false (not error)', async () => {
      const fetchImpl = makeRouter([
        { test: /\/actions\/runs/, handler: () => jsonResponse(200, { workflow_runs: [] }) },
        { test: /\/issues\?labels=bug/, handler: () => jsonResponse(200, []) },
        { test: /\/releases/, handler: () => jsonResponse(200, []) },
        { test: /\/contents\/SECURITY\.md/, handler: () => jsonResponse(404, {}) },
        { test: /\/contents\/\.github\/dependabot\.yml/, handler: () => jsonResponse(404, {}) },
        { test: /\/branches\/[^/]+\/protection/, handler: () => jsonResponse(404, {}) },
      ]);
      const r = (await fetchGithubP1Enrichment(baseP0, { pat: PAT, fetchImpl, nowSeconds: NOW })).repos[0]!;
      expect(r.hasSecurity).toBe(false);
      expect(r.hasDependabot).toBe(false);
      expect(r.hasBranchProtection).toBe(false);
      expect(r.p1FetchStatus).toBe('ok');
    });
  });
});
