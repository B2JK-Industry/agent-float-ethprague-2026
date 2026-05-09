// Source engine wrapper for the Sourcify per-source pipeline.
// Reads MultiSourceEvidence.sourcify (already populated by the
// orchestrator), extracts the score-engine components for this source
// (compileSuccess + sourcifyRecency) and produces a single
// EngineContribution that the aggregator sums uniformly with every
// other engine.
//
// No fetching happens here — the orchestrator owns the network. This
// wrapper is a pure projection from the existing component extractors.

import { performance } from 'node:perf_hooks';

import { compileSuccess, sourcifyRecency } from '../score/components.js';
import {
  emptyContribution,
  type SourceEngine,
  type EngineContribution,
} from './types.js';

const SOURCIFY_SENIORITY_WEIGHT = 0.25;   // EPIC §10.2 compileSuccess weight
const SOURCIFY_RELEVANCE_WEIGHT = 0.30;   // EPIC §10.3 sourcifyRecency weight

export const sourcifyEngine: SourceEngine = {
  id: 'sourcify',
  category: 'source',
  defaultParams: {
    weight: 1,
    trustFloor: 1.0,
    trustCeiling: 1.0,
    timeoutMs: 100, // pure projection, no network
    thresholds: {},
  },
  async evaluate(evidence, _ctx, params): Promise<EngineContribution> {
    const start = performance.now();

    const compile = compileSuccess(evidence);
    const recency = sourcifyRecency(evidence);

    const okEntries = evidence.sourcify.filter((e) => e.kind === 'ok');
    const exists = okEntries.length > 0;
    const errorEntries = evidence.sourcify.filter((e) => e.kind === 'error');

    if (!exists && errorEntries.length === 0) {
      return emptyContribution(
        'sourcify',
        'source',
        SOURCIFY_SENIORITY_WEIGHT + SOURCIFY_RELEVANCE_WEIGHT,
        performance.now() - start,
        [],
        SOURCIFY_SENIORITY_WEIGHT,
        SOURCIFY_RELEVANCE_WEIGHT,
      );
    }

    const seniorityValue = compile.value ?? 0;
    const relevanceValue = recency.value ?? 0;

    const errors: string[] = errorEntries.map(
      (e) => `sourcify[${e.kind === 'error' ? `${e.chainId}:${e.address}` : ''}]: ${
        e.kind === 'error' ? e.message : ''
      }`,
    );
    const confidence: EngineContribution['confidence'] = errorEntries.length > 0
      ? 'partial'
      : 'complete';

    return {
      engineId: 'sourcify',
      category: 'source',
      exists,
      validity: 1,
      liveness: exists ? 1 : 0,
      seniority: seniorityValue,
      relevance: relevanceValue,
      trust: params.trustFloor, // verified — 1.0
      weight: SOURCIFY_SENIORITY_WEIGHT + SOURCIFY_RELEVANCE_WEIGHT,
      seniorityWeight: SOURCIFY_SENIORITY_WEIGHT,
      relevanceWeight: SOURCIFY_RELEVANCE_WEIGHT,
      signals: {
        seniorityBreakdown: [
          {
            name: 'compileSuccess',
            value: seniorityValue,
            weight: SOURCIFY_SENIORITY_WEIGHT,
            raw: { status: compile.status, count: okEntries.length },
          },
        ],
        relevanceBreakdown: [
          {
            name: 'sourcifyRecency',
            value: relevanceValue,
            weight: SOURCIFY_RELEVANCE_WEIGHT,
            raw: { status: recency.status },
          },
        ],
        antiSignals: errorEntries.map((e) => ({
          name: 'sourcify_entry_error',
          penalty: 0,
          reason: e.kind === 'error' ? `${e.chainId}:${e.address} — ${e.reason}` : 'unknown',
        })),
      },
      evidence: [
        {
          label: 'Sourcify entries',
          value: `${okEntries.length} ok · ${errorEntries.length} error`,
        },
        {
          label: 'compileSuccess',
          value: compile.value === null ? '— (no data)' : compile.value.toFixed(2),
        },
        {
          label: 'sourcifyRecency',
          value: recency.value === null ? '— (no data)' : recency.value.toFixed(2),
        },
      ],
      confidence,
      durationMs: performance.now() - start,
      cacheHit: false,
      errors,
    };
  },
};
