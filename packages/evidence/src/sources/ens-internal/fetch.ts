import { NetworkUnavailable, retryableFetch, type RetryOptions } from '../../network/retry.js';
import type { FetchLike } from '../../sourcify/types.js';
import {
  ENS_SUBGRAPH_ID,
  type EnsInternalError,
  type EnsInternalResult,
  type EnsInternalSignals,
} from './types.js';

export interface FetchEnsInternalSignalsOptions {
  // Required at call time; surfaced as kind:'error' reason:'missing_api_key'
  // when empty so the orchestrator can render the @daniel blocker without
  // failing the whole subject fetch.
  readonly apiKey: string;
  readonly subgraphId?: string;
  readonly fetchImpl?: FetchLike;
  readonly retry?: RetryOptions | true;
  // Override the gateway base URL (default https://gateway.thegraph.com).
  // Tests pin it to the production URL; future on-prem deployments can
  // redirect.
  readonly gatewayBaseUrl?: string;
}

const DEFAULT_GATEWAY = 'https://gateway.thegraph.com';

const ENS_NAME_RE = /^(?:[a-z0-9_-]+\.)+(?:eth|test)$/i;

function isPlausibleEnsName(name: string): boolean {
  if (typeof name !== 'string' || name.length === 0 || name.length > 255) return false;
  if (!ENS_NAME_RE.test(name)) return false;
  return name.split('.').every((label) => label.length > 0 && label.length <= 63);
}

function resolveRetryOptions(retry: RetryOptions | true | undefined): RetryOptions | undefined {
  if (retry === undefined) return undefined;
  if (retry === true) return {};
  return retry;
}

// GraphQL query — kept as a single template string so the wire format is
// grep-able. The resolver/subdomainCount/events shape mirrors the public
// ENS subgraph schema (entity names: Domain, Resolver, TextChanged).
//
// audit-round-7 P1 #6: the prior `events(where: { event: "TextChanged" })`
// filter was schema-invalid — `ResolverEvent` does not expose an `event`
// field for filtering. The Graph rejects the predicate (or silently
// returns all event types depending on gateway tolerance), so the parser
// could pick a non-TextChanged block as `lastRecordUpdateBlock`,
// inflating recency for events that aren't text-record updates. Fix:
// drop the broken filter, ask for `__typename` + `blockNumber`, fetch a
// small head window of events, and filter to TextChanged in code. The
// head window is bounded so a resolver with a long stream of non-text
// events won't pull arbitrary amounts.
const EVENTS_HEAD_WINDOW = 25;
const GRAPHQL_QUERY = `
query EnsInternalSignals($name: String!) {
  domains(where: { name: $name }, first: 1) {
    id
    name
    createdAt
    subdomainCount
    resolver {
      id
      texts
      events(orderBy: blockNumber, orderDirection: desc, first: ${EVENTS_HEAD_WINDOW}) {
        __typename
        blockNumber
      }
    }
  }
}
`.trim();

interface DomainNode {
  readonly createdAt?: unknown;
  readonly subdomainCount?: unknown;
  readonly resolver?: {
    readonly texts?: unknown;
    readonly events?: ReadonlyArray<{
      readonly __typename?: unknown;
      readonly blockNumber?: unknown;
    }>;
  } | null;
}

function parseUnixSeconds(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function parseInteger(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.trunc(raw);
  if (typeof raw === 'string') {
    const n = Number(raw);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return 0;
}

function parseTextsLength(raw: unknown): number {
  return Array.isArray(raw) ? raw.length : 0;
}

// audit-round-7 P1 #6: filter to TextChanged in code now that the
// GraphQL `where` predicate is gone. Older fixtures lacked `__typename`
// because the buggy query implicitly trusted that every returned event
// was TextChanged; treat a missing `__typename` as a TextChanged event
// for backward-compat (the wire change is additive and the fetcher
// would otherwise break the moment a real subgraph response includes
// non-TextChanged events ahead of TextChanged ones).
function parseLastBlock(
  events: ReadonlyArray<{ readonly __typename?: unknown; readonly blockNumber?: unknown }> | undefined,
): bigint | null {
  if (!events || events.length === 0) return null;
  for (const ev of events) {
    const typename = ev.__typename;
    if (typename !== undefined && typename !== 'TextChanged') continue;
    const raw = ev.blockNumber;
    if (typeof raw === 'string') {
      try {
        return BigInt(raw);
      } catch {
        return null;
      }
    }
    if (typeof raw === 'number' && Number.isFinite(raw)) return BigInt(Math.trunc(raw));
  }
  return null;
}

function buildSignals(name: string, domain: DomainNode | null): EnsInternalSignals {
  if (domain === null) {
    return {
      name,
      registrationDate: null,
      subnameCount: 0,
      textRecordCount: 0,
      lastRecordUpdateBlock: null,
    };
  }
  return {
    name,
    registrationDate: parseUnixSeconds(domain.createdAt),
    subnameCount: parseInteger(domain.subdomainCount),
    textRecordCount: parseTextsLength(domain.resolver?.texts),
    lastRecordUpdateBlock: parseLastBlock(domain.resolver?.events),
  };
}

// Reads four ENS-internal signals for a single ENS name from The Graph Network
// gateway. Failure isolation: every error path returns a discriminated
// EnsInternalError with a typed reason; the orchestrator never throws.
export async function fetchEnsInternalSignals(
  name: string,
  options: FetchEnsInternalSignalsOptions,
): Promise<EnsInternalResult> {
  if (!options.apiKey || options.apiKey.length === 0) {
    return {
      kind: 'error',
      reason: 'missing_api_key',
      message: 'ens-internal: THE_GRAPH_API_KEY is required for the Graph Network gateway',
    };
  }

  if (!isPlausibleEnsName(name)) {
    return {
      kind: 'error',
      reason: 'invalid_name',
      message: `ens-internal: invalid ENS name ${JSON.stringify(name)}`,
    };
  }

  const baseFetch: FetchLike = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const retryOpts = resolveRetryOptions(options.retry);
  const fetchImpl: FetchLike = retryOpts ? retryableFetch(baseFetch, retryOpts) : baseFetch;
  const subgraphId = options.subgraphId ?? ENS_SUBGRAPH_ID;
  const gatewayBaseUrl = options.gatewayBaseUrl ?? DEFAULT_GATEWAY;
  const url = `${gatewayBaseUrl}/api/${options.apiKey}/subgraphs/id/${subgraphId}`;

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query: GRAPHQL_QUERY, variables: { name } }),
    });
  } catch (err) {
    if (err instanceof NetworkUnavailable) {
      return errorOf('network_error', `ens-internal: ${err.message}`, err.lastError);
    }
    return errorOf(
      'network_error',
      `ens-internal: network error - ${err instanceof Error ? err.message : String(err)}`,
      err,
    );
  }

  if (response.status === 429) {
    return { kind: 'error', reason: 'rate_limited', message: 'ens-internal: rate limited (HTTP 429)', httpStatus: 429 };
  }
  if (response.status >= 500) {
    return { kind: 'error', reason: 'server_error', message: `ens-internal: server error (HTTP ${response.status})`, httpStatus: response.status };
  }
  if (response.status < 200 || response.status >= 300) {
    return { kind: 'error', reason: 'server_error', message: `ens-internal: unexpected HTTP ${response.status}`, httpStatus: response.status };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (err) {
    return errorOf(
      'malformed_response',
      `ens-internal: invalid JSON - ${err instanceof Error ? err.message : String(err)}`,
      err,
    );
  }

  if (typeof body !== 'object' || body === null) {
    return { kind: 'error', reason: 'malformed_response', message: 'ens-internal: response is not an object' };
  }

  const obj = body as Record<string, unknown>;
  if (Array.isArray(obj['errors']) && obj['errors'].length > 0) {
    const head = obj['errors'][0];
    const msg = head && typeof head === 'object' && 'message' in head && typeof (head as { message: unknown }).message === 'string'
      ? (head as { message: string }).message
      : JSON.stringify(head);
    return { kind: 'error', reason: 'graphql_error', message: `ens-internal: graphql error - ${msg}` };
  }

  const data = obj['data'];
  if (typeof data !== 'object' || data === null) {
    return { kind: 'error', reason: 'malformed_response', message: 'ens-internal: missing data block' };
  }

  const domains = (data as Record<string, unknown>)['domains'];
  if (!Array.isArray(domains)) {
    return { kind: 'error', reason: 'malformed_response', message: 'ens-internal: data.domains is not an array' };
  }

  const head = domains[0];
  const domain = head && typeof head === 'object' ? (head as DomainNode) : null;

  return { kind: 'ok', value: buildSignals(name, domain) };
}

function errorOf(reason: EnsInternalError['reason'], message: string, cause?: unknown): EnsInternalError {
  if (cause === undefined) {
    return { kind: 'error', reason, message };
  }
  return { kind: 'error', reason, message, cause };
}
