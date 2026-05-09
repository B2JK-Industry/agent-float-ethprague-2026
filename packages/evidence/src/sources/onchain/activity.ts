import { createPublicClient, http, type PublicClient } from 'viem';
import { mainnet, sepolia } from 'viem/chains';

import type { Address } from '@upgrade-siren/shared';

import { withRetry, type RetryOptions } from '../../network/retry.js';
import type {
  OnchainActivity,
  OnchainActivityError,
  OnchainActivityResult,
} from './types.js';

export interface FetchOnchainActivityOptions {
  readonly client?: PublicClient;
  readonly rpcUrl?: string;
  readonly retry?: RetryOptions | true;
  // Bound the binary search; defaults to the chain head returned by
  // getBlockNumber. Tests inject this for determinism.
  readonly toBlock?: bigint;
  // Lower bound of the search; defaults to 0n. Useful for L2s with a
  // high-numbered genesis or for deliberately narrowed scans.
  readonly fromBlock?: bigint;
}

function resolveRetryOptions(retry: RetryOptions | true | undefined): RetryOptions | undefined {
  if (retry === undefined) return undefined;
  if (retry === true) return {};
  return retry;
}

function resolveClient(
  chainId: number,
  options: FetchOnchainActivityOptions,
): PublicClient | OnchainActivityError {
  if (options.client) return options.client;
  let chain;
  if (chainId === mainnet.id) chain = mainnet;
  else if (chainId === sepolia.id) chain = sepolia;
  else {
    return {
      kind: 'error',
      reason: 'unsupported_chain',
      message: `onchain.activity: unsupported chainId ${chainId}; expected ${mainnet.id} (mainnet) or ${sepolia.id} (sepolia)`,
    };
  }
  return createPublicClient({ chain, transport: http(options.rpcUrl) });
}

// Binary search for the smallest block B in [lo, hi] where the address has
// nonce ≥ 1. Caller must verify hi has nonce ≥ 1 before calling. Each
// iteration is one getTransactionCount RPC call → ~ceil(log2(hi - lo + 1))
// calls total.
async function binarySearchFirstTxBlock(
  client: PublicClient,
  address: Address,
  lo: bigint,
  hi: bigint,
  retryOpts: RetryOptions | undefined,
): Promise<bigint> {
  let l = lo;
  let h = hi;
  while (l < h) {
    const mid = (l + h) / 2n;
    const callNonce = (): Promise<number> =>
      client.getTransactionCount({ address, blockNumber: mid });
    const nonceAtMid = retryOpts ? await withRetry(callNonce, retryOpts) : await callNonce();
    if (nonceAtMid === 0) {
      l = mid + 1n;
    } else {
      h = mid;
    }
  }
  return l;
}

// Reads outbound tx count + first-tx address-age signals for a single
// address on a single chain. Returns ok-shaped even when firstTxBlock is null
// (account has never sent a tx on this chain) — that is signal, not error.
//
// rpc_error is reserved for transport-level failures of the *first* probe
// (latestBlock or nonce@latest). Once those succeed, partial failures during
// the binary search or timestamp lookup degrade gracefully: nullable fields
// surface the failure to the score engine without aborting the whole call.
export async function fetchOnchainActivity(
  chainId: number,
  address: Address,
  options: FetchOnchainActivityOptions = {},
): Promise<OnchainActivityResult> {
  const clientOrError = resolveClient(chainId, options);
  if ('kind' in clientOrError && clientOrError.kind === 'error') {
    return clientOrError;
  }
  const client = clientOrError as PublicClient;
  const retryOpts = resolveRetryOptions(options.retry);

  let latestBlock: bigint;
  try {
    const callLatest = (): Promise<bigint> => client.getBlockNumber();
    latestBlock = options.toBlock ?? (retryOpts ? await withRetry(callLatest, retryOpts) : await callLatest());
  } catch (err) {
    return {
      kind: 'error',
      reason: 'rpc_error',
      message: `onchain.activity: getBlockNumber failed - ${err instanceof Error ? err.message : String(err)}`,
      cause: err,
    };
  }

  let nonceAtLatest: number;
  try {
    const callNonce = (): Promise<number> =>
      client.getTransactionCount({ address, blockNumber: latestBlock });
    nonceAtLatest = retryOpts ? await withRetry(callNonce, retryOpts) : await callNonce();
  } catch (err) {
    return {
      kind: 'error',
      reason: 'rpc_error',
      message: `onchain.activity: getTransactionCount(latest) failed - ${err instanceof Error ? err.message : String(err)}`,
      cause: err,
    };
  }

  const fromBlock = options.fromBlock ?? 0n;
  if (fromBlock > latestBlock) {
    return {
      kind: 'error',
      reason: 'rpc_error',
      message: `onchain.activity: fromBlock ${fromBlock} > latestBlock ${latestBlock}`,
    };
  }

  const baseValue: OnchainActivity = {
    chainId,
    address,
    nonce: nonceAtLatest,
    firstTxBlock: null,
    firstTxTimestamp: null,
    latestBlock,
  };

  if (nonceAtLatest === 0) {
    return { kind: 'ok', value: baseValue };
  }

  // If nonce at fromBlock is already > 0, fromBlock IS the answer (or earlier
  // — but the search is bounded below by fromBlock by request). Avoids one
  // unnecessary search step.
  let firstTxBlock: bigint;
  try {
    const callNonceAtLow = (): Promise<number> =>
      client.getTransactionCount({ address, blockNumber: fromBlock });
    const nonceAtLow = retryOpts
      ? await withRetry(callNonceAtLow, retryOpts)
      : await callNonceAtLow();
    if (nonceAtLow > 0) {
      firstTxBlock = fromBlock;
    } else {
      firstTxBlock = await binarySearchFirstTxBlock(
        client,
        address,
        fromBlock,
        latestBlock,
        retryOpts,
      );
    }
  } catch (err) {
    // Binary search failed mid-flight — surface the partial result. nonce is
    // valid; firstTxBlock/Timestamp remain null. The score engine treats
    // "outbound activity exists but address-age unknown" as missing rather
    // than zero.
    return { kind: 'ok', value: { ...baseValue, firstTxBlock: null, firstTxTimestamp: null } };
  }

  let firstTxTimestamp: number | null = null;
  try {
    const callBlock = () => client.getBlock({ blockNumber: firstTxBlock });
    const block = retryOpts ? await withRetry(callBlock, retryOpts) : await callBlock();
    if (block && typeof block.timestamp === 'bigint') {
      const ts = block.timestamp;
      // Timestamps are unix seconds; safe to cast for any reasonable chain.
      firstTxTimestamp = Number(ts);
    }
  } catch {
    // Same degrade-gracefully posture as binary-search failure.
    firstTxTimestamp = null;
  }

  return {
    kind: 'ok',
    value: { ...baseValue, firstTxBlock, firstTxTimestamp },
  };
}
