import type { Abi } from 'viem';

import type { Address } from '@upgrade-siren/shared';

import { NetworkUnavailable, retryableFetch, type RetryOptions } from '../network/retry.js';
import {
  SOURCIFY_BASE_URL,
  type FetchLike,
  type Result,
  type SourcifyError,
  type SourcifyMatchLevel,
  type SourcifyMetadata,
  type SourcifySourceFile,
  type SourcifyStorageLayout,
} from './types.js';

// Codex #51: opt-in retry on 429/5xx via `retry` option.
interface FetchSourcifyMetadataOptions {
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
  return `${baseUrl}/contract/${chainId}/${address}?fields=all`;
}

function parseMatchLevel(raw: unknown): SourcifyMatchLevel | null {
  if (raw === 'exact_match' || raw === 'match') return raw;
  if (raw === null || raw === undefined) return 'not_found';
  return null;
}

function parseAbi(raw: unknown): Abi | null {
  if (raw === null || raw === undefined) return null;
  if (!Array.isArray(raw)) return null;
  return raw as Abi;
}

function parseCompilerSettings(raw: unknown): Record<string, unknown> | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function parseSources(raw: unknown): Record<string, SourcifySourceFile> | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const out: Record<string, SourcifySourceFile> = {};
  for (const [path, value] of Object.entries(obj)) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) continue;
    const content = (value as Record<string, unknown>)['content'];
    if (typeof content !== 'string') continue;
    out[path] = { content };
  }
  return out;
}

function parseStorageLayout(raw: unknown): SourcifyStorageLayout | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const storage = obj['storage'];
  if (!Array.isArray(storage)) return null;
  const entries = storage
    .map((entry) => {
      if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return null;
      const e = entry as Record<string, unknown>;
      const slot = typeof e['slot'] === 'string' ? e['slot'] : null;
      const offset = typeof e['offset'] === 'number' ? e['offset'] : null;
      const type = typeof e['type'] === 'string' ? e['type'] : null;
      const label = typeof e['label'] === 'string' ? e['label'] : null;
      if (slot === null || offset === null || type === null || label === null) return null;
      const contract = typeof e['contract'] === 'string' ? e['contract'] : undefined;
      return contract !== undefined
        ? { slot, offset, type, label, contract }
        : { slot, offset, type, label };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);
  const types = obj['types'];
  if (types !== undefined && (typeof types !== 'object' || Array.isArray(types) || types === null)) {
    return { storage: entries };
  }
  return types === undefined
    ? { storage: entries }
    : { storage: entries, types: types as Record<string, unknown> };
}

export async function fetchSourcifyMetadata(
  chainId: number,
  address: Address,
  options: FetchSourcifyMetadataOptions = {},
): Promise<Result<SourcifyMetadata, SourcifyError>> {
  const baseFetch: FetchLike = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const retryOpts = resolveRetryOptions(options.retry);
  const fetchImpl: FetchLike = retryOpts ? retryableFetch(baseFetch, retryOpts) : baseFetch;
  const baseUrl = options.baseUrl ?? SOURCIFY_BASE_URL;
  const url = buildUrl(baseUrl, chainId, address);

  let response: Response;
  try {
    response = await fetchImpl(url, { headers: { accept: 'application/json' } });
  } catch (err) {
    if (err instanceof NetworkUnavailable) {
      return {
        kind: 'error',
        error: {
          reason: 'network_error',
          message: `sourcify.metadata: ${err.message}`,
          cause: err.lastError,
        },
      };
    }
    return {
      kind: 'error',
      error: {
        reason: 'network_error',
        message: `sourcify.metadata: network error - ${err instanceof Error ? err.message : String(err)}`,
        cause: err,
      },
    };
  }

  if (response.status === 404) {
    return {
      kind: 'ok',
      value: {
        chainId,
        address,
        match: 'not_found',
        abi: null,
        compilerSettings: null,
        sources: null,
        storageLayout: null,
      },
    };
  }

  if (response.status === 429) {
    return {
      kind: 'error',
      error: {
        reason: 'rate_limited',
        message: 'sourcify.metadata: rate limited (HTTP 429)',
        httpStatus: 429,
      },
    };
  }

  if (response.status >= 500) {
    return {
      kind: 'error',
      error: {
        reason: 'server_error',
        message: `sourcify.metadata: server error (HTTP ${response.status})`,
        httpStatus: response.status,
      },
    };
  }

  if (response.status < 200 || response.status >= 300) {
    return {
      kind: 'error',
      error: {
        reason: 'server_error',
        message: `sourcify.metadata: unexpected HTTP ${response.status}`,
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
        message: `sourcify.metadata: invalid JSON - ${err instanceof Error ? err.message : String(err)}`,
        cause: err,
      },
    };
  }

  if (typeof body !== 'object' || body === null) {
    return {
      kind: 'error',
      error: {
        reason: 'malformed_response',
        message: 'sourcify.metadata: response is not an object',
      },
    };
  }

  const obj = body as Record<string, unknown>;
  const match = parseMatchLevel(obj['match']);
  if (match === null) {
    return {
      kind: 'error',
      error: {
        reason: 'malformed_response',
        message: `sourcify.metadata: unknown match value ${JSON.stringify(obj['match'])}`,
      },
    };
  }

  return {
    kind: 'ok',
    value: {
      chainId,
      address,
      match,
      abi: parseAbi(obj['abi']),
      compilerSettings: parseCompilerSettings(obj['compilerSettings']),
      sources: parseSources(obj['sources']),
      storageLayout: parseStorageLayout(obj['storageLayout']),
    },
  };
}
