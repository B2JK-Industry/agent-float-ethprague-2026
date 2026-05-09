// Unified engine aggregator.
//
// Sums EngineContribution[] into a ScoreResult — same shape the
// existing score/engine.ts produces, so consumers (UI, JSON endpoint,
// score-breakdown panel, tests) don't need to change.
//
// Math (preserves original): for each engine signal,
//
//   contribution = signal.value × signal.weight × engine.trust
//
// seniorityAxis.sum = Σ over engines of (Σ over seniority signals of contribution)
// relevanceAxis.sum = Σ over engines of (Σ over relevance signals of contribution)
//
// score_raw  = AXIS_WEIGHTS.seniority × seniorityAxis + AXIS_WEIGHTS.relevance × relevanceAxis
// score_100  = round(score_raw × 100)
// tier       = applyTierCeiling(tierFromScore100, mode, nonZeroSourceCount)
//
// Tier ceiling rules + non-zero source detection re-import from the
// existing weights + components helpers so the refactor is purely
// structural (no behavioural drift).

import type { MultiSourceEvidence } from '../bench/types.js';
import { nonZeroSourceCount as countNonZeroSources } from '../score/components.js';
import {
  AXIS_WEIGHTS,
  PUBLIC_READ_TIER_CAP,
  TIER_THRESHOLDS,
  U_TIER_MIN_NONZERO_SOURCES,
  type TrustLabel,
} from '../score/weights.js';
import type {
  CeilingApplied,
  ScoreAxisBreakdown,
  ScoreComponentBreakdown,
  ScoreResult,
  Tier,
} from '../score/types.js';

import type { EngineContribution } from './types.js';

export interface AggregateOptions {
  readonly evidence: MultiSourceEvidence;
  readonly nowSeconds: number;
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
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
  if (nonZeroCount < U_TIER_MIN_NONZERO_SOURCES) {
    return { tier: 'U', ceilingApplied: 'unrated' };
  }
  if (mode === 'public-read' && (rawTier === 'S' || rawTier === 'A')) {
    if (rawTier === 'S') {
      return { tier: PUBLIC_READ_TIER_CAP, ceilingApplied: 'public_read_a' };
    }
    return { tier: 'A', ceilingApplied: 'public_read_a' };
  }
  return { tier: rawTier, ceilingApplied: 'none' };
}

// Map an engine trust factor (0..1) onto a TrustLabel for the breakdown
// panel. The UI distinguishes verified (× 1.0) vs unverified (× 0.6).
// Engines with trust ≥ 0.99 render as verified; everything below is
// rendered as the discount label.
function trustLabelFromFactor(trust: number): TrustLabel {
  return trust >= 0.99 ? 'verified' : 'unverified';
}

interface SyntheticComponentInput {
  readonly id: string;
  readonly value: number;
  readonly weight: number;
  readonly trust: number;
  readonly note?: string;
  readonly absent?: boolean; // engine reported the source absent
}

function syntheticComponent(input: SyntheticComponentInput): ScoreComponentBreakdown {
  const factor = input.trust;
  const trustLabel = trustLabelFromFactor(input.trust);
  const value = input.absent ? null : input.value;
  const contribution = value === null ? 0 : input.weight * value * factor;
  const base = {
    id: input.id,
    weight: input.weight,
    value,
    trust: trustLabel,
    trustFactor: factor,
    contribution,
    status: input.absent ? ('null_no_data' as const) : ('computed' as const),
  };
  return input.note !== undefined ? { ...base, note: input.note } : base;
}

function buildAxis(components: ScoreComponentBreakdown[]): ScoreAxisBreakdown {
  let sum = 0;
  for (const c of components) sum += c.contribution;
  return { components, sum: clamp01(sum) };
}

// Walk every engine's signals and emit ScoreComponentBreakdown rows
// per axis. The ordering mirrors the order in which engines registered.
// Component IDs are namespaced by engineId so duplicate signal names
// across engines (e.g. multiple engines emitting `recency`) keep
// stable React keys downstream.
function expandAxisComponents(
  contributions: ReadonlyArray<EngineContribution>,
  axis: 'seniority' | 'relevance',
): ScoreComponentBreakdown[] {
  const out: ScoreComponentBreakdown[] = [];
  for (const c of contributions) {
    const breakdown =
      axis === 'seniority' ? c.signals.seniorityBreakdown : c.signals.relevanceBreakdown;
    if (breakdown.length === 0) continue;
    for (const sig of breakdown) {
      const noteRaw = (sig.raw as { note?: unknown })?.note;
      const input: SyntheticComponentInput = {
        id: `${c.engineId}.${sig.name}`,
        value: sig.value,
        weight: sig.weight,
        trust: c.trust,
        absent: !c.exists,
      };
      out.push(
        syntheticComponent(
          typeof noteRaw === 'string' ? { ...input, note: noteRaw } : input,
        ),
      );
    }
  }
  return out;
}

export function aggregate(
  contributions: ReadonlyArray<EngineContribution>,
  options: AggregateOptions,
): ScoreResult {
  const seniorityComponents = expandAxisComponents(contributions, 'seniority');
  const relevanceComponents = expandAxisComponents(contributions, 'relevance');

  const seniorityAxis = buildAxis(seniorityComponents);
  const relevanceAxis = buildAxis(relevanceComponents);

  const score_raw =
    AXIS_WEIGHTS.seniority * seniorityAxis.sum + AXIS_WEIGHTS.relevance * relevanceAxis.sum;
  const score_100 = Math.round(score_raw * 100);

  const rawTier = tierFromScore100(score_100);
  const nonZeroCount = countNonZeroSources(options.evidence);
  const { tier, ceilingApplied } = applyTierCeiling(
    rawTier,
    options.evidence.subject.mode,
    nonZeroCount,
  );

  const githubVerified =
    options.evidence.subject.manifest?.sources.github?.verified === true;

  return {
    seniority: seniorityAxis.sum,
    relevance: relevanceAxis.sum,
    score_raw,
    score_100,
    tier,
    ceilingApplied,
    breakdown: { seniority: seniorityAxis, relevance: relevanceAxis },
    meta: {
      mode: options.evidence.subject.mode,
      nonZeroSourceCount: nonZeroCount,
      githubVerified,
      seniorityComponentIds: seniorityComponents.map((c) => c.id) as ScoreResult['meta']['seniorityComponentIds'],
      relevanceComponentIds: relevanceComponents.map((c) => c.id) as ScoreResult['meta']['relevanceComponentIds'],
    },
  };
}
