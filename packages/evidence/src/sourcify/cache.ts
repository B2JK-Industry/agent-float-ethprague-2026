// Sourcify response cache. Wraps fetchSourcifyStatus and fetchSourcifyMetadata
// with TTL-keyed in-memory storage. Per US-032 default TTL: 1 hour for
// verified responses (which Sourcify retains long-term), 30 seconds for
// not_found (which may flip to verified at any time as developers verify
// freshly deployed contracts).

import type { Address } from '@upgrade-siren/shared';

import { fetchSourcifyMetadata } from './metadata.js';
import { fetchSourcifyStatus } from './status.js';
import type {
  FetchLike,
  Result,
  SourcifyError,
  SourcifyMetadata,
  SourcifyStatus,
} from './types.js';

export interface SourcifyCacheOptions {
  readonly verifiedTtlMs?: number;
  readonly notFoundTtlMs?: number;
  readonly clock?: () => number;
  readonly maxEntries?: number;
}

interface CacheEntry<T> {
  readonly value: T;
  readonly expiresAt: number;
}

const DEFAULT_VERIFIED_TTL_MS = 60 * 60 * 1000;
const DEFAULT_NOT_FOUND_TTL_MS = 30 * 1000;
const DEFAULT_MAX_ENTRIES = 1000;

export type SourcifyEndpoint = 'status' | 'metadata';

export class SourcifyCache {
  private readonly statusStore = new Map<string, CacheEntry<SourcifyStatus>>();
  private readonly metadataStore = new Map<string, CacheEntry<SourcifyMetadata>>();
  private readonly verifiedTtlMs: number;
  private readonly notFoundTtlMs: number;
  private readonly clock: () => number;
  private readonly maxEntries: number;

  constructor(options: SourcifyCacheOptions = {}) {
    this.verifiedTtlMs = options.verifiedTtlMs ?? DEFAULT_VERIFIED_TTL_MS;
    this.notFoundTtlMs = options.notFoundTtlMs ?? DEFAULT_NOT_FOUND_TTL_MS;
    this.clock = options.clock ?? Date.now;
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  }

  // Codex #47: include the Sourcify base URL in cache identity. Without this,
  // a single SourcifyCache instance reused across a local fixture/proxy
  // server and live Sourcify (or a staging vs prod backend) can hand back
  // the wrong backend's response. Default empty string preserves caller
  // intent ("the default Sourcify endpoint is one identity"); explicit
  // overrides become their own identities.
  static keyFor(
    endpoint: SourcifyEndpoint,
    chainId: number,
    address: Address,
    baseUrl: string = '',
  ): string {
    return `${endpoint}:${baseUrl}:${chainId}:${address.toLowerCase()}`;
  }

  private ttlFor(matchLevel: 'exact_match' | 'match' | 'not_found'): number {
    return matchLevel === 'not_found' ? this.notFoundTtlMs : this.verifiedTtlMs;
  }

  private prune<T>(store: Map<string, CacheEntry<T>>): void {
    if (store.size < this.maxEntries) return;
    const firstKey = store.keys().next().value;
    if (firstKey !== undefined) store.delete(firstKey);
  }

  getStatus(chainId: number, address: Address, baseUrl: string = ''): SourcifyStatus | undefined {
    const key = SourcifyCache.keyFor('status', chainId, address, baseUrl);
    const entry = this.statusStore.get(key);
    if (!entry) return undefined;
    if (this.clock() >= entry.expiresAt) {
      this.statusStore.delete(key);
      return undefined;
    }
    return entry.value;
  }

  setStatus(chainId: number, address: Address, value: SourcifyStatus, baseUrl: string = ''): void {
    this.prune(this.statusStore);
    const key = SourcifyCache.keyFor('status', chainId, address, baseUrl);
    this.statusStore.set(key, {
      value,
      expiresAt: this.clock() + this.ttlFor(value.match),
    });
  }

  getMetadata(chainId: number, address: Address, baseUrl: string = ''): SourcifyMetadata | undefined {
    const key = SourcifyCache.keyFor('metadata', chainId, address, baseUrl);
    const entry = this.metadataStore.get(key);
    if (!entry) return undefined;
    if (this.clock() >= entry.expiresAt) {
      this.metadataStore.delete(key);
      return undefined;
    }
    return entry.value;
  }

  setMetadata(chainId: number, address: Address, value: SourcifyMetadata, baseUrl: string = ''): void {
    this.prune(this.metadataStore);
    const key = SourcifyCache.keyFor('metadata', chainId, address, baseUrl);
    this.metadataStore.set(key, {
      value,
      expiresAt: this.clock() + this.ttlFor(value.match),
    });
  }

  invalidate(chainId: number, address: Address, baseUrl: string = ''): void {
    this.statusStore.delete(SourcifyCache.keyFor('status', chainId, address, baseUrl));
    this.metadataStore.delete(SourcifyCache.keyFor('metadata', chainId, address, baseUrl));
  }

  clear(): void {
    this.statusStore.clear();
    this.metadataStore.clear();
  }

  size(): { status: number; metadata: number } {
    return { status: this.statusStore.size, metadata: this.metadataStore.size };
  }
}

export interface CachedFetchOptions {
  readonly cache?: SourcifyCache;
  readonly fetchImpl?: FetchLike;
  readonly baseUrl?: string;
}

export async function fetchSourcifyStatusCached(
  chainId: number,
  address: Address,
  options: CachedFetchOptions = {},
): Promise<Result<SourcifyStatus, SourcifyError>> {
  const cache = options.cache;
  const baseUrl = options.baseUrl ?? '';
  if (cache) {
    const hit = cache.getStatus(chainId, address, baseUrl);
    if (hit !== undefined) return { kind: 'ok', value: hit };
  }
  const fetchOptions = {
    ...(options.fetchImpl !== undefined ? { fetchImpl: options.fetchImpl } : {}),
    ...(options.baseUrl !== undefined ? { baseUrl: options.baseUrl } : {}),
  };
  const result = await fetchSourcifyStatus(chainId, address, fetchOptions);
  if (cache && result.kind === 'ok') {
    cache.setStatus(chainId, address, result.value, baseUrl);
  }
  return result;
}

export async function fetchSourcifyMetadataCached(
  chainId: number,
  address: Address,
  options: CachedFetchOptions = {},
): Promise<Result<SourcifyMetadata, SourcifyError>> {
  const cache = options.cache;
  const baseUrl = options.baseUrl ?? '';
  if (cache) {
    const hit = cache.getMetadata(chainId, address, baseUrl);
    if (hit !== undefined) return { kind: 'ok', value: hit };
  }
  const fetchOptions = {
    ...(options.fetchImpl !== undefined ? { fetchImpl: options.fetchImpl } : {}),
    ...(options.baseUrl !== undefined ? { baseUrl: options.baseUrl } : {}),
  };
  const result = await fetchSourcifyMetadata(chainId, address, fetchOptions);
  if (cache && result.kind === 'ok') {
    cache.setMetadata(chainId, address, result.value, baseUrl);
  }
  return result;
}
