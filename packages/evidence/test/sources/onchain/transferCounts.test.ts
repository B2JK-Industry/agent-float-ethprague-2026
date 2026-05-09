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
    it('issues two POSTs (recent + total) and surfaces both counts', async () => {
      let recentCalled = false;
      let totalCalled = false;
      const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as { params?: ReadonlyArray<unknown> };
        const params = body.params?.[0] as { fromBlock?: string } | undefined;
        if (params?.fromBlock === '0x0') {
          totalCalled = true;
          return jsonResponse(200, alchemyBody(50));
        }
        recentCalled = true;
        return jsonResponse(200, alchemyBody(12));
      });
      const result = await fetchOnchainTransferCounts(1, ADDR, {
        nowSeconds: NOW,
        alchemyApiKey: 'k',
        fetchImpl,
      });
      expect(recentCalled).toBe(true);
      expect(totalCalled).toBe(true);
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.transferCountRecent90d).toBe(12);
        expect(result.value.transferCountTotal).toBe(50);
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
