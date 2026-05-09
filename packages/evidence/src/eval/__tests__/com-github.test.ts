// Calibration + contract tests for the `com.github` engine. The
// fixtures live next to this file under `fixtures/com-github/`. They
// are real GitHub API responses captured anonymously (so they are
// reproducible without leaking a PAT) and pinned to 2026-05-09 so
// account-age math stays deterministic across re-runs.
//
// The two non-negotiable assertions from the launch contract:
//   letadlo.eth   (Artemstar)        seniority ∈ [0.05, 0.18]
//                                    relevance ∈ [0.40, 0.65]
//                                    trust ≈ 0.60
//   agent-kikiriki.eth (record absent) exists=false, seniority=0
//
// If either fails, tune weights inside DEFAULT_THRESHOLDS in
// `com-github.ts` rather than hardcoding test values — the test is
// the spec.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicClient } from 'viem';

import { comGithubEngine, __testing } from '../com-github.js';
import type {
  EngineContext,
  EngineParams,
  RecordKey,
  ResolvedRecord,
  SharedFetch,
  SharedFetchInit,
  SharedFetchResponse,
} from '../types.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = resolve(HERE, 'fixtures/com-github');
// 2026-05-09 — the day the Artemstar fixture was captured. Pinning
// `Date.now()` keeps account-age and recency math deterministic.
const FIXED_NOW_MS = Date.parse('2026-05-09T20:00:00Z');

interface ArtemstarFixture {
  user: unknown;
  repos: unknown;
}

function loadFixture(name: string): unknown {
  const text = readFileSync(resolve(FIXTURE_DIR, name), 'utf8');
  return JSON.parse(text);
}

function rec(raw: string | null, ensName = 'subject.eth'): ResolvedRecord {
  return {
    key: 'com.github' satisfies RecordKey,
    ensName,
    raw,
    resolvedAtBlock: 1,
    resolvedAtMs: FIXED_NOW_MS,
  };
}

interface MockFetchOptions {
  readonly userBody?: unknown;
  readonly userStatus?: number;
  readonly reposBody?: unknown;
  readonly reposStatus?: number;
  readonly userHeaders?: Record<string, string>;
  readonly reposHeaders?: Record<string, string>;
}

function mockFetch(opts: MockFetchOptions): { fetch: SharedFetch; calls: string[] } {
  const calls: string[] = [];
  const make = (status: number, body: unknown, headers: Record<string, string>): SharedFetchResponse => ({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    text: async () => JSON.stringify(body),
    async json<T = unknown>(): Promise<T> {
      return body as T;
    },
  });
  const fetch: SharedFetch = async (url: string, _init?: SharedFetchInit): Promise<SharedFetchResponse> => {
    calls.push(url);
    if (url.includes('/repos')) {
      return make(opts.reposStatus ?? 200, opts.reposBody ?? [], opts.reposHeaders ?? {});
    }
    return make(opts.userStatus ?? 200, opts.userBody ?? null, opts.userHeaders ?? {});
  };
  return { fetch, calls };
}

function context(fetch: SharedFetch): EngineContext {
  const cache = new Map<string, unknown>();
  return {
    rpc: { mainnet: {} as unknown as PublicClient, sepolia: {} as unknown as PublicClient },
    fetch,
    cache: {
      get<T>(k: string): T | undefined {
        return cache.get(k) as T | undefined;
      },
      set<T>(k: string, v: T): void {
        cache.set(k, v);
      },
    },
    logger: { debug: () => {}, warn: () => {} },
    signal: new AbortController().signal,
  };
}

const baseParams: EngineParams = comGithubEngine.defaultParams;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  vi.setSystemTime(new Date(FIXED_NOW_MS));
  // Token state is per-test; default to absent so anonymous-path
  // assertions are the implicit baseline.
  delete process.env['GITHUB_TOKEN'];
});

afterEach(() => {
  vi.useRealTimers();
});

describe('comGithubEngine — calibration anchors', () => {
  it('letadlo.eth (Artemstar): seniority ∈ [0.05, 0.18], relevance ∈ [0.40, 0.65], trust ≈ 0.60', async () => {
    const fx = loadFixture('Artemstar.json') as ArtemstarFixture;
    process.env['GITHUB_TOKEN'] = 'pat_test_token';

    const { fetch, calls } = mockFetch({ userBody: fx.user, reposBody: fx.repos });
    const ctx = context(fetch);

    const result = await comGithubEngine.evaluate(rec('Artemstar', 'letadlo.eth'), ctx, baseParams);

    expect(result.exists).toBe(true);
    expect(result.recordKey).toBe('com.github');

    expect(result.seniority).toBeGreaterThanOrEqual(0.05);
    expect(result.seniority).toBeLessThanOrEqual(0.18);

    expect(result.relevance).toBeGreaterThanOrEqual(0.4);
    expect(result.relevance).toBeLessThanOrEqual(0.65);

    expect(result.trust).toBeCloseTo(0.6, 5);

    // Engine stays well under the 12-call rate-limit budget — in
    // steady state this is exactly two calls.
    expect(calls.length).toBeLessThanOrEqual(12);
    expect(calls.length).toBe(2);

    expect(result.errors).toEqual([]);
    expect(result.confidence).toBe('complete');
  });

  it('agent-kikiriki.eth (record absent): exists=false, seniority=0, no GitHub calls', async () => {
    const fx = loadFixture('empty.json') as { raw: string | null; expected: { exists: false; seniority: 0 } };
    const { fetch, calls } = mockFetch({});
    const ctx = context(fetch);

    const result = await comGithubEngine.evaluate(
      rec(fx.raw, 'agent-kikiriki.eth'),
      ctx,
      baseParams,
    );

    expect(result.exists).toBe(false);
    expect(result.seniority).toBe(0);
    expect(result.relevance).toBe(0);
    expect(result.trust).toBe(0);
    expect(result.errors).toEqual([]);
    // No fetch calls when the record is absent — saves the budget.
    expect(calls.length).toBe(0);
  });
});

describe('comGithubEngine — anonymous path (no GITHUB_TOKEN)', () => {
  it('marks confidence=partial when GITHUB_TOKEN is unset, even on a successful fetch', async () => {
    const fx = loadFixture('Artemstar.json') as ArtemstarFixture;
    delete process.env['GITHUB_TOKEN'];

    const { fetch } = mockFetch({ userBody: fx.user, reposBody: fx.repos });
    const ctx = context(fetch);

    const result = await comGithubEngine.evaluate(rec('Artemstar'), ctx, baseParams);

    expect(result.exists).toBe(true);
    expect(result.confidence).toBe('partial');
    // Calibration assertions still hold on the anonymous path —
    // the engine produces the same scores; only confidence drops.
    expect(result.seniority).toBeGreaterThanOrEqual(0.05);
    expect(result.seniority).toBeLessThanOrEqual(0.18);
    expect(result.relevance).toBeGreaterThanOrEqual(0.4);
    expect(result.relevance).toBeLessThanOrEqual(0.65);
  });

  it('upgrades confidence to complete when GITHUB_TOKEN is set and both fetches succeed', async () => {
    const fx = loadFixture('Artemstar.json') as ArtemstarFixture;
    process.env['GITHUB_TOKEN'] = 'pat_test_token';

    const { fetch } = mockFetch({ userBody: fx.user, reposBody: fx.repos });
    const ctx = context(fetch);

    const result = await comGithubEngine.evaluate(rec('Artemstar'), ctx, baseParams);
    expect(result.confidence).toBe('complete');
  });
});

describe('comGithubEngine — error and absent paths', () => {
  it('rejects an invalid GitHub login without spending API budget', async () => {
    const { fetch, calls } = mockFetch({});
    const ctx = context(fetch);

    const result = await comGithubEngine.evaluate(
      rec('not a valid login!!'),
      ctx,
      baseParams,
    );

    expect(result.exists).toBe(false);
    expect(result.errors[0]).toContain('invalid github login');
    expect(calls.length).toBe(0);
  });

  it('surfaces a 404 on /users as a degraded zero with the anti-signal', async () => {
    const { fetch } = mockFetch({ userStatus: 404, userBody: { message: 'Not Found' } });
    const ctx = context(fetch);

    const result = await comGithubEngine.evaluate(
      rec('definitely-not-a-real-user-zzz123'),
      ctx,
      baseParams,
    );

    expect(result.exists).toBe(true);
    expect(result.validity).toBe(0);
    expect(result.seniority).toBe(0);
    expect(result.relevance).toBe(0);
    expect(result.trust).toBeCloseTo(0.6, 5);
    expect(result.confidence).toBe('degraded');
    expect(result.signals.antiSignals[0]?.name).toBe('githubAccountNotFound');
  });

  it('downgrades to degraded when GitHub returns a primary rate-limit 403', async () => {
    const fx = loadFixture('Artemstar.json') as ArtemstarFixture;
    process.env['GITHUB_TOKEN'] = 'pat_test_token';

    const { fetch } = mockFetch({
      userStatus: 403,
      userHeaders: { 'x-ratelimit-remaining': '0' },
      userBody: { message: 'API rate limit exceeded' },
      reposBody: fx.repos,
    });
    const ctx = context(fetch);

    const result = await comGithubEngine.evaluate(rec('Artemstar'), ctx, baseParams);
    expect(result.confidence).toBe('degraded');
    expect(result.errors[0]).toContain('user fetch');
  });
});

describe('comGithubEngine — pure compute determinism', () => {
  it('compute() is a pure function of (user, repos, thresholds, nowMs)', () => {
    const fx = loadFixture('Artemstar.json') as ArtemstarFixture;
    const user = __testing.parseUser(fx.user);
    expect(user).not.toBeNull();
    const repos = __testing.parseRepoList(fx.repos);
    expect(repos.length).toBeGreaterThanOrEqual(1);

    const a = __testing.compute({
      user: user!,
      repos,
      thresholds: __testing.DEFAULT_THRESHOLDS,
      nowMs: FIXED_NOW_MS,
    });
    const b = __testing.compute({
      user: user!,
      repos,
      thresholds: __testing.DEFAULT_THRESHOLDS,
      nowMs: FIXED_NOW_MS,
    });

    expect(a.seniority).toBe(b.seniority);
    expect(a.relevance).toBe(b.relevance);
    expect(a.seniorityBreakdown.map((s) => s.value)).toEqual(b.seniorityBreakdown.map((s) => s.value));
    expect(a.relevanceBreakdown.map((s) => s.value)).toEqual(b.relevanceBreakdown.map((s) => s.value));
  });

  it('compute() never produces axes outside [0, 1]', () => {
    // Synthesise a maximally favourable subject to confirm we cap at 1.
    const user = { login: 'inflated', created_at: '2010-01-01T00:00:00Z', public_repos: 1000, followers: 100_000 };
    const repos = Array.from({ length: 50 }, (_, i) => ({
      name: `r${i}`,
      fork: false,
      archived: false,
      language: ['ts', 'rs', 'py', 'go', 'sol'][i % 5] ?? null,
      stargazers_count: 10_000,
      topics: ['ethereum', 'eth-prague'],
      license: { spdx_id: 'MIT' },
      pushed_at: '2026-05-08T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
    }));
    const out = __testing.compute({
      user,
      repos,
      thresholds: __testing.DEFAULT_THRESHOLDS,
      nowMs: FIXED_NOW_MS,
    });
    expect(out.seniority).toBeLessThanOrEqual(1);
    expect(out.seniority).toBeGreaterThanOrEqual(0);
    expect(out.relevance).toBeLessThanOrEqual(1);
    expect(out.relevance).toBeGreaterThanOrEqual(0);
  });
});
