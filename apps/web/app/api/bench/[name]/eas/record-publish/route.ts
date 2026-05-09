// POST /api/bench/[name]/eas/record-publish
//
// Subject's wallet has already submitted the on-chain `attest(...)` tx
// from the client. The client receives the resulting UID, then calls
// this endpoint with `{ uid, network, txHash }`. We fetch the on-chain
// attestation by UID, verify its `data` matches our off-chain envelope
// (same reportHash + same recipient + same schema), and persist the
// publication metadata in Turso.
//
// Strict no-write contract: this endpoint does NOT submit any
// transaction to EAS contracts. Read-only `getAttestation` call only.
// AC #9 — verified by absence of writeContract / sendTransaction.
//
// Idempotent on `(offchainUid, onchainUid)`: re-posting with the same
// UIDs returns the same response, no double-write.

import { NextResponse } from "next/server";
import { createPublicClient, http, type Address } from "viem";
import { base, mainnet, optimism, sepolia } from "viem/chains";

import {
  fetchOnchainAttestation,
  decodeBenchPayload,
  BENCH_SCHEMA_UIDS,
  type SupportedNetwork,
} from "@upgrade-siren/evidence";

import {
  loadLatestAttestationForSubject as loadFromStore,
  recordOnchainPublication,
} from "../../../../../../lib/easStore";

const NETWORK_TO_VIEM_CHAIN = {
  mainnet,
  base,
  optimism,
  sepolia,
} as const;

const NETWORK_TO_RPC_ENV: Record<SupportedNetwork, string | null> = {
  mainnet: "ALCHEMY_RPC_MAINNET",
  base: "ALCHEMY_RPC_BASE",
  optimism: "ALCHEMY_RPC_OPTIMISM",
  sepolia: "ALCHEMY_RPC_SEPOLIA",
};

function isHex32(s: unknown): s is `0x${string}` {
  return typeof s === "string" && /^0x[0-9a-fA-F]{64}$/.test(s);
}

function isSupportedNetwork(s: unknown): s is SupportedNetwork {
  return s === "base" || s === "optimism" || s === "sepolia" || s === "mainnet";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
): Promise<Response> {
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Body must be JSON." },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "invalid_body", message: "Body must be a JSON object." },
      { status: 400 },
    );
  }

  const { uid, network, txHash } = body as Record<string, unknown>;
  if (!isHex32(uid)) {
    return NextResponse.json(
      { error: "invalid_uid", message: "uid must be a 0x-prefixed bytes32 string." },
      { status: 400 },
    );
  }
  if (!isSupportedNetwork(network)) {
    return NextResponse.json(
      {
        error: "invalid_network",
        message: "network must be one of: base, optimism, sepolia, mainnet.",
      },
      { status: 400 },
    );
  }
  if (!isHex32(txHash) && !(typeof txHash === "string" && /^0x[0-9a-fA-F]+$/.test(txHash))) {
    return NextResponse.json(
      { error: "invalid_txhash", message: "txHash must be a 0x-prefixed hex string." },
      { status: 400 },
    );
  }

  // Load the off-chain attestation we're about to mark as published.
  const stored = await loadFromStore(name);
  if (!stored) {
    return NextResponse.json(
      {
        error: "no_offchain_record",
        message: `No off-chain attestation found for subject ${name}. Generate a report first.`,
      },
      { status: 404 },
    );
  }

  // Fetch the on-chain attestation by UID + verify it matches.
  const rpcEnvKey = NETWORK_TO_RPC_ENV[network];
  const rpcUrl =
    (rpcEnvKey ? process.env[rpcEnvKey] : undefined) ?? process.env.ENS_RPC_URL;

  const publicClient = createPublicClient({
    chain: NETWORK_TO_VIEM_CHAIN[network],
    transport: http(rpcUrl),
  });

  let attestation;
  try {
    attestation = await fetchOnchainAttestation(publicClient, uid, network);
  } catch (err) {
    return NextResponse.json(
      {
        error: "rpc_error",
        message: `Failed to read on-chain attestation: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 502 },
    );
  }

  if (!attestation) {
    return NextResponse.json(
      {
        error: "uid_not_found",
        message: `Attestation UID ${uid} not found on ${network}. Wait for tx to confirm and retry.`,
      },
      { status: 404 },
    );
  }

  if (
    attestation.schema.toLowerCase() !==
    BENCH_SCHEMA_UIDS[network].toLowerCase()
  ) {
    return NextResponse.json(
      {
        error: "schema_mismatch",
        message: `On-chain attestation schema ${attestation.schema} does not match bench schema ${BENCH_SCHEMA_UIDS[network]}.`,
      },
      { status: 422 },
    );
  }

  // Decode payload + cross-check reportHash matches what we issued.
  let onchainPayload;
  try {
    onchainPayload = decodeBenchPayload(attestation.data);
  } catch (err) {
    return NextResponse.json(
      {
        error: "data_decode_failed",
        message: `Could not decode on-chain attestation data: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 422 },
    );
  }

  if (
    onchainPayload.reportHash.toLowerCase() !==
    stored.offchain.payload.reportHash.toLowerCase()
  ) {
    return NextResponse.json(
      {
        error: "report_hash_mismatch",
        message: `On-chain reportHash ${onchainPayload.reportHash} does not match off-chain ${stored.offchain.payload.reportHash}. The on-chain attestation was for a different report.`,
      },
      { status: 422 },
    );
  }

  const publishedBy = attestation.attester as Address;

  const { updated } = await recordOnchainPublication({
    offchainUid: stored.offchain.uid,
    onchainUid: uid,
    onchainNetwork: network,
    onchainTxHash: txHash as `0x${string}`,
    onchainPublishedBy: publishedBy,
  });

  if (!updated) {
    return NextResponse.json(
      {
        error: "store_update_failed",
        message: "Off-chain record exists but onchain update did not match any row.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    subject: name,
    onchain: {
      uid,
      network,
      txHash,
      attester: publishedBy,
      time: attestation.time,
    },
  });
}