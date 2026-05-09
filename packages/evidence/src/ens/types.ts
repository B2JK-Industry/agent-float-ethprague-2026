export const UPGRADE_SIREN_RECORD_KEYS = {
  chainId: 'upgrade-siren:chain_id',
  proxy: 'upgrade-siren:proxy',
  owner: 'upgrade-siren:owner',
  schema: 'upgrade-siren:schema',
  upgradeManifest: 'upgrade-siren:upgrade_manifest',
} as const;

export type UpgradeSirenRecordKey = (typeof UPGRADE_SIREN_RECORD_KEYS)[keyof typeof UPGRADE_SIREN_RECORD_KEYS];

export interface EnsRecordSet {
  readonly chainId: string | null;
  readonly proxy: string | null;
  readonly owner: string | null;
  readonly schema: string | null;
  readonly upgradeManifestRaw: string | null;
}

export interface EnsResolutionFlags {
  readonly chainIdPresent: boolean;
  readonly proxyPresent: boolean;
  readonly ownerPresent: boolean;
  readonly schemaPresent: boolean;
  readonly upgradeManifestPresent: boolean;
}

export interface EnsResolutionOk {
  readonly kind: 'ok';
  readonly name: string;
  readonly chainId: number;
  readonly records: EnsRecordSet;
  readonly flags: EnsResolutionFlags;
  readonly anyUpgradeSirenRecordPresent: boolean;
}

export interface EnsResolutionError {
  readonly kind: 'error';
  readonly reason: 'invalid_name' | 'rpc_error' | 'unsupported_chain';
  readonly message: string;
  readonly cause?: unknown;
}

export type EnsResolutionResult = EnsResolutionOk | EnsResolutionError;
