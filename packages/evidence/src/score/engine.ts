// US-118 score engine. Pure function over MultiSourceEvidence; no
// I/O, no Date.now(), no module-level state. Judges should re-derive
// any tuple by hand from the breakdown + weights.ts.
//
// GATE-30 (locked): "raw-discounted axis only — no normalization to
// ceiling. v1 max final score is 79." Bench Mode kill condition #5
// fails this PR if the breakdown normalizes the discounted sum.

import type { MultiSourceEvidence } from '../bench/types.js';

import {
  bugHygiene,
  ciPassRate,
  compileSuccess,
  ensRecency,
  githubRecency,
  nonZeroSourceCount,
  onchainRecency,
  releaseCadence,
  repoHygiene,
  sourcifyRecency,
  testPresence,
  type ComponentValue,
} from './components.js';
import {
  AXIS_WEIGHTS,
  PUBLIC_READ_TIER_CAP,
  RELEVANCE_WEIGHTS,
  SENIORITY_WEIGHTS,
  TIER_THRESHOLDS,
  U_TIER_MIN_NONZERO_SOURCES,
  trustFactor,
  type RelevanceComponentId,
  type SeniorityComponentId,
  type TrustLabel,
  type WeightedComponent,
} from './weights.js';
import type {
  CeilingApplied,
  ScoreAxisBreakdown,
  ScoreComponentBreakdown,
  ScoreResult,
  Tier,
} from './types.js';

export interface ComputeScoreOptions {
  // Unix seconds. Required — score engine is pure (no Date.now()).
  // Tests pin this for determinism; judges re-derive recency math
  // from this anchor.
  readonly nowSeconds: number;
}

type ComponentExtractor = (
  evidence: MultiSourceEvidence,
  nowSeconds: number,
) => ComponentValue;

// Order matters: rendered breakdown follows this order.
const SENIORITY_EXTRACTORS: ReadonlyArray<{
  readonly id: SeniorityComponentId;
  readonly extractor: ComponentExtractor;
}> = [
  { id: 'compileSuccess', extractor: (e) => compileSuccess(e) },
  { id: 'ciPassRate', extractor: (e) => ciPassRate(e) },
  { id: 'testPresence', extractor: (e) => testPresence(e) },
  { id: 'bugHygiene', extractor: (e) => bugHygiene(e) },
  { id: 'repoHygiene', extractor: (e) => repoHygiene(e) },
  { id: 'releaseCadence', extractor: (e) => releaseCadence(e) },
];

const RELEVANCE_EXTRACTORS: ReadonlyArray<{
  readonly id: RelevanceComponentId;
  readonly extractor: ComponentExtractor;
}> = [
  { id: 'sourcifyRecency', extractor: (e) => sourcifyRecency(e) },
  { id: 'githubRecency', extractor: (e, now) => githubRecency(e, now) },
  { id: 'onchainRecency', extractor: (e) => onchainRecency(e) },
  { id: 'ensRecency', extractor: (e, now) => ensRecency(e, now) },
];

function buildComponent(
  id: string,
  spec: WeightedComponent,
  cv: ComponentValue,
): ScoreComponentBreakdown {
  const trust: TrustLabel = spec.trust;
  const factor = trustFactor(trust);
  const value = cv.value;
  // Null-valued components contribute 0 to the sum but are surfaced
  // in the breakdown so the math is auditable.
  const contribution =
    value === null ? 0 : spec.weight * value * factor;
  return cv.note !== undefined
    ? {
        id,
        weight: spec.weight,
        value,
        trust,
        trustFactor: factor,
        contribution,
        status: cv.status,
        note: cv.note,
      }
    : {
        id,
        weight: spec.weight,
        value,
        trust,
        trustFactor: factor,
        contribution,
        status: cv.status,
      };
}

function buildAxis(
  components: ReadonlyArray<ScoreComponentBreakdown>,
): ScoreAxisBreakdown {
  let sum = 0;
  for (const c of components) sum += c.contribution;
  // Guard against floating-point drift: clamp 0..1 so downstream
  // tier math is well-defined. (Math is already 0..1 by construction
  // from the weight tables, but tests could feed adversarial inputs.)
  const clamped = Math.min(Math.max(sum, 0), 1);
  return { components, sum: clamped };
}

function tierFromScore100(score100: number): Tier {
  if (score100 >= TIER_THRESHOLDS.S) return 'S';
  if (score100 >= TIER_THRESHOLDS.A) return 'A';
  if (score100 >= TIER_THRESHOLDS.B) return 'B';
  if (score100 >= TIER_THRESHOLDS.C) return 'C';
  return 'D';
}

function applyTierCeiling(
  rawTier: Tier,
  mode: 'manifest' | 'public-read',
  nonZeroCount: number,
): { tier: Tier; ceilingApplied: CeilingApplied } {
  // U-tier short circuit — fewer than 2 non-zero data sources.
  if (nonZeroCount < U_TIER_MIN_NONZERO_SOURCES) {
    return { tier: 'U', ceilingApplied: 'unrated' };
  }
  // Public-read mode tier ceiling per EPIC §7 D-I lock.
  if (mode === 'public-read' && (rawTier === 'S' || rawTier === 'A')) {
    if (rawTier === 'S') {
      return { tier: PUBLIC_READ_TIER_CAP, ceilingApplied: 'public_read_a' };
    }
    // A is the cap; A is already at the cap so no change.
    return { tier: 'A', ceilingApplied: 'public_read_a' };
  }
  return { tier: rawTier, ceilingApplied: 'none' };
}

// Computes the seniority + relevance axes (raw discounted sums), the
// 0..100 score, and the tier with ceiling enforcement. Pure: callers
// must supply `nowSeconds` for recency math so judges can re-derive
// any tuple by hand from `weights.ts` + the input fixture.
export function computeScore(
  evidence: MultiSourceEvidence,
  options: ComputeScoreOptions,
): ScoreResult {
  const seniorityComponents: ScoreComponentBreakdown[] = SENIORITY_EXTRACTORS.map(
    ({ id, extractor }) =>
      buildComponent(id, SENIORITY_WEIGHTS[id], extractor(evidence, options.nowSeconds)),
  );
  const relevanceComponents: ScoreComponentBreakdown[] = RELEVANCE_EXTRACTORS.map(
    ({ id, extractor }) =>
      buildComponent(id, RELEVANCE_WEIGHTS[id], extractor(evidence, options.nowSeconds)),
  );

  const seniorityAxis = buildAxis(seniorityComponents);
  const relevanceAxis = buildAxis(relevanceComponents);

  const score_raw =
    AXIS_WEIGHTS.seniority * seniorityAxis.sum +
    AXIS_WEIGHTS.relevance * relevanceAxis.sum;
  const score_100 = Math.round(score_raw * 100);

  const rawTier = tierFromScore100(score_100);
  const nonZeroCount = nonZeroSourceCount(evidence);
  const { tier, ceilingApplied } = applyTierCeiling(
    rawTier,
    evidence.subject.mode,
    nonZeroCount,
  );

  const githubVerified =
    evidence.subject.manifest?.sources.github?.verified === true;

  return {
    seniority: seniorityAxis.sum,
    relevance: relevanceAxis.sum,
    score_raw,
    score_100,
    tier,
    ceilingApplied,
    breakdown: { seniority: seniorityAxis, relevance: relevanceAxis },
    meta: {
      mode: evidence.subject.mode,
      nonZeroSourceCount: nonZeroCount,
      githubVerified,
      seniorityComponentIds: SENIORITY_EXTRACTORS.map((e) => e.id),
      relevanceComponentIds: RELEVANCE_EXTRACTORS.map((e) => e.id),
    },
  };
}
