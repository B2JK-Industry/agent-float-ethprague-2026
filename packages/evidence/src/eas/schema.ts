// EAS schema constants for Bench Mode attestations.
//
// Schema string is identical across networks:
//   "address subject, bytes32 ensNamehash, uint16 score, string tier,
//    uint64 computedAt, bytes32 reportHash, string reportUri"
//
// Schema UIDs are network-specific (computed by EAS SchemaRegistry on
// register). Daniel registers the schema once per network with the
// operator wallet and pastes the UID below.
//
// EAS contract addresses sourced from
// https://docs.attest.org/docs/quick--start/contracts. They are stable
// per network — no need to redeploy.

import type { Address } from '@upgrade-siren/shared';
import type { SupportedNetwork } from './types.js';

export const BENCH_ATTESTATION_SCHEMA =
  'address subject, bytes32 ensNamehash, uint16 score, string tier, uint64 computedAt, bytes32 reportHash, string reportUri' as const;

export const BENCH_ATTESTATION_REVOCABLE = true;

// EAS contract address per network. EAS Protocol mainline deployments
// (https://docs.attest.org/docs/quick--start/contracts).
export const EAS_CONTRACTS: Record<SupportedNetwork, Address> = {
  mainnet: '0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587',
  base: '0x4200000000000000000000000000000000000021',
  optimism: '0x4200000000000000000000000000000000000021',
  sepolia: '0xC2679fBD37d54388Ce493F1DB75320D236e1815e',
};

// EAS SchemaRegistry per network — used by the schema-deploy script.
export const EAS_SCHEMA_REGISTRIES: Record<SupportedNetwork, Address> = {
  mainnet: '0xA7b39296258348C78294F95B872b282326A97BDF',
  base: '0x4200000000000000000000000000000000000020',
  optimism: '0x4200000000000000000000000000000000000020',
  sepolia: '0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0',
};

// Bench attestation schema UID per network. Filled in after the
// operator wallet calls `SchemaRegistry.register(...)` once.
//
// Placeholder zero-bytes32 means "schema not yet deployed on this
// network" — the EAS module emits a typed error in that state.
export const BENCH_SCHEMA_UIDS: Record<SupportedNetwork, `0x${string}`> = {
  mainnet:
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  base:
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  optimism:
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  // Sepolia placeholder — fill after Daniel runs the deploy script.
  sepolia:
    '0x0000000000000000000000000000000000000000000000000000000000000000',
};

// EAS Explorer URL per network — used by UI to deep-link a UID.
export function easExplorerUrl(
  network: SupportedNetwork,
  uid: `0x${string}`,
): string {
  if (network === 'base') return `https://base.easscan.org/attestation/view/${uid}`;
  if (network === 'optimism') return `https://optimism.easscan.org/attestation/view/${uid}`;
  if (network === 'sepolia') return `https://sepolia.easscan.org/attestation/view/${uid}`;
  return `https://easscan.org/attestation/view/${uid}`;
}

export function isSchemaDeployed(network: SupportedNetwork): boolean {
  return BENCH_SCHEMA_UIDS[network] !== '0x0000000000000000000000000000000000000000000000000000000000000000';
}

export const SUPPORTED_NETWORK_LIST: ReadonlyArray<SupportedNetwork> = [
  'base',
  'optimism',
  'sepolia',
  'mainnet',
];

// Default network for "Publish on-chain" UI dropdown — Base. Low gas,
// stable EAS deployment, aligned with mainstream ENS-on-L2 trajectory.
export const DEFAULT_PUBLISH_NETWORK: SupportedNetwork = 'sepolia';

// Chain IDs per network (used by wallet prompts to switch chain
// before calling attest).
export const NETWORK_CHAIN_IDS: Record<SupportedNetwork, number> = {
  mainnet: 1,
  base: 8453,
  optimism: 10,
  sepolia: 11155111,
};