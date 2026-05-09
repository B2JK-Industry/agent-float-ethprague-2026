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

    // Brief target: ≤130ms wall time for hardDeadlineMs=100. We allow +20ms slack
    // for vitest worker scheduling jitter on CI.
    expect(elapsed).toBeLessThanOrEqual(150);

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

  it('absorbs engine rejection that fires AFTER the timeout race has settled', async () => {
    let lateReject: ((err: Error) => void) | null = null;
    const lateRejecter: RecordEngine = {
      key: 'addr.eth',
      defaultParams: params,
      evaluate() {
        return new Promise((_, reject) => {
          lateReject = reject;
        });
      },
    };
    register(lateRejecter);

    const records = new Map<RecordKey, ResolvedRecord>([['addr.eth', record('addr.eth')]]);
    const paramsMap = new Map<RecordKey, EngineParams>([
      ['addr.eth', { ...params, timeoutMs: 30 }],
    ]);

    const out = await runBench({
      ensName: 'x.eth',
      records,
      params: paramsMap,
      context: context(),
      hardDeadlineMs: 200,
    });

    expect(out.results.get('addr.eth')?.confidence).toBe('degraded');
    expect(out.results.get('addr.eth')?.errors).toEqual(['timeout']);

    // Now fire the engine's rejection AFTER runner returned. Without the silent .catch in
    // runner.ts this would raise an unhandledRejection event and (in strict Node) kill the process.
    const unhandled: unknown[] = [];
    const handler = (err: unknown): void => {
      unhandled.push(err);
    };
    process.on('unhandledRejection', handler);

    expect(lateReject).not.toBeNull();
    lateReject!(new Error('post-timeout-throw'));
    // Yield several microtasks so any unhandled rejection has a chance to surface.
    await new Promise((r) => setTimeout(r, 50));

    process.removeListener('unhandledRejection', handler);
    expect(unhandled).toEqual([]);
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
