// Source engine wrapper for the on-chain per-source pipeline.
//
// Refactor 2026-05-10: axes redefined
//   SENIORITY = engineering footprint (deployed contracts, address age)
//   RELEVANCE = alive (recent transfers, non-zero activity)
//
// Pulls onchainRecency from the score components extractor for relevance.
// Seniority sub-signals derived inline from per-chain OnchainActivity:
// `firstTxBlock` age + `nonce` lifetime activity.

import { performance } from 'node:perf_hooks';

import { onchainRecency } from '../score/components.js';
import {
  emptyContribution,
  type SourceEngine,
  type EngineContribution,
} from './types.js';

const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_YEAR = 365 * SECONDS_PER_DAY;

// SENIORITY (engineering footprint)
const ONCHAIN_SEN_AGE_W = 0.05;             // oldest tx age across chains
const ONCHAIN_SEN_LIFETIME_ACTIVITY_W = 0.05; // log10 of total nonce
const ONCHAIN_SENIORITY_WEIGHT = 0.10;

// RELEVANCE (alive)
const ONCHAIN_REL_RECENCY_W = 0.15;
const ONCHAIN_RELEVANCE_WEIGHT = 0.15;

export const onchainEngine: SourceEngine = {
  id: 'onchain',
  category: 'source',
  defaultParams: {
    weight: 1,
    trustFloor: 1.0,
    trustCeiling: 1.0,
    timeoutMs: 100,
    thresholds: {},
  },
  async evaluate(evidence, _ctx, params): Promise<EngineContribution> {
    const start = performance.now();

    const okOnchain = evidence.onchain.filter((o) => o.kind === 'ok');
    const errorOnchain = evidence.onchain.filter((o) => o.kind === 'error');
    const exists = okOnchain.some(
      (o) => o.kind === 'ok' && o.value && (o.value.nonce > 0 || o.value.firstTxBlock !== null),
    );

    if (okOnchain.length === 0 && errorOnchain.length === 0) {
      return emptyContribution(
        'onchain', 'source',
        ONCHAIN_SENIORITY_WEIGHT + ONCHAIN_RELEVANCE_WEIGHT,
        performance.now() - start, [],
        ONCHAIN_SENIORITY_WEIGHT, ONCHAIN_RELEVANCE_WEIGHT,
      );
    }

    const nowSeconds = Math.floor(Date.now() / 1000);

    // ---- SENIORITY: oldest tx age + lifetime activity ----
    let oldestFirstTx: number | null = null;
    let totalNonce = 0;
    for (const o of okOnchain) {
      if (o.kind !== 'ok' || !o.value) continue;
      totalNonce += o.value.nonce;
      if (o.value.firstTxTimestamp !== null) {
        if (oldestFirstTx === null || o.value.firstTxTimestamp < oldestFirstTx) {
          oldestFirstTx = o.value.firstTxTimestamp;
        }
      }
    }
    const ageYears = oldestFirstTx !== null
      ? Math.max(0, (nowSeconds - oldestFirstTx) / SECONDS_PER_YEAR)
      : 0;
    const ageValue = Math.min(1, ageYears / 5); // 5y saturates
    const lifetimeActivityValue = totalNonce > 0
      ? Math.min(1, Math.log10(totalNonce + 1) / Math.log10(10001))
      : 0;

    const seniorityValue =
      ageValue * (ONCHAIN_SEN_AGE_W / ONCHAIN_SENIORITY_WEIGHT) +
      lifetimeActivityValue * (ONCHAIN_SEN_LIFETIME_ACTIVITY_W / ONCHAIN_SENIORITY_WEIGHT);

    // ---- RELEVANCE: recent activity (existing component) ----
    const recency = onchainRecency(evidence);
    const relevanceValue = recency.value ?? 0;

    const errors: string[] = errorOnchain.map(
      (o) => o.kind === 'error' ? `onchain[${o.chainId}]: ${o.message}` : '',
    );

    return {
      engineId: 'onchain',
      category: 'source',
      exists,
      validity: 1,
      liveness: exists ? 1 : 0,
      seniority: seniorityValue,
      relevance: relevanceValue,
      trust: params.trustFloor,
      weight: ONCHAIN_SENIORITY_WEIGHT + ONCHAIN_RELEVANCE_WEIGHT,
      seniorityWeight: ONCHAIN_SENIORITY_WEIGHT,
      relevanceWeight: ONCHAIN_RELEVANCE_WEIGHT,
      signals: {
        seniorityBreakdown: [
          {
            name: 'onchainAddressAge',
            value: ageValue,
            weight: ONCHAIN_SEN_AGE_W,
            raw: { ageYears: Number(ageYears.toFixed(2)) },
          },
          {
            name: 'onchainLifetimeActivity',
            value: lifetimeActivityValue,
            weight: ONCHAIN_SEN_LIFETIME_ACTIVITY_W,
            raw: { totalNonce },
          },
        ],
        relevanceBreakdown: [
          {
            name: 'onchainRecency',
            value: relevanceValue,
            weight: ONCHAIN_REL_RECENCY_W,
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
        { label: 'Oldest tx', value: oldestFirstTx ? `${ageYears.toFixed(1)}y` : '—' },
        { label: 'Lifetime nonce (sum)', value: String(totalNonce) },
      ],
      confidence: errorOnchain.length > 0 ? 'partial' : 'complete',
      durationMs: performance.now() - start,
      cacheHit: false,
      errors,
    };
  },
};
