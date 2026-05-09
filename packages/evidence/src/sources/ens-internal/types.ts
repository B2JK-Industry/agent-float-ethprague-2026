// US-116 ENS-internal source fetcher. EPIC Section 8.4. Reads four signals
// from the ENS subgraph (Graph Network endpoint, free-tier API key required):
//
//   - ensRegistrationDate    : domain.createdAt
//   - subnameCount           : domain.subdomainCount
//   - textRecordCount        : domain.resolver.texts.length
//   - lastRecordUpdateBlock  : most recent TextChanged event on the resolver
//
// The Graph Network endpoint requires an authenticated request:
//   https://gateway.thegraph.com/api/{API_KEY}/subgraphs/id/{SUBGRAPH_ID}
//
// Per launch prompt: if THE_GRAPH_API_KEY is missing at call time, the
// fetcher returns kind:'error' reason:'missing_api_key' so the orchestrator
// can surface a @daniel blocker comment without aborting other sources.

export const ENS_SUBGRAPH_ID = '5XqPmWe6gjyrJtFn9cLy237i4cWw2j9HcUJEXsP5qGtH';

export interface EnsInternalSignals {
  readonly name: string;
  // Unix seconds; null when subgraph returns no domain row (unregistered name).
  readonly registrationDate: number | null;
  // Direct subname count from the subgraph indexer.
  readonly subnameCount: number;
  // Number of text record keys currently published on the resolver.
  readonly textRecordCount: number;
  // Block number of the most recent TextChanged event on the resolver, or
  // null when no such event exists yet (fresh resolver / no records).
  readonly lastRecordUpdateBlock: bigint | null;
}

export type EnsInternalFailureReason =
  | 'missing_api_key'
  | 'invalid_name'
  | 'rate_limited'
  | 'server_error'
  | 'malformed_response'
  | 'graphql_error'
  | 'network_error';

export interface EnsInternalOk {
  readonly kind: 'ok';
  readonly value: EnsInternalSignals;
}

export interface EnsInternalError {
  readonly kind: 'error';
  readonly reason: EnsInternalFailureReason;
  readonly message: string;
  readonly httpStatus?: number;
  readonly cause?: unknown;
}

export type EnsInternalResult = EnsInternalOk | EnsInternalError;
