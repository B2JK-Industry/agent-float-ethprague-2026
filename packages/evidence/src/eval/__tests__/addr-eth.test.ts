import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import type { PublicClient } from 'viem';

import { addrEthEngine } from '../addr-eth.js';
import type { EngineContext, ResolvedRecord, SharedFetch } from '../types.js';

interface Fixture {
  record: ResolvedRecord;
  rpc: { nonce: number; balanceWei: string; reverseEnsName: string | null };
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

function ctx(f: Fixture, overrides: Partial<EngineContext> = {}): EngineContext {
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
      mainnet: {
        getEnsName: async () => null,
      } as unknown as PublicClient,
      sepolia: {
        getTransactionCount: async () => f.rpc.nonce,
        getBalance: async () => BigInt(f.rpc.balanceWei),
        getEnsName: async () => f.rpc.reverseEnsName,
      } as unknown as PublicClient,
    },
    fetch,
    cache: { get: () => undefined, set: () => {} },
    logger: { debug: () => {}, warn: () => {} },
    signal: new AbortController().signal,
    ...overrides,
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
      expect(r.signals.seniorityBreakdown).toHaveLength(4);
      expect(r.signals.relevanceBreakdown).toHaveLength(3);
    });
  }

  it('returns an empty result for missing or malformed addr records', async () => {
    const f = fixture('agent-kikiriki');
    const r = await addrEthEngine.evaluate({ ...f.record, raw: null }, ctx(f), addrEthEngine.defaultParams);
    expect(r.exists).toBe(false);
    expect(r.validity).toBe(0);
    expect(r.errors[0]).toContain('addr.eth');
  });

  it('upgrades trust to ceiling when reverse-record matches the ENS name', async () => {
    const f = fixture('letadlo');
    const matched: Fixture = {
      ...f,
      rpc: { ...f.rpc, reverseEnsName: f.record.ensName },
    };
    const r = await addrEthEngine.evaluate(matched.record, ctx(matched), addrEthEngine.defaultParams);
    expect(r.trust).toBe(addrEthEngine.defaultParams.trustCeiling);
    const reverseSignal = r.signals.seniorityBreakdown.find((s) => s.name === 'reverse_record_match');
    expect(reverseSignal?.value).toBe(1);
  });

  it('penalises sybil-shaped activity (many txs in few blocks)', async () => {
    const f = fixture('letadlo');
    const sybilTxs = Array.from({ length: 20 }, (_, i) => ({
      blockNumber: i < 18 ? '5502500' : '5502501',
      timeStamp: String(1778097562 + i),
      to: '0x0000000000000000000000000000000000000000',
      from: f.record.raw,
      value: '0',
      isError: '0',
    }));
    const sybilFixture: Fixture = {
      ...f,
      etherscan: { status: 200, body: { status: '1', message: 'OK', result: sybilTxs } },
    };
    const r = await addrEthEngine.evaluate(sybilFixture.record, ctx(sybilFixture), addrEthEngine.defaultParams);
    const sybil = r.signals.antiSignals.find((a) => a.name === 'sybil_block_concentration');
    expect(sybil?.penalty).toBeGreaterThan(0);
  });

  it('flags dormant-funded addresses (zero nonce, balance ≥ 1 ETH)', async () => {
    const f = fixture('letadlo');
    const dormant: Fixture = {
      ...f,
      rpc: { nonce: 0, balanceWei: '1500000000000000000', reverseEnsName: null },
    };
    const r = await addrEthEngine.evaluate(dormant.record, ctx(dormant), addrEthEngine.defaultParams);
    const flag = r.signals.antiSignals.find((a) => a.name === 'dormant_funded');
    expect(flag?.penalty).toBe(0.1);
  });

  it('falls back to nonce baseline when Etherscan is unreachable', async () => {
    const f = fixture('letadlo');
    const broken: Fixture = {
      ...f,
      etherscan: { status: 200, body: { status: '0', message: 'NOTOK', result: 'Missing/Invalid API Key' } },
    };
    const r = await addrEthEngine.evaluate(broken.record, ctx(broken), addrEthEngine.defaultParams);
    expect(r.confidence).toBe('partial');
    const fallback = r.signals.seniorityBreakdown.find(
      (s) => s.name === 'sepolia_outbound_nonce_fallback',
    );
    expect(fallback).toBeDefined();
  });
});
