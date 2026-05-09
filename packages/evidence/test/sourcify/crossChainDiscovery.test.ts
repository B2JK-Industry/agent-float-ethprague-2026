import { describe, expect, it, vi } from 'vitest';

import type { SubjectSourcifyEntry } from '@upgrade-siren/shared';

import { discoverCrossChainPresence } from '../../src/sourcify/crossChainDiscovery.js';

const ADDR_A = '0x1111111111111111111111111111111111111111' as const;
const ADDR_A_CHECKSUM = '0x1111111111111111111111111111111111111111' as const;
const ADDR_B = '0x2222222222222222222222222222222222222222' as const;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('discoverCrossChainPresence', () => {
  it('returns empty result for empty inputs', async () => {
    const result = await discoverCrossChainPresence([]);
    expect(result.entries).toEqual([]);
    expect(result.failures).toEqual([]);
  });

  it('issues one fetch per unique address (groups multi-chain manifest entries)', async () => {
    const inputs: SubjectSourcifyEntry[] = [
      { chainId: 1, address: ADDR_A, label: 'Vault mainnet' },
      { chainId: 11155111, address: ADDR_A, label: 'Vault sepolia' },
      { chainId: 1, address: ADDR_B, label: 'Token mainnet' },
    ];
    const fetchImpl = vi.fn(async () => jsonResponse(200, []));
    await discoverCrossChainPresence(inputs, { fetchImpl });
    // 2 unique addresses → 2 fetches
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('excludes chains already declared in the manifest from `discovered`', async () => {
    const inputs: SubjectSourcifyEntry[] = [
      { chainId: 1, address: ADDR_A, label: 'mainnet' },
      { chainId: 11155111, address: ADDR_A, label: 'sepolia' },
    ];
    // Sourcify reports 3 chains for ADDR_A — the manifest already declares 2.
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, [
        { chainId: 1, address: ADDR_A_CHECKSUM, match: 'exact_match' },
        { chainId: 11155111, address: ADDR_A_CHECKSUM, match: 'match' },
        { chainId: 137, address: ADDR_A_CHECKSUM, match: 'exact_match' },
      ]),
    );
    const result = await discoverCrossChainPresence(inputs, { fetchImpl });
    expect(result.entries).toHaveLength(1);
    const entry = result.entries[0]!;
    expect(entry.declaredChainIds).toEqual([1, 11155111]);
    expect(entry.discovered).toHaveLength(1);
    expect(entry.discovered[0]?.chainId).toBe(137);
  });

  it('does NOT exclude entries whose address differs from the source (Sourcify implementation pointers)', async () => {
    const inputs: SubjectSourcifyEntry[] = [
      { chainId: 1, address: ADDR_A, label: 'proxy' },
    ];
    // Sourcify all-chains can return entries for sibling addresses (e.g. an
    // implementation pointer). Those should be preserved in `discovered`
    // even when the chainId matches the manifest.
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, [
        { chainId: 1, address: ADDR_A, match: 'exact_match' },
        { chainId: 1, address: ADDR_B, match: 'exact_match' },
      ]),
    );
    const result = await discoverCrossChainPresence(inputs, { fetchImpl });
    const entry = result.entries[0]!;
    // Same chainId + same address → excluded (already declared).
    // Same chainId + different address → kept (sibling discovery).
    expect(entry.discovered).toHaveLength(1);
    expect(entry.discovered[0]?.address).toBe(ADDR_B);
  });

  it('records non-fatal per-address failures in `failures`', async () => {
    const inputs: SubjectSourcifyEntry[] = [
      { chainId: 1, address: ADDR_A, label: 'a' },
      { chainId: 1, address: ADDR_B, label: 'b' },
    ];
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes(ADDR_A)) return jsonResponse(429, {});
      return jsonResponse(200, [{ chainId: 137, address: ADDR_B, match: 'exact_match' }]);
    });
    const result = await discoverCrossChainPresence(inputs, { fetchImpl });
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]?.sourceAddress.toLowerCase()).toBe(ADDR_A.toLowerCase());
    expect(result.failures[0]?.reason).toBe('rate_limited');
    // ADDR_A still gets an entry with empty discovered (drawer can render
    // it as "unknown — try again").
    expect(result.entries.find((e) => e.sourceAddress === ADDR_A)?.discovered).toEqual([]);
    expect(result.entries.find((e) => e.sourceAddress === ADDR_B)?.discovered).toHaveLength(1);
  });

  it('honours custom concurrency cap', async () => {
    const inputs: SubjectSourcifyEntry[] = Array.from({ length: 20 }, (_, i) => ({
      chainId: 1,
      address: `0x${i.toString(16).padStart(40, '0')}` as `0x${string}`,
      label: `r${i}`,
    }));
    let inFlight = 0;
    let peakInFlight = 0;
    const fetchImpl = vi.fn(async () => {
      inFlight += 1;
      peakInFlight = Math.max(peakInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 1));
      inFlight -= 1;
      return jsonResponse(200, []);
    });
    await discoverCrossChainPresence(inputs, { fetchImpl, concurrency: 3 });
    expect(peakInFlight).toBeLessThanOrEqual(3);
    expect(fetchImpl).toHaveBeenCalledTimes(20);
  });

  it('declaredChainIds is sorted ascending', async () => {
    const inputs: SubjectSourcifyEntry[] = [
      { chainId: 11155111, address: ADDR_A, label: 's' },
      { chainId: 1, address: ADDR_A, label: 'm' },
      { chainId: 137, address: ADDR_A, label: 'p' },
    ];
    const fetchImpl = vi.fn(async () => jsonResponse(200, []));
    const result = await discoverCrossChainPresence(inputs, { fetchImpl });
    expect(result.entries[0]?.declaredChainIds).toEqual([1, 137, 11155111]);
  });

  it('returns one entry per unique address (de-dup by address)', async () => {
    const inputs: SubjectSourcifyEntry[] = [
      { chainId: 1, address: ADDR_A, label: 'a-mainnet' },
      { chainId: 11155111, address: ADDR_A, label: 'a-sepolia' },
      { chainId: 137, address: ADDR_A, label: 'a-polygon' },
    ];
    const fetchImpl = vi.fn(async () => jsonResponse(200, []));
    const result = await discoverCrossChainPresence(inputs, { fetchImpl });
    expect(result.entries).toHaveLength(1);
  });
});
