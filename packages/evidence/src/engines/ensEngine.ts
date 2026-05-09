// Source engine wrapper for the ENS-internal per-source pipeline.
// Pulls ensRecency from the score components extractor; ENS only
// contributes to the relevance axis in v1 (EPIC §10.3).

import { performance } from 'node:perf_hooks';

import { ensRecency } from '../score/components.js';
import {
  emptyContribution,
  type AntiSignalEntry,
  type SourceEngine,
  type EngineContribution,
} from './types.js';

const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_YEAR = 365 * SECONDS_PER_DAY;

// Seniority sub-signals (sum to ENS_SENIORITY_WEIGHT)
const ENS_AGE_WEIGHT = 0.05;             // registration age normalised over 5y
const ENS_TEXT_RICHNESS_WEIGHT = 0.03;   // textRecordCount / 6 (mature profile)
const ENS_SUBNAME_STRUCTURE_WEIGHT = 0.02; // subname presence
const ENS_SENIORITY_WEIGHT = ENS_AGE_WEIGHT + ENS_TEXT_RICHNESS_WEIGHT + ENS_SUBNAME_STRUCTURE_WEIGHT;

const ENS_RELEVANCE_WEIGHT = 0.15;       // EPIC §10.3 ensRecency weight

// Anti-signal thresholds
const EXPIRY_WARNING_DAYS = 60;          // < 60d to expiry → moderate penalty
const EXPIRY_CRITICAL_DAYS = 7;          // < 7d to expiry → critical penalty
const EXPIRED_PENALTY = 0.30;            // domain expired
const EXPIRY_CRITICAL_PENALTY = 0.20;
const EXPIRY_WARNING_PENALTY = 0.10;

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

    const nowSeconds = Math.floor(Date.now() / 1000);
    const recency = ensRecency(evidence, nowSeconds);
    const relevanceValue = recency.value ?? 0;
    const ens = evidence.ensInternal.value;

    // Seniority sub-signals: registration age, text-record richness,
    // subname structure. Each on its own scale, then weighted-summed
    // to fit ENS_SENIORITY_WEIGHT (0.10).
    const ageDays = ens.registrationDate !== null
      ? Math.max(0, (nowSeconds - ens.registrationDate) / SECONDS_PER_DAY)
      : 0;
    const ageYears = ageDays / 365;
    const ageValue = Math.min(1, ageYears / 5); // 5y saturates
    const textRichnessValue = Math.min(1, ens.textRecordCount / 6); // 6+ records mature
    const subnameStructureValue = ens.subnameCount > 0 ? Math.min(1, Math.log10(ens.subnameCount + 1) / 2) : 0;

    const seniorityValue =
      ageValue * (ENS_AGE_WEIGHT / ENS_SENIORITY_WEIGHT) +
      textRichnessValue * (ENS_TEXT_RICHNESS_WEIGHT / ENS_SENIORITY_WEIGHT) +
      subnameStructureValue * (ENS_SUBNAME_STRUCTURE_WEIGHT / ENS_SENIORITY_WEIGHT);

    // Anti-signals: domain expiry. Only fired when expiryDate is
    // populated on the source (some networks / older subgraphs may
    // not have it; absent → no penalty).
    const antiSignals: AntiSignalEntry[] = [];
    const expiryDate = (ens as { expiryDate?: number | null }).expiryDate ?? null;
    if (typeof expiryDate === 'number') {
      const daysToExpiry = (expiryDate - nowSeconds) / SECONDS_PER_DAY;
      if (daysToExpiry < 0) {
        antiSignals.push({
          name: 'ens_expired',
          penalty: EXPIRED_PENALTY,
          reason: `domain expired ${Math.floor(-daysToExpiry)}d ago`,
        });
      } else if (daysToExpiry < EXPIRY_CRITICAL_DAYS) {
        antiSignals.push({
          name: 'ens_expiry_critical',
          penalty: EXPIRY_CRITICAL_PENALTY,
          reason: `expires in ${Math.floor(daysToExpiry)}d`,
        });
      } else if (daysToExpiry < EXPIRY_WARNING_DAYS) {
        antiSignals.push({
          name: 'ens_expiry_warning',
          penalty: EXPIRY_WARNING_PENALTY,
          reason: `expires in ${Math.floor(daysToExpiry)}d`,
        });
      }
    }

    return {
      engineId: 'ens',
      category: 'source',
      exists: ens.subnameCount > 0 || ens.textRecordCount > 0 || ens.registrationDate !== null,
      validity: 1,
      liveness: 1,
      seniority: seniorityValue,
      relevance: relevanceValue,
      trust: params.trustFloor,
      weight: ENS_SENIORITY_WEIGHT + ENS_RELEVANCE_WEIGHT,
      seniorityWeight: ENS_SENIORITY_WEIGHT,
      relevanceWeight: ENS_RELEVANCE_WEIGHT,
      signals: {
        seniorityBreakdown: [
          {
            name: 'ensRegistrationAge',
            value: ageValue,
            weight: ENS_AGE_WEIGHT,
            raw: { ageDays: Math.round(ageDays), ageYears: Number(ageYears.toFixed(2)) },
          },
          {
            name: 'ensTextRecordRichness',
            value: textRichnessValue,
            weight: ENS_TEXT_RICHNESS_WEIGHT,
            raw: { count: ens.textRecordCount },
          },
          {
            name: 'ensSubnameStructure',
            value: subnameStructureValue,
            weight: ENS_SUBNAME_STRUCTURE_WEIGHT,
            raw: { count: ens.subnameCount },
          },
        ],
        relevanceBreakdown: [
          {
            name: 'ensRecency',
            value: relevanceValue,
            weight: ENS_RELEVANCE_WEIGHT,
            raw: { status: recency.status, note: recency.note },
          },
        ],
        antiSignals,
      },
      evidence: [
        { label: 'ENS name', value: ens.name },
        { label: 'Registration', value: ens.registrationDate !== null ? new Date(ens.registrationDate * 1000).toISOString() : '(unregistered)' },
        { label: 'Age', value: ens.registrationDate !== null ? `${Math.round(ageDays)}d (${ageYears.toFixed(1)}y)` : '—' },
        { label: 'Subnames', value: String(ens.subnameCount) },
        { label: 'Text records', value: String(ens.textRecordCount) },
        { label: 'Last update block', value: ens.lastRecordUpdateBlock?.toString() ?? '(none)' },
        ...(typeof expiryDate === 'number'
          ? [{ label: 'Expires', value: new Date(expiryDate * 1000).toISOString() }]
          : []),
      ],
      confidence: 'complete',
      durationMs: performance.now() - start,
      cacheHit: false,
      errors: [],
    };
  },
};
