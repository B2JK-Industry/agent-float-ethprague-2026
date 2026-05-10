// EAS attestation layer for Bench Mode reports.
//
// Schema (one row per Bench report, registered on each supported network):
//   address subject       — primary address resolved from ENS subject
//   bytes32 ensNamehash   — keccak256 namehash of the subject ENS name
//   uint16  score         — 0..100 score_100 from ScoreResult
//   string  tier          — "S" | "A" | "B" | "C" | "D" | "U"
//   uint64  computedAt    — Unix seconds, when the report was generated
//   bytes32 reportHash    — keccak256 of canonical report JSON bytes
//   string  reportUri     — absolute URL where the JSON report can be
//                           fetched (for verifiers who want raw payload)
//
// Same schema on every chain — one schema UID per chain, registered
// once with the operator wallet at deploy time. UIDs hardcoded in
// `schema.ts` after registration.
//
// Off-chain (default) attestations are emitted by the operator wallet
// for every signed report. On-chain attestations are subject-initiated
// and subject-paid — server never submits transactions.

import type { Address } from '@upgrade-siren/shared';

export type SupportedNetwork = 'base' | 'optimism' | 'sepolia' | 'mainnet';

export interface BenchAttestationPayload {
  readonly subject: Address;
  readonly ensNamehash: `0x${string}`;
  readonly score: number;        // 0..100
  readonly tier: string;          // 'S' | 'A' | 'B' | 'C' | 'D' | 'U'
  readonly computedAt: number;    // Unix seconds
  readonly reportHash: `0x${string}`;
  readonly reportUri: string;
}

/**
 * EAS off-chain attestation envelope.
 *
 * Mirrors the `OffchainAttestation` shape from `@ethereum-attestation-service/eas-sdk`
 * but typed locally so the rest of the codebase doesn't depend on the
 * SDK's wide type surface.
 */
export interface OffchainAttestationEnvelope {
  readonly version: number;
  readonly uid: `0x${string}`;
  readonly schema: `0x${string}`;
  readonly recipient: Address;
  readonly time: number;          // Unix seconds
  readonly expirationTime: number; // 0 = no expiry
  readonly revocable: boolean;
  readonly refUID: `0x${string}`;
  readonly data: `0x${string}`;   // ABI-encoded BenchAttestationPayload
  readonly signature: {
    readonly v: number;
    readonly r: `0x${string}`;
    readonly s: `0x${string}`;
  };
  readonly signer: Address;
}

export interface OnchainAttestationParams {
  readonly contract: Address;     // EAS contract address on the target network
  readonly schemaUid: `0x${string}`;
  readonly recipient: Address;
  readonly data: `0x${string}`;   // ABI-encoded BenchAttestationPayload
  readonly revocable: boolean;
  readonly refUID: `0x${string}`;
  readonly expirationTime: bigint; // 0 = no expiry
  readonly value: bigint;         // ETH msg.value, always 0 for our schema
}

export interface OnchainAttestationRecord {
  readonly uid: `0x${string}`;
  readonly network: SupportedNetwork;
  readonly txHash: `0x${string}`;
  readonly publishedAt: string;   // ISO-8601
  readonly publishedBy: Address;
  readonly payload: BenchAttestationPayload;
}

export type OnchainAttestationStatus =
  | { readonly status: 'not-published' }
  | (OnchainAttestationRecord & { readonly status: 'published' });

export interface BenchAttestationBundle {
  readonly offchain: {
    readonly uid: `0x${string}`;
    readonly serialized: string;
    readonly network: SupportedNetwork;
    readonly payload: BenchAttestationPayload;
  };
  readonly onchain: OnchainAttestationStatus;
}

export type VerifyResult =
  | { readonly kind: 'ok'; readonly signer: Address; readonly payload: BenchAttestationPayload }
  | { readonly kind: 'error'; readonly reason: 'bad_signature' | 'signer_mismatch' | 'malformed_envelope' | 'schema_mismatch'; readonly message: string };