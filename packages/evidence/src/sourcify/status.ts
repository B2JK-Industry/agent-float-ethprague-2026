import type { Address } from '@upgrade-siren/shared';

import { NetworkUnavailable, retryableFetch, type RetryOptions } from '../network/retry.js';
import {
  SOURCIFY_BASE_URL,
  type FetchLike,
  type Result,
  type SourcifyError,
  type SourcifyMatchLevel,
  type SourcifyStatus,
} from './types.js';

// Codex #51: callers can opt into retry on transient 429/5xx by passing
// `retry: <RetryOptions>` (or `retry: true` for the default backoff). When
// omitted, behaviour is unchanged from US-024.
interface FetchSourcifyStatusOptions {
  readonly fetchImpl?: FetchLike;
  readonly baseUrl?: string;
  readonly retry?: RetryOptions | true;
}

function resolveRetryOptions(retry: RetryOptions | true | undefined): RetryOptions | undefined {
  if (retry === undefined) return undefined;
  if (retry === true) return {};
  return retry;
}

function buildUrl(baseUrl: string, chainId: number, address: Address): string {
  // Sourcify v2 rejects `fields=match` with HTTP 400 ("Field selector match is
  // not a valid field"). `runtimeMatch` is a valid selector and the response
  // includes the headline `match` field regardless, which is all this status
  // probe reads. Without this fix every Sourcify status call 400s in
  // production and the verdict engine sees both impls as unverified.
  return `${baseUrl}/contract/${chainId}/${address}?fields=runtimeMatch`;
}

function parseMatchLevel(raw: unknown): SourcifyMatchLevel | null {
  if (raw === 'exact_match' || raw === 'match') return raw;
  if (raw === null || raw === undefined) return 'not_found';
  return null;
}

export async function fetchSourcifyStatus(
  chainId: number,
  address: Address,
  options: FetchSourcifyStatusOptions = {},
): Promise<Result<SourcifyStatus, SourcifyError>> {
  const baseFetch: FetchLike = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const retryOpts = resolveRetryOptions(options.retry);
  const fetchImpl: FetchLike = retryOpts ? retryableFetch(baseFetch, retryOpts) : baseFetch;
  const baseUrl = options.baseUrl ?? SOURCIFY_BASE_URL;
  const url = buildUrl(baseUrl, chainId, address);

  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: { accept: 'application/json' },
    });
  } catch (err) {
    if (err instanceof NetworkUnavailable) {
      return {
        kind: 'error',
        error: {
          reason: 'network_error',
          message: `sourcify.status: ${err.message}`,
          cause: err.lastError,
        },
      };
    }
    return {
      kind: 'error',
      error: {
        reason: 'network_error',
        message: `sourcify.status: network error - ${err instanceof Error ? err.message : String(err)}`,
        cause: err,
      },
    };
  }

  if (response.status === 404) {
    return {
      kind: 'ok',
      value: { chainId, address, match: 'not_found' },
    };
  }

  if (response.status === 429) {
    return {
      kind: 'error',
      error: {
        reason: 'rate_limited',
        message: `sourcify.status: rate limited (HTTP 429)`,
        httpStatus: response.status,
      },
    };
  }

  if (response.status >= 500) {
    return {
      kind: 'error',
      error: {
        reason: 'server_error',
        message: `sourcify.status: server error (HTTP ${response.status})`,
        httpStatus: response.status,
      },
    };
  }

  if (response.status < 200 || response.status >= 300) {
    return {
      kind: 'error',
      error: {
        reason: 'server_error',
        message: `sourcify.status: unexpected HTTP ${response.status}`,
        httpStatus: response.status,
      },
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
        message: `sourcify.status: invalid JSON - ${err instanceof Error ? err.message : String(err)}`,
        cause: err,
      },
    };
  }

  if (typeof body !== 'object' || body === null) {
    return {
      kind: 'error',
      error: {
        reason: 'malformed_response',
        message: `sourcify.status: response is not an object`,
      },
    };
  }

  const matchRaw = (body as Record<string, unknown>)['match'];
  const match = parseMatchLevel(matchRaw);
  if (match === null) {
    return {
      kind: 'error',
      error: {
        reason: 'malformed_response',
        message: `sourcify.status: unknown match value ${JSON.stringify(matchRaw)}`,
      },
    };
  }

  return {
    kind: 'ok',
    value: { chainId, address, match },
  };
}
