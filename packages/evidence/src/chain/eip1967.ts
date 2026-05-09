import { createPublicClient, http, getAddress, isAddress, isHex, type Hex, type PublicClient } from 'viem';
import { mainnet, sepolia } from 'viem/chains';

import type { Address, Hex32 } from '@upgrade-siren/shared';

import { NetworkUnavailable, withRetry, type RetryOptions } from '../network/retry.js';

// EIP-1967 implementation slot:
// keccak256("eip1967.proxy.implementation") - 1
// Canonical and grep-able. Reviewer must verify byte-for-byte.
export const EIP1967_IMPLEMENTATION_SLOT: Hex32 =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

const ZERO_SLOT: Hex32 =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

export interface Eip1967ReadOk {
  readonly kind: 'ok';
  readonly implementation: Address | null;
  readonly slotValue: Hex32;
}

export interface Eip1967ReadError {
  readonly kind: 'error';
  readonly reason: 'rpc_error' | 'invalid_slot_value' | 'unsupported_chain';
  readonly message: string;
  readonly cause?: unknown;
}

export type Eip1967ReadResult = Eip1967ReadOk | Eip1967ReadError;

// Pure: parses a 32-byte slot value into the implementation address by taking
// the rightmost 20 bytes. Returns null when the slot is fully zero (proxy
// not initialized). Throws on syntactic garbage; the async reader catches.
export function extractImplementationFromSlot(slotValue: Hex32 | Hex): Address | null {
  if (!isHex(slotValue)) {
    throw new Error(`eip1967: slot value is not hex: ${String(slotValue)}`);
  }
  // Slot value is 32 bytes = 64 hex chars + "0x"; tolerate left-padded shorter values.
  const stripped = slotValue.slice(2).toLowerCase();
  if (stripped.length === 0) return null;
  // Tolerate left-padded shorter values; truncate from the right if longer.
  const padded = stripped.padStart(64, '0');
  const last64 = padded.slice(-64);
  const addressHex = last64.slice(-40);
  const candidate = `0x${addressHex}` as `0x${string}`;
  // All-zero slot means proxy not initialized.
  if (candidate === '0x0000000000000000000000000000000000000000') {
    return null;
  }
  if (!isAddress(candidate)) {
    throw new Error(`eip1967: extracted bytes do not form an address: ${candidate}`);
  }
  return getAddress(candidate) as Address;
}

// Codex #51: opt-in retry on transient RPC errors via `retry` option.
interface ResolveClientOptions {
  readonly client?: PublicClient;
  readonly rpcUrl?: string;
  readonly retry?: RetryOptions | true;
}

function resolveRetryOptions(retry: RetryOptions | true | undefined): RetryOptions | undefined {
  if (retry === undefined) return undefined;
  if (retry === true) return {};
  return retry;
}

function resolveClient(chainId: number, options: ResolveClientOptions): PublicClient | Eip1967ReadError {
  if (options.client) return options.client;

  let chain;
  if (chainId === mainnet.id) chain = mainnet;
  else if (chainId === sepolia.id) chain = sepolia;
  else {
    return {
      kind: 'error',
      reason: 'unsupported_chain',
      message: `eip1967: unsupported chainId ${chainId}; expected ${mainnet.id} (mainnet) or ${sepolia.id} (sepolia)`,
    };
  }

  return createPublicClient({
    chain,
    transport: http(options.rpcUrl),
  });
}

export async function readImplementationSlot(
  chainId: number,
  proxyAddress: Address,
  options: ResolveClientOptions = {},
): Promise<Eip1967ReadResult> {
  const clientOrError = resolveClient(chainId, options);
  if ('kind' in clientOrError && clientOrError.kind === 'error') {
    return clientOrError;
  }
  const client = clientOrError as PublicClient;

  let slotValue: Hex;
  const retryOpts = resolveRetryOptions(options.retry);
  try {
    const callGetStorageAt = (): Promise<Hex | undefined> =>
      client.getStorageAt({
        address: proxyAddress,
        slot: EIP1967_IMPLEMENTATION_SLOT,
      });
    const raw = retryOpts
      ? await withRetry(callGetStorageAt, retryOpts)
      : await callGetStorageAt();
    if (raw === undefined) {
      return {
        kind: 'error',
        reason: 'rpc_error',
        message: 'eip1967: getStorageAt returned undefined',
      };
    }
    slotValue = raw;
  } catch (err) {
    if (err instanceof NetworkUnavailable) {
      return {
        kind: 'error',
        reason: 'rpc_error',
        message: `eip1967.getStorageAt: ${err.message}`,
        cause: err.lastError,
      };
    }
    return {
      kind: 'error',
      reason: 'rpc_error',
      message: err instanceof Error ? err.message : String(err),
      cause: err,
    };
  }

  try {
    const implementation = extractImplementationFromSlot(slotValue);
    return {
      kind: 'ok',
      implementation,
      slotValue: (slotValue === '0x' ? ZERO_SLOT : (slotValue as Hex32)),
    };
  } catch (err) {
    return {
      kind: 'error',
      reason: 'invalid_slot_value',
      message: err instanceof Error ? err.message : String(err),
      cause: err,
    };
  }
}
