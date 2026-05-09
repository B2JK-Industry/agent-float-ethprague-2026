import { describe, expect, it, vi } from 'vitest';

import { fetchGithubP0Source } from '../../../src/sources/github/fetch.js';

const PAT = 'ghp_test_pat';
const OWNER = 'vbuterin';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

interface RouteHandler {
  (url: string, init?: RequestInit): Response | Promise<Response>;
}

function makeRouter(routes: ReadonlyArray<{ test: RegExp; handler: (url: string) => Response | Promise<Response> }>) {
  return vi.fn(async (input: string, _init?: RequestInit) => {
    for (const r of routes) {
      if (r.test.test(input)) return r.handler(input);
    }
    throw new Error(`unrouted url: ${input}`);
  });
}

const userBody = {
  login: 'vbuterin',
  created_at: '2011-08-01T00:00:00Z',
  public_repos: 30,
  followers: 12345,
};

const reposBody = [
  {
    name: 'EIPs',
    full_name: 'vbuterin/EIPs',
    created_at: '2018-01-01T00:00:00Z',
    pushed_at: '2026-04-15T00:00:00Z',
    archived: false,
    default_branch: 'master',
    license: { spdx_id: 'CC0-1.0' },
    topics: ['ethereum', 'eips'],
  },
  {
    name: 'pyethereum',
    full_name: 'vbuterin/pyethereum',
    created_at: '2014-01-01T00:00:00Z',
    pushed_at: '2020-01-01T00:00:00Z',
    archived: true,
    default_branch: 'main',
    license: { spdx_id: 'MIT' },
    topics: [],
  },
];

const eipsTestDir = [{ name: 'README.md', type: 'file' }];
const eipsReadme = { name: 'README.md', type: 'file', size: 4096 };
const eipsLicense = { name: 'LICENSE', type: 'file', size: 1024 };

describe('fetchGithubP0Source', () => {
  describe('input validation', () => {
    it('returns missing_pat when PAT is empty string', async () => {
      const result = await fetchGithubP0Source(OWNER, { pat: '' });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('missing_pat');
    });

    it('returns invalid_owner for syntactically broken inputs', async () => {
      for (const bad of ['', '-leading-dash', 'has space', 'a'.repeat(40)]) {
        const result = await fetchGithubP0Source(bad, { pat: PAT });
        expect(result.kind).toBe('error');
        if (result.kind === 'error') expect(result.reason).toBe('invalid_owner');
      }
    });
  });

  describe('URL construction + auth', () => {
    it('targets api.github.com with Bearer auth headers', async () => {
      const captured: { url: string; headers: Record<string, string> }[] = [];
      const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
        captured.push({ url, headers: init?.headers as Record<string, string> });
        if (url.endsWith(`/users/${OWNER}`)) return jsonResponse(200, userBody);
        if (url.includes(`/users/${OWNER}/repos`)) return jsonResponse(200, []);
        return jsonResponse(404, {});
      });
      await fetchGithubP0Source(OWNER, { pat: PAT, fetchImpl });
      expect(captured[0]?.url.startsWith('https://api.github.com/users/')).toBe(true);
      expect(captured[0]?.headers['authorization']).toBe(`Bearer ${PAT}`);
      expect(captured[0]?.headers['accept']).toBe('application/vnd.github+json');
      expect(captured[0]?.headers['x-github-api-version']).toBe('2022-11-28');
    });

    it('respects baseUrl override', async () => {
      let firstUrl = '';
      const fetchImpl = vi.fn(async (url: string) => {
        if (firstUrl === '') firstUrl = url;
        return jsonResponse(200, url.includes('/users/') && !url.includes('/repos') ? userBody : []);
      });
      await fetchGithubP0Source(OWNER, { pat: PAT, fetchImpl, baseUrl: 'https://gh.test/api' });
      expect(firstUrl.startsWith('https://gh.test/api/users/')).toBe(true);
    });
  });

  describe('happy path', () => {
    it('returns user + per-repo P0 metadata + probes', async () => {
      const fetchImpl = makeRouter([
        { test: /\/users\/vbuterin$/, handler: () => jsonResponse(200, userBody) },
        { test: /\/users\/vbuterin\/repos/, handler: () => jsonResponse(200, reposBody) },
        { test: /\/repos\/vbuterin\/EIPs\/contents\/test$/, handler: () => jsonResponse(404, {}) },
        { test: /\/repos\/vbuterin\/EIPs\/contents\/tests$/, handler: () => jsonResponse(200, eipsTestDir) },
        { test: /\/repos\/vbuterin\/EIPs\/contents\/__tests__$/, handler: () => jsonResponse(404, {}) },
        { test: /\/repos\/vbuterin\/EIPs\/contents\/spec$/, handler: () => jsonResponse(404, {}) },
        { test: /\/repos\/vbuterin\/EIPs\/contents\/README\.md$/, handler: () => jsonResponse(200, eipsReadme) },
        { test: /\/repos\/vbuterin\/EIPs\/contents\/LICENSE$/, handler: () => jsonResponse(200, eipsLicense) },
        { test: /\/repos\/vbuterin\/pyethereum\/contents\/test$/, handler: () => jsonResponse(404, {}) },
        { test: /\/repos\/vbuterin\/pyethereum\/contents\/tests$/, handler: () => jsonResponse(404, {}) },
        { test: /\/repos\/vbuterin\/pyethereum\/contents\/__tests__$/, handler: () => jsonResponse(404, {}) },
        { test: /\/repos\/vbuterin\/pyethereum\/contents\/spec$/, handler: () => jsonResponse(404, {}) },
        { test: /\/repos\/vbuterin\/pyethereum\/contents\/README\.md$/, handler: () => jsonResponse(404, {}) },
        { test: /\/repos\/vbuterin\/pyethereum\/contents\/LICENSE$/, handler: () => jsonResponse(404, {}) },
      ]);

      const result = await fetchGithubP0Source(OWNER, { pat: PAT, fetchImpl });
      expect(result.kind).toBe('ok');
      if (result.kind !== 'ok') return;
      expect(result.value.owner).toBe(OWNER);
      expect(result.value.user).toEqual({
        login: 'vbuterin',
        createdAt: '2011-08-01T00:00:00Z',
        publicRepos: 30,
        followers: 12345,
      });
      expect(result.value.repos).toHaveLength(2);
      const eips = result.value.repos[0]!;
      expect(eips.name).toBe('EIPs');
      expect(eips.pushedAt).toBe('2026-04-15T00:00:00Z');
      expect(eips.license).toBe('CC0-1.0');
      expect(eips.topics).toEqual(['ethereum', 'eips']);
      expect(eips.hasTestDir).toBe(true);
      expect(eips.hasSubstantialReadme).toBe(true);
      expect(eips.readmeBytes).toBe(4096);
      expect(eips.hasLicense).toBe(true);
      expect(eips.fetchStatus).toBe('ok');

      const py = result.value.repos[1]!;
      expect(py.name).toBe('pyethereum');
      expect(py.archived).toBe(true);
      expect(py.hasTestDir).toBe(false);
      expect(py.hasSubstantialReadme).toBe(false);
      expect(py.readmeBytes).toBeNull();
      expect(py.hasLicense).toBe(false);
      expect(py.fetchStatus).toBe('ok');
    });

    it('caps the repo set at repoCap (default 20)', async () => {
      const manyRepos = Array.from({ length: 50 }, (_, i) => ({
        name: `repo${i}`,
        full_name: `vbuterin/repo${i}`,
        created_at: '2024-01-01T00:00:00Z',
        pushed_at: '2026-01-01T00:00:00Z',
        archived: false,
        default_branch: 'main',
        license: null,
        topics: [],
      }));
      const fetchImpl = makeRouter([
        { test: /\/users\/vbuterin$/, handler: () => jsonResponse(200, userBody) },
        { test: /\/users\/vbuterin\/repos/, handler: () => jsonResponse(200, manyRepos) },
        { test: /\/contents\//, handler: () => jsonResponse(404, {}) },
      ]);
      const result = await fetchGithubP0Source(OWNER, { pat: PAT, fetchImpl });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') expect(result.value.repos).toHaveLength(20);
    });

    it('honours repoCap override', async () => {
      const manyRepos = Array.from({ length: 5 }, (_, i) => ({
        name: `r${i}`,
        full_name: `vbuterin/r${i}`,
        created_at: '2024-01-01T00:00:00Z',
        pushed_at: '2026-01-01T00:00:00Z',
        archived: false,
        default_branch: 'main',
        license: null,
        topics: [],
      }));
      const fetchImpl = makeRouter([
        { test: /\/users\/vbuterin$/, handler: () => jsonResponse(200, userBody) },
        { test: /\/users\/vbuterin\/repos/, handler: () => jsonResponse(200, manyRepos) },
        { test: /\/contents\//, handler: () => jsonResponse(404, {}) },
      ]);
      const result = await fetchGithubP0Source(OWNER, { pat: PAT, fetchImpl, repoCap: 3 });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') expect(result.value.repos).toHaveLength(3);
    });

    it('hasSubstantialReadme=false when README is below threshold (200 bytes default)', async () => {
      const repos = [{
        name: 'small', full_name: 'vbuterin/small', created_at: null, pushed_at: null,
        archived: false, default_branch: 'main', license: null, topics: [],
      }];
      const fetchImpl = makeRouter([
        { test: /\/users\/vbuterin$/, handler: () => jsonResponse(200, userBody) },
        { test: /\/users\/vbuterin\/repos/, handler: () => jsonResponse(200, repos) },
        { test: /\/contents\/README\.md$/, handler: () => jsonResponse(200, { type: 'file', size: 100 }) },
        { test: /\/contents\//, handler: () => jsonResponse(404, {}) },
      ]);
      const result = await fetchGithubP0Source(OWNER, { pat: PAT, fetchImpl });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        const r = result.value.repos[0]!;
        expect(r.readmeBytes).toBe(100);
        expect(r.hasSubstantialReadme).toBe(false);
      }
    });
  });

  describe('top-level error paths', () => {
    it('returns rate_limited when /users/{owner} is 429', async () => {
      const fetchImpl = makeRouter([
        { test: /\/users\/vbuterin$/, handler: () => jsonResponse(429, {}) },
        { test: /\/users\/vbuterin\/repos/, handler: () => jsonResponse(200, []) },
      ]);
      const result = await fetchGithubP0Source(OWNER, { pat: PAT, fetchImpl });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') {
        expect(result.reason).toBe('rate_limited');
        expect(result.httpStatus).toBe(429);
      }
    });

    it('treats HTTP 403 as rate_limited at top level (GitHub primary rate-limit overlay)', async () => {
      const fetchImpl = makeRouter([
        { test: /\/users\/vbuterin$/, handler: () => jsonResponse(403, { message: 'rate limited' }) },
      ]);
      const result = await fetchGithubP0Source(OWNER, { pat: PAT, fetchImpl });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('rate_limited');
    });

    it('returns server_error on /users/{owner} HTTP 5xx', async () => {
      const fetchImpl = makeRouter([
        { test: /\/users\/vbuterin$/, handler: () => jsonResponse(503, {}) },
      ]);
      const result = await fetchGithubP0Source(OWNER, { pat: PAT, fetchImpl });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('server_error');
    });

    it('returns network_error when /users/{owner} fetch throws', async () => {
      const fetchImpl = vi.fn(async () => {
        throw new TypeError('connection refused');
      });
      const result = await fetchGithubP0Source(OWNER, { pat: PAT, fetchImpl });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('network_error');
    });

    it('continues with user=null when /users/{owner} returns 404 (account does not exist) — repos call still tries', async () => {
      const fetchImpl = makeRouter([
        { test: /\/users\/vbuterin$/, handler: () => jsonResponse(404, {}) },
        { test: /\/users\/vbuterin\/repos/, handler: () => jsonResponse(200, []) },
      ]);
      const result = await fetchGithubP0Source(OWNER, { pat: PAT, fetchImpl });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.user).toBeNull();
        expect(result.value.repos).toEqual([]);
      }
    });
  });

  describe('per-repo soft failure', () => {
    it('marks repo fetchStatus=partial when both README and LICENSE error (not 404)', async () => {
      const repos = [{
        name: 'r', full_name: 'vbuterin/r', created_at: null, pushed_at: null,
        archived: false, default_branch: 'main', license: null, topics: [],
      }];
      const fetchImpl = makeRouter([
        { test: /\/users\/vbuterin$/, handler: () => jsonResponse(200, userBody) },
        { test: /\/users\/vbuterin\/repos/, handler: () => jsonResponse(200, repos) },
        { test: /\/contents\/test$/, handler: () => jsonResponse(404, {}) },
        { test: /\/contents\/tests$/, handler: () => jsonResponse(404, {}) },
        { test: /\/contents\/__tests__$/, handler: () => jsonResponse(404, {}) },
        { test: /\/contents\/spec$/, handler: () => jsonResponse(404, {}) },
        { test: /\/contents\/README\.md$/, handler: () => jsonResponse(503, {}) },
        { test: /\/contents\/LICENSE$/, handler: () => jsonResponse(503, {}) },
      ]);
      const result = await fetchGithubP0Source(OWNER, { pat: PAT, fetchImpl });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        const r = result.value.repos[0]!;
        expect(r.fetchStatus).toBe('partial');
        expect(r.hasSubstantialReadme).toBe(false);
        expect(r.hasLicense).toBe(false);
      }
    });

    // audit-round-7 P1 #7 regression: previously a single-probe error
    // (e.g. README 503 while LICENSE 200) silently downgraded the
    // hygiene flag and marked the repo `fetchStatus: 'ok'`. That hid
    // partial-failure data behind a clean-looking score. Now any single
    // hygiene-probe error trips `fetchStatus: 'partial'` so the drawer
    // can render a degraded provenance pill.
    it('marks repo fetchStatus=partial when only README errors and LICENSE succeeds (audit-round-7 P1 #7)', async () => {
      const repos = [{
        name: 'r', full_name: 'vbuterin/r', created_at: null, pushed_at: null,
        archived: false, default_branch: 'main', license: null, topics: [],
      }];
      const fetchImpl = makeRouter([
        { test: /\/users\/vbuterin$/, handler: () => jsonResponse(200, userBody) },
        { test: /\/users\/vbuterin\/repos/, handler: () => jsonResponse(200, repos) },
        { test: /\/contents\/test$/, handler: () => jsonResponse(404, {}) },
        { test: /\/contents\/tests$/, handler: () => jsonResponse(404, {}) },
        { test: /\/contents\/__tests__$/, handler: () => jsonResponse(404, {}) },
        { test: /\/contents\/spec$/, handler: () => jsonResponse(404, {}) },
        { test: /\/contents\/README\.md$/, handler: () => jsonResponse(503, {}) },
        { test: /\/contents\/LICENSE$/, handler: () =>
          jsonResponse(200, { type: 'file', size: 1024, name: 'LICENSE', path: 'LICENSE' }) },
      ]);
      const result = await fetchGithubP0Source(OWNER, { pat: PAT, fetchImpl });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        const r = result.value.repos[0]!;
        expect(r.fetchStatus).toBe('partial');
        if (r.fetchStatus === 'partial') {
          // README 503 surfaced as the partial-failure provenance.
          expect(r.errorReason).toMatch(/README|503/i);
        }
      }
    });

    it('marks repo fetchStatus=partial when only LICENSE errors and README succeeds (audit-round-7 P1 #7)', async () => {
      const repos = [{
        name: 'r', full_name: 'vbuterin/r', created_at: null, pushed_at: null,
        archived: false, default_branch: 'main', license: null, topics: [],
      }];
      const fetchImpl = makeRouter([
        { test: /\/users\/vbuterin$/, handler: () => jsonResponse(200, userBody) },
        { test: /\/users\/vbuterin\/repos/, handler: () => jsonResponse(200, repos) },
        { test: /\/contents\/test$/, handler: () => jsonResponse(404, {}) },
        { test: /\/contents\/tests$/, handler: () => jsonResponse(404, {}) },
        { test: /\/contents\/__tests__$/, handler: () => jsonResponse(404, {}) },
        { test: /\/contents\/spec$/, handler: () => jsonResponse(404, {}) },
        { test: /\/contents\/README\.md$/, handler: () =>
          jsonResponse(200, { type: 'file', size: 4096, name: 'README.md', path: 'README.md' }) },
        { test: /\/contents\/LICENSE$/, handler: () => jsonResponse(503, {}) },
      ]);
      const result = await fetchGithubP0Source(OWNER, { pat: PAT, fetchImpl });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        const r = result.value.repos[0]!;
        expect(r.fetchStatus).toBe('partial');
        if (r.fetchStatus === 'partial') {
          expect(r.errorReason).toMatch(/LICENSE|503/i);
        }
      }
    });

    it('keeps repo fetchStatus=ok when README is 404 and LICENSE is 404 (just absent, not erroring)', async () => {
      const repos = [{
        name: 'r', full_name: 'vbuterin/r', created_at: null, pushed_at: null,
        archived: false, default_branch: 'main', license: null, topics: [],
      }];
      const fetchImpl = makeRouter([
        { test: /\/users\/vbuterin$/, handler: () => jsonResponse(200, userBody) },
        { test: /\/users\/vbuterin\/repos/, handler: () => jsonResponse(200, repos) },
        { test: /\/contents\//, handler: () => jsonResponse(404, {}) },
      ]);
      const result = await fetchGithubP0Source(OWNER, { pat: PAT, fetchImpl });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        const r = result.value.repos[0]!;
        expect(r.fetchStatus).toBe('ok');
        expect(r.hasSubstantialReadme).toBe(false);
        expect(r.hasLicense).toBe(false);
      }
    });
  });
});
