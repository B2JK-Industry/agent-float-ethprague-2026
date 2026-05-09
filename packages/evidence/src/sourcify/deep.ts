import type { Address } from '@upgrade-siren/shared';

import { NetworkUnavailable, retryableFetch, type RetryOptions } from '../network/retry.js';
import {
  SOURCIFY_BASE_URL,
  type FetchLike,
  type Result,
  type SourcifyError,
  type SourcifyMatchLevel,
} from './types.js';

// Sourcify v2 deep-field fetcher (US-113). EPIC Section 8.1 P0/P1 matrix.
// Distinct from fetchSourcifyStatus / fetchSourcifyMetadata which are public
// API consumed by /r/[name] (US-068) — those must not be modified.
//
// `match` is intentionally omitted from `SourcifyDeepField` because Sourcify
// v2 rejects `fields=match` with HTTP 400 ("Field selector match is not a
// valid field"). The top-level `match` header is returned regardless of the
// `fields=` query — see fetchSourcifyStatus for the same workaround note.
export const SOURCIFY_DEEP_FIELDS = [
  'creationMatch',
  'runtimeMatch',
  'compilation',
  'signatures.function',
  'signatures.event',
  'metadata',
  'proxyResolution',
  'userdoc',
  'devdoc',
] as const;

export type SourcifyDeepField = (typeof SOURCIFY_DEEP_FIELDS)[number];

export interface SourcifyDeepCompilation {
  readonly compiler: string | null;
  readonly compilerVersion: string | null;
  readonly language: string | null;
  readonly evmVersion: string | null;
  readonly optimizerEnabled: boolean | null;
  readonly optimizerRuns: number | null;
  readonly contractName: string | null;
  readonly fullyQualifiedName: string | null;
}

export interface SourcifyDeepFunctionSignature {
  readonly selector: string;
  readonly signature: string;
}

export interface SourcifyDeepEventSignature {
  readonly topicHash: string;
  readonly signature: string;
}

export interface SourcifyDeepLicense {
  readonly path: string;
  readonly license: string;
}

export interface SourcifyDeepProxyImplementation {
  readonly address: Address;
  readonly name: string | null;
}

export interface SourcifyDeepProxyResolution {
  readonly isProxy: boolean | null;
  readonly proxyType: string | null;
  readonly implementations: ReadonlyArray<SourcifyDeepProxyImplementation>;
}

export interface SourcifyDeep {
  readonly chainId: number;
  readonly address: Address;
  readonly match: SourcifyMatchLevel;
  readonly creationMatch: SourcifyMatchLevel | null;
  readonly runtimeMatch: SourcifyMatchLevel | null;
  readonly compilation: SourcifyDeepCompilation | null;
  readonly functionSignatures: ReadonlyArray<SourcifyDeepFunctionSignature> | null;
  readonly eventSignatures: ReadonlyArray<SourcifyDeepEventSignature> | null;
  readonly licenses: ReadonlyArray<SourcifyDeepLicense> | null;
  readonly userdoc: Readonly<Record<string, unknown>> | null;
  readonly devdoc: Readonly<Record<string, unknown>> | null;
  readonly proxyResolution: SourcifyDeepProxyResolution | null;
}

export interface FetchSourcifyDeepOptions {
  readonly fetchImpl?: FetchLike;
  readonly baseUrl?: string;
  readonly retry?: RetryOptions | true;
  readonly fields?: ReadonlyArray<SourcifyDeepField>;
}

function resolveRetryOptions(retry: RetryOptions | true | undefined): RetryOptions | undefined {
  if (retry === undefined) return undefined;
  if (retry === true) return {};
  return retry;
}

function buildUrl(
  baseUrl: string,
  chainId: number,
  address: Address,
  fields: ReadonlyArray<SourcifyDeepField>,
): string {
  return `${baseUrl}/contract/${chainId}/${address}?fields=${fields.join(',')}`;
}

function parseMatchLevel(raw: unknown): SourcifyMatchLevel | null {
  if (raw === 'exact_match' || raw === 'match') return raw;
  if (raw === null || raw === undefined) return 'not_found';
  return null;
}

function parseStringOrNull(raw: unknown): string | null {
  return typeof raw === 'string' ? raw : null;
}

function parseBoolOrNull(raw: unknown): boolean | null {
  return typeof raw === 'boolean' ? raw : null;
}

function parseNumberOrNull(raw: unknown): number | null {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

function parseObjectOrNull(raw: unknown): Record<string, unknown> | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function parseCompilation(raw: unknown): SourcifyDeepCompilation | null {
  const obj = parseObjectOrNull(raw);
  if (obj === null) return null;
  const optimizer = parseObjectOrNull(obj['optimizer']);
  return {
    compiler: parseStringOrNull(obj['compiler']),
    compilerVersion: parseStringOrNull(obj['compilerVersion']) ?? parseStringOrNull(obj['version']),
    language: parseStringOrNull(obj['language']),
    evmVersion: parseStringOrNull(obj['evmVersion']),
    optimizerEnabled: optimizer ? parseBoolOrNull(optimizer['enabled']) : null,
    optimizerRuns: optimizer ? parseNumberOrNull(optimizer['runs']) : null,
    contractName: parseStringOrNull(obj['name']) ?? parseStringOrNull(obj['contractName']),
    fullyQualifiedName: parseStringOrNull(obj['fullyQualifiedName']),
  };
}

function parseSignaturesMap(raw: unknown): Record<string, string> | null {
  const obj = parseObjectOrNull(raw);
  if (obj === null) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

function parseFunctionSignatures(raw: unknown): ReadonlyArray<SourcifyDeepFunctionSignature> | null {
  const sigsRoot = parseObjectOrNull(raw);
  if (sigsRoot === null) return null;
  // Sourcify v2 returns `signatures: { function: {selector: signature}, event: ... }`.
  // Some CSV-fields responses flatten one level (signatures.function → returns
  // { function: {...} } at top-level under `signatures`). Try both.
  const fnMap =
    parseSignaturesMap(sigsRoot['function']) ??
    parseSignaturesMap(sigsRoot);
  if (fnMap === null) return null;
  return Object.entries(fnMap).map(([selector, signature]) => ({ selector, signature }));
}

function parseEventSignatures(raw: unknown): ReadonlyArray<SourcifyDeepEventSignature> | null {
  const sigsRoot = parseObjectOrNull(raw);
  if (sigsRoot === null) return null;
  const evMap =
    parseSignaturesMap(sigsRoot['event']) ??
    parseSignaturesMap(sigsRoot);
  if (evMap === null) return null;
  return Object.entries(evMap).map(([topicHash, signature]) => ({ topicHash, signature }));
}

function parseLicensesFromMetadata(metadataRaw: unknown): ReadonlyArray<SourcifyDeepLicense> | null {
  const metadata = parseObjectOrNull(metadataRaw);
  if (metadata === null) return null;
  const sources = parseObjectOrNull(metadata['sources']);
  if (sources === null) return null;
  const out: SourcifyDeepLicense[] = [];
  for (const [path, value] of Object.entries(sources)) {
    const v = parseObjectOrNull(value);
    if (v === null) continue;
    const license = parseStringOrNull(v['license']);
    if (license === null) continue;
    out.push({ path, license });
  }
  return out;
}

function parseProxyResolution(raw: unknown): SourcifyDeepProxyResolution | null {
  const obj = parseObjectOrNull(raw);
  if (obj === null) return null;
  const implsRaw = obj['implementations'];
  const implementations: SourcifyDeepProxyImplementation[] = [];
  if (Array.isArray(implsRaw)) {
    for (const item of implsRaw) {
      const v = parseObjectOrNull(item);
      if (v === null) continue;
      const addr = parseStringOrNull(v['address']);
      if (addr === null || !/^0x[a-fA-F0-9]{40}$/.test(addr)) continue;
      implementations.push({
        address: addr as Address,
        name: parseStringOrNull(v['name']),
      });
    }
  }
  return {
    isProxy: parseBoolOrNull(obj['isProxy']),
    proxyType: parseStringOrNull(obj['proxyType']),
    implementations,
  };
}

function notFoundShape(chainId: number, address: Address): SourcifyDeep {
  return {
    chainId,
    address,
    match: 'not_found',
    creationMatch: null,
    runtimeMatch: null,
    compilation: null,
    functionSignatures: null,
    eventSignatures: null,
    licenses: null,
    userdoc: null,
    devdoc: null,
    proxyResolution: null,
  };
}

export async function fetchSourcifyDeep(
  chainId: number,
  address: Address,
  options: FetchSourcifyDeepOptions = {},
): Promise<Result<SourcifyDeep, SourcifyError>> {
  const baseFetch: FetchLike = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const retryOpts = resolveRetryOptions(options.retry);
  const fetchImpl: FetchLike = retryOpts ? retryableFetch(baseFetch, retryOpts) : baseFetch;
  const baseUrl = options.baseUrl ?? SOURCIFY_BASE_URL;
  const fields = options.fields ?? SOURCIFY_DEEP_FIELDS;
  const url = buildUrl(baseUrl, chainId, address, fields);

  let response: Response;
  try {
    response = await fetchImpl(url, { headers: { accept: 'application/json' } });
  } catch (err) {
    if (err instanceof NetworkUnavailable) {
      return {
        kind: 'error',
        error: {
          reason: 'network_error',
          message: `sourcify.deep: ${err.message}`,
          cause: err.lastError,
        },
      };
    }
    return {
      kind: 'error',
      error: {
        reason: 'network_error',
        message: `sourcify.deep: network error - ${err instanceof Error ? err.message : String(err)}`,
        cause: err,
      },
    };
  }

  if (response.status === 404) {
    return { kind: 'ok', value: notFoundShape(chainId, address) };
  }

  if (response.status === 429) {
    return {
      kind: 'error',
      error: {
        reason: 'rate_limited',
        message: 'sourcify.deep: rate limited (HTTP 429)',
        httpStatus: 429,
      },
    };
  }

  if (response.status >= 500) {
    return {
      kind: 'error',
      error: {
        reason: 'server_error',
        message: `sourcify.deep: server error (HTTP ${response.status})`,
        httpStatus: response.status,
      },
    };
  }

  if (response.status < 200 || response.status >= 300) {
    return {
      kind: 'error',
      error: {
        reason: 'server_error',
        message: `sourcify.deep: unexpected HTTP ${response.status}`,
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
        message: `sourcify.deep: invalid JSON - ${err instanceof Error ? err.message : String(err)}`,
        cause: err,
      },
    };
  }

  if (typeof body !== 'object' || body === null) {
    return {
      kind: 'error',
      error: {
        reason: 'malformed_response',
        message: 'sourcify.deep: response is not an object',
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
        message: `sourcify.deep: unknown match value ${JSON.stringify(obj['match'])}`,
      },
    };
  }

  return {
    kind: 'ok',
    value: {
      chainId,
      address,
      match,
      creationMatch: parseMatchLevel(obj['creationMatch']),
      runtimeMatch: parseMatchLevel(obj['runtimeMatch']),
      compilation: parseCompilation(obj['compilation']),
      functionSignatures: parseFunctionSignatures(obj['signatures']),
      eventSignatures: parseEventSignatures(obj['signatures']),
      licenses: parseLicensesFromMetadata(obj['metadata']),
      userdoc: parseObjectOrNull(obj['userdoc']),
      devdoc: parseObjectOrNull(obj['devdoc']),
      proxyResolution: parseProxyResolution(obj['proxyResolution']),
    },
  };
}
