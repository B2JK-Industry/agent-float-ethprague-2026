// Wallet financial analytics panel — token holdings, NFT count,
// ETH balance + USD value for the subject's primaryAddress.
// Display-only (no score impact in v1).

import type { MultiSourceEvidence } from "@upgrade-siren/evidence";

const CHAIN_LABEL: Record<number, string> = {
  1: "Ethereum mainnet",
  11155111: "Sepolia",
  10: "Optimism",
  8453: "Base",
  42161: "Arbitrum One",
  137: "Polygon",
};

function fmtUsd(n: number | null): string {
  if (n === null) return "—";
  if (n < 0.01) return "<$0.01";
  if (n < 1000) return `$${n.toFixed(2)}`;
  if (n < 1_000_000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${(n / 1_000_000).toFixed(2)}M`;
}

function fmtToken(balance: string): string {
  const n = Number.parseFloat(balance);
  if (!Number.isFinite(n)) return balance;
  if (n < 0.0001) return n.toExponential(2);
  if (n < 1000) return n.toFixed(4);
  if (n < 1_000_000) return `${(n / 1000).toFixed(2)}k`;
  return `${(n / 1_000_000).toFixed(3)}M`;
}

export function WalletAnalyticsPanel({
  evidence,
}: {
  readonly evidence: MultiSourceEvidence;
}): React.JSX.Element | null {
  const wallets = evidence.walletAnalytics ?? [];
  if (wallets.length === 0) return null;

  const okWallets = wallets.filter((w) => w.kind === "ok");
  const errorWallets = wallets.filter((w) => w.kind === "error");

  if (okWallets.length === 0) {
    // Render compact error if all chains failed (likely missing key)
    const firstErr = errorWallets[0];
    return (
      <section
        data-section="wallet-analytics"
        data-state="error"
        className="border border-border bg-surface"
        style={{ padding: "12px 20px" }}
      >
        <span
          className="font-mono uppercase text-t3"
          style={{ fontSize: "10px", letterSpacing: "0.18em" }}
        >
          Wallet analytics ·{" "}
          {firstErr && firstErr.kind === "error" ? firstErr.reason : "unavailable"}
        </span>
      </section>
    );
  }

  // Aggregate top-line numbers across OK chains
  let totalEthBalance = 0;
  let totalEthValueUsd = 0;
  let totalTokenValueUsd = 0;
  let totalNftCount = 0;
  let totalNftCollections = 0;
  let totalValueUsd = 0;
  for (const w of okWallets) {
    if (w.kind !== "ok") continue;
    totalEthBalance += w.value.ethBalance;
    totalEthValueUsd += w.value.ethValueUsd ?? 0;
    totalTokenValueUsd += w.value.tokenTotalValueUsd;
    totalNftCount += w.value.nftTotalCount;
    totalNftCollections += w.value.nftCollectionsCount;
    totalValueUsd += w.value.totalValueUsd;
  }

  return (
    <section
      data-section="wallet-analytics"
      data-chain-count={okWallets.length}
      aria-label="Wallet financial analytics"
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
        Treasury & holdings · {okWallets.length} chain{okWallets.length === 1 ? "" : "s"} · score-neutral
      </header>

      {/* Top-line aggregate */}
      <div
        className="grid gap-3 sm:grid-cols-2 md:grid-cols-4"
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--color-border)",
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          letterSpacing: "0.04em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <div className="flex flex-col">
          <span className="text-t3 uppercase" style={{ fontSize: "9px", letterSpacing: "0.18em" }}>
            total value
          </span>
          <span
            data-field="total-value"
            className="text-t1"
            style={{ fontSize: "20px", fontWeight: 600, marginTop: "4px" }}
          >
            {fmtUsd(totalValueUsd > 0 ? totalValueUsd : null)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-t3 uppercase" style={{ fontSize: "9px", letterSpacing: "0.18em" }}>
            ETH balance
          </span>
          <span
            data-field="eth-balance"
            className="text-t1"
            style={{ fontSize: "20px", fontWeight: 600, marginTop: "4px" }}
          >
            {totalEthBalance.toFixed(4)}
          </span>
          {totalEthValueUsd > 0 && (
            <span className="text-t3" style={{ fontSize: "10px" }}>
              {fmtUsd(totalEthValueUsd)}
            </span>
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-t3 uppercase" style={{ fontSize: "9px", letterSpacing: "0.18em" }}>
            ERC-20 tokens
          </span>
          <span
            data-field="token-count"
            className="text-t1"
            style={{ fontSize: "20px", fontWeight: 600, marginTop: "4px" }}
          >
            {okWallets.reduce((s, w) => (w.kind === "ok" ? s + w.value.tokens.length : s), 0)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-t3 uppercase" style={{ fontSize: "9px", letterSpacing: "0.18em" }}>
            NFTs
          </span>
          <span
            data-field="nft-count"
            className="text-t1"
            style={{ fontSize: "20px", fontWeight: 600, marginTop: "4px" }}
          >
            {totalNftCount}
          </span>
          {totalNftCollections > 0 && (
            <span className="text-t3" style={{ fontSize: "10px" }}>
              {totalNftCollections} collection{totalNftCollections === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>

      {/* Per-chain breakdown */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" style={{ padding: "16px 20px" }}>
        {okWallets.map((w, i) => {
          if (w.kind !== "ok") return null;
          const v = w.value;
          return (
            <div
              key={`${v.chainId}-${i}`}
              data-chain={v.chainId}
              className="flex flex-col gap-2"
              style={{
                padding: "12px 14px",
                border: "1px solid var(--color-border)",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                letterSpacing: "0.04em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span
                className="text-t3 uppercase"
                style={{ fontSize: "10px", letterSpacing: "0.18em" }}
              >
                {CHAIN_LABEL[v.chainId] ?? `chain ${v.chainId}`}
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-t3">ETH</span>
                <span data-field="eth" className="text-t1">{v.ethBalance.toFixed(4)}</span>
              </div>
              {v.ethValueUsd !== null && (
                <div className="flex items-baseline justify-between">
                  <span className="text-t3">ETH value</span>
                  <span className="text-t1">{fmtUsd(v.ethValueUsd)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between">
                <span className="text-t3">tokens</span>
                <span data-field="tokens" className="text-t1">{v.tokens.length}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-t3">NFTs</span>
                <span data-field="nfts" className="text-t1">
                  {v.nftTotalCount} · {v.nftCollectionsCount} cols
                </span>
              </div>
              {v.tokens.length > 0 && (
                <ul
                  className="m-0 list-none p-0 mt-1"
                  style={{ borderTop: "1px dotted var(--color-border)", paddingTop: "6px" }}
                >
                  {v.tokens.slice(0, 5).map((t) => (
                    <li
                      key={t.contractAddress}
                      data-token={t.contractAddress}
                      className="flex items-baseline justify-between"
                      style={{ fontSize: "10px", padding: "2px 0" }}
                    >
                      <span className="text-t3" style={{ wordBreak: "break-all" }}>
                        {t.symbol ?? t.contractAddress.slice(0, 8)}
                      </span>
                      <span className="text-t1">{fmtToken(t.balance)}</span>
                    </li>
                  ))}
                  {v.tokens.length > 5 && (
                    <li
                      className="text-t3 mt-1"
                      style={{ fontSize: "10px", fontStyle: "italic", fontFamily: "var(--font-serif)" }}
                    >
                      … {v.tokens.length - 5} more
                    </li>
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>

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
        Treasury overview powered by Alchemy on-chain data + CoinGecko ETH
        price. ERC-20 token prices are best-effort (Pro tier needed for
        long-tail token pricing). Score-neutral surface for venture
        due-diligence framing.
      </p>
    </section>
  );
}
