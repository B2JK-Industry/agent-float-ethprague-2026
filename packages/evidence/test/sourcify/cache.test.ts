import { describe, expect, it, vi } from 'vitest';

import {
  SourcifyCache,
  fetchSourcifyMetadataCached,
  fetchSourcifyStatusCached,
} from '../../src/sourcify/cache.js';
import type { FetchLike, SourcifyMetadata, SourcifyStatus } from '../../src/sourcify/types.js';

const CHAIN_ID = 11155111;
const ADDRESS: `0x${string}` = '0x1111111111111111111111111111111111111111';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function makeFetchCounting(handler: () => Promise<Response>): { fetchImpl: FetchLike; calls: () => number } {
  let n = 0;
  const fn = vi.fn(async () => {
    n += 1;
    return handler();
  }) as unknown as FetchLike;
  return { fetchImpl: fn, calls: () => n };
}

describe('SourcifyCache', () => {
  it('keyFor lowercases the address and namespaces by endpoint+chainId', () => {
    expect(SourcifyCache.keyFor('status', CHAIN_ID, '0xABCDEF1234567890123456789012345678901234' as `0x${string}`)).toBe(
      `status:${CHAIN_ID}:0xabcdef1234567890123456789012345678901234`,
    );
    expect(SourcifyCache.keyFor('metadata', CHAIN_ID, ADDRESS)).toBe(
      `metadata:${CHAIN_ID}:${ADDRESS.toLowerCase()}`,
    );
  });

  it('verified responses use the long TTL; not_found uses the short TTL', () => {
    let now = 0;
    const cache = new SourcifyCache({
      verifiedTtlMs: 100_000,
      notFoundTtlMs: 5_000,
      clock: () => now,
    });
    const verified: SourcifyStatus = { chainId: CHAIN_ID, address: ADDRESS, match: 'exact_match' };
    const notFound: SourcifyStatus = { chainId: CHAIN_ID, address: ADDRESS, match: 'not_found' };

    cache.setStatus(CHAIN_ID, ADDRESS, verified);
    now = 50_000; // halfway through verified TTL
    expect(cache.getStatus(CHAIN_ID, ADDRESS)?.match).toBe('exact_match');
    now = 100_000; // exactly at verified TTL
    expect(cache.getStatus(CHAIN_ID, ADDRESS)).toBeUndefined();

    cache.setStatus(CHAIN_ID, ADDRESS, notFound);
    now = 100_000 + 4_999;
    expect(cache.getStatus(CHAIN_ID, ADDRESS)?.match).toBe('not_found');
    now = 100_000 + 5_000;
    expect(cache.getStatus(CHAIN_ID, ADDRESS)).toBeUndefined();
  });

  it('namespaces status and metadata stores separately', () => {
    const cache = new SourcifyCache();
    const status: SourcifyStatus = { chainId: CHAIN_ID, address: ADDRESS, match: 'exact_match' };
    cache.setStatus(CHAIN_ID, ADDRESS, status);
    expect(cache.getStatus(CHAIN_ID, ADDRESS)).toEqual(status);
    expect(cache.getMetadata(CHAIN_ID, ADDRESS)).toBeUndefined();
  });

  it('respects maxEntries via oldest-first eviction in each store', () => {
    const cache = new SourcifyCache({ maxEntries: 2 });
    const mk = (addr: string): SourcifyStatus => ({
      chainId: CHAIN_ID,
      address: addr as `0x${string}`,
      match: 'exact_match',
    });
    const a = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
    const b = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`;
    const c = '0xcccccccccccccccccccccccccccccccccccccccc' as `0x${string}`;
    cache.setStatus(CHAIN_ID, a, mk(a));
    cache.setStatus(CHAIN_ID, b, mk(b));
    cache.setStatus(CHAIN_ID, c, mk(c));
    expect(cache.getStatus(CHAIN_ID, a)).toBeUndefined();
    expect(cache.getStatus(CHAIN_ID, b)?.match).toBe('exact_match');
  });

  it('invalidate clears both endpoints for the same address', () => {
    const cache = new SourcifyCache();
    cache.setStatus(CHAIN_ID, ADDRESS, { chainId: CHAIN_ID, address: ADDRESS, match: 'match' });
    cache.setMetadata(CHAIN_ID, ADDRESS, {
      chainId: CHAIN_ID,
      address: ADDRESS,
      match: 'match',
      abi: null,
      compilerSettings: null,
      sources: null,
      storageLayout: null,
    });
    cache.invalidate(CHAIN_ID, ADDRESS);
    expect(cache.getStatus(CHAIN_ID, ADDRESS)).toBeUndefined();
    expect(cache.getMetadata(CHAIN_ID, ADDRESS)).toBeUndefined();
  });
});

describe('fetchSourcifyStatusCached', () => {
  it('hits the network on a miss and caches the result', async () => {
    const { fetchImpl, calls } = makeFetchCounting(async () => jsonResponse({ match: 'exact_match' }));
    const cache = new SourcifyCache();
    const a = await fetchSourcifyStatusCached(CHAIN_ID, ADDRESS, { fetchImpl, cache });
    const b = await fetchSourcifyStatusCached(CHAIN_ID, ADDRESS, { fetchImpl, cache });
    expect(a.kind).toBe('ok');
    expect(b.kind).toBe('ok');
    expect(calls()).toBe(1); // second call short-circuits
  });

  it('does not cache error results', async () => {
    const { fetchImpl, calls } = makeFetchCounting(async () => new Response('', { status: 503 }));
    const cache = new SourcifyCache();
    await fetchSourcifyStatusCached(CHAIN_ID, ADDRESS, { fetchImpl, cache });
    await fetchSourcifyStatusCached(CHAIN_ID, ADDRESS, { fetchImpl, cache });
    expect(calls()).toBe(2);
  });

  it('not_found cached entries expire faster than verified ones', async () => {
    let now = 0;
    const cache = new SourcifyCache({ verifiedTtlMs: 100, notFoundTtlMs: 10, clock: () => now });
    const { fetchImpl, calls } = makeFetchCounting(async () => new Response('not found', { status: 404 }));
    await fetchSourcifyStatusCached(CHAIN_ID, ADDRESS, { fetchImpl, cache });
    now = 5;
    await fetchSourcifyStatusCached(CHAIN_ID, ADDRESS, { fetchImpl, cache });
    expect(calls()).toBe(1); // within not_found TTL
    now = 11; // expired
    await fetchSourcifyStatusCached(CHAIN_ID, ADDRESS, { fetchImpl, cache });
    expect(calls()).toBe(2);
  });
});

describe('fetchSourcifyMetadataCached', () => {
  it('hits the network on a miss and caches the result', async () => {
    const body = {
      match: 'exact_match',
      abi: [],
      compilerSettings: {},
      sources: {},
      storageLayout: null,
    };
    const { fetchImpl, calls } = makeFetchCounting(async () => jsonResponse(body));
    const cache = new SourcifyCache();
    await fetchSourcifyMetadataCached(CHAIN_ID, ADDRESS, { fetchImpl, cache });
    await fetchSourcifyMetadataCached(CHAIN_ID, ADDRESS, { fetchImpl, cache });
    expect(calls()).toBe(1);
  });

  it('uses the metadata-specific store; status calls do not satisfy metadata calls', async () => {
    const cache = new SourcifyCache();
    const status: SourcifyStatus = { chainId: CHAIN_ID, address: ADDRESS, match: 'exact_match' };
    cache.setStatus(CHAIN_ID, ADDRESS, status);
    const { fetchImpl, calls } = makeFetchCounting(async () =>
      jsonResponse({ match: 'exact_match', abi: [], compilerSettings: {}, sources: {}, storageLayout: null }),
    );
    await fetchSourcifyMetadataCached(CHAIN_ID, ADDRESS, { fetchImpl, cache });
    expect(calls()).toBe(1);
  });

  it('runs without a cache (cache option omitted)', async () => {
    const { fetchImpl, calls } = makeFetchCounting(async () =>
      jsonResponse({ match: 'exact_match', abi: [], compilerSettings: {}, sources: {}, storageLayout: null }),
    );
    const r: Awaited<ReturnType<typeof fetchSourcifyMetadataCached>> =
      await fetchSourcifyMetadataCached(CHAIN_ID, ADDRESS, { fetchImpl });
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      // Reference an imported metadata type to keep the import used.
      const v: SourcifyMetadata = r.value;
      expect(v.match).toBe('exact_match');
    }
    expect(calls()).toBe(1);
  });
});
