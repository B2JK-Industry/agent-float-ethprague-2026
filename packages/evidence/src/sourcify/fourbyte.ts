// 4byte signature directory lookup. When the current implementation is
// unverified on Sourcify, we still want to expose a low-confidence guess
// at what its function selectors mean. The 4byte directory is community-
// maintained: matches are best-effort, and any name returned here is
// flagged with a `low_confidence` finding when surfaced in the verdict.

import { isRiskySelectorName } from '../diff/abi.js';
import { NetworkUnavailable, retryableFetch, type RetryOptions } from '../network/retry.js';

export const FOURBYTE_BASE_URL = 'https://www.4byte.directory/api/v1';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type FourByteFailureReason =
  | 'rate_limited'
  | 'server_error'
  | 'malformed_response'
  | 'network_error';

export interface FourByteError {
  readonly reason: FourByteFailureReason;
  readonly message: string;
  readonly httpStatus?: number;
  readonly cause?: unknown;
}

export interface SelectorCandidate {
  readonly name: string;
  readonly textSignature: string;
  readonly risky: boolean;
}

export interface SelectorLookup {
  readonly selector: `0x${string}`;
  readonly candidates: ReadonlyArray<SelectorCandidate>;
  readonly anyRisky: boolean;
}

export interface FourByteLookupOk {
  readonly kind: 'ok';
  readonly results: ReadonlyMap<`0x${string}`, SelectorLookup>;
}

export interface FourByteLookupError {
  readonly kind: 'error';
  readonly error: FourByteError;
}

export type FourByteLookupResult = FourByteLookupOk | FourByteLookupError;

// Codex #51: opt-in retry on 429/5xx via `retry` option.
interface Lookup4byteOptions {
  readonly fetchImpl?: FetchLike;
  readonly baseUrl?: string;
  readonly retry?: RetryOptions | true;
}

function resolveRetryOptions(retry: RetryOptions | true | undefined): RetryOptions | undefined {
  if (retry === undefined) return undefined;
  if (retry === true) return {};
  return retry;
}

const SELECTOR_RE = /^0x[a-fA-F0-9]{8}$/;

function functionNameFromTextSignature(textSig: string): string | null {
  // text_signature is like "transfer(address,uint256)"; the name is the
  // identifier before the opening paren.
  const idx = textSig.indexOf('(');
  if (idx <= 0) return null;
  const name = textSig.slice(0, idx);
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : null;
}

async function lookupSingle(
  selector: `0x${string}`,
  fetchImpl: FetchLike,
  baseUrl: string,
): Promise<SelectorLookup | FourByteError> {
  const url = `${baseUrl}/signatures/?hex_signature=${selector}`;
  let response: Response;
  try {
    response = await fetchImpl(url, { headers: { accept: 'application/json' } });
  } catch (err) {
    if (err instanceof NetworkUnavailable) {
      return {
        reason: 'network_error',
        message: `fourbyte: ${err.message}`,
        cause: err.lastError,
      };
    }
    return {
      reason: 'network_error',
      message: `fourbyte: network error - ${err instanceof Error ? err.message : String(err)}`,
      cause: err,
    };
  }

  if (response.status === 429) {
    return {
      reason: 'rate_limited',
      message: 'fourbyte: rate limited (HTTP 429)',
      httpStatus: 429,
    };
  }
  if (response.status >= 500) {
    return {
      reason: 'server_error',
      message: `fourbyte: server error (HTTP ${response.status})`,
      httpStatus: response.status,
    };
  }
  if (response.status === 404) {
    // 404 sometimes indicates "no match"; treat as empty candidates.
    return { selector, candidates: [], anyRisky: false };
  }
  if (response.status < 200 || response.status >= 300) {
    return {
      reason: 'server_error',
      message: `fourbyte: unexpected HTTP ${response.status}`,
      httpStatus: response.status,
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (err) {
    return {
      reason: 'malformed_response',
      message: `fourbyte: invalid JSON - ${err instanceof Error ? err.message : String(err)}`,
      cause: err,
    };
  }

  if (typeof body !== 'object' || body === null) {
    return { reason: 'malformed_response', message: 'fourbyte: response is not an object' };
  }

  const results = (body as { results?: unknown }).results;
  if (!Array.isArray(results)) {
    return { reason: 'malformed_response', message: 'fourbyte: response.results is not an array' };
  }

  const candidates: SelectorCandidate[] = [];
  for (const entry of results) {
    if (typeof entry !== 'object' || entry === null) continue;
    const textSig = (entry as { text_signature?: unknown }).text_signature;
    if (typeof textSig !== 'string') continue;
    const name = functionNameFromTextSignature(textSig);
    if (name === null) continue;
    candidates.push({
      name,
      textSignature: textSig,
      risky: isRiskySelectorName(name),
    });
  }

  return {
    selector,
    candidates,
    anyRisky: candidates.some((c) => c.risky),
  };
}

export async function lookup4byteSelectors(
  selectors: ReadonlyArray<`0x${string}`>,
  options: Lookup4byteOptions = {},
): Promise<FourByteLookupResult> {
  for (const s of selectors) {
    if (!SELECTOR_RE.test(s)) {
      return {
        kind: 'error',
        error: {
          reason: 'malformed_response',
          message: `fourbyte: invalid selector format ${JSON.stringify(s)}`,
        },
      };
    }
  }

  const baseFetch: FetchLike = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const retryOpts = resolveRetryOptions(options.retry);
  const fetchImpl: FetchLike = retryOpts ? retryableFetch(baseFetch, retryOpts) : baseFetch;
  const baseUrl = options.baseUrl ?? FOURBYTE_BASE_URL;

  const lookups = await Promise.all(
    selectors.map((s) => lookupSingle(s, fetchImpl, baseUrl)),
  );

  for (const r of lookups) {
    if ('reason' in r) {
      return { kind: 'error', error: r };
    }
  }

  const map = new Map<`0x${string}`, SelectorLookup>();
  for (const r of lookups) {
    if ('selector' in r) {
      map.set(r.selector, r);
    }
  }

  return { kind: 'ok', results: map };
}
