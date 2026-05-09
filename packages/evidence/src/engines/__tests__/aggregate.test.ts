import { describe, it, expect } from 'vitest';

import { aggregate } from '../aggregate.js';
import type { EngineContribution } from '../types.js';
import type { MultiSourceEvidence } from '../../bench/types.js';

const evidence = (overrides: Partial<MultiSourceEvidence['subject']> = {}): MultiSourceEvidence => ({
  subject: {
    name: 'subject.eth',
    chainId: 1,
    mode: 'manifest',
    primaryAddress: '0x1234567890123456789012345678901234567890',
    kind: 'project',
    manifest: null,
    inferredGithub: null,
    inferredTexts: {},
    ...overrides,
  },
  sourcify: [],
  github: { kind: 'absent' },
  onchain: [],
  ensInternal: { kind: 'absent' },
  crossChain: null,
  failures: [],
});

const contribution = (
  engineId: EngineContribution['engineId'],
  category: EngineContribution['category'],
  overrides: Partial<EngineContribution> = {},
): EngineContribution => ({
  engineId,
  category,
  exists: true,
  validity: 1,
  liveness: 1,
  seniority: 0.5,
  relevance: 0.5,
  trust: 1,
  weight: 1,
  seniorityWeight: 1,
  relevanceWeight: 1,
  signals: { seniorityBreakdown: [], relevanceBreakdown: [], antiSignals: [] },
  evidence: [],
  confidence: 'complete',
  durationMs: 0,
  cacheHit: false,
  errors: [],
  ...overrides,
});

describe('aggregateEngines', () => {
  it('returns U tier when fewer than 2 sources non-zero', () => {
    const result = aggregate([], { evidence: evidence(), nowSeconds: 0 });
    expect(result.tier).toBe('U');
    expect(result.ceilingApplied).toBe('unrated');
    expect(result.score_100).toBe(0);
  });

  it('preserves the 0.5/0.5 axis split when summing engine signals', () => {
    const sourcify = contribution('sourcify', 'source', {
      seniority: 1,
      relevance: 1,
      trust: 1,
      seniorityWeight: 0.25,
      relevanceWeight: 0.30,
      signals: {
        seniorityBreakdown: [{ name: 'compileSuccess', value: 1, weight: 0.25 }],
        relevanceBreakdown: [{ name: 'sourcifyRecency', value: 1, weight: 0.30 }],
        antiSignals: [],
      },
    });
    const github = contribution('github', 'source', {
      seniority: 0.8,
      relevance: 0.5,
      trust: 0.6,
      seniorityWeight: 0.75,
      relevanceWeight: 0.30,
      signals: {
        seniorityBreakdown: [
          { name: 'testPresence', value: 0.8, weight: 0.15 },
          { name: 'repoHygiene', value: 0.8, weight: 0.15 },
          { name: 'ciPassRate', value: 0.8, weight: 0.20 },
          { name: 'bugHygiene', value: 0.8, weight: 0.10 },
          { name: 'releaseCadence', value: 0.8, weight: 0.15 },
        ],
        relevanceBreakdown: [{ name: 'githubRecency', value: 0.5, weight: 0.30 }],
        antiSignals: [],
      },
    });
    const ev = evidence();
    // Force non-zero source count by providing fake non-empty data.
    const evWithSources: MultiSourceEvidence = {
      ...ev,
      sourcify: [
        {
          kind: 'ok',
          chainId: 1,
          address: '0xAAA',
          label: 'x',
          deep: { match: 'exact', creationMatch: 'exact_match', runtimeMatch: 'exact_match' } as unknown as MultiSourceEvidence['sourcify'][number] extends infer X ? (X extends { deep: infer D } ? D : never) : never,
          patterns: [],
          licenseCompiler: { license: null, compilerVersion: null, evmVersion: null } as unknown as MultiSourceEvidence['sourcify'][number] extends infer X ? (X extends { licenseCompiler: infer L } ? L : never) : never,
        } as unknown as MultiSourceEvidence['sourcify'][number],
      ],
      github: {
        kind: 'ok',
        value: { owner: 'x', user: { login: 'x', createdAt: null, publicRepos: 0, followers: 0 }, repos: [] },
      } as unknown as MultiSourceEvidence['github'],
    };
    const result = aggregate([sourcify, github], { evidence: evWithSources, nowSeconds: 0 });

    // Sum manually:
    // seniority sum = 0.25*1*1 + 0.15*0.8*0.6 + 0.15*0.8*0.6 + 0.20*0.8*0.6 + 0.10*0.8*0.6 + 0.15*0.8*0.6
    //               = 0.25 + (0.6*0.8)*(0.15+0.15+0.20+0.10+0.15)
    //               = 0.25 + 0.48 * 0.75
    //               = 0.25 + 0.36
    //               = 0.61
    // relevance sum = 0.30*1*1 + 0.30*0.5*0.6 = 0.30 + 0.09 = 0.39
    // score_raw = 0.5*0.61 + 0.5*0.39 = 0.305 + 0.195 = 0.50
    // score_100 = 50
    expect(result.seniority).toBeCloseTo(0.61, 2);
    expect(result.relevance).toBeCloseTo(0.39, 2);
    expect(result.score_100).toBeCloseTo(50, 0);
  });

  it('namespaces synthetic component IDs by engineId to keep React keys unique', () => {
    const a = contribution('sourcify', 'source', {
      signals: {
        seniorityBreakdown: [{ name: 'recency', value: 0.5, weight: 0.1 }],
        relevanceBreakdown: [],
        antiSignals: [],
      },
    });
    const b = contribution('github', 'source', {
      signals: {
        seniorityBreakdown: [{ name: 'recency', value: 0.6, weight: 0.1 }],
        relevanceBreakdown: [],
        antiSignals: [],
      },
    });
    const ev = evidence();
    const result = aggregate([a, b], { evidence: ev, nowSeconds: 0 });
    const ids = result.breakdown.seniority.components.map((c) => c.id);
    expect(ids).toContain('sourcify.recency');
    expect(ids).toContain('github.recency');
    expect(new Set(ids).size).toBe(ids.length); // all unique
  });
});
