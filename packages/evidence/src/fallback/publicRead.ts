import {
  createPublicClient,
  http,
  isAddress,
  type PublicClient,
} from 'viem';
import { mainnet, sepolia } from 'viem/chains';

import type { Address } from '@upgrade-siren/shared';

import { readImplementationSlot } from '../chain/eip1967.js';
import { fetchSourcifyMetadata } from '../sourcify/metadata.js';
import { fetchSourcifyStatus } from '../sourcify/status.js';
import type {
  FetchLike,
  SourcifyMatchLevel,
  SourcifyMetadata,
} from '../sourcify/types.js';

export type PublicReadInputKind = 'address' | 'ens_name';

export interface PublicReadOk {
  readonly kind: 'ok';
  readonly mode: 'public-read';
  readonly confidence: 'public-read';
  readonly inputKind: PublicReadInputKind;
  readonly inputName: string | null;
  readonly proxyAddress: Address;
  readonly currentImplementation: Address | null;
  readonly sourcifyStatus: SourcifyMatchLevel | null;
  readonly sourcifyMetadata: SourcifyMetadata | null;
  readonly notes: ReadonlyArray<string>;
}

export type PublicReadFailureReason =
  | 'invalid_input'
  | 'ens_not_resolved'
  | 'unsupported_chain'
  | 'rpc_error';

export interface PublicReadError {
  readonly kind: 'error';
  readonly reason: PublicReadFailureReason;
  readonly message: string;
  readonly cause?: unknown;
}

export type PublicReadResult = PublicReadOk | PublicReadError;

export interface RunPublicReadFallbackOptions {
  readonly chainId?: number;
  readonly client?: PublicClient;
  readonly rpcUrl?: string;
  readonly fetchImpl?: FetchLike;
  readonly sourcifyBaseUrl?: string;
}

const ENS_NAME_RE = /^(?:[a-z0-9_-]+\.)+(?:eth|test)$/i;

function isPlausibleEnsName(value: string): boolean {
  return ENS_NAME_RE.test(value);
}

function resolveClient(
  chainId: number,
  options: { client?: PublicClient; rpcUrl?: string },
): PublicClient | PublicReadError {
  if (options.client) return options.client;
  let chain;
  if (chainId === mainnet.id) chain = mainnet;
  else if (chainId === sepolia.id) chain = sepolia;
  else {
    return {
      kind: 'error',
      reason: 'unsupported_chain',
      message: `publicRead: unsupported chainId ${chainId}; expected ${mainnet.id} or ${sepolia.id}`,
    };
  }
  return createPublicClient({ chain, transport: http(options.rpcUrl) });
}

export async function runPublicReadFallback(
  input: string,
  options: RunPublicReadFallbackOptions = {},
): Promise<PublicReadResult> {
  const trimmed = (input ?? '').trim();
  if (trimmed.length === 0) {
    return {
      kind: 'error',
      reason: 'invalid_input',
      message: 'publicRead: empty input',
    };
  }

  const chainId = options.chainId ?? mainnet.id;
  const clientOrError = resolveClient(chainId, options);
  if ('kind' in clientOrError && clientOrError.kind === 'error') {
    return clientOrError;
  }
  const client = clientOrError as PublicClient;

  const notes: string[] = [];
  let proxyAddress: Address;
  let inputKind: PublicReadInputKind;
  let inputName: string | null = null;

  if (isAddress(trimmed)) {
    proxyAddress = trimmed as Address;
    inputKind = 'address';
    notes.push('input recognised as raw 0x address');
  } else if (isPlausibleEnsName(trimmed)) {
    inputKind = 'ens_name';
    inputName = trimmed;
    let resolved: string | null;
    try {
      resolved = await client.getEnsAddress({ name: trimmed });
    } catch (err) {
      return {
        kind: 'error',
        reason: 'rpc_error',
        message: `publicRead.getEnsAddress: ${err instanceof Error ? err.message : String(err)}`,
        cause: err,
      };
    }
    if (!resolved) {
      return {
        kind: 'error',
        reason: 'ens_not_resolved',
        message: `publicRead: ENS name ${trimmed} did not resolve to an address record`,
      };
    }
    proxyAddress = resolved as Address;
    notes.push(`ENS ${trimmed} resolved to ${resolved}`);
  } else {
    return {
      kind: 'error',
      reason: 'invalid_input',
      message: `publicRead: input is neither an address nor a plausible ENS name`,
    };
  }

  const slotResult = await readImplementationSlot(chainId, proxyAddress, { client });
  let currentImplementation: Address | null = null;
  if (slotResult.kind === 'error') {
    if (slotResult.reason === 'rpc_error') {
      return {
        kind: 'error',
        reason: 'rpc_error',
        message: `publicRead.readImplementationSlot: ${slotResult.message}`,
        cause: slotResult.cause,
      };
    }
    notes.push(`eip1967 slot read returned ${slotResult.reason}`);
  } else {
    currentImplementation = slotResult.implementation;
    if (currentImplementation === null) {
      notes.push('eip1967 slot is zero — proxy not initialised or address is not an EIP-1967 proxy');
    }
  }

  let sourcifyStatus: SourcifyMatchLevel | null = null;
  let sourcifyMetadata: SourcifyMetadata | null = null;

  if (currentImplementation !== null) {
    const fetchOptions = options.fetchImpl !== undefined
      ? { fetchImpl: options.fetchImpl, ...(options.sourcifyBaseUrl !== undefined ? { baseUrl: options.sourcifyBaseUrl } : {}) }
      : (options.sourcifyBaseUrl !== undefined ? { baseUrl: options.sourcifyBaseUrl } : {});
    const statusResult = await fetchSourcifyStatus(chainId, currentImplementation, fetchOptions);
    if (statusResult.kind === 'ok') {
      sourcifyStatus = statusResult.value.match;
    } else {
      notes.push(`sourcify.status returned ${statusResult.error.reason}`);
    }

    const metadataResult = await fetchSourcifyMetadata(chainId, currentImplementation, fetchOptions);
    if (metadataResult.kind === 'ok') {
      sourcifyMetadata = metadataResult.value;
    } else {
      notes.push(`sourcify.metadata returned ${metadataResult.error.reason}`);
    }
  } else {
    notes.push('skipping sourcify lookups because no implementation address was recovered');
  }

  return {
    kind: 'ok',
    mode: 'public-read',
    confidence: 'public-read',
    inputKind,
    inputName,
    proxyAddress,
    currentImplementation,
    sourcifyStatus,
    sourcifyMetadata,
    notes,
  };
}
