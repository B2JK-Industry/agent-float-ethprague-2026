import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicClient } from 'viem';

import { clearRegistry, register } from '../registry.js';
import { runBench } from '../runner.js';
import {
  EMPTY_RESULT,
  type EngineContext,
  type EngineParams,
  type EvaluatorResult,
  type RecordEngine,
  type RecordKey,
  type ResolvedRecord,
  type SharedFetch,
} from '../types.js';

const baseParams: EngineParams = {
  weight: 1,
  trustFloor: 0,
  trustCeiling: 1,
  timeoutMs: 1000,
  thresholds: {},
};

function makeRecord(key: RecordKey, ensName = 'foo.eth'): ResolvedRecord {
  return { key, ensName, raw: 'value', resolvedAtBlock: 1, resolvedAtMs: Date.now() };
}

const stubFetch: SharedFetch = async () => ({
  ok: true,
  status: 200,
  headers: new Headers(),
  text: async () => '',
  async json<T = unknown>(): Promise<T> {
    return {} as T;
  },
});

function makeContext(): Omit<EngineContext, 'signal' | 'peerResults'> {
  const cache = new Map<string, unknown>();
  return {
    rpc: { mainnet: {} as unknown as PublicClient, sepolia: {} as unknown as PublicClient },
    fetch: stubFetch,
    cache: {
      get<T>(key: string): T | undefined {
        return cache.get(key) as T | undefined;
      },
      set<T>(key: string, value: T): void {
        cache.set(key, value);
      },
    },
    logger: { debug: () => {}, warn: () => {} },
  };
}

function successResult(
  key: RecordKey,
  params: EngineParams,
  confidence: EvaluatorResult['confidence'] = 'complete',
): EvaluatorResult {
  return {
    recordKey: key,
    exists: true,
    validity: 1,
    liveness: 1,
    seniority: 0.6,
    relevance: 0.5,
    trust: 0.8,
    weight: params.weight,
    signals: { seniorityBreakdown: [], relevanceBreakdown: [], antiSignals: [] },
    evidence: [{ label: 'mock', value: 'mock' }],
    confidence,
    durationMs: 5,
    cacheHit: false,
    errors: [],
  };
}

beforeEach(() => clearRegistry());
afterEach(() => clearRegistry());

describe('runBench — contract aggregation', () => {
  it('aggregates complete, partial, and timeout engines into a single result map', async () => {
    const completeEngine: RecordEngine = {
      key: 'addr.eth',
      defaultParams: baseParams,
      async evaluate(_record, _ctx, params) {
        return successResult('addr.eth', params, 'complete');
      },
    };

    const partialEngine: RecordEngine = {
      key: 'com.github',
      defaultParams: baseParams,
      async evaluate(_record, _ctx, params) {
        return { ...successResult('com.github', params, 'partial'), liveness: 0 };
      },
    };

    const timeoutEngine: RecordEngine = {
      key: 'description',
      defaultParams: { ...baseParams, timeoutMs: 30 },
      async evaluate(_record, _ctx, params) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return successResult('description', params);
      },
    };

    register(completeEngine);
    register(partialEngine);
    register(timeoutEngine);

    const onResult = vi.fn();
    const records = new Map<RecordKey, ResolvedRecord>([
      ['addr.eth', makeRecord('addr.eth')],
      ['com.github', makeRecord('com.github')],
      ['description', makeRecord('description')],
    ]);
    const params = new Map<RecordKey, EngineParams>([
      ['addr.eth', baseParams],
      ['com.github', baseParams],
      ['description', { ...baseParams, timeoutMs: 30 }],
    ]);

    const out = await runBench({
      ensName: 'foo.eth',
      records,
      params,
      context: makeContext(),
      onResult,
      hardDeadlineMs: 1000,
    });

    expect(out.results.size).toBe(3);

    const addr = out.results.get('addr.eth');
    expect(addr?.confidence).toBe('complete');
    expect(addr?.errors).toEqual([]);

    const gh = out.results.get('com.github');
    expect(gh?.confidence).toBe('partial');
    expect(gh?.liveness).toBe(0);

    const desc = out.results.get('description');
    expect(desc?.confidence).toBe('degraded');
    expect(desc?.errors).toEqual(['timeout']);

    expect(onResult).toHaveBeenCalledTimes(3);

    expect(out.status).toBe('partial');
    expect(out.startedAtMs).toBeLessThanOrEqual(out.finishedAtMs);
  });

  it('records error result when an engine throws', async () => {
    const throwingEngine: RecordEngine = {
      key: 'url',
      defaultParams: baseParams,
      async evaluate() {
        throw new Error('boom');
      },
    };
    register(throwingEngine);

    const records = new Map<RecordKey, ResolvedRecord>([['url', makeRecord('url')]]);
    const params = new Map<RecordKey, EngineParams>([['url', baseParams]]);

    const out = await runBench({
      ensName: 'foo.eth',
      records,
      params,
      context: makeContext(),
      hardDeadlineMs: 500,
    });

    const r = out.results.get('url');
    expect(r).toBeDefined();
    expect(r?.errors).toEqual(['boom']);
    expect(r?.exists).toBe(false);
    expect(out.status).toBe('partial');
  });

  it('marks status complete when every engine returns clean', async () => {
    const cleanEngine: RecordEngine = {
      key: 'addr.eth',
      defaultParams: baseParams,
      async evaluate(_r, _c, p) {
        return successResult('addr.eth', p);
      },
    };
    register(cleanEngine);

    const records = new Map<RecordKey, ResolvedRecord>([['addr.eth', makeRecord('addr.eth')]]);
    const params = new Map<RecordKey, EngineParams>([['addr.eth', baseParams]]);

    const out = await runBench({
      ensName: 'foo.eth',
      records,
      params,
      context: makeContext(),
      hardDeadlineMs: 500,
    });

    expect(out.status).toBe('complete');
    expect(out.results.get('addr.eth')?.errors).toEqual([]);
  });

  it('handles records with no registered engine', async () => {
    const records = new Map<RecordKey, ResolvedRecord>([['url', makeRecord('url')]]);
    const params = new Map<RecordKey, EngineParams>([['url', baseParams]]);

    const out = await runBench({
      ensName: 'foo.eth',
      records,
      params,
      context: makeContext(),
      hardDeadlineMs: 200,
    });

    const r = out.results.get('url');
    expect(r?.errors[0]).toContain('no engine registered');
    expect(r?.exists).toBe(false);
  });

  it('exposes the EMPTY_RESULT shape via type contract', () => {
    const empty = EMPTY_RESULT('addr.eth', 0.5, 12, ['x']);
    expect(empty.recordKey).toBe('addr.eth');
    expect(empty.weight).toBe(0.5);
    expect(empty.durationMs).toBe(12);
    expect(empty.errors).toEqual(['x']);
    expect(empty.confidence).toBe('complete');
  });
});
