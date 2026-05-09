import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PublicClient } from 'viem';

import { clearRegistry, register } from '../registry.js';
import { runBench } from '../runner.js';
import type {
  EngineContext,
  EngineParams,
  EvaluatorResult,
  RecordEngine,
  RecordKey,
  ResolvedRecord,
  SharedFetch,
} from '../types.js';

const params: EngineParams = {
  weight: 1,
  trustFloor: 0,
  trustCeiling: 1,
  timeoutMs: 1000,
  thresholds: {},
};

const stubFetch: SharedFetch = async () => ({
  ok: true,
  status: 200,
  headers: new Headers(),
  text: async () => '',
  async json<T = unknown>(): Promise<T> {
    return {} as T;
  },
});

function context(): Omit<EngineContext, 'signal' | 'peerResults'> {
  const cache = new Map<string, unknown>();
  return {
    rpc: { mainnet: {} as unknown as PublicClient, sepolia: {} as unknown as PublicClient },
    fetch: stubFetch,
    cache: {
      get<T>(k: string): T | undefined {
        return cache.get(k) as T | undefined;
      },
      set<T>(k: string, v: T): void {
        cache.set(k, v);
      },
    },
    logger: { debug: () => {}, warn: () => {} },
  };
}

function record(key: RecordKey): ResolvedRecord {
  return { key, ensName: 'x.eth', raw: 'v', resolvedAtBlock: 1, resolvedAtMs: Date.now() };
}

function delayedResult(key: RecordKey, ms: number, p: EngineParams): RecordEngine {
  return {
    key,
    defaultParams: p,
    async evaluate(_r, _c, pp) {
      await new Promise((res) => setTimeout(res, ms));
      const out: EvaluatorResult = {
        recordKey: key,
        exists: true,
        validity: 1,
        liveness: 1,
        seniority: 0.5,
        relevance: 0.5,
        trust: 0.7,
        weight: pp.weight,
        signals: { seniorityBreakdown: [], relevanceBreakdown: [], antiSignals: [] },
        evidence: [],
        confidence: 'complete',
        durationMs: ms,
        cacheHit: false,
        errors: [],
      };
      return out;
    },
  };
}

beforeEach(() => clearRegistry());
afterEach(() => clearRegistry());

describe('runBench — hard deadline enforcement', () => {
  it('returns within deadline budget; slow engine yields a degraded result', async () => {
    register(delayedResult('addr.eth', 50, params));
    register(delayedResult('com.github', 80, params));
    register(delayedResult('description', 200, params));

    const records = new Map<RecordKey, ResolvedRecord>([
      ['addr.eth', record('addr.eth')],
      ['com.github', record('com.github')],
      ['description', record('description')],
    ]);
    const paramsMap = new Map<RecordKey, EngineParams>([
      ['addr.eth', params],
      ['com.github', params],
      ['description', params],
    ]);

    const start = Date.now();
    const out = await runBench({
      ensName: 'x.eth',
      records,
      params: paramsMap,
      context: context(),
      hardDeadlineMs: 100,
    });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThanOrEqual(180);

    const fast = out.results.get('addr.eth');
    expect(fast?.confidence).toBe('complete');
    expect(fast?.errors).toEqual([]);

    const med = out.results.get('com.github');
    expect(med?.confidence).toBe('complete');
    expect(med?.errors).toEqual([]);

    const slow = out.results.get('description');
    expect(slow?.confidence).toBe('degraded');
    expect(slow?.errors).toEqual(['timeout']);

    expect(out.status === 'deadline-reached' || out.status === 'partial').toBe(true);
  });

  it('honours per-engine timeoutMs even when it is tighter than hardDeadlineMs', async () => {
    register(delayedResult('addr.eth', 100, { ...params, timeoutMs: 30 }));

    const records = new Map<RecordKey, ResolvedRecord>([['addr.eth', record('addr.eth')]]);
    const paramsMap = new Map<RecordKey, EngineParams>([
      ['addr.eth', { ...params, timeoutMs: 30 }],
    ]);

    const out = await runBench({
      ensName: 'x.eth',
      records,
      params: paramsMap,
      context: context(),
      hardDeadlineMs: 1000,
    });

    const r = out.results.get('addr.eth');
    expect(r?.confidence).toBe('degraded');
    expect(r?.errors).toEqual(['timeout']);
  });

  it('streams onResult synchronously per engine completion', async () => {
    register(delayedResult('addr.eth', 10, params));
    register(delayedResult('com.github', 30, params));

    const order: RecordKey[] = [];
    const records = new Map<RecordKey, ResolvedRecord>([
      ['addr.eth', record('addr.eth')],
      ['com.github', record('com.github')],
    ]);
    const paramsMap = new Map<RecordKey, EngineParams>([
      ['addr.eth', params],
      ['com.github', params],
    ]);

    await runBench({
      ensName: 'x.eth',
      records,
      params: paramsMap,
      context: context(),
      hardDeadlineMs: 500,
      onResult: (r) => order.push(r.recordKey),
    });

    expect(order).toEqual(['addr.eth', 'com.github']);
  });
});
