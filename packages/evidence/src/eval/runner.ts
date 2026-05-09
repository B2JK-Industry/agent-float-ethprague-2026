import { performance } from 'node:perf_hooks';

import { getEngine } from './registry.js';
import {
  EMPTY_RESULT,
  type EngineContext,
  type EngineParams,
  type EvaluatorResult,
  type RecordKey,
  type ResolvedRecord,
} from './types.js';

const DEFAULT_HARD_DEADLINE_MS = 4500;

export interface BenchRunOptions {
  ensName: string;
  records: Map<RecordKey, ResolvedRecord>;
  params: Map<RecordKey, EngineParams>;
  context: Omit<EngineContext, 'signal' | 'peerResults'>;
  hardDeadlineMs?: number;
  onResult?: (result: EvaluatorResult) => void;
}

export type BenchRunStatus = 'complete' | 'partial' | 'deadline-reached';

export interface BenchRunResult {
  results: Map<RecordKey, EvaluatorResult>;
  status: BenchRunStatus;
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

async function runEngine(
  key: RecordKey,
  record: ResolvedRecord,
  params: EngineParams,
  baseContext: Omit<EngineContext, 'signal' | 'peerResults'>,
  peerResults: Map<RecordKey, EvaluatorResult>,
  parentSignal: AbortSignal,
  remainingDeadlineMs: number,
): Promise<EvaluatorResult> {
  const start = performance.now();

  const engine = getEngine(key);
  if (!engine) {
    return EMPTY_RESULT(key, params.weight, 0, [`no engine registered for key: ${key}`]);
  }

  const engineTimeoutMs = Math.max(0, Math.min(params.timeoutMs, remainingDeadlineMs));
  const controller = new AbortController();
  const handle = chainAbort(parentSignal, controller);

  const ctx: EngineContext = {
    ...baseContext,
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

  const enginePromise = engine.evaluate(record, ctx, params);
  // Absorb any rejection that arrives AFTER the timeout race has already settled —
  // without this, an engine that throws post-timeout becomes an unhandledRejection.
  enginePromise.catch(() => {});

  try {
    const winner = await Promise.race([enginePromise, timeoutPromise]);
    if (winner === TIMEOUT_SENTINEL) {
      const durationMs = performance.now() - start;
      const empty = EMPTY_RESULT(key, params.weight, durationMs, ['timeout']);
      return { ...empty, confidence: 'degraded' };
    }
    return winner;
  } catch (err) {
    const durationMs = performance.now() - start;
    if (controller.signal.aborted) {
      const empty = EMPTY_RESULT(key, params.weight, durationMs, ['timeout']);
      return { ...empty, confidence: 'degraded' };
    }
    const message = err instanceof Error ? err.message : String(err);
    return EMPTY_RESULT(key, params.weight, durationMs, [message]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    handle.detach();
  }
}

export async function runBench(options: BenchRunOptions): Promise<BenchRunResult> {
  const startedAtMs = Date.now();
  const startPerf = performance.now();
  const hardDeadlineMs = options.hardDeadlineMs ?? DEFAULT_HARD_DEADLINE_MS;

  const deadlineController = new AbortController();
  const deadlineTimer = setTimeout(() => {
    deadlineController.abort(new Error('hard-deadline-reached'));
  }, hardDeadlineMs);

  const results = new Map<RecordKey, EvaluatorResult>();

  const tasks: Array<Promise<void>> = [];
  for (const [key, record] of options.records.entries()) {
    const params = options.params.get(key);
    if (!params) {
      const empty = EMPTY_RESULT(key, 0, 0, [`no params provided for key: ${key}`]);
      results.set(key, empty);
      options.onResult?.(empty);
      continue;
    }

    const remaining = (): number => {
      const elapsed = performance.now() - startPerf;
      return Math.max(0, hardDeadlineMs - elapsed);
    };

    const task = runEngine(
      key,
      record,
      params,
      options.context,
      results,
      deadlineController.signal,
      remaining(),
    ).then((result) => {
      results.set(key, result);
      try {
        options.onResult?.(result);
      } catch {
        // swallow onResult errors so one bad listener doesn't poison the run
      }
    });
    tasks.push(task);
  }

  await Promise.allSettled(tasks);
  clearTimeout(deadlineTimer);

  const finishedAtMs = Date.now();
  const deadlineHit = deadlineController.signal.aborted;
  const anyDegraded = Array.from(results.values()).some(
    (r) => r.confidence === 'degraded' || r.errors.length > 0,
  );

  let status: BenchRunStatus;
  if (deadlineHit) status = 'deadline-reached';
  else if (anyDegraded) status = 'partial';
  else status = 'complete';

  return { results, status, startedAtMs, finishedAtMs };
}
