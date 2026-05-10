"use client";

// Subject-specific EAS publish widget. Renders top-right of /b/[name]
// (above the hero band). Encapsulates the entire publish flow:
//
//   1. Disconnected → "Connect wallet to publish"
//   2. Connected, wrong wallet → "Wrong wallet — connect <subjectAddr>"
//   3. Connected, correct wallet, not yet published → "Publish to EAS"
//   4. Pending tx → "Awaiting confirmation…"
//   5. Published → "View on EAS Explorer ↗"
//   6. Failed → error + retry
//
// The publish click:
//   - Switches the wallet to the chosen network if needed
//   - Sends `attest(...)` calldata to the EAS contract on that network
//   - On tx confirm, POSTs UID + txHash + network to
//     /api/bench/[name]/eas/record-publish
//   - Server fetches the on-chain attestation, verifies it matches our
//     off-chain envelope, persists in Turso

import { useEffect, useState } from "react";
import { ConnectKitButton } from "connectkit";
import { useAccount, useSwitchChain, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useConfig } from "wagmi";

import { decodeEventLog, namehash, parseAbiItem } from "viem";

// EAS `Attested` event signature:
//   event Attested(
//     address indexed recipient,
//     address indexed attester,
//     bytes32 uid,
//     bytes32 indexed schema
//   )
// uid is NON-indexed → it lives in the data field, not the topics array.
// Decoding via viem's decodeEventLog gives us back the proper bytes32.
const ATTESTED_EVENT = parseAbiItem(
  "event Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schema)",
);

import {
  BENCH_SCHEMA_UIDS,
  DEFAULT_PUBLISH_NETWORK,
  EAS_ATTEST_ABI,
  EAS_CONTRACTS,
  NETWORK_CHAIN_IDS,
  easExplorerUrl,
  encodeBenchPayload,
  isSchemaDeployed,
  type BenchAttestationBundle,
  type SupportedNetwork,
} from "@upgrade-siren/evidence/eas";

export type BenchPublishWidgetProps = {
  readonly subjectName: string;
  readonly subjectAddress: `0x${string}` | null;
  readonly easBundle: BenchAttestationBundle | null;
};

type PublishState =
  | { kind: "idle" }
  | { kind: "switching" }
  | { kind: "submitting" }
  | { kind: "pending"; txHash: `0x${string}` }
  | { kind: "indexing"; txHash: `0x${string}`; uid: `0x${string}` }
  | { kind: "published"; uid: `0x${string}`; network: SupportedNetwork }
  | { kind: "error"; message: string };

export function BenchPublishWidget({
  subjectName,
  subjectAddress,
  easBundle,
}: BenchPublishWidgetProps): React.JSX.Element | null {
  const { address: walletAddress, isConnected, chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const config = useConfig();
  const [state, setState] = useState<PublishState>({ kind: "idle" });
  const [network] = useState<SupportedNetwork>(DEFAULT_PUBLISH_NETWORK);

  // Sync state to bundle.onchain when it lands published.
  useEffect(() => {
    if (
      easBundle?.onchain.status === "published" &&
      state.kind !== "published"
    ) {
      setState({
        kind: "published",
        uid: easBundle.onchain.uid,
        network: easBundle.onchain.network,
      });
    }
  }, [easBundle, state.kind]);

  // Self-attest demo mode: when no Turso row exists for this subject
  // (ad-hoc /b/{name} visit, not pre-seeded) and the visitor has a
  // wallet connected, we still render the publish button. The connected
  // wallet becomes both attester AND recipient — the resulting on-chain
  // attestation is "subject self-attests with their bench score".
  // Off-chain envelope is generated inline at publish time using the
  // visitor's wallet to sign the EAS payload (no operator key required
  // in the browser).
  const schemaReady = isSchemaDeployed(network);
  const selfAttest = !easBundle && walletAddress !== undefined;
  const subjectMatches =
    subjectAddress !== null &&
    walletAddress?.toLowerCase() === subjectAddress.toLowerCase();
  const effectiveSubject =
    subjectAddress ?? (walletAddress as `0x${string}` | undefined) ?? null;
  // Skip the "Connect <subject>" gate in self-attest mode — there's no
  // canonical subject address to match against.
  const canPublish =
    isConnected &&
    schemaReady &&
    (selfAttest || subjectMatches) &&
    effectiveSubject !== null;

  async function onPublish(): Promise<void> {
    if (!walletAddress) return;
    const recipient = effectiveSubject;
    if (!recipient) return;
    setState({ kind: "switching" });
    try {
      const targetChainId = NETWORK_CHAIN_IDS[network];
      if (chain?.id !== targetChainId) {
        await switchChainAsync({ chainId: targetChainId });
      }

      // Build the EAS data field. Two paths:
      //   1. easBundle present → use the canonical ABI-encoded payload
      //      from the off-chain envelope (matches the bench schema).
      //   2. self-attest mode → encode a fresh BenchAttestationPayload
      //      using `encodeBenchPayload` so the on-chain attestation
      //      decodes cleanly against the registered schema. score=0 +
      //      tier="U" is honest for a freshly-typed subject without a
      //      stored report.
      const dataPayload: `0x${string}` = easBundle
        ? (easBundle.offchain.serialized as `0x${string}`)
        : encodeBenchPayload({
            subject: walletAddress as `0x${string}`,
            ensNamehash: namehash(subjectName) as `0x${string}`,
            score: 0,
            tier: "U",
            computedAt: Math.floor(Date.now() / 1000),
            reportHash:
              "0x0000000000000000000000000000000000000000000000000000000000000000",
            reportUri: `${typeof window !== "undefined" ? window.location.origin : "https://upgrade-siren.vercel.app"}/b/${encodeURIComponent(subjectName)}`,
          });

      setState({ kind: "submitting" });
      const txHash = await writeContractAsync({
        address: EAS_CONTRACTS[network],
        abi: EAS_ATTEST_ABI,
        functionName: "attest",
        args: [
          {
            schema: BENCH_SCHEMA_UIDS[network],
            data: {
              recipient,
              expirationTime: 0n,
              revocable: true,
              refUID:
                "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
              data: dataPayload,
              value: 0n,
            },
          },
        ],
      });

      setState({ kind: "pending", txHash });

      const receipt = await waitForTransactionReceipt(config, {
        hash: txHash,
        chainId: targetChainId,
      });

      // Extract UID from the Attested event. UID lives in the
      // non-indexed `data` field — viem's decodeEventLog handles the
      // packing for us; topics[1..3] are recipient/attester/schema.
      let uid: `0x${string}` | undefined;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: [ATTESTED_EVENT],
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "Attested") {
            uid = decoded.args.uid as `0x${string}`;
            break;
          }
        } catch {
          // Not an Attested event — skip and continue.
        }
      }

      if (!uid) {
        throw new Error(
          `tx confirmed but Attested UID not found in receipt logs: ${txHash}`,
        );
      }

      setState({ kind: "indexing", txHash, uid });

      // Notify server to verify + persist (only when an off-chain row
      // exists in the store — self-attest mode skips this since there's
      // nothing to update; the on-chain UID is the artifact).
      if (easBundle) {
        const recordRes = await fetch(
          `/api/bench/${encodeURIComponent(subjectName)}/eas/record-publish`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid, network, txHash }),
          },
        );
        if (!recordRes.ok) {
          // Non-fatal — log but still mark published. The on-chain
          // attestation IS the canonical artifact.
          // eslint-disable-next-line no-console
          console.warn("server indexing failed", await recordRes.text());
        }
      }

      setState({ kind: "published", uid, network });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <aside
      data-widget="bench-publish"
      data-state={state.kind}
      className="flex flex-col items-end gap-2"
    >
      {!schemaReady ? (
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-tier-c">
          EAS schema pending deploy on {network}
        </span>
      ) : !isConnected ? (
        <ConnectKitButton.Custom>
          {({ show }) => (
            <button
              type="button"
              onClick={show}
              className="inline-flex items-center gap-2 border border-accent bg-bg px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-accent hover:bg-accent hover:text-bg"
            >
              <span aria-hidden>◇</span>
              <span>Connect to publish</span>
            </button>
          )}
        </ConnectKitButton.Custom>
      ) : !canPublish ? (
        <button
          type="button"
          disabled
          className="inline-flex cursor-not-allowed items-center gap-2 border border-border-strong bg-bg px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-t3 opacity-60"
        >
          <span aria-hidden>×</span>
          <span>
            Connect{" "}
            {subjectAddress
              ? `${subjectAddress.slice(0, 6)}…${subjectAddress.slice(-4)}`
              : "wallet"}
          </span>
        </button>
      ) : state.kind === "published" ? (
        <a
          href={easExplorerUrl(state.network, state.uid)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border border-verdict-safe bg-bg px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-verdict-safe hover:bg-verdict-safe hover:text-bg"
        >
          <span aria-hidden>✓</span>
          <span>View on EAS Explorer ↗</span>
        </a>
      ) : state.kind === "pending" || state.kind === "indexing" ? (
        <button
          type="button"
          disabled
          className="inline-flex cursor-progress items-center gap-2 border border-tier-c bg-bg px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-tier-c"
        >
          <span aria-hidden className="animate-pulse">◐</span>
          <span>
            {state.kind === "pending" ? "Confirming tx…" : "Indexing…"}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void onPublish()}
          disabled={state.kind === "switching" || state.kind === "submitting"}
          className="inline-flex items-center gap-2 border border-accent bg-bg px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-accent hover:bg-accent hover:text-bg disabled:cursor-progress disabled:opacity-60"
        >
          <span aria-hidden>↗</span>
          <span>
            {state.kind === "switching"
              ? "Switching network…"
              : state.kind === "submitting"
                ? "Sign in wallet…"
                : `Publish to EAS (${network})`}
          </span>
        </button>
      )}
      {state.kind === "error" ? (
        <span
          role="alert"
          className="max-w-xs text-right font-mono text-[10px] text-verdict-siren"
        >
          {state.message}
        </span>
      ) : null}
    </aside>
  );
}