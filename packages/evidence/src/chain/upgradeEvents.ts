import {
  createPublicClient,
  http,
  parseAbiItem,
  type AbiEvent,
  type Hex,
  type PublicClient,
} from 'viem';
import { mainnet, sepolia } from 'viem/chains';

import type { Address, Hex32 } from '@upgrade-siren/shared';

import { NetworkUnavailable, withRetry, type RetryOptions } from '../network/retry.js';

export const UPGRADED_EVENT: AbiEvent = parseAbiItem(
  'event Upgraded(address indexed implementation)',
);

const DEFAULT_CHUNK_SIZE = 9_999n;

export interface UpgradeEvent {
  readonly blockNumber: bigint;
  readonly transactionHash: Hex32;
  readonly logIndex: number;
  readonly newImplementation: Address;
}

export interface UpgradeEventsReadOk {
  readonly kind: 'ok';
  readonly events: ReadonlyArray<UpgradeEvent>;
  readonly fromBlock: bigint;
  readonly toBlock: bigint;
  readonly chunksFetched: number;
}

export interface UpgradeEventsReadError {
  readonly kind: 'error';
  readonly reason: 'rpc_error' | 'unsupported_chain' | 'invalid_log';
  readonly message: string;
  readonly cause?: unknown;
}

export type UpgradeEventsReadResult = UpgradeEventsReadOk | UpgradeEventsReadError;

// Codex #51: opt-in retry on transient RPC errors via `retry` option.
interface ResolveClientOptions {
  readonly client?: PublicClient;
  readonly rpcUrl?: string;
  readonly retry?: RetryOptions | true;
}

interface ReadOptions extends ResolveClientOptions {
  readonly fromBlock?: bigint;
  readonly toBlock?: bigint | 'latest';
  readonly chunkSize?: bigint;
}

function resolveRetryOptions(retry: RetryOptions | true | undefined): RetryOptions | undefined {
  if (retry === undefined) return undefined;
  if (retry === true) return {};
  return retry;
}

function resolveClient(
  chainId: number,
  options: ResolveClientOptions,
): PublicClient | UpgradeEventsReadError {
  if (options.client) return options.client;

  let chain;
  if (chainId === mainnet.id) chain = mainnet;
  else if (chainId === sepolia.id) chain = sepolia;
  else {
    return {
      kind: 'error',
      reason: 'unsupported_chain',
      message: `upgradeEvents: unsupported chainId ${chainId}; expected ${mainnet.id} (mainnet) or ${sepolia.id} (sepolia)`,
    };
  }

  return createPublicClient({
    chain,
    transport: http(options.rpcUrl),
  });
}

interface RawLog {
  blockNumber: bigint | null;
  transactionHash: Hex | null;
  logIndex: number | null;
  args: { implementation?: Address };
}

function normalizeLog(raw: RawLog): UpgradeEvent | UpgradeEventsReadError {
  if (raw.blockNumber === null) {
    return {
      kind: 'error',
      reason: 'invalid_log',
      message: 'upgradeEvents: pending log without blockNumber',
    };
  }
  if (raw.transactionHash === null) {
    return {
      kind: 'error',
      reason: 'invalid_log',
      message: 'upgradeEvents: log missing transactionHash',
    };
  }
  if (raw.logIndex === null) {
    return {
      kind: 'error',
      reason: 'invalid_log',
      message: 'upgradeEvents: log missing logIndex',
    };
  }
  const impl = raw.args.implementation;
  if (!impl) {
    return {
      kind: 'error',
      reason: 'invalid_log',
      message: 'upgradeEvents: log missing implementation arg',
    };
  }
  return {
    blockNumber: raw.blockNumber,
    transactionHash: raw.transactionHash as Hex32,
    logIndex: raw.logIndex,
    newImplementation: impl,
  };
}

export async function readUpgradeEvents(
  chainId: number,
  proxyAddress: Address,
  options: ReadOptions = {},
): Promise<UpgradeEventsReadResult> {
  const clientOrError = resolveClient(chainId, options);
  if ('kind' in clientOrError && clientOrError.kind === 'error') {
    return clientOrError;
  }
  const client = clientOrError as PublicClient;

  const retryOpts = resolveRetryOptions(options.retry);
  let toBlockNum: bigint;
  if (options.toBlock === undefined || options.toBlock === 'latest') {
    try {
      const callGetBlockNumber = (): Promise<bigint> => client.getBlockNumber();
      toBlockNum = retryOpts
        ? await withRetry(callGetBlockNumber, retryOpts)
        : await callGetBlockNumber();
    } catch (err) {
      if (err instanceof NetworkUnavailable) {
        return {
          kind: 'error',
          reason: 'rpc_error',
          message: `upgradeEvents.getBlockNumber: ${err.message}`,
          cause: err.lastError,
        };
      }
      return {
        kind: 'error',
        reason: 'rpc_error',
        message: `upgradeEvents.getBlockNumber: ${err instanceof Error ? err.message : String(err)}`,
        cause: err,
      };
    }
  } else {
    toBlockNum = options.toBlock;
  }

  const fromBlock = options.fromBlock ?? 0n;
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  if (chunkSize <= 0n) {
    return {
      kind: 'error',
      reason: 'invalid_log',
      message: `upgradeEvents: chunkSize must be positive, got ${chunkSize}`,
    };
  }

  const events: UpgradeEvent[] = [];
  let cursor = fromBlock;
  let chunksFetched = 0;

  while (cursor <= toBlockNum) {
    const chunkEnd = cursor + chunkSize - 1n > toBlockNum ? toBlockNum : cursor + chunkSize - 1n;

    let logs;
    try {
      const callGetLogs = (): ReturnType<typeof client.getLogs> =>
        client.getLogs({
          address: proxyAddress,
          event: UPGRADED_EVENT,
          fromBlock: cursor,
          toBlock: chunkEnd,
        });
      logs = retryOpts ? await withRetry(callGetLogs, retryOpts) : await callGetLogs();
    } catch (err) {
      if (err instanceof NetworkUnavailable) {
        return {
          kind: 'error',
          reason: 'rpc_error',
          message: `upgradeEvents.getLogs[${cursor}..${chunkEnd}]: ${err.message}`,
          cause: err.lastError,
        };
      }
      return {
        kind: 'error',
        reason: 'rpc_error',
        message: `upgradeEvents.getLogs[${cursor}..${chunkEnd}]: ${err instanceof Error ? err.message : String(err)}`,
        cause: err,
      };
    }

    chunksFetched += 1;

    for (const raw of logs) {
      const normalized = normalizeLog(raw as unknown as RawLog);
      if ('kind' in normalized && normalized.kind === 'error') {
        return normalized;
      }
      events.push(normalized as UpgradeEvent);
    }

    cursor = chunkEnd + 1n;
  }

  events.sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) {
      return a.blockNumber < b.blockNumber ? -1 : 1;
    }
    return a.logIndex - b.logIndex;
  });

  return {
    kind: 'ok',
    events,
    fromBlock,
    toBlock: toBlockNum,
    chunksFetched,
  };
}
