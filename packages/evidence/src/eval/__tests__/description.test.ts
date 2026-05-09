import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PublicClient } from 'viem';

import { descriptionEngine } from '../description.js';
import { clearRegistry, register } from '../registry.js';
import type { EngineContext, EngineParams, ResolvedRecord } from '../types.js';

const HERE = dirname(fileURLToPath(import.meta.url));

function fixture(name: string): string {
  return readFileSync(resolve(HERE, 'fixtures', name), 'utf8').trim();
}

const params: EngineParams = descriptionEngine.defaultParams;

function ctx(): EngineContext {
  const cache = new Map<string, unknown>();
  return {
    rpc: { mainnet: {} as unknown as PublicClient, sepolia: {} as unknown as PublicClient },
    fetch: async () => ({ ok: true, status: 200, headers: new Headers(), text: async () => '', async json<T>() { return {} as T; } }),
    cache: {
      get<T>(k: string): T | undefined { return cache.get(k) as T | undefined; },
      set<T>(k: string, v: T): void { cache.set(k, v); },
    },
    logger: { debug: () => {}, warn: () => {} },
    signal: new AbortController().signal,
    peerResults: new Map(),
  };
}

function record(raw: string | null, ensName = 'test.eth'): ResolvedRecord {
  return { key: 'description', ensName, raw, resolvedAtBlock: 1, resolvedAtMs: Date.now() };
}

beforeEach(() => { clearRegistry(); register(descriptionEngine); });
afterEach(() => clearRegistry());

describe('description engine — calibration', () => {
  it('letadlo.eth: seniority [0.30, 0.55], relevance [0.40, 0.65]', async () => {
    const text = fixture('letadlo.txt');
    const result = await descriptionEngine.evaluate(record(text, 'letadlo.eth'), ctx(), params);
    expect(result.exists).toBe(true);
    expect(result.seniority).toBeGreaterThanOrEqual(0.30);
    expect(result.seniority).toBeLessThanOrEqual(0.55);
    expect(result.relevance).toBeGreaterThanOrEqual(0.40);
    expect(result.relevance).toBeLessThanOrEqual(0.65);
  });

  it('agent-kikiriki.eth: absent record → exists=false', async () => {
    const result = await descriptionEngine.evaluate(record(null, 'agent-kikiriki.eth'), ctx(), params);
    expect(result.exists).toBe(false);
    expect(result.seniority).toBe(0);
    expect(result.relevance).toBe(0);
  });

  it('vague: single word → seniority < 0.10', async () => {
    const text = fixture('vague.txt');
    const result = await descriptionEngine.evaluate(record(text), ctx(), params);
    expect(result.seniority).toBeLessThan(0.10);
  });

  it('rich: full Solidity/DeFi/year description → seniority >= 0.55, relevance >= 0.40', async () => {
    const text = fixture('rich.txt');
    const result = await descriptionEngine.evaluate(record(text), ctx(), params);
    expect(result.seniority).toBeGreaterThanOrEqual(0.55);
    expect(result.relevance).toBeGreaterThanOrEqual(0.40);
  });
});

describe('description engine — structural', () => {
  it('empty string → exists=false', async () => {
    const result = await descriptionEngine.evaluate(record(''), ctx(), params);
    expect(result.exists).toBe(false);
  });

  it('returns complete confidence', async () => {
    const result = await descriptionEngine.evaluate(record('some text here'), ctx(), params);
    expect(result.confidence).toBe('complete');
    expect(result.errors).toEqual([]);
  });

  it('scores are in [0, 1]', async () => {
    const text = fixture('rich.txt');
    const result = await descriptionEngine.evaluate(record(text), ctx(), params);
    expect(result.seniority).toBeGreaterThanOrEqual(0);
    expect(result.seniority).toBeLessThanOrEqual(1);
    expect(result.relevance).toBeGreaterThanOrEqual(0);
    expect(result.relevance).toBeLessThanOrEqual(1);
  });
});
