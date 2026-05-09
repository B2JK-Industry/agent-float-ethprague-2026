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

import {
  BENCH_SCHEMA_UIDS,
  DEFAULT_PUBLISH_NETWORK,
  EAS_ATTEST_ABI,
  EAS_CONTRACTS,
  NETWORK_CHAIN_IDS,
  easExplorerUrl,
  isSchemaDeployed,
  type BenchAttestationBundle,
  type SupportedNetwork,
} from "@upgrade-siren/evidence";

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

  // Don't render at all when there's no off-chain attestation to
  // publish (mock subjects, public-read with no signed claim, etc.).
  if (!easBundle) return null;

  const subjectMatches =
    subjectAddress !== null &&
    walletAddress?.toLowerCase() === subjectAddress.toLowerCase();
  const schemaReady = isSchemaDeployed(network);

  async function onPublish(): Promise<void> {
    if (!walletAddress || !subjectAddress) return;
    if (!easBundle) return;
    setState({ kind: "switching" });
    try {
      const targetChainId = NETWORK_CHAIN_IDS[network];
      if (chain?.id !== targetChainId) {
        await switchChainAsync({ chainId: targetChainId });
      }

      setState({ kind: "submitting" });
      const txHash = await writeContractAsync({
        address: EAS_CONTRACTS[network],
        abi: EAS_ATTEST_ABI,
        functionName: "attest",
        args: [
          {
            schema: BENCH_SCHEMA_UIDS[network],
            data: {
              recipient: subjectAddress,
              expirationTime: 0n,
              revocable: true,
              refUID:
                "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
              data: easBundle.offchain.serialized as `0x${string}`,
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

      // EAS emits the UID as a return value; we extract from the
      // receipt logs (Attested event topic[1] is the UID).
      const attestedTopic =
        "0x8bf46bf4cfd674fa735a3d63ec1c9ad4153f033c290341f3a588b75685141b35";
      const log = receipt.logs.find(
        (l) => l.topics[0]?.toLowerCase() === attestedTopic,
      );
      const uid = (log?.topics[2] ?? log?.topics[1]) as `0x${string}` | undefined;

      if (!uid) {
        throw new Error(
          `tx confirmed but UID not found in logs: ${txHash}`,
        );
      }

      setState({ kind: "indexing", txHash, uid });

      // Notify server to verify + persist.
      const recordRes = await fetch(
        `/api/bench/${encodeURIComponent(subjectName)}/eas/record-publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid, network, txHash }),
        },
      );
      if (!recordRes.ok) {
        const err = await recordRes.json().catch(() => ({}));
        throw new Error(
          `server indexing failed: ${err.message ?? recordRes.statusText}`,
        );
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
      ) : !subjectMatches ? (
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
              : "subject wallet"}
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