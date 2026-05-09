import type { Abi } from 'viem';

import type { Address } from '@upgrade-siren/shared';

export type SourcifyMatchLevel = 'exact_match' | 'match' | 'not_found';

export interface SourcifyStatus {
  readonly chainId: number;
  readonly address: Address;
  readonly match: SourcifyMatchLevel;
}

export interface SourcifyStorageLayoutEntry {
  readonly slot: string;
  readonly offset: number;
  readonly type: string;
  readonly label: string;
  readonly contract?: string;
}

export interface SourcifyStorageLayout {
  readonly storage: ReadonlyArray<SourcifyStorageLayoutEntry>;
  readonly types?: Readonly<Record<string, unknown>>;
}

export interface SourcifySourceFile {
  readonly content: string;
}

export interface SourcifyMetadata {
  readonly chainId: number;
  readonly address: Address;
  readonly match: SourcifyMatchLevel;
  readonly abi: Abi | null;
  readonly compilerSettings: Readonly<Record<string, unknown>> | null;
  readonly sources: Readonly<Record<string, SourcifySourceFile>> | null;
  readonly storageLayout: SourcifyStorageLayout | null;
}

export type SourcifyErrorReason =
  | 'server_error'
  | 'malformed_response'
  | 'rate_limited'
  | 'network_error';

export interface SourcifyError {
  readonly reason: SourcifyErrorReason;
  readonly message: string;
  readonly httpStatus?: number;
  readonly cause?: unknown;
}

export type Result<T, E> = { readonly kind: 'ok'; readonly value: T } | { readonly kind: 'error'; readonly error: E };

export const SOURCIFY_BASE_URL = 'https://sourcify.dev/server/v2';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
