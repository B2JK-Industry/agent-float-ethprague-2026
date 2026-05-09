// Unified Engine architecture (refactor 2026-05-09).
//
// Two engine families share one contribution shape:
//
//   • RecordEngine   — evaluates ONE ENS record (addr, com.github,
//                      description, url). Re-exports `eval/`'s existing
//                      RecordEngine — no behavioural change.
//   • SourceEngine   — wraps an existing source fetcher (Sourcify,
//                      GitHub-source, on-chain, ENS-internal). Reads
//                      from MultiSourceEvidence the orchestrator already
//                      assembles, transforms native shape into
//                      EngineContribution.
//
// Both produce EngineContribution (== EvaluatorResult shape with
// `engineId` + `category` swapped in for `recordKey`). Aggregator sums
// over EngineContribution[] with no knowledge of which family produced
// what — single source of truth for the score breakdown.
//
// Trust math, weight math, anti-signal math: ONE place — see aggregate.ts.
//
// MultiSourceEvidence stays as the orchestrator's per-source dump so
// existing per-source drawers (Sourcify / GitHub / On-chain / ENS) keep
// reading raw fetcher data unchanged. SourceEngine sits BETWEEN the
// raw evidence and the score; drawers don't go through engines.

import type { MultiSourceEvidence } from '../bench/types.js';
import type {
  AntiSignalEntry,
  EngineContext,
  EngineParams,
  EvaluatorConfidence,
  Evidence,
  EvaluatorResult,
  RecordEngine,
  RecordKey,
  ResolvedRecord,
  SignalEntry,
} from '../eval/types.js';

export type SourceEngineId = 'sourcify' | 'github' | 'onchain' | 'ens';

export type EngineId = RecordKey | SourceEngineId;

export type EngineCategory = 'record' | 'source';

export interface EngineContribution {
  engineId: EngineId;
  category: EngineCategory;
  exists: boolean;
  validity: 0 | 1;
  liveness: 0 | 1;

  // Engine score values [0, 1] per axis. Aggregator multiplies these
  // by the per-axis weight + trust below.
  seniority: number;
  relevance: number;
  trust: number;

  // Per-axis weights — share of axis sum the engine claims when its
  // score equals 1.0. The two weights need NOT be equal: e.g. the
  // Sourcify source engine claims 0.25 of seniority via compileSuccess
  // and 0.30 of relevance via sourcifyRecency. RecordEngines that
  // contribute the same amount to both axes set both equal to `weight`
  // (preserves backward compat with the EvaluatorResult `weight` field).
  seniorityWeight: number;
  relevanceWeight: number;

  // Composite "engine weight" — used by tests / UI as a single number
  // when per-axis split isn't relevant. Defaults to seniorityWeight +
  // relevanceWeight for source engines, or the original weight for
  // record engines.
  weight: number;

  signals: {
    seniorityBreakdown: SignalEntry[];
    relevanceBreakdown: SignalEntry[];
    antiSignals: AntiSignalEntry[];
  };

  evidence: Evidence[];
  confidence: EvaluatorConfidence;
  durationMs: number;
  cacheHit: boolean;
  errors: string[];
}

export interface SourceEngine {
  readonly id: SourceEngineId;
  readonly category: 'source';
  readonly defaultParams: EngineParams;
  evaluate(
    evidence: MultiSourceEvidence,
    ctx: EngineContext,
    params: EngineParams,
  ): Promise<EngineContribution>;
}

// Re-export RecordEngine + EvaluatorResult so engines/ is the single
// import surface for engine consumers. RecordEngine is the same
// interface from eval/types.ts — no rename, no shim.
export type { RecordEngine, EvaluatorResult, EngineContext, EngineParams, ResolvedRecord };
export type { Evidence, SignalEntry, AntiSignalEntry, EvaluatorConfidence };

export type AnyEngine = RecordEngine | SourceEngine;

// Adapt EvaluatorResult → EngineContribution. Pure projection: changes
// the discriminator field name, mirrors single weight to per-axis weights.
export function recordResultToContribution(
  result: EvaluatorResult,
): EngineContribution {
  return {
    engineId: result.recordKey,
    category: 'record',
    exists: result.exists,
    validity: result.validity,
    liveness: result.liveness,
    seniority: result.seniority,
    relevance: result.relevance,
    trust: result.trust,
    weight: result.weight,
    seniorityWeight: result.weight,
    relevanceWeight: result.weight,
    signals: result.signals,
    evidence: result.evidence,
    confidence: result.confidence,
    durationMs: result.durationMs,
    cacheHit: result.cacheHit,
    errors: result.errors,
  };
}

// Build an empty (absent) contribution. Used when an engine reports
// no data at all so the aggregator can still display its row.
export function emptyContribution(
  engineId: EngineId,
  category: EngineCategory,
  weight: number,
  durationMs: number,
  errors: string[] = [],
  seniorityWeight?: number,
  relevanceWeight?: number,
): EngineContribution {
  return {
    engineId,
    category,
    exists: false,
    validity: 0,
    liveness: 0,
    seniority: 0,
    relevance: 0,
    trust: 0,
    weight,
    seniorityWeight: seniorityWeight ?? weight,
    relevanceWeight: relevanceWeight ?? weight,
    signals: { seniorityBreakdown: [], relevanceBreakdown: [], antiSignals: [] },
    evidence: [],
    confidence: 'complete',
    durationMs,
    cacheHit: false,
    errors,
  };
}
