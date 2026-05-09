import { describe, expect, it } from 'vitest';

import {
  BENCH_CACHE_KEYS,
  BENCH_CACHE_TTLS,
  BenchCache,
  sourcifyDeepTtlMs,
} from '../../src/cache/benchCache.js';

const ADDR = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa' as const;
const ADDR_LC = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

describe('BENCH_CACHE_KEYS', () => {
  it('builds canonical sourcify key with lowercased address', () => {
    expect(BENCH_CACHE_KEYS.sourcifyDeep(11155111, ADDR, 'creationMatch,runtimeMatch')).toBe(
      `sourcify:11155111:${ADDR_LC}:fields=creationMatch,runtimeMatch`,
    );
  });

  it('builds canonical github keys with lowercased owner/repo', () => {
    expect(BENCH_CACHE_KEYS.githubMeta('Vbuterin')).toBe('github:vbuterin:meta');
    expect(BENCH_CACHE_KEYS.githubRepos('Vbuterin')).toBe('github:vbuterin:repos');
    expect(BENCH_CACHE_KEYS.githubRuns('B2JK-Industry', 'Upgrade-Siren-ETHPrague2026')).toBe(
      'github:b2jk-industry:upgrade-siren-ethprague2026:runs',
    );
    expect(BENCH_CACHE_KEYS.githubBugIssues('Vbuterin', 'EIPs')).toBe('github:vbuterin:eips:issues:bug');
    expect(BENCH_CACHE_KEYS.githubContents('Vbuterin', 'EIPs', 'EIPS/eip-712.md')).toBe(
      'github:vbuterin:eips:contents:EIPS/eip-712.md',
    );
  });

  it('builds canonical onchain keys with lowercased address', () => {
    expect(BENCH_CACHE_KEYS.onchainFirstTx(1, ADDR)).toBe(`onchain:1:${ADDR_LC}:firstTx`);
    expect(BENCH_CACHE_KEYS.onchainCounts(11155111, ADDR)).toBe(`onchain:11155111:${ADDR_LC}:counts`);
  });

  it('builds canonical ens-internal keys with lowercased name', () => {
    expect(BENCH_CACHE_KEYS.ensInternal('VAULT.demo.upgradesiren.eth')).toBe(
      'ens-internal:vault.demo.upgradesiren.eth',
    );
  });

  it('builds canonical bench-report keys with lowercased name', () => {
    expect(BENCH_CACHE_KEYS.benchReport('SOMEAGENT.eth')).toBe('bench:someagent.eth:report');
  });

  it('keeps the path component of github contents key as-is (case sensitive on disk)', () => {
    // Repo paths are case-sensitive on case-sensitive filesystems, so we don't
    // lowercase the {path} component. This locks the contract for fetchers.
    expect(
      BENCH_CACHE_KEYS.githubContents('owner', 'repo', 'README.md').endsWith(':contents:README.md'),
    ).toBe(true);
  });
});

describe('BENCH_CACHE_TTLS', () => {
  it('matches EPIC Section 12 cache TTL table', () => {
    expect(BENCH_CACHE_TTLS.sourcifyDeepVerifiedMs).toBe(24 * 60 * 60 * 1000);
    expect(BENCH_CACHE_TTLS.sourcifyDeepUnverifiedMs).toBe(60 * 1000);
    expect(BENCH_CACHE_TTLS.githubMetaMs).toBe(60 * 60 * 1000);
    expect(BENCH_CACHE_TTLS.githubReposMs).toBe(60 * 60 * 1000);
    expect(BENCH_CACHE_TTLS.githubRunsMs).toBe(15 * 60 * 1000);
    expect(BENCH_CACHE_TTLS.githubBugIssuesMs).toBe(15 * 60 * 1000);
    expect(BENCH_CACHE_TTLS.githubContentsMs).toBe(60 * 60 * 1000);
    expect(BENCH_CACHE_TTLS.onchainFirstTxMs).toBe(24 * 60 * 60 * 1000);
    expect(BENCH_CACHE_TTLS.onchainCountsMs).toBe(5 * 60 * 1000);
    expect(BENCH_CACHE_TTLS.ensInternalMs).toBe(5 * 60 * 1000);
    expect(BENCH_CACHE_TTLS.benchReportMs).toBe(5 * 60 * 1000);
  });
});

describe('sourcifyDeepTtlMs', () => {
  it('returns verified TTL for exact_match', () => {
    expect(sourcifyDeepTtlMs('exact_match')).toBe(BENCH_CACHE_TTLS.sourcifyDeepVerifiedMs);
  });
  it('returns verified TTL for match', () => {
    expect(sourcifyDeepTtlMs('match')).toBe(BENCH_CACHE_TTLS.sourcifyDeepVerifiedMs);
  });
  it('returns unverified TTL for not_found', () => {
    expect(sourcifyDeepTtlMs('not_found')).toBe(BENCH_CACHE_TTLS.sourcifyDeepUnverifiedMs);
  });
});

describe('BenchCache', () => {
  it('returns undefined for a missing key', () => {
    const cache = new BenchCache();
    expect(cache.get('nope')).toBeUndefined();
  });

  it('returns the stored value before TTL expires', () => {
    let now = 1_000_000;
    const cache = new BenchCache({ clock: () => now });
    cache.set('k', { foo: 'bar' }, 10_000);
    expect(cache.get<{ foo: string }>('k')).toEqual({ foo: 'bar' });
  });

  it('expires the entry once now >= expiresAt', () => {
    let now = 1_000_000;
    const cache = new BenchCache({ clock: () => now });
    cache.set('k', 42, 10_000);
    now = 1_009_999;
    expect(cache.get('k')).toBe(42);
    now = 1_010_000;
    expect(cache.get('k')).toBeUndefined();
  });

  it('evicts expired entry on access (cleanup-on-read)', () => {
    let now = 1_000_000;
    const cache = new BenchCache({ clock: () => now });
    cache.set('k', 1, 5_000);
    now = 1_010_000;
    expect(cache.get('k')).toBeUndefined();
    expect(cache.size()).toBe(0);
  });

  it('has() returns false for expired entries and evicts them', () => {
    let now = 1_000_000;
    const cache = new BenchCache({ clock: () => now });
    cache.set('k', 1, 5_000);
    now = 1_010_000;
    expect(cache.has('k')).toBe(false);
    expect(cache.size()).toBe(0);
  });

  it('replaces value + ttl on repeated set with the same key', () => {
    let now = 1_000_000;
    const cache = new BenchCache({ clock: () => now });
    cache.set('k', 'first', 1_000);
    cache.set('k', 'second', 10_000);
    now = 1_005_000;
    expect(cache.get('k')).toBe('second');
  });

  it('supports manual delete', () => {
    const cache = new BenchCache();
    cache.set('k', 1, 1_000);
    expect(cache.delete('k')).toBe(true);
    expect(cache.get('k')).toBeUndefined();
    expect(cache.delete('k')).toBe(false);
  });

  it('supports clear', () => {
    const cache = new BenchCache();
    cache.set('a', 1, 1_000);
    cache.set('b', 2, 1_000);
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it('rejects non-positive TTL on set', () => {
    const cache = new BenchCache();
    expect(() => cache.set('k', 1, 0)).toThrow();
    expect(() => cache.set('k', 1, -5)).toThrow();
    expect(() => cache.set('k', 1, Number.POSITIVE_INFINITY)).toThrow();
  });

  it('evicts oldest entry when maxEntries is exceeded (FIFO)', () => {
    const cache = new BenchCache({ maxEntries: 3 });
    cache.set('a', 1, 60_000);
    cache.set('b', 2, 60_000);
    cache.set('c', 3, 60_000);
    cache.set('d', 4, 60_000);
    expect(cache.size()).toBe(3);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('d')).toBe(4);
  });

  // audit-round-7 P1 #5: when the cache is at capacity, prune() must
  // first sweep expired entries before falling back to FIFO eviction.
  // Previously a stale-but-untouched entry consumed capacity and forced
  // eviction of the oldest LIVE entry. Discriminating shape: load up
  // capacity with three entries, expire one of them via clock advance,
  // then insert a fourth. The expired entry is the only one that should
  // be evicted; the oldest live entry must stay.
  it('prunes expired entries before FIFO-evicting live ones (audit-round-7 P1 #5)', () => {
    let now = 1_000;
    const cache = new BenchCache({ maxEntries: 3, clock: () => now });
    cache.set('expired-soon', 'x', 100);
    cache.set('live-old', 'old', 60_000);
    cache.set('live-mid', 'mid', 60_000);
    expect(cache.size()).toBe(3);

    // Advance past expired-soon's TTL but well within live entries' TTL.
    now = 5_000;

    cache.set('live-new', 'new', 60_000);

    // Critical: the expired entry was reclaimed; the oldest LIVE entry
    // (`live-old`) survived. Without expired-sweep prune, `live-old`
    // would have been FIFO-evicted to make room for `live-new`.
    expect(cache.size()).toBe(3);
    expect(cache.get('expired-soon')).toBeUndefined();
    expect(cache.get('live-old')).toBe('old');
    expect(cache.get('live-mid')).toBe('mid');
    expect(cache.get('live-new')).toBe('new');
  });

  it('treats different namespaces as disjoint identities', () => {
    const cache = new BenchCache();
    const k1 = BENCH_CACHE_KEYS.githubMeta('alice');
    const k2 = BENCH_CACHE_KEYS.githubRepos('alice');
    cache.set(k1, 'meta-value', 60_000);
    cache.set(k2, 'repos-value', 60_000);
    expect(cache.get(k1)).toBe('meta-value');
    expect(cache.get(k2)).toBe('repos-value');
  });

  it('rejects setting after expiry by re-evaluating the clock', () => {
    let now = 1_000_000;
    const cache = new BenchCache({ clock: () => now });
    cache.set('k', 1, 1_000);
    now = 1_500_000;
    cache.set('k', 2, 1_000);
    now = 1_500_500;
    expect(cache.get('k')).toBe(2);
    now = 1_501_000;
    expect(cache.get('k')).toBeUndefined();
  });
});
