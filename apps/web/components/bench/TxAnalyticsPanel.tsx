// Per-chain transaction analytics panel.
//
// Aggregates data the on-chain source fetcher (US-115 + US-115b) already
// pulls into MultiSourceEvidence.onchain[] and renders a per-chain card
// grid with: nonce, first-tx age, transfer counts (total + recent 90d),
// indexer provider badge, latest block. No extra fetch — purely a
// visual surface over existing data.
//
// Score-impact note: this panel does NOT introduce new score signals.
// All numbers shown are already factored into the on-chain engine's
// `onchainRecency` contribution. Rendering them here as a dedicated
// panel makes the underlying activity legible to judges who need to
// understand WHY a subject's relevance axis is high/low.

import type { MultiSourceEvidence, OnchainEntryEvidence } from "@upgrade-siren/evidence";

const CHAIN_LABEL: Record<number, string> = {
  1: "Ethereum mainnet",
  11155111: "Sepolia testnet",
  10: "Optimism",
  8453: "Base",
  42161: "Arbitrum One",
  137: "Polygon",
};

const SECONDS_PER_DAY = 86_400;

function chainLabel(chainId: number): string {
  return CHAIN_LABEL[chainId] ?? `chain ${chainId}`;
}

function ageLabel(firstTxTimestamp: number | null, nowSeconds: number): string {
  if (firstTxTimestamp === null) return "—";
  const days = Math.max(0, Math.floor((nowSeconds - firstTxTimestamp) / SECONDS_PER_DAY));
  if (days < 1) return "<1d";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

function fmtNumber(n: number): string {
  if (n === 0) return "0";
  if (n < 1000) return n.toString();
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

function activityIntensity(transferCountRecent90d: number | null | undefined, nonce: number): {
  label: string;
  color: string;
} {
  // Use indexer signal when available; fall back to nonce.
  const metric = transferCountRecent90d ?? nonce;
  if (metric >= 100) return { label: "high", color: "var(--color-src-verified)" };
  if (metric >= 10) return { label: "active", color: "var(--color-src-partial)" };
  if (metric > 0) return { label: "low", color: "var(--color-src-discounted)" };
  return { label: "dormant", color: "var(--color-t3)" };
}

function ChainCard({
  entry,
  nowSeconds,
}: {
  readonly entry: OnchainEntryEvidence;
  readonly nowSeconds: number;
}): React.JSX.Element | null {
  if (entry.kind === "ok" && !entry.value) return null;
  if (entry.kind === "error") {
    return (
      <li
        data-chain={entry.chainId}
        data-status="error"
        className="flex flex-col gap-1"
        style={{
          padding: "12px 14px",
          border: "1px dashed var(--color-border)",
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          letterSpacing: "0.04em",
        }}
      >
        <span className="text-t3 uppercase" style={{ fontSize: "10px", letterSpacing: "0.18em" }}>
          {chainLabel(entry.chainId)}
        </span>
        <span className="text-verdict-review">error · {entry.reason}</span>
        <span className="text-t3" style={{ fontSize: "10px" }}>
          {entry.message}
        </span>
      </li>
    );
  }

  const v = entry.value;
  const age = ageLabel(v.firstTxTimestamp, nowSeconds);
  const transferRecent = v.transferCountRecent90d ?? null;
  const transferTotal = v.transferCountTotal ?? null;
  const provider = v.transferCountProvider ?? null;
  const intensity = activityIntensity(transferRecent, v.nonce);

  return (
    <li
      data-chain={v.chainId}
      data-status="ok"
      data-intensity={intensity.label}
      className="flex flex-col gap-2"
      style={{
        padding: "12px 14px",
        border: "1px solid var(--color-border)",
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        letterSpacing: "0.04em",
      }}
    >
      <header className="flex items-baseline justify-between gap-2">
        <span className="text-t3 uppercase" style={{ fontSize: "10px", letterSpacing: "0.18em" }}>
          {chainLabel(v.chainId)}
        </span>
        <span
          data-field="intensity"
          className="uppercase"
          style={{
            fontSize: "9px",
            letterSpacing: "0.16em",
            color: intensity.color,
          }}
        >
          {intensity.label}
        </span>
      </header>

      <dl className="m-0 flex flex-col gap-1 p-0" style={{ fontVariantNumeric: "tabular-nums" }}>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-t3">first tx</dt>
          <dd data-field="age" className="text-t1">
            {age}
            {v.firstTxBlock !== null && (
              <span className="ml-1 text-t3" style={{ fontSize: "10px" }}>
                · #{v.firstTxBlock.toString().slice(0, 8)}
              </span>
            )}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-t3">nonce (out)</dt>
          <dd data-field="nonce" className="text-t1">{fmtNumber(v.nonce)}</dd>
        </div>
        {transferTotal !== null && (
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-t3">transfers total</dt>
            <dd data-field="transfers-total" className="text-t1">{fmtNumber(transferTotal)}</dd>
          </div>
        )}
        {transferRecent !== null && (
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-t3">last 90d</dt>
            <dd data-field="transfers-90d" className="text-t1">{fmtNumber(transferRecent)}</dd>
          </div>
        )}
        {provider && (
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-t3">provider</dt>
            <dd data-field="provider" className="text-t3" style={{ fontStyle: "italic" }}>{provider}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-t3">latest block</dt>
          <dd data-field="latest-block" className="text-t1" style={{ fontSize: "10px" }}>
            #{v.latestBlock.toString().slice(0, 10)}
          </dd>
        </div>
      </dl>
    </li>
  );
}

export function TxAnalyticsPanel({
  evidence,
  nowSeconds,
}: {
  readonly evidence: MultiSourceEvidence;
  readonly nowSeconds?: number;
}): React.JSX.Element | null {
  const chains = evidence.onchain;
  if (chains.length === 0) return null;
  const now = nowSeconds ?? Math.floor(Date.now() / 1000);
  const okChains = chains.filter((c) => c.kind === "ok");
  const errorChains = chains.filter((c) => c.kind === "error");

  // Aggregate top-line numbers across OK chains.
  let totalNonce = 0;
  let totalTransfers = 0;
  let totalRecent = 0;
  let oldestFirstTx: number | null = null;
  let activeChains = 0;
  for (const c of okChains) {
    if (c.kind !== "ok" || !c.value) continue;
    totalNonce += c.value.nonce;
    if (typeof c.value.transferCountTotal === "number") totalTransfers += c.value.transferCountTotal;
    if (typeof c.value.transferCountRecent90d === "number") totalRecent += c.value.transferCountRecent90d;
    if (c.value.firstTxTimestamp !== null && c.value.firstTxTimestamp !== undefined) {
      if (oldestFirstTx === null || c.value.firstTxTimestamp < oldestFirstTx) {
        oldestFirstTx = c.value.firstTxTimestamp;
      }
    }
    if (c.value.nonce > 0) activeChains += 1;
  }

  return (
    <section
      data-section="tx-analytics"
      data-chain-count={chains.length}
      aria-label="Per-chain transaction analytics"
      className="border border-border bg-surface"
    >
      <header
        className="font-mono uppercase text-t3"
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid var(--color-border)",
          fontSize: "10px",
          letterSpacing: "0.18em",
        }}
      >
        On-chain activity · {okChains.length} chain{okChains.length === 1 ? "" : "s"}
        {errorChains.length > 0 && (
          <span className="ml-2 text-verdict-review">· {errorChains.length} error{errorChains.length === 1 ? "" : "s"}</span>
        )}
      </header>

      {/* Top-line aggregate row */}
      <div
        data-block="aggregate"
        className="grid gap-3 sm:grid-cols-2 md:grid-cols-4"
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid var(--color-border)",
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          letterSpacing: "0.04em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <div className="flex flex-col">
          <span className="text-t3 uppercase" style={{ fontSize: "9px", letterSpacing: "0.18em" }}>oldest tx</span>
          <span data-field="oldest-tx" className="text-t1" style={{ fontSize: "16px", fontWeight: 600 }}>
            {ageLabel(oldestFirstTx, now)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-t3 uppercase" style={{ fontSize: "9px", letterSpacing: "0.18em" }}>active chains</span>
          <span data-field="active-chains" className="text-t1" style={{ fontSize: "16px", fontWeight: 600 }}>
            {activeChains} / {okChains.length}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-t3 uppercase" style={{ fontSize: "9px", letterSpacing: "0.18em" }}>transfers total</span>
          <span data-field="transfers-total" className="text-t1" style={{ fontSize: "16px", fontWeight: 600 }}>
            {fmtNumber(totalTransfers)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-t3 uppercase" style={{ fontSize: "9px", letterSpacing: "0.18em" }}>last 90d</span>
          <span data-field="transfers-90d" className="text-t1" style={{ fontSize: "16px", fontWeight: 600 }}>
            {fmtNumber(totalRecent)}
          </span>
        </div>
      </div>

      {/* Per-chain card grid */}
      <ul
        className="m-0 grid list-none gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3"
        data-block="chains-grid"
      >
        {chains.map((entry, idx) => (
          <ChainCard key={`${entry.chainId}-${idx}`} entry={entry} nowSeconds={now} />
        ))}
      </ul>

      <p
        className="text-t3"
        style={{
          padding: "10px 20px 14px",
          fontSize: "10px",
          letterSpacing: "0.04em",
          fontStyle: "italic",
          fontFamily: "var(--font-serif)",
          background: "var(--color-bg)",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        Per-chain on-chain evidence the orchestrator pulls. Score uses
        recent transfer count (or outbound nonce as fallback) for the
        on-chain relevance signal — see breakdown for the formula.
      </p>
    </section>
  );
}
