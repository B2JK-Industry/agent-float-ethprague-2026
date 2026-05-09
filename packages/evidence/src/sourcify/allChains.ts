import type { Address } from '@upgrade-siren/shared';

import { NetworkUnavailable, retryableFetch, type RetryOptions } from '../network/retry.js';
import {
  SOURCIFY_BASE_URL,
  type FetchLike,
  type Result,
  type SourcifyError,
  type SourcifyMatchLevel,
} from './types.js';

// Sourcify v2 cross-chain auto-discovery (consumed by US-112 public-read
// fallback inference, and later by US-120 P1 cross-chain discovery for
// opt-in subjects). Endpoint: GET /v2/contract/all-chains/{address}.
//
// Distinct from fetchSourcifyStatus / fetchSourcifyMetadata / fetchSourcifyDeep
// because the response shape is a list-by-chain rather than a single contract
// payload.

export interface SourcifyAllChainsEntry {
  readonly chainId: number;
  readonly address: Address;
  readonly match: SourcifyMatchLevel;
  // Sourcify response includes per-chain match-level metadata; we surface
  // creationMatch + runtimeMatch when available so callers (US-112) can
  // promote only "exact" entries to the inferred manifest.
  readonly creationMatch: SourcifyMatchLevel | null;
  readonly runtimeMatch: SourcifyMatchLevel | null;
}

export interface FetchSourcifyAllChainsOptions {
  readonly fetchImpl?: FetchLike;
  readonly baseUrl?: string;
  readonly retry?: RetryOptions | true;
}

function resolveRetryOptions(retry: RetryOptions | true | undefined): RetryOptions | undefined {
  if (retry === undefined) return undefined;
  if (retry === true) return {};
  return retry;
}

// Top-level `match`: required. null/undefined input is the wire-shape for
// "no Sourcify match" → surface as 'not_found' value.
function parseTopLevelMatch(raw: unknown): SourcifyMatchLevel | null {
  if (raw === 'exact_match' || raw === 'match') return raw;
  if (raw === null || raw === undefined) return 'not_found';
  return null;
}

// Sub-field `creationMatch` / `runtimeMatch`: optional. null/undefined input
// means "field absent from response" — surface as null. Unknown string input
// also surfaces as null (silent skip; the top-level match still drives
// promotion logic).
function parseSubMatch(raw: unknown): SourcifyMatchLevel | null {
  if (raw === 'exact_match' || raw === 'match') return raw;
  return null;
}

function parseEntry(raw: unknown): SourcifyAllChainsEntry | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const chainIdRaw = o['chainId'];
  let chainId: number | null = null;
  if (typeof chainIdRaw === 'number' && Number.isFinite(chainIdRaw)) chainId = chainIdRaw;
  else if (typeof chainIdRaw === 'string') {
    const n = Number(chainIdRaw);
    if (Number.isFinite(n)) chainId = n;
  }
  if (chainId === null || chainId <= 0) return null;
  const addr = o['address'];
  if (typeof addr !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(addr)) return null;
  const match = parseTopLevelMatch(o['match']);
  if (match === null) return null;
  return {
    chainId,
    address: addr as Address,
    match,
    creationMatch: parseSubMatch(o['creationMatch']),
    runtimeMatch: parseSubMatch(o['runtimeMatch']),
  };
}

// Fetches Sourcify's per-chain match list for `address`. Only entries with
// a recognised match level land in the result. 404 → empty list (Sourcify
// has no record of this address on any chain). Rate-limit / server / network
// failures surface as discriminated errors.
export async function fetchSourcifyAllChains(
  address: Address,
  options: FetchSourcifyAllChainsOptions = {},
): Promise<Result<ReadonlyArray<SourcifyAllChainsEntry>, SourcifyError>> {
  const baseFetch: FetchLike = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const retryOpts = resolveRetryOptions(options.retry);
  const fetchImpl: FetchLike = retryOpts ? retryableFetch(baseFetch, retryOpts) : baseFetch;
  const baseUrl = options.baseUrl ?? SOURCIFY_BASE_URL;
  const url = `${baseUrl}/contract/all-chains/${address}`;

  let response: Response;
  try {
    response = await fetchImpl(url, { headers: { accept: 'application/json' } });
  } catch (err) {
    if (err instanceof NetworkUnavailable) {
      return {
        kind: 'error',
        error: {
          reason: 'network_error',
          message: `sourcify.allChains: ${err.message}`,
          cause: err.lastError,
        },
      };
    }
    return {
      kind: 'error',
      error: {
        reason: 'network_error',
        message: `sourcify.allChains: network error - ${err instanceof Error ? err.message : String(err)}`,
        cause: err,
      },
    };
  }

  if (response.status === 404) return { kind: 'ok', value: [] };
  if (response.status === 429) {
    return {
      kind: 'error',
      error: { reason: 'rate_limited', message: 'sourcify.allChains: rate limited (HTTP 429)', httpStatus: 429 },
    };
  }
  if (response.status >= 500) {
    return {
      kind: 'error',
      error: { reason: 'server_error', message: `sourcify.allChains: server error (HTTP ${response.status})`, httpStatus: response.status },
    };
  }
  if (response.status < 200 || response.status >= 300) {
    return {
      kind: 'error',
      error: { reason: 'server_error', message: `sourcify.allChains: unexpected HTTP ${response.status}`, httpStatus: response.status },
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (err) {
    return {
      kind: 'error',
      error: {
        reason: 'malformed_response',
        message: `sourcify.allChains: invalid JSON - ${err instanceof Error ? err.message : String(err)}`,
        cause: err,
      },
    };
  }

  // Sourcify v2 returns either a top-level array OR `{ results: [...] }`
  // depending on the API version. Tolerate both shapes; callers don't see
  // the wire-level wrapping.
  let arr: unknown;
  if (Array.isArray(body)) arr = body;
  else if (body !== null && typeof body === 'object' && Array.isArray((body as Record<string, unknown>)['results'])) {
    arr = (body as Record<string, unknown>)['results'];
  } else {
    return {
      kind: 'error',
      error: { reason: 'malformed_response', message: 'sourcify.allChains: response is not an array or { results }' },
    };
  }

  const out: SourcifyAllChainsEntry[] = [];
  for (const item of arr as ReadonlyArray<unknown>) {
    const parsed = parseEntry(item);
    if (parsed) out.push(parsed);
  }
  return { kind: 'ok', value: out };
}
