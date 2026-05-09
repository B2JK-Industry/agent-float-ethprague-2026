import { describe, expect, it, vi } from 'vitest';

import { fetchOnchainTransferCounts } from '../../../src/sources/onchain/transferCounts.js';

const ADDR = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
const NOW = 1778198400; // 2026-05-09 00:00 UTC

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function alchemyBody(transferCount: number): unknown {
  return { result: { transfers: Array.from({ length: transferCount }, (_, i) => ({ hash: `0x${i}` })) } };
}

function etherscanBody(items: ReadonlyArray<{ timeStamp?: string }>): unknown {
  return { status: '1', result: items };
}

describe('fetchOnchainTransferCounts', () => {
  describe('configuration', () => {
    it('returns no_provider_configured when neither key is set', async () => {
      const result = await fetchOnchainTransferCounts(1, ADDR, { nowSeconds: NOW });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('no_provider_configured');
    });

    it('returns unsupported_chain when chainId not in {1, 11155111}', async () => {
      const fetchImpl = vi.fn(async () => jsonResponse(200, alchemyBody(0)));
      const result = await fetchOnchainTransferCounts(137, ADDR, {
        nowSeconds: NOW,
        alchemyApiKey: 'k',
        fetchImpl,
      });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('unsupported_chain');
    });
  });

  describe('alchemy backend', () => {
    // audit-round-7 P1 #14 (outbound-only) reshaped this test:
    // alchemy_getAssetTransfers can only filter by fromAddress OR
    // toAddress per call, so fetching bidirectional transfer counts
    // requires TWO RPCs per category. The fetcher now issues 4 RPCs
    // total (recent-out + recent-in + total-out + total-in) and sums
    // each pair. Without the inbound leg, every receiver-style contract
    // looked silent on-chain even when active.
    it('issues 4 POSTs (recent ± direction, total ± direction) and surfaces summed counts', async () => {
      let recentOut = 0, recentIn = 0, totalOut = 0, totalIn = 0;
      const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as { params?: ReadonlyArray<unknown> };
        const params = body.params?.[0] as
          | { fromBlock?: string; fromAddress?: string; toAddress?: string }
          | undefined;
        const isTotal = params?.fromBlock === '0x0';
        const isInbound = !!params?.toAddress;
        if (isTotal && isInbound) { totalIn += 1; return jsonResponse(200, alchemyBody(20)); }
        if (isTotal) { totalOut += 1; return jsonResponse(200, alchemyBody(50)); }
        if (isInbound) { recentIn += 1; return jsonResponse(200, alchemyBody(8)); }
        recentOut += 1;
        return jsonResponse(200, alchemyBody(12));
      });
      const result = await fetchOnchainTransferCounts(1, ADDR, {
        nowSeconds: NOW,
        alchemyApiKey: 'k',
        fetchImpl,
      });
      expect(recentOut).toBe(1);
      expect(recentIn).toBe(1);
      expect(totalOut).toBe(1);
      expect(totalIn).toBe(1);
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        // recent = outbound 12 + inbound 8 = 20.
        expect(result.value.transferCountRecent90d).toBe(20);
        // total = outbound 50 + inbound 20 = 70.
        expect(result.value.transferCountTotal).toBe(70);
        expect(result.value.provider).toBe('alchemy');
      }
    });

    it('cascades to etherscan when alchemy errors', async () => {
      const fetchImpl = vi.fn(async (url: string) => {
        if (url.includes('alchemy.com')) return jsonResponse(503, {});
        // etherscan
        return jsonResponse(200, etherscanBody([{ timeStamp: String(NOW - 3600) }]));
      });
      const result = await fetchOnchainTransferCounts(1, ADDR, {
        nowSeconds: NOW,
        alchemyApiKey: 'a',
        etherscanApiKey: 'e',
        fetchImpl,
      });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') expect(result.value.provider).toBe('etherscan');
    });

    it('honours provider order override (etherscan first)', async () => {
      let calledAlchemy = false;
      const fetchImpl = vi.fn(async (url: string) => {
        if (url.includes('alchemy.com')) {
          calledAlchemy = true;
          return jsonResponse(200, alchemyBody(99));
        }
        return jsonResponse(200, etherscanBody([{ timeStamp: String(NOW - 3600) }]));
      });
      const result = await fetchOnchainTransferCounts(1, ADDR, {
        nowSeconds: NOW,
        alchemyApiKey: 'a',
        etherscanApiKey: 'e',
        providerOrder: ['etherscan', 'alchemy'],
        fetchImpl,
      });
      expect(calledAlchemy).toBe(false);
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') expect(result.value.provider).toBe('etherscan');
    });

    it('returns rate_limited on 429 with no fallback', async () => {
      const fetchImpl = vi.fn(async () => jsonResponse(429, {}));
      const result = await fetchOnchainTransferCounts(1, ADDR, {
        nowSeconds: NOW,
        alchemyApiKey: 'k',
        fetchImpl,
      });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('rate_limited');
    });

    // audit-round-7 P1 #14 (nowBlock) regression: previously
    // `fromBlock = cutoffSec / 12` ≈ 148M dwarfed real mainnet head
    // ~22M, so Alchemy returned 0 transfers for every address. With a
    // real `nowBlock` injected, fromBlock = nowBlock - blocks-per-90d
    // and Alchemy actually sees the address's recent activity.
    it('uses nowBlock to derive fromBlock for recent window (audit-round-7 P1 #14)', async () => {
      let recentFromBlock: string | undefined;
      const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as { params?: ReadonlyArray<unknown> };
        const params = body.params?.[0] as { fromBlock?: string; toAddress?: string } | undefined;
        // First outbound recent call captures the fromBlock value.
        if (params?.fromBlock !== '0x0' && !params?.toAddress && recentFromBlock === undefined) {
          recentFromBlock = params?.fromBlock;
        }
        return jsonResponse(200, alchemyBody(0));
      });
      const NOW_BLOCK = 22_000_000n;
      // 90d / 12s ≈ 648_000 blocks.
      const expectedFromBlock = NOW_BLOCK - 648_000n;
      await fetchOnchainTransferCounts(1, ADDR, {
        nowSeconds: NOW,
        nowBlock: NOW_BLOCK,
        alchemyApiKey: 'k',
        fetchImpl,
      });
      expect(recentFromBlock).toBeDefined();
      // Must be derived from nowBlock, not from cutoffSec/12 (~148M).
      expect(BigInt(recentFromBlock as string)).toBe(expectedFromBlock);
      // Sanity: not the broken fabricated value.
      expect(BigInt(recentFromBlock as string)).toBeLessThan(NOW_BLOCK);
    });

    it('returns malformed_response when result.transfers is missing', async () => {
      const fetchImpl = vi.fn(async () => jsonResponse(200, { result: {} }));
      const result = await fetchOnchainTransferCounts(1, ADDR, {
        nowSeconds: NOW,
        alchemyApiKey: 'k',
        fetchImpl,
      });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('malformed_response');
    });
  });

  describe('etherscan backend', () => {
    it('counts only items within the 90-day window for recent count', async () => {
      const cutoff = NOW - 90 * 86400;
      const fetchImpl = vi.fn(async () => jsonResponse(200, etherscanBody([
        { timeStamp: String(cutoff + 100) },   // in window
        { timeStamp: String(cutoff + 1000) },  // in window
        { timeStamp: String(cutoff - 1000) },  // out of window
      ])));
      const result = await fetchOnchainTransferCounts(1, ADDR, {
        nowSeconds: NOW,
        etherscanApiKey: 'e',
        fetchImpl,
      });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.transferCountRecent90d).toBe(2);
        expect(result.value.transferCountTotal).toBe(3);
      }
    });

    // audit-round-7 P1 #14 (V1 vs V2) regression: Etherscan moved its
    // multichain endpoint to `/v2/api?chainid=...`. The previous base
    // URL was `/api` (v1, chain-specific subdomains, no chainid query).
    // Hybridising — v1 path with v2 chainid query — broke for sepolia
    // and produced inconsistent rate-limit and key handling. Verify
    // the default URL is the v2 path.
    it('uses Etherscan v2 multichain endpoint by default (audit-round-7 P1 #14)', async () => {
      let captured = '';
      const fetchImpl = vi.fn(async (url: string) => {
        captured = url;
        return jsonResponse(200, etherscanBody([]));
      });
      await fetchOnchainTransferCounts(1, ADDR, {
        nowSeconds: NOW,
        etherscanApiKey: 'e',
        fetchImpl,
      });
      expect(captured).toContain('/v2/api');
      expect(captured).toContain('chainid=1');
    });

    it('treats etherscan status:0 with "no transactions" message as zero count', async () => {
      const fetchImpl = vi.fn(async () => jsonResponse(200, { status: '0', result: 'No transactions found' }));
      const result = await fetchOnchainTransferCounts(1, ADDR, {
        nowSeconds: NOW,
        etherscanApiKey: 'e',
        fetchImpl,
      });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.transferCountRecent90d).toBe(0);
        expect(result.value.transferCountTotal).toBe(0);
      }
    });
  });

  describe('network errors', () => {
    it('surfaces network_error on fetch throw', async () => {
      const fetchImpl = vi.fn(async () => {
        throw new TypeError('econnreset');
      });
      const result = await fetchOnchainTransferCounts(1, ADDR, {
        nowSeconds: NOW,
        alchemyApiKey: 'k',
        fetchImpl,
      });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.reason).toBe('network_error');
    });
  });
});
