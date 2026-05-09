// Source engine wrapper for the on-chain per-source pipeline.
// Pulls onchainRecency from the score components extractor; on-chain
// only contributes to the relevance axis in v1 (EPIC §10.3).

import { performance } from 'node:perf_hooks';

import { onchainRecency } from '../score/components.js';
import {
  emptyContribution,
  type SourceEngine,
  type EngineContribution,
} from './types.js';

const ONCHAIN_SENIORITY_WEIGHT = 0;     // not in v1 score formula
const ONCHAIN_RELEVANCE_WEIGHT = 0.25;  // EPIC §10.3 onchainRecency weight

export const onchainEngine: SourceEngine = {
  id: 'onchain',
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

    const okOnchain = evidence.onchain.filter((o) => o.kind === 'ok');
    const errorOnchain = evidence.onchain.filter((o) => o.kind === 'error');
    const exists = okOnchain.some((o) => o.kind === 'ok' && (o.value.nonce > 0 || o.value.firstTxBlock !== null));

    if (okOnchain.length === 0 && errorOnchain.length === 0) {
      return emptyContribution(
        'onchain',
        'source',
        ONCHAIN_SENIORITY_WEIGHT + ONCHAIN_RELEVANCE_WEIGHT,
        performance.now() - start,
        [],
        ONCHAIN_SENIORITY_WEIGHT,
        ONCHAIN_RELEVANCE_WEIGHT,
      );
    }

    const recency = onchainRecency(evidence);
    const relevanceValue = recency.value ?? 0;

    const errors: string[] = errorOnchain.map((o) => o.kind === 'error' ? `onchain[${o.chainId}]: ${o.message}` : '');

    return {
      engineId: 'onchain',
      category: 'source',
      exists,
      validity: 1,
      liveness: exists ? 1 : 0,
      seniority: 0,
      relevance: relevanceValue,
      trust: params.trustFloor, // 1.0 verified
      weight: ONCHAIN_SENIORITY_WEIGHT + ONCHAIN_RELEVANCE_WEIGHT,
      seniorityWeight: ONCHAIN_SENIORITY_WEIGHT,
      relevanceWeight: ONCHAIN_RELEVANCE_WEIGHT,
      signals: {
        seniorityBreakdown: [],
        relevanceBreakdown: [
          {
            name: 'onchainRecency',
            value: relevanceValue,
            weight: ONCHAIN_RELEVANCE_WEIGHT,
            raw: { status: recency.status, note: recency.note },
          },
        ],
        antiSignals: errorOnchain.map((o) => ({
          name: 'onchain_chain_error',
          penalty: 0,
          reason: o.kind === 'error' ? `${o.chainId}: ${o.reason}` : 'unknown',
        })),
      },
      evidence: [
        { label: 'Chains scanned', value: `${okOnchain.length} ok · ${errorOnchain.length} error` },
        ...okOnchain.map((o) => ({
          label: o.kind === 'ok' ? `chain ${o.chainId}` : '',
          value: o.kind === 'ok' ? `nonce ${o.value.nonce} · transferCountRecent90d ${o.value.transferCountRecent90d ?? 'n/a'}` : '',
        })),
      ],
      confidence: errorOnchain.length > 0 ? 'partial' : 'complete',
      durationMs: performance.now() - start,
      cacheHit: false,
      errors,
    };
  },
};
