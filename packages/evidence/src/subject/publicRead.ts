import { createPublicClient, http, isAddress, type Address as ViemAddress, type PublicClient } from 'viem';
import { mainnet, sepolia } from 'viem/chains';

import type {
  Address,
  SubjectOnchainSource,
  SubjectSourcifyEntry,
} from '@upgrade-siren/shared';

import { withRetry, type RetryOptions } from '../network/retry.js';
import {
  fetchSourcifyAllChains,
  type FetchSourcifyAllChainsOptions,
  type SourcifyAllChainsEntry,
} from '../sourcify/allChains.js';

export type SubjectPublicReadFailureReason =
  | 'invalid_name'
  | 'unsupported_chain'
  | 'rpc_error'
  | 'sourcify_error';

export interface SubjectPublicReadInferredSources {
  // Promoted from Sourcify all-chains lookup. Only entries with a
  // recognised match level land here; the score engine treats this as
  // verified evidence (Sourcify is the verified source per Section 9).
  readonly sourcify: ReadonlyArray<SubjectSourcifyEntry>;
  // null when ENS addr() resolved to zero / no record.
  readonly onchain: SubjectOnchainSource | null;
  // github intentionally absent in public-read: the user made no claim, so
  // the engine has nothing to discount.
  // ensInternal will be populated by the orchestrator (US-117) from the
  // US-116 fetcher; it is always available regardless of opt-in.
}

export interface SubjectPublicReadInference {
  readonly name: string;
  readonly chainId: number;
  // null when ENS addr() resolved to no value (subject ENS exists but has
  // no addr record). Caller surfaces "U" tier in this case.
  readonly primaryAddress: Address | null;
  readonly sources: SubjectPublicReadInferredSources;
}

export interface SubjectPublicReadOk {
  readonly kind: 'ok';
  readonly value: SubjectPublicReadInference;
}

export interface SubjectPublicReadError {
  readonly kind: 'error';
  readonly reason: SubjectPublicReadFailureReason;
  readonly message: string;
  readonly cause?: unknown;
}

export type SubjectPublicReadResolutionResult = SubjectPublicReadOk | SubjectPublicReadError;

export interface InferSubjectFromPublicReadOptions {
  readonly chainId?: number;
  readonly rpcUrl?: string;
  readonly client?: PublicClient;
  readonly retry?: RetryOptions | true;
  readonly sourcifyOptions?: FetchSourcifyAllChainsOptions;
  // Default chains in the all-chains lookup are NOT filtered; we accept
  // every chain Sourcify reports. Callers wanting a narrower view can
  // post-filter the returned entries.
}

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

function resolveClient(
  chainId: number,
  options: InferSubjectFromPublicReadOptions,
): PublicClient | SubjectPublicReadError {
  if (options.client) return options.client;
  let chain;
  if (chainId === mainnet.id) chain = mainnet;
  else if (chainId === sepolia.id) chain = sepolia;
  else {
    return {
      kind: 'error',
      reason: 'unsupported_chain',
      message: `subject.publicRead: unsupported chainId ${chainId}; expected ${mainnet.id} or ${sepolia.id}`,
    };
  }
  return createPublicClient({ chain, transport: http(options.rpcUrl) });
}

function isZeroAddress(addr: string): boolean {
  return addr === '0x0000000000000000000000000000000000000000';
}

// Promotes Sourcify all-chains entries into the SubjectSourcifyEntry shape
// the orchestrator expects. The label is synthesised because public-read
// has no manifest-author intent — it surfaces "Discovered (chain N)" so
// the drawer makes the inference visible.
//
// audit-round-7 P1 #8: the prior implementation promoted EVERY entry
// regardless of `match` level. Sourcify's all-chains response includes
// `not_found` rows (Sourcify saw the address but had no verified source)
// — promoting those entries downstream caused the orchestrator to
// surface a "Discovered" Sourcify row that the score engine then
// scored as a failed-deep-fetch error rather than honestly omitting.
// The interface comment in `SubjectPublicReadInferredSources` already
// declared the intent ("Only entries with a recognised match level
// land here"); the implementation now matches the contract.
function promoteEntries(entries: ReadonlyArray<SourcifyAllChainsEntry>): SubjectSourcifyEntry[] {
  return entries
    .filter((e) => e.match === 'exact_match' || e.match === 'match')
    .map((e) => ({
      chainId: e.chainId,
      address: e.address,
      label: `Discovered (chain ${e.chainId})`,
    }));
}

// Public-read inference (US-112). Fired when subject ENS name has no
// `agent-bench:bench_manifest` text record. Reads ENS addr() and the
// Sourcify all-chains list to assemble a partial sources object the
// score engine can run against. Caller (US-117 orchestrator) layers the
// US-116 ENS-internal signals on top.
//
// Returns ok-shaped even when primaryAddress is null. The score engine
// caps tier at A in public-read mode regardless (per Section 7); callers
// must surface the public-read banner (`confidence: public-read`).
export async function inferSubjectFromPublicRead(
  name: string,
  options: InferSubjectFromPublicReadOptions = {},
): Promise<SubjectPublicReadResolutionResult> {
  if (!isPlausibleEnsName(name)) {
    return { kind: 'error', reason: 'invalid_name', message: `subject.publicRead: invalid ENS name ${JSON.stringify(name)}` };
  }
  const chainId = options.chainId ?? mainnet.id;
  const clientOrError = resolveClient(chainId, options);
  if ('kind' in clientOrError && clientOrError.kind === 'error') return clientOrError;
  const client = clientOrError as PublicClient;
  const retryOpts = resolveRetryOptions(options.retry);

  let primaryAddress: Address | null = null;
  try {
    const callAddr = (): Promise<ViemAddress | null> =>
      client.getEnsAddress({ name }).then((v) => v ?? null);
    const raw = retryOpts ? await withRetry(callAddr, retryOpts) : await callAddr();
    if (raw !== null && isAddress(raw) && !isZeroAddress(raw)) {
      primaryAddress = raw as Address;
    }
  } catch (err) {
    return {
      kind: 'error',
      reason: 'rpc_error',
      message: `subject.publicRead: getEnsAddress failed - ${err instanceof Error ? err.message : String(err)}`,
      cause: err,
    };
  }

  let sourcifyEntries: ReadonlyArray<SubjectSourcifyEntry> = [];
  if (primaryAddress !== null) {
    const allChainsRes = await fetchSourcifyAllChains(primaryAddress, options.sourcifyOptions);
    if (allChainsRes.kind === 'error') {
      return {
        kind: 'error',
        reason: 'sourcify_error',
        message: `subject.publicRead: sourcify all-chains failed - ${allChainsRes.error.message}`,
        cause: allChainsRes.error,
      };
    }
    sourcifyEntries = promoteEntries(allChainsRes.value);
  }

  const onchain: SubjectOnchainSource | null = primaryAddress !== null
    ? { primaryAddress, claimedFirstTxHash: null }
    : null;

  return {
    kind: 'ok',
    value: {
      name,
      chainId,
      primaryAddress,
      sources: {
        sourcify: sourcifyEntries,
        onchain,
      },
    },
  };
}
