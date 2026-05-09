// Unified engine runner. Spawns every registered engine in parallel,
// honours per-engine + global hard deadlines, returns ContributionSet.
//
// RecordEngines need a ResolvedRecord input — caller passes the
// records map (extracted from MultiSourceEvidence). SourceEngines need
// the full MultiSourceEvidence.
//
// Both produce EngineContribution. Aggregator sums them uniformly.

import { performance } from 'node:perf_hooks';

import { listRegisteredEngines, isSourceEngine } from './registry.js';
import {
  recordResultToContribution,
  emptyContribution,
  type AnyEngine,
  type EngineContribution,
  type EngineId,
} from './types.js';
import type { MultiSourceEvidence } from '../bench/types.js';
import type {
  EngineContext,
  EngineParams,
  EvaluatorResult,
  RecordKey,
  ResolvedRecord,
} from '../eval/types.js';
import type { RecordEngine } from '../eval/types.js';

const DEFAULT_HARD_DEADLINE_MS = 9_000; // bumped from 4500 to handle source-engine network calls

export interface EngineRunOptions {
  evidence: MultiSourceEvidence;
  records: Map<RecordKey, ResolvedRecord>;
  params: Map<EngineId, EngineParams>;
  context: Omit<EngineContext, 'signal' | 'peerResults'>;
  hardDeadlineMs?: number;
  onResult?: (result: EngineContribution) => void;
}

export type EngineRunStatus = 'complete' | 'partial' | 'deadline-reached';

export interface EngineRunResult {
  contributions: Map<EngineId, EngineContribution>;
  status: EngineRunStatus;
  startedAtMs: number;
  finishedAtMs: number;
}

interface ChainHandle {
  detach(): void;
}

function chainAbort(parent: AbortSignal, child: AbortController): ChainHandle {
  if (parent.aborted) {
    child.abort(parent.reason);
    return { detach: () => {} };
  }
  const onAbort = (): void => child.abort(parent.reason);
  parent.addEventListener('abort', onAbort, { once: true });
  return {
    detach: () => parent.removeEventListener('abort', onAbort),
  };
}

const TIMEOUT_SENTINEL = Symbol('engine-timeout');

async function runOne(
  engine: AnyEngine,
  options: EngineRunOptions,
  peerResults: Map<RecordKey, EvaluatorResult>,
  parentSignal: AbortSignal,
  remainingDeadlineMs: number,
): Promise<EngineContribution> {
  const start = performance.now();
  const engineId: EngineId = isSourceEngine(engine) ? engine.id : engine.key;
  const params = options.params.get(engineId);
  if (!params) {
    return emptyContribution(engineId, isSourceEngine(engine) ? 'source' : 'record', 0, 0, [
      `no params provided for engine: ${engineId}`,
    ]);
  }

  const engineTimeoutMs = Math.max(0, Math.min(params.timeoutMs, remainingDeadlineMs));
  const controller = new AbortController();
  const handle = chainAbort(parentSignal, controller);

  const ctx: EngineContext = {
    ...options.context,
    signal: controller.signal,
    peerResults,
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<typeof TIMEOUT_SENTINEL>((resolve) => {
    timer = setTimeout(() => {
      controller.abort(new Error('engine-timeout'));
      resolve(TIMEOUT_SENTINEL);
    }, engineTimeoutMs);
  });

  const enginePromise: Promise<EngineContribution> = isSourceEngine(engine)
    ? engine.evaluate(options.evidence, ctx, params)
    : runRecordEngine(engine, options.records, ctx, params, peerResults);

  enginePromise.catch(() => {});

  try {
    const winner = await Promise.race([enginePromise, timeoutPromise]);
    if (winner === TIMEOUT_SENTINEL) {
      const durationMs = performance.now() - start;
      const empty = emptyContribution(
        engineId,
        isSourceEngine(engine) ? 'source' : 'record',
        params.weight,
        durationMs,
        ['timeout'],
      );
      return { ...empty, confidence: 'degraded' };
    }
    return winner;
  } catch (err) {
    const durationMs = performance.now() - start;
    if (controller.signal.aborted) {
      const empty = emptyContribution(
        engineId,
        isSourceEngine(engine) ? 'source' : 'record',
        params.weight,
        durationMs,
        ['timeout'],
      );
      return { ...empty, confidence: 'degraded' };
    }
    const message = err instanceof Error ? err.message : String(err);
    return emptyContribution(
      engineId,
      isSourceEngine(engine) ? 'source' : 'record',
      params.weight,
      durationMs,
      [message],
    );
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    handle.detach();
  }
}

async function runRecordEngine(
  engine: RecordEngine,
  records: Map<RecordKey, ResolvedRecord>,
  ctx: EngineContext,
  params: EngineParams,
  peerResults: Map<RecordKey, EvaluatorResult>,
): Promise<EngineContribution> {
  const record = records.get(engine.key);
  if (!record) {
    return emptyContribution(engine.key, 'record', params.weight, 0, [
      `no record provided for ${engine.key}`,
    ]);
  }
  const result = await engine.evaluate(record, ctx, params);
  // Stash the raw EvaluatorResult so subsequent record-engines can
  // peek at it via ctx.peerResults — preserves cross-record coherence.
  peerResults.set(engine.key, result);
  return recordResultToContribution(result);
}

export async function runEngines(options: EngineRunOptions): Promise<EngineRunResult> {
  const startedAtMs = Date.now();
  const startPerf = performance.now();
  const hardDeadlineMs = options.hardDeadlineMs ?? DEFAULT_HARD_DEADLINE_MS;

  const deadlineController = new AbortController();
  const deadlineTimer = setTimeout(() => {
    deadlineController.abort(new Error('hard-deadline-reached'));
  }, hardDeadlineMs);

  const contributions = new Map<EngineId, EngineContribution>();
  const peerResults = new Map<RecordKey, EvaluatorResult>();

  const tasks: Array<Promise<void>> = [];
  for (const engine of listRegisteredEngines()) {
    const remaining = (): number => {
      const elapsed = performance.now() - startPerf;
      return Math.max(0, hardDeadlineMs - elapsed);
    };

    const task = runOne(engine, options, peerResults, deadlineController.signal, remaining())
      .then((contribution) => {
        contributions.set(contribution.engineId, contribution);
        try {
          options.onResult?.(contribution);
        } catch {
          // swallow listener errors so one bad listener doesn't poison the run
        }
      });
    tasks.push(task);
  }

  await Promise.allSettled(tasks);
  clearTimeout(deadlineTimer);

  const finishedAtMs = Date.now();
  const deadlineHit = deadlineController.signal.aborted;
  const anyDegraded = Array.from(contributions.values()).some(
    (c) => c.confidence === 'degraded' || c.errors.length > 0,
  );

  let status: EngineRunStatus;
  if (deadlineHit) status = 'deadline-reached';
  else if (anyDegraded) status = 'partial';
  else status = 'complete';

  return { contributions, status, startedAtMs, finishedAtMs };
}
