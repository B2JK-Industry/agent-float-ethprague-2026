// Caching wrapper for ENS resolution. ENS records change infrequently but
// not never; default TTL is 60 seconds, configurable. Tests inject a
// deterministic clock so cache expiry is hermetic.

import {
  resolveEnsRecords,
  type ResolveEnsRecordsOptions,
} from './resolve.js';
import type { EnsResolutionResult } from './types.js';

export interface EnsResolutionCacheOptions {
  readonly ttlMs?: number;
  readonly clock?: () => number;
  readonly maxEntries?: number;
}

interface CacheEntry {
  readonly value: EnsResolutionResult;
  readonly expiresAt: number;
}

const DEFAULT_TTL_MS = 60_000;
const DEFAULT_MAX_ENTRIES = 1000;

export class EnsResolutionCache {
  private readonly store = new Map<string, CacheEntry>();
  private readonly ttlMs: number;
  private readonly clock: () => number;
  private readonly maxEntries: number;

  constructor(options: EnsResolutionCacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.clock = options.clock ?? Date.now;
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  }

  static keyFor(name: string, chainId: number): string {
    return `${chainId}:${name.toLowerCase()}`;
  }

  get(name: string, chainId: number): EnsResolutionResult | undefined {
    const key = EnsResolutionCache.keyFor(name, chainId);
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (this.clock() >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(name: string, chainId: number, value: EnsResolutionResult): void {
    if (this.store.size >= this.maxEntries) {
      // Naive eviction: remove the oldest entry by insertion order.
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) this.store.delete(firstKey);
    }
    const key = EnsResolutionCache.keyFor(name, chainId);
    this.store.set(key, {
      value,
      expiresAt: this.clock() + this.ttlMs,
    });
  }

  invalidate(name: string, chainId: number): void {
    this.store.delete(EnsResolutionCache.keyFor(name, chainId));
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

export interface ResolveEnsRecordsCachedOptions extends ResolveEnsRecordsOptions {
  readonly cache?: EnsResolutionCache;
}

import { mainnet } from 'viem/chains';

export async function resolveEnsRecordsCached(
  name: string,
  options: ResolveEnsRecordsCachedOptions = {},
): Promise<EnsResolutionResult> {
  const cache = options.cache;
  const chainId = options.chainId ?? mainnet.id;

  if (cache) {
    const hit = cache.get(name, chainId);
    if (hit !== undefined) return hit;
  }

  const result = await resolveEnsRecords(name, options);
  // Only cache successful resolutions; transient errors should not pin
  // bad state into the cache for the entire TTL.
  if (cache && result.kind === 'ok') {
    cache.set(name, chainId, result);
  }
  return result;
}
