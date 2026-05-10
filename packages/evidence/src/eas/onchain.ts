// On-chain EAS attestation helpers.
//
// We never submit on-chain transactions from server code. These helpers
// produce CALLDATA + parse on-chain attestations, callable from both:
//   - Stream C (client-side) — wagmi `useWriteContract` with the
//     calldata; subject pays gas with their own wallet.
//   - Stream B (server-side) — only for VERIFICATION (read-only): the
//     record-publish endpoint reads the attestation by UID to confirm
//     it matches our off-chain envelope before flipping the
//     `onchain.status` flag in the store.
//
// AC #9 from the task: "No code path causes our server to send a
// transaction to EAS contracts." Verified by absence of
// `writeContract` / `sendTransaction` from any server import.

import { encodeFunctionData, type Hex } from 'viem';

import {
  BENCH_ATTESTATION_REVOCABLE,
  BENCH_SCHEMA_UIDS,
  EAS_CONTRACTS,
  isSchemaDeployed,
} from './schema.js';
import { encodeBenchPayload } from './offchain.js';
import type {
  BenchAttestationPayload,
  OnchainAttestationParams,
  SupportedNetwork,
} from './types.js';

// Minimal EAS ABI fragment for `attest((bytes32 schema, (address recipient,
// uint64 expirationTime, bool revocable, bytes32 refUID, bytes data,
// uint256 value) data))`.
//
// Documented at https://docs.attest.org/docs/protocol/contracts.
export const EAS_ATTEST_ABI = [
  {
    type: 'function',
    name: 'attest',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'request',
        type: 'tuple',
        components: [
          { name: 'schema', type: 'bytes32' },
          {
            name: 'data',
            type: 'tuple',
            components: [
              { name: 'recipient', type: 'address' },
              { name: 'expirationTime', type: 'uint64' },
              { name: 'revocable', type: 'bool' },
              { name: 'refUID', type: 'bytes32' },
              { name: 'data', type: 'bytes' },
              { name: 'value', type: 'uint256' },
            ],
          },
        ],
      },
    ],
    outputs: [{ name: 'uid', type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'getAttestation',
    stateMutability: 'view',
    inputs: [{ name: 'uid', type: 'bytes32' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'uid', type: 'bytes32' },
          { name: 'schema', type: 'bytes32' },
          { name: 'time', type: 'uint64' },
          { name: 'expirationTime', type: 'uint64' },
          { name: 'revocationTime', type: 'uint64' },
          { name: 'refUID', type: 'bytes32' },
          { name: 'recipient', type: 'address' },
          { name: 'attester', type: 'address' },
          { name: 'revocable', type: 'bool' },
          { name: 'data', type: 'bytes' },
        ],
      },
    ],
  },
] as const;

/**
 * Build the calldata + contract reference the subject's wallet uses
 * to publish a Bench attestation on-chain.
 *
 * Returns enough info for `useWriteContract({ address, abi, functionName,
 * args })` — wagmi handles signing + submission. No private keys touched
 * on either side of this code path.
 */
export function prepareOnchainAttestation(
  payload: BenchAttestationPayload,
  network: SupportedNetwork,
): OnchainAttestationParams {
  if (!isSchemaDeployed(network)) {
    throw new Error(
      `EAS schema not deployed on ${network} — cannot prepare on-chain calldata.`,
    );
  }
  const schemaUid = BENCH_SCHEMA_UIDS[network];
  const data = encodeBenchPayload(payload);
  return {
    contract: EAS_CONTRACTS[network],
    schemaUid,
    recipient: payload.subject,
    data,
    revocable: BENCH_ATTESTATION_REVOCABLE,
    refUID:
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    expirationTime: 0n,
    value: 0n,
  };
}

/**
 * Encode the full `attest(...)` calldata as a single Hex blob — useful
 * for callers that bypass wagmi (e.g. raw `eth_sendTransaction`).
 */
export function encodeAttestCalldata(
  params: OnchainAttestationParams,
): Hex {
  return encodeFunctionData({
    abi: EAS_ATTEST_ABI,
    functionName: 'attest',
    args: [
      {
        schema: params.schemaUid,
        data: {
          recipient: params.recipient,
          expirationTime: params.expirationTime,
          revocable: params.revocable,
          refUID: params.refUID,
          data: params.data,
          value: params.value,
        },
      },
    ],
  });
}

/**
 * Read an on-chain attestation by UID. Used by the record-publish
 * endpoint to confirm the subject's tx actually landed an attestation
 * matching our off-chain envelope.
 *
 * Pass an authenticated viem PublicClient (server-side) or a wagmi
 * `usePublicClient` instance (client-side). Either works.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchOnchainAttestation(
  publicClient: any,
  uid: `0x${string}`,
  network: SupportedNetwork,
): Promise<{
  schema: `0x${string}`;
  recipient: `0x${string}`;
  attester: `0x${string}`;
  data: `0x${string}`;
  time: number;
  revocationTime: number;
} | null> {
  const result = await publicClient.readContract({
    address: EAS_CONTRACTS[network],
    abi: EAS_ATTEST_ABI,
    functionName: 'getAttestation',
    args: [uid],
  });
  // EAS returns zero-bytes32 schema when the UID is unknown.
  const zeroSchema =
    '0x0000000000000000000000000000000000000000000000000000000000000000';
  if (!result || result.schema === zeroSchema) return null;
  return {
    schema: result.schema as `0x${string}`,
    recipient: result.recipient as `0x${string}`,
    attester: result.attester as `0x${string}`,
    data: result.data as `0x${string}`,
    time: Number(result.time),
    revocationTime: Number(result.revocationTime),
  };
}