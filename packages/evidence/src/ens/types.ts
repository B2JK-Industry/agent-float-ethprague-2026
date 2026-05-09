export const UPGRADE_SIREN_RECORD_KEYS = {
  chainId: 'upgrade-siren:chain_id',
  proxy: 'upgrade-siren:proxy',
  owner: 'upgrade-siren:owner',
  schema: 'upgrade-siren:schema',
  upgradeManifest: 'upgrade-siren:upgrade_manifest',
} as const;

export type UpgradeSirenRecordKey = (typeof UPGRADE_SIREN_RECORD_KEYS)[keyof typeof UPGRADE_SIREN_RECORD_KEYS];

// ENSIP-26 standardised discovery records. Surfaced for sponsor-positioning
// (ENS Most Creative Use track) and for the UI ENS records panel (US-048).
export const ENSIP_26_RECORD_KEYS = {
  agentContext: 'agent-context',
  agentEndpointWeb: 'agent-endpoint[web]',
  agentEndpointMcp: 'agent-endpoint[mcp]',
} as const;

export type Ensip26RecordKey = (typeof ENSIP_26_RECORD_KEYS)[keyof typeof ENSIP_26_RECORD_KEYS];

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
  readonly agentContextPresent: boolean;
  readonly agentEndpointWebPresent: boolean;
  readonly agentEndpointMcpPresent: boolean;
}

export interface EnsResolutionOk {
  readonly kind: 'ok';
  readonly name: string;
  readonly chainId: number;
  readonly records: EnsRecordSet;
  readonly flags: EnsResolutionFlags;
  readonly anyUpgradeSirenRecordPresent: boolean;
  readonly agentContext: string | null;
  readonly agentEndpointWeb: string | null;
  readonly agentEndpointMcp: string | null;
}

export interface EnsResolutionError {
  readonly kind: 'error';
  readonly reason: 'invalid_name' | 'rpc_error' | 'unsupported_chain';
  readonly message: string;
  readonly cause?: unknown;
}

export type EnsResolutionResult = EnsResolutionOk | EnsResolutionError;
