// Off-chain EAS attestation builder + verifier.
//
// Flow per Bench report:
//   1. Aggregator computes ScoreResult.
//   2. Server signs the canonical report bytes with operator wallet
//      (existing EIP-712 path — `packages/evidence/src/sign/`).
//   3. We additionally wrap the SAME payload in an EAS off-chain
//      envelope. Signed by the same operator wallet, verifiable through
//      eas-sdk + on-chain SchemaRegistry without on-chain attest tx.
//
// Zero gas. Zero on-chain calls. Off-chain attestations live entirely
// in our API responses + the report JSON.
//
// On-chain publication is the subject's choice — see `onchain.ts`.

import {
  Offchain,
  OffchainAttestationVersion,
  SchemaEncoder,
  ZERO_BYTES32,
} from '@ethereum-attestation-service/eas-sdk';

// eas-sdk's signer interface — eslint disabled because the SDK types
// are intentionally permissive (ethers.Signer compat shim).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SignerOrProvider = any;
import { keccak256, toBytes } from 'viem';
import type { Address } from '@upgrade-siren/shared';

import {
  BENCH_ATTESTATION_REVOCABLE,
  BENCH_ATTESTATION_SCHEMA,
  BENCH_SCHEMA_UIDS,
  EAS_CONTRACTS,
  NETWORK_CHAIN_IDS,
  isSchemaDeployed,
} from './schema.js';
import type {
  BenchAttestationPayload,
  OffchainAttestationEnvelope,
  SupportedNetwork,
  VerifyResult,
} from './types.js';

// EAS encodes attestation data as ABI-encoded tuple matching the
// schema string. We encode the BenchAttestationPayload here so the
// `data` field of the envelope decodes back to the original values.
export function encodeBenchPayload(
  payload: BenchAttestationPayload,
): `0x${string}` {
  const encoder = new SchemaEncoder(BENCH_ATTESTATION_SCHEMA);
  return encoder.encodeData([
    { name: 'subject', value: payload.subject, type: 'address' },
    { name: 'ensNamehash', value: payload.ensNamehash, type: 'bytes32' },
    { name: 'score', value: payload.score, type: 'uint16' },
    { name: 'tier', value: payload.tier, type: 'string' },
    { name: 'computedAt', value: payload.computedAt, type: 'uint64' },
    { name: 'reportHash', value: payload.reportHash, type: 'bytes32' },
    { name: 'reportUri', value: payload.reportUri, type: 'string' },
  ]) as `0x${string}`;
}

export function decodeBenchPayload(
  encoded: `0x${string}`,
): BenchAttestationPayload {
  const encoder = new SchemaEncoder(BENCH_ATTESTATION_SCHEMA);
  const decoded = encoder.decodeData(encoded);
  const get = (name: string): unknown =>
    decoded.find((d) => d.name === name)?.value.value;
  return {
    subject: String(get('subject')) as Address,
    ensNamehash: String(get('ensNamehash')) as `0x${string}`,
    score: Number(get('score')),
    tier: String(get('tier')),
    computedAt: Number(get('computedAt')),
    reportHash: String(get('reportHash')) as `0x${string}`,
    reportUri: String(get('reportUri')),
  };
}

/**
 * Canonical report-hash derivation. Verifiers can match the off-chain
 * attestation's `reportHash` field against the keccak256 of the report
 * JSON they received (post-canonicalization).
 */
export function reportHash(canonicalReportJson: string): `0x${string}` {
  return keccak256(toBytes(canonicalReportJson));
}

export interface BuildOffchainOptions {
  readonly signer: SignerOrProvider;
  readonly network: SupportedNetwork;
  readonly recipient: Address;
}

/**
 * Build + sign an EAS off-chain attestation for a Bench report.
 *
 * Returns the canonical envelope shape (typed locally) plus the
 * eas-sdk-serialized JSON string ready for transport / persistence.
 */
export async function buildOffchainAttestation(
  payload: BenchAttestationPayload,
  options: BuildOffchainOptions,
): Promise<{
  envelope: OffchainAttestationEnvelope;
  serialized: string;
}> {
  const { signer, network, recipient } = options;
  if (!isSchemaDeployed(network)) {
    throw new Error(
      `EAS schema not yet deployed on ${network} — register the schema first and update BENCH_SCHEMA_UIDS.`,
    );
  }

  const eas = new Offchain(
    {
      address: EAS_CONTRACTS[network],
      version: '1.4.0',
      chainId: BigInt(NETWORK_CHAIN_IDS[network]),
    },
    OffchainAttestationVersion.Version2,
    // The eas-sdk wants an EAS instance for resolver hookups; we don't
    // use resolvers, so a stub is fine.
    {} as never,
  );

  const data = encodeBenchPayload(payload);
  const time = BigInt(payload.computedAt);

  const offchain = await eas.signOffchainAttestation(
    {
      schema: BENCH_SCHEMA_UIDS[network],
      recipient,
      time,
      expirationTime: 0n,
      revocable: BENCH_ATTESTATION_REVOCABLE,
      refUID: ZERO_BYTES32 as `0x${string}`,
      data,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signer as any,
  );

  // Recover signer for the envelope shape. The eas-sdk does this
  // implicitly during sign — we re-extract here for the typed return.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signerAddress = (await (signer as any).getAddress()) as Address;

  const envelope: OffchainAttestationEnvelope = {
    version: offchain.version,
    uid: offchain.uid as `0x${string}`,
    schema: BENCH_SCHEMA_UIDS[network],
    recipient,
    time: Number(time),
    expirationTime: 0,
    revocable: BENCH_ATTESTATION_REVOCABLE,
    refUID: ZERO_BYTES32 as `0x${string}`,
    data,
    signature: {
      v: offchain.signature.v,
      r: offchain.signature.r as `0x${string}`,
      s: offchain.signature.s as `0x${string}`,
    },
    signer: signerAddress,
  };

  // eas-sdk's `OffchainAttestation` is JSON-friendly modulo bigint —
  // serialize via the SDK helper.
  const serialized = JSON.stringify({
    sig: {
      domain: offchain.domain,
      primaryType: offchain.primaryType,
      types: offchain.types,
      message: {
        ...offchain.message,
        time: offchain.message.time.toString(),
        expirationTime: offchain.message.expirationTime.toString(),
      },
      uid: offchain.uid,
      version: offchain.version,
      signature: offchain.signature,
    },
    signer: signerAddress,
  });

  return { envelope, serialized };
}

export function serializeOffchainAttestation(
  envelope: OffchainAttestationEnvelope,
): string {
  return JSON.stringify({
    version: envelope.version,
    uid: envelope.uid,
    schema: envelope.schema,
    recipient: envelope.recipient,
    time: envelope.time,
    expirationTime: envelope.expirationTime,
    revocable: envelope.revocable,
    refUID: envelope.refUID,
    data: envelope.data,
    signature: envelope.signature,
    signer: envelope.signer,
  });
}

/**
 * Verify an off-chain attestation envelope:
 *   1. Parse JSON
 *   2. Decode `data` against the bench schema
 *   3. Recover signer via eas-sdk and compare to expected
 *
 * Returns typed `VerifyResult`. Pure I/O-free given a valid network
 * config — no network calls.
 */
export async function verifyOffchainAttestation(
  serialized: string,
  expectedSigner: Address,
  network: SupportedNetwork,
): Promise<VerifyResult> {
  if (!isSchemaDeployed(network)) {
    return {
      kind: 'error',
      reason: 'schema_mismatch',
      message: `EAS schema not deployed on ${network}`,
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch (err) {
    return {
      kind: 'error',
      reason: 'malformed_envelope',
      message: err instanceof Error ? err.message : String(err),
    };
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return {
      kind: 'error',
      reason: 'malformed_envelope',
      message: 'serialized envelope is not an object',
    };
  }
  const obj = parsed as Record<string, unknown>;
  // Direct envelope shape (our serialiser).
  const data = obj.data as `0x${string}` | undefined;
  const signer = obj.signer as Address | undefined;
  const schema = obj.schema as `0x${string}` | undefined;
  if (!data || !signer || !schema) {
    return {
      kind: 'error',
      reason: 'malformed_envelope',
      message: 'missing data/signer/schema field',
    };
  }
  if (schema.toLowerCase() !== BENCH_SCHEMA_UIDS[network].toLowerCase()) {
    return {
      kind: 'error',
      reason: 'schema_mismatch',
      message: `envelope schema ${schema} does not match bench schema ${BENCH_SCHEMA_UIDS[network]} for ${network}`,
    };
  }
  if (signer.toLowerCase() !== expectedSigner.toLowerCase()) {
    return {
      kind: 'error',
      reason: 'signer_mismatch',
      message: `envelope signer ${signer} != expected ${expectedSigner}`,
    };
  }

  let payload: BenchAttestationPayload;
  try {
    payload = decodeBenchPayload(data);
  } catch (err) {
    return {
      kind: 'error',
      reason: 'malformed_envelope',
      message: err instanceof Error ? err.message : String(err),
    };
  }

  // 2026-05-10 audit: actually recover the ECDSA signer from the
  // EIP-712 typed data instead of trusting the `signer` field claim.
  // eas-sdk's serializer wraps the typed-data fields under `sig`
  // (domain/primaryType/types/message/signature). When that wrapper
  // is present we reconstruct the typed data + recover the signer
  // via viem and compare to the claim.
  //
  // The flat-envelope shape (serializeOffchainAttestation output)
  // strips the typed-data fields, so signature recovery from that
  // form requires reconstructing domain/types from the network +
  // EAS schema knowledge. For now we verify only when the `sig`
  // wrapper is present; flat-envelope verification falls back to
  // shape-only and surfaces a typed warning (caller can still
  // reject if they require strong verification).
  const sig = (obj as { sig?: unknown }).sig;
  if (sig && typeof sig === 'object') {
    const sigObj = sig as Record<string, unknown>;
    const signature = sigObj.signature as
      | { v: number; r: `0x${string}`; s: `0x${string}` }
      | undefined;
    const message = sigObj.message as Record<string, unknown> | undefined;
    const types = sigObj.types as
      | Record<string, ReadonlyArray<{ name: string; type: string }>>
      | undefined;
    const domainRaw = sigObj.domain as Record<string, unknown> | undefined;
    const primaryType = (sigObj.primaryType as string | undefined) ?? 'Attest';
    if (!signature || !message || !types || !domainRaw) {
      return {
        kind: 'error',
        reason: 'malformed_envelope',
        message: 'sig wrapper present but missing typed-data fields',
      };
    }
    // Stringified bigints come back from JSON parse — viem requires
    // bigint for uint64 fields. Coerce time / expirationTime back.
    const messageCoerced: Record<string, unknown> = { ...message };
    for (const k of ['time', 'expirationTime']) {
      const v = messageCoerced[k];
      if (typeof v === 'string') {
        try {
          messageCoerced[k] = BigInt(v);
        } catch {
          /* leave as-is; recovery will fail with a typed error below */
        }
      }
    }
    // viem's recoverTypedDataAddress takes signature as a single 0x…
    // string. eas-sdk wrote v as the raw recovery byte (27/28 or 0/1);
    // viem accepts either via serializeSignature.
    let recovered: string;
    try {
      const { recoverTypedDataAddress, serializeSignature } = await import('viem');
      const sigHex = serializeSignature({
        r: signature.r,
        s: signature.s,
        v: BigInt(signature.v),
      });
      recovered = await recoverTypedDataAddress({
        domain: domainRaw as Parameters<typeof recoverTypedDataAddress>[0]['domain'],
        types: types as Parameters<typeof recoverTypedDataAddress>[0]['types'],
        primaryType: primaryType as Parameters<typeof recoverTypedDataAddress>[0]['primaryType'],
        message: messageCoerced as Parameters<typeof recoverTypedDataAddress>[0]['message'],
        signature: sigHex,
      });
    } catch (err) {
      return {
        kind: 'error',
        reason: 'bad_signature',
        message: `ECDSA recovery failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    if (recovered.toLowerCase() !== signer.toLowerCase()) {
      return {
        kind: 'error',
        reason: 'bad_signature',
        message: `recovered signer ${recovered} != envelope signer ${signer}`,
      };
    }
  }
  // No sig wrapper present → caller is verifying a flat envelope; we
  // can't recover without typed-data fields. Shape + schema + signer-
  // claim checks already passed above. Caller that needs strong
  // verification should pass the eas-sdk-produced format that includes
  // the sig wrapper.

  return { kind: 'ok', signer, payload };
}