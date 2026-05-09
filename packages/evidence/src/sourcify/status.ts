import type { Address } from '@upgrade-siren/shared';

import {
  SOURCIFY_BASE_URL,
  type FetchLike,
  type Result,
  type SourcifyError,
  type SourcifyMatchLevel,
  type SourcifyStatus,
} from './types.js';

interface FetchSourcifyStatusOptions {
  readonly fetchImpl?: FetchLike;
  readonly baseUrl?: string;
}

function buildUrl(baseUrl: string, chainId: number, address: Address): string {
  return `${baseUrl}/contract/${chainId}/${address}?fields=match`;
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
  const fetchImpl: FetchLike = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const baseUrl = options.baseUrl ?? SOURCIFY_BASE_URL;
  const url = buildUrl(baseUrl, chainId, address);

  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: { accept: 'application/json' },
    });
  } catch (err) {
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
