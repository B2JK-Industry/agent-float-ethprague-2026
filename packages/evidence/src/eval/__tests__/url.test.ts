import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import type { PublicClient } from 'viem';

import { urlEngine } from '../url.js';
import type { EngineContext, ResolvedRecord, SharedFetch } from '../types.js';

interface HeadFixture {
  status: number;
  headers: Record<string, string>;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const readHead = (name: string): HeadFixture =>
  JSON.parse(readFileSync(resolve(HERE, 'fixtures/url', `${name}.json`), 'utf8')) as HeadFixture;

function record(raw: string | null, ensName = 'subject.eth'): ResolvedRecord {
  return { key: 'url', ensName, raw, resolvedAtBlock: 1, resolvedAtMs: 1 };
}

function ctx(fixture: HeadFixture, calls: string[] = []): EngineContext {
  const fetch: SharedFetch = async (url, init) => {
    calls.push(`${init?.method ?? 'GET'} ${url}`);
    return {
      ok: fixture.status >= 200 && fixture.status < 300,
      status: fixture.status,
      headers: new Headers(fixture.headers),
      text: async () => '',
      async json<T = unknown>(): Promise<T> {
        return {} as T;
      },
    };
  };
  return {
    rpc: { mainnet: {} as PublicClient, sepolia: {} as PublicClient },
    fetch,
    cache: { get: () => undefined, set: () => {} },
    logger: { debug: () => {}, warn: () => {} },
    signal: new AbortController().signal,
  };
}

describe('url evaluator', () => {
  it('detects social URL but contributes ZERO to score (Daniel constraint 2026-05-10)', async () => {
    const calls: string[] = [];
    const r = await urlEngine.evaluate(
      record('https://www.linkedin.com/in/artem-starokozhko-715700393/', 'letadlo.eth'),
      ctx(readHead('linkedin-head'), calls),
      urlEngine.defaultParams,
    );
    const social = r.signals.seniorityBreakdown.find((s) => s.name === 'socialPlatformDetected');
    // Social classifier still fires — UI uses this to render the link.
    expect(social?.raw).toMatchObject({ platform: 'linkedin', handle: 'artem-starokozhko-715700393' });
    // But every score-impacting field is zero.
    expect(r.seniority).toBe(0);
    expect(r.relevance).toBe(0);
    expect(r.weight).toBe(0);
    expect(r.trust).toBe(0);
    // Evidence preserves the link for the SocialsPanel to render.
    expect(r.evidence.find((e) => e.label === 'Social profile URL')?.link).toBe(
      'https://www.linkedin.com/in/artem-starokozhko-715700393/',
    );
    // Still no network call — pattern match short-circuits.
    expect(calls).toEqual([]);
  });

  it('returns exists=false for absent agent-kikiriki.eth url', async () => {
    const r = await urlEngine.evaluate(record(null, 'agent-kikiriki.eth'), ctx(readHead('example-head')), urlEngine.defaultParams);
    expect(r.exists).toBe(false);
  });

  it('marks malformed URL as invalid', async () => {
    const r = await urlEngine.evaluate(record('not a url'), ctx(readHead('example-head')), urlEngine.defaultParams);
    expect(r.exists).toBe(true);
    expect(r.validity).toBe(0);
  });

  it('marks generic 200 OK website live without social signal', async () => {
    const calls: string[] = [];
    const r = await urlEngine.evaluate(record('https://example.com/'), ctx(readHead('example-head'), calls), urlEngine.defaultParams);
    expect(r.liveness).toBe(1);
    expect(r.signals.seniorityBreakdown.some((s) => s.name === 'socialPlatformDetected')).toBe(false);
    expect(calls).toEqual(['HEAD https://example.com/']);
  });
});
