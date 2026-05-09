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
