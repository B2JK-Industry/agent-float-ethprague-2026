import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import type { PublicClient } from 'viem';

import { addrEthEngine } from '../addr-eth.js';
import type { EngineContext, ResolvedRecord, SharedFetch } from '../types.js';

interface Fixture {
  record: ResolvedRecord;
  rpc: { nonce: number; balanceWei: string };
  etherscan: { status: number; body: unknown };
  expected: {
    seniority: [number, number];
    relevance: [number, number];
    trust: number;
  };
}

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string): Fixture =>
  JSON.parse(readFileSync(resolve(HERE, 'fixtures/addr-eth', `${name}.json`), 'utf8')) as Fixture;

function ctx(f: Fixture): EngineContext {
  const fetch: SharedFetch = async () => ({
    ok: f.etherscan.status >= 200 && f.etherscan.status < 300,
    status: f.etherscan.status,
    headers: new Headers(),
    text: async () => JSON.stringify(f.etherscan.body),
    async json<T = unknown>(): Promise<T> {
      return f.etherscan.body as T;
    },
  });
  return {
    rpc: {
      mainnet: {} as PublicClient,
      sepolia: {
        getTransactionCount: async () => f.rpc.nonce,
        getBalance: async () => BigInt(f.rpc.balanceWei),
      } as unknown as PublicClient,
    },
    fetch,
    cache: { get: () => undefined, set: () => {} },
    logger: { debug: () => {}, warn: () => {} },
    signal: new AbortController().signal,
  };
}

describe('addr.eth evaluator', () => {
  for (const name of ['agent-kikiriki', 'letadlo'] as const) {
    it(`calibrates ${name}.eth`, async () => {
      const f = fixture(name);
      const r = await addrEthEngine.evaluate(f.record, ctx(f), addrEthEngine.defaultParams);
      expect(r.seniority).toBeGreaterThanOrEqual(f.expected.seniority[0]);
      expect(r.seniority).toBeLessThanOrEqual(f.expected.seniority[1]);
      expect(r.relevance).toBeGreaterThanOrEqual(f.expected.relevance[0]);
      expect(r.relevance).toBeLessThanOrEqual(f.expected.relevance[1]);
      expect(r.trust).toBe(f.expected.trust);
      expect(r.exists).toBe(true);
      expect(r.liveness).toBe(1);
    });
  }

  it('returns an empty result for missing or malformed addr records', async () => {
    const f = fixture('agent-kikiriki');
    const r = await addrEthEngine.evaluate({ ...f.record, raw: null }, ctx(f), addrEthEngine.defaultParams);
    expect(r.exists).toBe(false);
    expect(r.validity).toBe(0);
    expect(r.errors[0]).toContain('addr.eth');
  });
});
