import type { Address } from '@upgrade-siren/shared';

import { NetworkUnavailable, retryableFetch, type RetryOptions } from '../network/retry.js';
import {
  SOURCIFY_BASE_URL,
  type FetchLike,
  type Result,
  type SourcifyError,
} from './types.js';

// US-121 (P1) Sourcify bytecode similarity submit flow. EPIC Section 8.1
// "Bytecode Similarity Submit Flow":
//
//   POST /v2/verify/similarity/{chainId}/{address}
//     → Sourcify scans known bytecode set
//     → if match found, contract auto-verifies
//     → poll /v2/verify/{verificationId} until terminal
//     → caller re-fetches /v2/contract/{chainId}/{address}
//
// This module owns submit + poll. Re-fetching after a successful match is
// the orchestrator's job (it controls the cache invalidation).

export type SimilarityTerminalStatus = 'verified' | 'no_match' | 'failed';

export type SimilarityPendingStatus = 'pending' | 'queued' | 'verifying';

export type SimilarityStatus = SimilarityTerminalStatus | SimilarityPendingStatus;

const TERMINAL_STATUSES: ReadonlySet<SimilarityStatus> = new Set([
  'verified',
  'no_match',
  'failed',
]);

const PENDING_RAW_TO_NORMAL: ReadonlyMap<string, SimilarityPendingStatus> = new Map([
  ['pending', 'pending'],
  ['queued', 'queued'],
  ['running', 'verifying'],
  ['in_progress', 'verifying'],
  ['verifying', 'verifying'],
]);

const TERMINAL_RAW_TO_NORMAL: ReadonlyMap<string, SimilarityTerminalStatus> = new Map([
  ['verified', 'verified'],
  ['success', 'verified'],
  ['matched', 'verified'],
  ['no_match', 'no_match'],
  ['not_matched', 'no_match'],
  ['failed', 'failed'],
  ['error', 'failed'],
]);

function normalizeStatus(raw: unknown): SimilarityStatus | null {
  if (typeof raw !== 'string') return null;
  const lower = raw.toLowerCase();
  return TERMINAL_RAW_TO_NORMAL.get(lower) ?? PENDING_RAW_TO_NORMAL.get(lower) ?? null;
}

export interface SimilaritySubmitInitial {
  readonly verificationId: string;
  readonly status: SimilarityStatus;
}

export interface SimilarityOutcome {
  readonly verificationId: string;
  readonly status: SimilarityTerminalStatus;
  readonly attempts: number;
  // The terminal raw response body (from the most recent poll). Surfaced
  // so the drawer can render Sourcify's own message verbatim.
  readonly raw: Readonly<Record<string, unknown>>;
}

export interface SubmitSimilarityVerificationOptions {
  readonly fetchImpl?: FetchLike;
  readonly baseUrl?: string;
  readonly retry?: RetryOptions | true;
  // Maximum number of poll attempts after the initial submit. Each attempt
  // sleeps `pollIntervalMs` (default 1500). Default 20 attempts ≈ 30s
  // ceiling. Tests inject smaller values.
  readonly maxPollAttempts?: number;
  readonly pollIntervalMs?: number;
  // Sleep injection for tests so we don't await real timers.
  readonly sleep?: (ms: number) => Promise<void>;
}

const DEFAULT_MAX_POLL_ATTEMPTS = 20;
const DEFAULT_POLL_INTERVAL_MS = 1_500;

function defaultSleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function resolveRetryOptions(retry: RetryOptions | true | undefined): RetryOptions | undefined {
  if (retry === undefined) return undefined;
  if (retry === true) return {};
  return retry;
}

function classifyHttpFailure(status: number): SourcifyError | null {
  if (status === 429) return { reason: 'rate_limited', message: `sourcify.similarity: rate limited (HTTP 429)`, httpStatus: 429 };
  if (status >= 500) return { reason: 'server_error', message: `sourcify.similarity: server error (HTTP ${status})`, httpStatus: status };
  if (status < 200 || status >= 300) return { reason: 'server_error', message: `sourcify.similarity: unexpected HTTP ${status}`, httpStatus: status };
  return null;
}

async function postSimilarity(
  fetchImpl: FetchLike,
  baseUrl: string,
  chainId: number,
  address: Address,
): Promise<Result<SimilaritySubmitInitial, SourcifyError>> {
  const url = `${baseUrl}/verify/similarity/${chainId}/${address}`;
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { accept: 'application/json' },
    });
  } catch (err) {
    if (err instanceof NetworkUnavailable) {
      return { kind: 'error', error: { reason: 'network_error', message: `sourcify.similarity: ${err.message}`, cause: err.lastError } };
    }
    return {
      kind: 'error',
      error: { reason: 'network_error', message: `sourcify.similarity: ${err instanceof Error ? err.message : String(err)}`, cause: err },
    };
  }

  const httpFail = classifyHttpFailure(response.status);
  if (httpFail !== null) return { kind: 'error', error: httpFail };

  let body: unknown;
  try {
    body = await response.json();
  } catch (err) {
    return { kind: 'error', error: { reason: 'malformed_response', message: `sourcify.similarity: invalid JSON - ${err instanceof Error ? err.message : String(err)}`, cause: err } };
  }
  if (typeof body !== 'object' || body === null) {
    return { kind: 'error', error: { reason: 'malformed_response', message: 'sourcify.similarity: response is not an object' } };
  }
  const o = body as Record<string, unknown>;
  const verificationId = typeof o['verificationId'] === 'string' ? o['verificationId'] : null;
  if (verificationId === null) {
    return { kind: 'error', error: { reason: 'malformed_response', message: 'sourcify.similarity: missing verificationId' } };
  }
  const status = normalizeStatus(o['status']) ?? 'pending';
  return { kind: 'ok', value: { verificationId, status } };
}

async function pollOnce(
  fetchImpl: FetchLike,
  baseUrl: string,
  verificationId: string,
): Promise<Result<{ status: SimilarityStatus; raw: Record<string, unknown> }, SourcifyError>> {
  const url = `${baseUrl}/verify/${verificationId}`;
  let response: Response;
  try {
    response = await fetchImpl(url, { headers: { accept: 'application/json' } });
  } catch (err) {
    if (err instanceof NetworkUnavailable) {
      return { kind: 'error', error: { reason: 'network_error', message: `sourcify.similarity: ${err.message}`, cause: err.lastError } };
    }
    return {
      kind: 'error',
      error: { reason: 'network_error', message: `sourcify.similarity: ${err instanceof Error ? err.message : String(err)}`, cause: err },
    };
  }
  const httpFail = classifyHttpFailure(response.status);
  if (httpFail !== null) return { kind: 'error', error: httpFail };
  let body: unknown;
  try {
    body = await response.json();
  } catch (err) {
    return { kind: 'error', error: { reason: 'malformed_response', message: `sourcify.similarity: invalid JSON - ${err instanceof Error ? err.message : String(err)}`, cause: err } };
  }
  if (typeof body !== 'object' || body === null) {
    return { kind: 'error', error: { reason: 'malformed_response', message: 'sourcify.similarity: response is not an object' } };
  }
  const raw = body as Record<string, unknown>;
  const status = normalizeStatus(raw['status']);
  if (status === null) {
    return { kind: 'error', error: { reason: 'malformed_response', message: `sourcify.similarity: unknown status ${JSON.stringify(raw['status'])}` } };
  }
  return { kind: 'ok', value: { status, raw } };
}

// Submits a bytecode similarity verification request and polls until the
// verification reaches a terminal state (verified | no_match | failed) or
// the poll budget is exhausted. Caller (US-117 orchestrator) re-fetches
// /v2/contract/{chainId}/{address} when status is 'verified' to pick up
// the freshly-verified Sourcify deep payload.
export async function submitSimilarityVerification(
  chainId: number,
  address: Address,
  options: SubmitSimilarityVerificationOptions = {},
): Promise<Result<SimilarityOutcome, SourcifyError>> {
  const baseFetch: FetchLike = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const retryOpts = resolveRetryOptions(options.retry);
  const fetchImpl: FetchLike = retryOpts ? retryableFetch(baseFetch, retryOpts) : baseFetch;
  const baseUrl = options.baseUrl ?? SOURCIFY_BASE_URL;
  const maxAttempts = options.maxPollAttempts ?? DEFAULT_MAX_POLL_ATTEMPTS;
  const pollInterval = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const sleep = options.sleep ?? defaultSleep;

  const submit = await postSimilarity(fetchImpl, baseUrl, chainId, address);
  if (submit.kind === 'error') return submit;

  let attempts = 0;
  let lastRaw: Record<string, unknown> = { status: submit.value.status };
  let lastStatus: SimilarityStatus = submit.value.status;

  // Submit may already be terminal (Sourcify can answer synchronously
  // when the bytecode hits a known matcher).
  if (TERMINAL_STATUSES.has(lastStatus)) {
    return {
      kind: 'ok',
      value: {
        verificationId: submit.value.verificationId,
        status: lastStatus as SimilarityTerminalStatus,
        attempts: 0,
        raw: lastRaw,
      },
    };
  }

  while (attempts < maxAttempts) {
    await sleep(pollInterval);
    attempts += 1;
    const poll = await pollOnce(fetchImpl, baseUrl, submit.value.verificationId);
    if (poll.kind === 'error') return poll;
    lastStatus = poll.value.status;
    lastRaw = poll.value.raw;
    if (TERMINAL_STATUSES.has(lastStatus)) {
      return {
        kind: 'ok',
        value: {
          verificationId: submit.value.verificationId,
          status: lastStatus as SimilarityTerminalStatus,
          attempts,
          raw: lastRaw,
        },
      };
    }
  }

  // Poll budget exhausted. Surface as 'failed' terminal so the orchestrator
  // can move on; the raw payload preserves Sourcify's last-known state.
  return {
    kind: 'ok',
    value: {
      verificationId: submit.value.verificationId,
      status: 'failed',
      attempts,
      raw: { ...lastRaw, _polling: 'budget_exhausted' },
    },
  };
}
