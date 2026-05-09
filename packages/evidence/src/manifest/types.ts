import type { Address, Hex32 } from '@upgrade-siren/shared';

export const MANIFEST_SCHEMA_V1 = 'upgrade-siren-manifest@1' as const;

export interface UpgradeManifest {
  readonly schema: typeof MANIFEST_SCHEMA_V1;
  readonly chainId: number;
  readonly proxy: Address;
  readonly previousImpl: Address;
  readonly currentImpl: Address;
  readonly reportUri: string;
  readonly reportHash: Hex32;
  readonly version: number;
  readonly effectiveFrom: string;
  readonly previousManifestHash: Hex32;
}

export type ManifestErrorReason =
  | 'malformed_json'
  | 'not_an_object'
  | 'missing_required_field'
  | 'unknown_schema_version'
  | 'invalid_address'
  | 'invalid_hash'
  | 'invalid_chain_id'
  | 'invalid_version'
  | 'invalid_iso_timestamp'
  | 'invalid_report_uri';

export interface ManifestError {
  readonly reason: ManifestErrorReason;
  readonly message: string;
  readonly field?: string;
  readonly got?: unknown;
}

export type ParseManifestResult =
  | { readonly kind: 'ok'; readonly value: UpgradeManifest }
  | { readonly kind: 'error'; readonly error: ManifestError };
