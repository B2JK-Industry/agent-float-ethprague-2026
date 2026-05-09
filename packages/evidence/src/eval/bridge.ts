// Bridge between the eval engine framework (this package, eval/*) and
// the live Bench Mode pipeline (loadBench → orchestrateSubject →
// computeScore). Engines run in parallel with the orchestrator's 4
// source fetchers; their results layer on top of the score as a
// capped overlay bonus, NOT a replacement. This keeps:
//
//   • computeScore pure (unchanged signature, unchanged math)
//   • orchestrateSubject's MultiSourceEvidence shape stable
//   • engines visible on /b/[name] via a dedicated breakdown section
//
// Bonus math:
//   seniorityBonus = Σ (eval.seniority × eval.weight × eval.trust × eval.exists × eval.validity)
//                    / Σ (eval.weight × eval.trust × eval.exists × eval.validity)
//   * BRIDGE_AXIS_BONUS_CAP
//
// Same formula for relevance. Cap is applied per axis (default 0.10),
// so total possible bonus is +0.20 to score_raw, +20 points to score_100.

import { listEngines } from './registry.js';
import { getAllParams } from './params.js';
import { runBench, type BenchRunResult } from './runner.js';
import type {
  EngineContext,
  EvaluatorResult,
  RecordKey,
  ResolvedRecord,
} from './types.js';

import type { MultiSourceEvidence } from '../bench/types.js';

export const BRIDGE_AXIS_BONUS_CAP = 0.1;
export const BRIDGE_HARD_DEADLINE_MS = 4500;

export interface BridgeRunOptions {
  evidence: MultiSourceEvidence;
  context: Omit<EngineContext, 'signal' | 'peerResults'>;
  hardDeadlineMs?: number;
  resolvedAtMs?: number;
}

export interface EvalBonus {
  /** [0, BRIDGE_AXIS_BONUS_CAP] additive overlay applied to score.seniority. */
  readonly seniority: number;
  /** [0, BRIDGE_AXIS_BONUS_CAP] additive overlay applied to score.relevance. */
  readonly relevance: number;
  /** Pre-rounding contribution to score_100 = round((seniority + relevance) × 100 × 0.5). */
  readonly appliedToScore100: number;
}

export interface BridgeRunResultPayload {
  readonly engines: ReadonlyArray<EvaluatorResult>;
  readonly bonus: EvalBonus;
  readonly status: BenchRunResult['status'];
  readonly startedAtMs: number;
  readonly finishedAtMs: number;
}

function nonEmptyValue(raw: string | null | undefined): string | null {
  if (raw === undefined || raw === null) return null;
  const trimmed = raw.trim();
  return trimmed === '' ? null : trimmed;
}

function readText(
  evidence: MultiSourceEvidence,
  key: 'description' | 'url' | 'com.github',
): string | null {
  const texts = evidence.subject.inferredTexts;
  if (texts && texts[key]) {
    return nonEmptyValue(texts[key]);
  }
  if (key === 'com.github') {
    const owner = evidence.subject.manifest?.sources.github?.owner;
    return nonEmptyValue(owner ?? null);
  }
  return null;
}

/**
 * Maps the orchestrator's MultiSourceEvidence subject to the per-record
 * inputs each registered engine expects. Records with no value present
 * to `raw: null` so engines can short-circuit with `exists: false`
 * without blocking the run.
 */
export function resolvedRecordsFromEvidence(
  evidence: MultiSourceEvidence,
  resolvedAtMs: number,
): Map<RecordKey, ResolvedRecord> {
  const ensName = evidence.subject.name;
  const records = new Map<RecordKey, ResolvedRecord>();
  const base = {
    ensName,
    resolvedAtBlock: 0,
    resolvedAtMs,
  };

  records.set('addr.eth', {
    key: 'addr.eth',
    raw: evidence.subject.primaryAddress ?? null,
    ...base,
  });
  records.set('com.github', {
    key: 'com.github',
    raw: readText(evidence, 'com.github'),
    ...base,
  });
  records.set('description', {
    key: 'description',
    raw: readText(evidence, 'description'),
    ...base,
  });
  records.set('url', {
    key: 'url',
    raw: readText(evidence, 'url'),
    ...base,
  });
  records.set('ens-registration', {
    key: 'ens-registration',
    raw: ensName,
    ...base,
  });

  return records;
}

function effectiveContribution(r: EvaluatorResult): number {
  return r.weight * r.trust * (r.exists ? 1 : 0) * (r.validity === 1 ? 1 : 0);
}

/**
 * Computes the eval-overlay bonus for both axes. Returns zeros when no
 * engine produced a non-zero contribution (cap-aware: bonus never
 * exceeds BRIDGE_AXIS_BONUS_CAP per axis).
 */
export function computeEvalBonus(results: ReadonlyArray<EvaluatorResult>): EvalBonus {
  const denom = results.reduce((s, r) => s + effectiveContribution(r), 0);
  if (denom === 0) {
    return { seniority: 0, relevance: 0, appliedToScore100: 0 };
  }
  const seniorityWeighted =
    results.reduce((s, r) => s + r.seniority * effectiveContribution(r), 0) / denom;
  const relevanceWeighted =
    results.reduce((s, r) => s + r.relevance * effectiveContribution(r), 0) / denom;

  const seniority = Math.min(BRIDGE_AXIS_BONUS_CAP, seniorityWeighted * BRIDGE_AXIS_BONUS_CAP);
  const relevance = Math.min(BRIDGE_AXIS_BONUS_CAP, relevanceWeighted * BRIDGE_AXIS_BONUS_CAP);

  // Score engine uses 0.5 / 0.5 axis weights and rounds to int 0..100.
  // Match that formula here so callers can add appliedToScore100 to
  // score_100 without re-deriving.
  const appliedToScore100 = Math.round((seniority + relevance) * 0.5 * 100);

  return { seniority, relevance, appliedToScore100 };
}

/**
 * Runs every registered engine against the subject pulled from a
 * MultiSourceEvidence snapshot. Returns the per-engine EvaluatorResult
 * list plus the computed overlay bonus. Never throws — engines that
 * timeout, throw, or have no params produce empty results that simply
 * don't contribute to the bonus.
 */
export async function runEvaluatorBridge(
  options: BridgeRunOptions,
): Promise<BridgeRunResultPayload> {
  const resolvedAtMs = options.resolvedAtMs ?? Date.now();
  const records = resolvedRecordsFromEvidence(options.evidence, resolvedAtMs);

  // Filter to only registered engines so we don't ship empty results
  // for keys that have no engine yet (com.github, ens-registration as
  // of 2026-05-09 evening). The runner would emit "no engine
  // registered" errors otherwise; cleaner to skip them here.
  const registered = new Set(listEngines().map((e) => e.key));
  const filteredRecords = new Map<RecordKey, ResolvedRecord>();
  for (const [key, record] of records.entries()) {
    if (registered.has(key)) filteredRecords.set(key, record);
  }

  const benchResult = await runBench({
    ensName: options.evidence.subject.name,
    records: filteredRecords,
    params: getAllParams(),
    context: options.context,
    hardDeadlineMs: options.hardDeadlineMs ?? BRIDGE_HARD_DEADLINE_MS,
  });

  const engines = Array.from(benchResult.results.values());
  const bonus = computeEvalBonus(engines);

  return {
    engines,
    bonus,
    status: benchResult.status,
    startedAtMs: benchResult.startedAtMs,
    finishedAtMs: benchResult.finishedAtMs,
  };
}
