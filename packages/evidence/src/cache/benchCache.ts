import type { Address } from '@upgrade-siren/shared';

// Bench Mode cache extension (US-122). Extends the discipline of SourcifyCache
// (US-032) with the additional namespaces from EPIC Section 12. The class is
// intentionally a thin generic store — the value of this PR is the locked
// key-builder + TTL constants that every Bench fetcher shares.
//
// Production deployment plugs Upstash Redis at apps/web (existing US-032
// adapter); the same key strings are used so an in-memory fixture run and a
// production run hit the same identity surface.

export const BENCH_CACHE_TTLS = {
  // Sourcify deep responses: long for verified contracts (Sourcify retains
  // long-term), short for unverified (may flip at any moment as devs
  // verify freshly deployed contracts).
  sourcifyDeepVerifiedMs: 24 * 60 * 60 * 1000,
  sourcifyDeepUnverifiedMs: 60 * 1000,
  // GitHub: metadata + repos changes slowly; CI runs and bug-labeled issues
  // need to refresh quickly so the score reflects very recent activity.
  githubMetaMs: 60 * 60 * 1000,
  githubReposMs: 60 * 60 * 1000,
  githubRunsMs: 15 * 60 * 1000,
  githubBugIssuesMs: 15 * 60 * 1000,
  githubContentsMs: 60 * 60 * 1000,
  // On-chain: firstTx is mathematically immutable once observed (an address
  // cannot un-send its first transaction); counts move continuously.
  onchainFirstTxMs: 24 * 60 * 60 * 1000,
  onchainCountsMs: 5 * 60 * 1000,
  // ENS-internal subgraph reads: indexed off mainnet, freshness similar to
  // counts.
  ensInternalMs: 5 * 60 * 1000,
  // Top-level computed bench report cache (full SubjectBenchReport JSON).
  benchReportMs: 5 * 60 * 1000,
} as const;

// Lower-cased addresses / owners / names in cache keys so EIP-55 vs lowercase
// vs ENS-name casing differences cannot create duplicate entries. The actual
// stored values keep their original casing.
function lc(s: string): string {
  return s.toLowerCase();
}

export const BENCH_CACHE_KEYS = {
  sourcifyDeep: (chainId: number, address: Address, fieldsCsv: string): string =>
    `sourcify:${chainId}:${lc(address)}:fields=${fieldsCsv}`,
  githubMeta: (owner: string): string => `github:${lc(owner)}:meta`,
  githubRepos: (owner: string): string => `github:${lc(owner)}:repos`,
  githubRuns: (owner: string, repo: string): string =>
    `github:${lc(owner)}:${lc(repo)}:runs`,
  githubBugIssues: (owner: string, repo: string): string =>
    `github:${lc(owner)}:${lc(repo)}:issues:bug`,
  githubContents: (owner: string, repo: string, path: string): string =>
    `github:${lc(owner)}:${lc(repo)}:contents:${path}`,
  onchainFirstTx: (chainId: number, address: Address): string =>
    `onchain:${chainId}:${lc(address)}:firstTx`,
  onchainCounts: (chainId: number, address: Address): string =>
    `onchain:${chainId}:${lc(address)}:counts`,
  ensInternal: (name: string): string => `ens-internal:${lc(name)}`,
  benchReport: (name: string): string => `bench:${lc(name)}:report`,
} as const;

export interface BenchCacheOptions {
  readonly clock?: () => number;
  readonly maxEntries?: number;
}

interface BenchCacheEntry {
  readonly value: unknown;
  readonly expiresAt: number;
}

const DEFAULT_MAX_ENTRIES = 4096;

export class BenchCache {
  private readonly store = new Map<string, BenchCacheEntry>();
  private readonly clock: () => number;
  private readonly maxEntries: number;

  constructor(options: BenchCacheOptions = {}) {
    this.clock = options.clock ?? Date.now;
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  }

  // Generic get — caller supplies T. Returns undefined when missing or
  // expired (and evicts the expired entry on access for liveness).
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (entry === undefined) return undefined;
    if (this.clock() >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
      throw new Error(`BenchCache.set: ttlMs must be a positive finite number, got ${ttlMs}`);
    }
    this.prune();
    this.store.set(key, { value, expiresAt: this.clock() + ttlMs });
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (entry === undefined) return false;
    if (this.clock() >= entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }

  // FIFO-ish eviction: drops the oldest insertion when at capacity. Map
  // iteration order is insertion order. Sufficient for v1; a real LRU is
  // overkill for the call volume Bench Mode produces.
  private prune(): void {
    if (this.store.size < this.maxEntries) return;
    const firstKey = this.store.keys().next().value;
    if (firstKey !== undefined) this.store.delete(firstKey);
  }
}

// Convenience helper for the sourcify-deep TTL split. Pure: callers who
// already know the match-level pass it in.
export function sourcifyDeepTtlMs(matchLevel: 'exact_match' | 'match' | 'not_found'): number {
  return matchLevel === 'not_found'
    ? BENCH_CACHE_TTLS.sourcifyDeepUnverifiedMs
    : BENCH_CACHE_TTLS.sourcifyDeepVerifiedMs;
}
