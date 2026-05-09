// Source engine wrapper for the ENS-internal per-source pipeline.
// Pulls ensRecency from the score components extractor; ENS only
// contributes to the relevance axis in v1 (EPIC §10.3).

import { performance } from 'node:perf_hooks';

import { ensRecency } from '../score/components.js';
import {
  emptyContribution,
  type SourceEngine,
  type EngineContribution,
} from './types.js';

const ENS_SENIORITY_WEIGHT = 0;     // not in v1 score formula
const ENS_RELEVANCE_WEIGHT = 0.15;  // EPIC §10.3 ensRecency weight

export const ensEngine: SourceEngine = {
  id: 'ens',
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

    if (evidence.ensInternal.kind === 'absent') {
      return emptyContribution(
        'ens',
        'source',
        ENS_SENIORITY_WEIGHT + ENS_RELEVANCE_WEIGHT,
        performance.now() - start,
        [],
        ENS_SENIORITY_WEIGHT,
        ENS_RELEVANCE_WEIGHT,
      );
    }

    if (evidence.ensInternal.kind === 'error') {
      const empty = emptyContribution(
        'ens',
        'source',
        ENS_SENIORITY_WEIGHT + ENS_RELEVANCE_WEIGHT,
        performance.now() - start,
        [evidence.ensInternal.message],
        ENS_SENIORITY_WEIGHT,
        ENS_RELEVANCE_WEIGHT,
      );
      return { ...empty, confidence: 'degraded' };
    }

    const recency = ensRecency(evidence, Math.floor(Date.now() / 1000));
    const relevanceValue = recency.value ?? 0;
    const ens = evidence.ensInternal.value;

    return {
      engineId: 'ens',
      category: 'source',
      exists: ens.subnameCount > 0 || ens.textRecordCount > 0 || ens.registrationDate !== null,
      validity: 1,
      liveness: 1,
      seniority: 0,
      relevance: relevanceValue,
      trust: params.trustFloor,
      weight: ENS_SENIORITY_WEIGHT + ENS_RELEVANCE_WEIGHT,
      seniorityWeight: ENS_SENIORITY_WEIGHT,
      relevanceWeight: ENS_RELEVANCE_WEIGHT,
      signals: {
        seniorityBreakdown: [],
        relevanceBreakdown: [
          {
            name: 'ensRecency',
            value: relevanceValue,
            weight: ENS_RELEVANCE_WEIGHT,
            raw: { status: recency.status, note: recency.note },
          },
        ],
        antiSignals: [],
      },
      evidence: [
        { label: 'ENS name', value: ens.name },
        { label: 'Registration', value: ens.registrationDate !== null ? new Date(ens.registrationDate * 1000).toISOString() : '(unregistered)' },
        { label: 'Subnames', value: String(ens.subnameCount) },
        { label: 'Text records', value: String(ens.textRecordCount) },
        { label: 'Last update block', value: ens.lastRecordUpdateBlock?.toString() ?? '(none)' },
      ],
      confidence: 'complete',
      durationMs: performance.now() - start,
      cacheHit: false,
      errors: [],
    };
  },
};
