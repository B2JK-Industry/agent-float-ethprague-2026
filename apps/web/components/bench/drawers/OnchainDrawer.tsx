// US-137 — On-chain source drawer for `/b/[name]`. Renders per-chain
// activity panels (Mainnet / Sepolia / OP / Base / Arbitrum / others)
// from `MultiSourceEvidence.onchain[]`.
//
// Anatomy compliance:
//   • v3 §C-04 Trust Pill — every chain header carries a state pill
//     (verified / degraded / discounted / missing / invalid) with the
//     mandatory currentColor border + tabular-nums.
//   • v3 §C-11 Evidence Row — chain rows expose the same dot + name +
//     citation + multiplier triple as Sourcify drawer (US-135).
//   • Carry-rule v2 §2B — every state ships with a glyph + label so
//     color isn't the sole signal. Dashed border RESERVED for missing
//     transfer-count data (indexer key absent).
//
// Source state mapping (`OnchainEntryEvidence` → tile state):
//   kind:'ok' (always)              → verified (cyan)
//   kind:'error' reason:rpc_timeout → degraded (amber, ⚠)
//   kind:'error' other reasons      → discounted (bronze, ✕)
//
// Transfer count enrichment (US-115b):
//   transferCountRecent90d present  → render with provider label
//                                     (Alchemy / Etherscan)
//   transferCountRecent90d absent / null → dashed-border missing pill
//                                     "indexer key absent — fallback
//                                      nonce/cap 1000"
//
// Tokens (no hex literals): --color-src-* full set, --color-tier-*,
// --color-t1/t2/t3, --color-border, --color-border-strong, --color-bg,
// --color-surface, --color-raised, --color-accent, --color-o-block,
// --font-mono, --font-display, --font-serif (italic notes).

import type {
  OnchainEntryEvidence,
} from "@upgrade-siren/evidence";

import { TrustPill, type TrustPillVariant } from "../primitives/TrustPill";

export type OnchainDrawerProps = {
  readonly entries: ReadonlyArray<OnchainEntryEvidence>;
  readonly initialOpen?: boolean;
};

// Canonical chain labels. Anything outside this set falls through to
// "chain <id>" — accurate for tests and forward-compatible for new
// chains the orchestrator may add.
const CHAIN_LABEL: Record<number, string> = {
  1: "Mainnet",
  10: "Optimism",
  56: "BNB Smart Chain",
  137: "Polygon",
  8453: "Base",
  42161: "Arbitrum One",
  11155111: "Sepolia",
};

function chainName(chainId: number): string {
  return CHAIN_LABEL[chainId] ?? `chain ${chainId}`;
}

// Mainnet block time in seconds. The actual block time varies by chain
// but the score engine + UI treat 12s as the conservative anchor for
// "approximate age" math — matches the EPIC §10.3 ensRecency policy.
const APPROX_BLOCK_TIME_SECONDS = 12;
const SECONDS_PER_MONTH = 30 * 24 * 60 * 60;
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

function approxAgeFromTimestamp(unixSeconds: number, nowSeconds: number): string {
  const diff = nowSeconds - unixSeconds;
  if (diff < 0) return "future"; // clock skew safety
  const years = Math.floor(diff / SECONDS_PER_YEAR);
  if (years >= 1) return `${years}y`;
  const months = Math.floor(diff / SECONDS_PER_MONTH);
  if (months >= 1) return `${months}mo`;
  const days = Math.floor(diff / (24 * 60 * 60));
  if (days >= 1) return `${days}d`;
  return "<1d";
}

function approxAgeFromBlock(
  block: bigint,
  latestBlock: bigint,
): string {
  if (block >= latestBlock) return "<1d";
  const blocksAgo = Number(latestBlock - block);
  const seconds = blocksAgo * APPROX_BLOCK_TIME_SECONDS;
  const years = Math.floor(seconds / SECONDS_PER_YEAR);
  if (years >= 1) return `~${years}y`;
  const months = Math.floor(seconds / SECONDS_PER_MONTH);
  if (months >= 1) return `~${months}mo`;
  const days = Math.floor(seconds / (24 * 60 * 60));
  if (days >= 1) return `~${days}d`;
  return "<1d";
}

type ErrorState = {
  variant: TrustPillVariant;
  glyph: string;
  label: string;
};

function errorState(reason: string): ErrorState {
  if (reason === "rpc_timeout") {
    return { variant: "degraded", glyph: "⚠", label: "DEGRADED" };
  }
  return { variant: "discounted", glyph: "✕", label: "INVALID" };
}

function ChainHeader({
  chainId,
  state,
  glyph,
  label,
}: {
  readonly chainId: number;
  readonly state: TrustPillVariant;
  readonly glyph: string;
  readonly label: string;
}): React.JSX.Element {
  const color =
    state === "verified"
      ? "var(--color-src-verified)"
      : state === "degraded"
        ? "var(--color-src-degraded)"
        : state === "missing"
          ? "var(--color-src-missing)"
          : "var(--color-src-discounted)";
  return (
    <header className="flex flex-wrap items-baseline justify-between gap-2">
      <span
        data-field="chain-name"
        className="inline-flex items-baseline gap-3 font-mono uppercase"
        style={{
          color,
          fontSize: "11px",
          letterSpacing: "0.18em",
        }}
      >
        <span data-field="chain-glyph" aria-hidden="true">
          {glyph}
        </span>
        {chainName(chainId)}
        <span
          data-field="chain-id"
          className="font-mono uppercase text-t3"
          style={{
            border: "1px solid var(--color-border-strong)",
            padding: "2px 6px",
            fontSize: "9px",
            letterSpacing: "0.1em",
          }}
        >
          chainId {chainId}
        </span>
      </span>
      <TrustPill variant={state} label={label} />
    </header>
  );
}

function OkChainCard({
  entry,
  nowSeconds,
}: {
  readonly entry: Extract<OnchainEntryEvidence, { kind: "ok" }>;
  readonly nowSeconds: number;
}): React.JSX.Element {
  // `entry.value` is required on OnchainEntryOk per the type, but
  // page-level test fixtures spread cast-through-unknown without it.
  // Defensively fall back to a degraded shape so the drawer doesn't
  // crash on synthetic shapes (production orchestrator always
  // populates value).
  const v = entry.value ?? null;
  const transferRecent = v?.transferCountRecent90d;
  const provider = v?.transferCountProvider;
  const indexerAbsent =
    transferRecent === undefined || transferRecent === null;
  const firstTxBlock = v?.firstTxBlock ?? null;
  const firstTxTimestamp = v?.firstTxTimestamp ?? null;
  const latestBlock = v?.latestBlock ?? null;
  const nonce = v?.nonce ?? 0;
  const firstAge =
    firstTxTimestamp !== null
      ? approxAgeFromTimestamp(firstTxTimestamp, nowSeconds)
      : firstTxBlock !== null && latestBlock !== null
        ? approxAgeFromBlock(firstTxBlock, latestBlock)
        : null;

  return (
    <article
      data-chain-id={entry.chainId}
      data-state="verified"
      style={{
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        padding: "16px 18px",
        display: "grid",
        gap: "12px",
      }}
    >
      <ChainHeader
        chainId={entry.chainId}
        state="verified"
        glyph="✓"
        label="× 1.00"
      />

      {/* Nonce — display 700 large, tabular-nums, the headline number for
          this chain. Mirrors the score-tile big-number rule (banned
          motion: no count-up). */}
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <div className="flex flex-col">
          <span
            data-field="nonce-label"
            className="font-mono uppercase text-t3"
            style={{
              fontSize: "9px",
              letterSpacing: "0.18em",
            }}
          >
            outbound nonce
          </span>
          <span
            data-field="nonce-value"
            className="text-t1"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "32px",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
              transition: "none",
            }}
          >
            {nonce}
          </span>
        </div>

        <div className="flex flex-col">
          <span
            data-field="first-tx-label"
            className="font-mono uppercase text-t3"
            style={{
              fontSize: "9px",
              letterSpacing: "0.18em",
            }}
          >
            first tx
          </span>
          <span
            data-field="first-tx-value"
            className="font-mono text-t1"
            style={{
              fontSize: "13px",
              letterSpacing: "0.04em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {firstTxBlock !== null ? (
              <>
                <span data-field="first-tx-block">
                  block {firstTxBlock.toString()}
                </span>
                {firstAge ? (
                  <span data-field="first-tx-age" className="ml-2 text-t3">
                    {firstAge} ago
                  </span>
                ) : null}
              </>
            ) : (
              <span data-field="first-tx-empty" className="text-t3">
                no outbound txs
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Transfer count (90d) — render with provider when present;
          render dashed-border missing pill with fallback note when
          absent (carry-rule v2 §2B identifier reservation). */}
      <div
        data-field="transfer-row"
        className="flex flex-wrap items-baseline gap-2"
      >
        <span
          className="font-mono uppercase text-t3"
          style={{
            fontSize: "9px",
            letterSpacing: "0.18em",
          }}
        >
          transfers (90d)
        </span>
        {indexerAbsent ? (
          <span
            data-field="transfer-missing"
            data-state="missing"
            className="inline-flex items-center gap-2 font-mono text-t3"
            style={{
              border: "1px dashed var(--color-border-strong)",
              padding: "3px 8px",
              fontSize: "10px",
              letterSpacing: "0.06em",
            }}
          >
            <span aria-hidden="true">·</span>
            <span data-field="transfer-missing-label">indexer absent</span>
            <span data-field="transfer-missing-note" className="text-t3">
              — fallback nonce/cap 1000
            </span>
          </span>
        ) : (
          <>
            <span
              data-field="transfer-count"
              className="font-mono text-t1"
              style={{
                fontSize: "13px",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {transferRecent}
            </span>
            <span
              data-field="transfer-provider"
              className="font-mono uppercase text-t3"
              style={{
                border: "1px solid var(--color-border-strong)",
                padding: "2px 6px",
                fontSize: "9px",
                letterSpacing: "0.1em",
              }}
            >
              {provider ?? "indexer"}
            </span>
          </>
        )}
      </div>
    </article>
  );
}

function ErrorChainCard({
  entry,
}: {
  readonly entry: Extract<OnchainEntryEvidence, { kind: "error" }>;
}): React.JSX.Element {
  const state = errorState(entry.reason);
  const borderColor =
    state.variant === "degraded"
      ? "var(--color-src-degraded)"
      : "var(--color-src-discounted)";
  return (
    <article
      data-chain-id={entry.chainId}
      data-state={state.variant}
      style={{
        border: `1px solid ${borderColor}`,
        background: "var(--color-surface)",
        padding: "16px 18px",
        display: "grid",
        gap: "10px",
      }}
    >
      <ChainHeader
        chainId={entry.chainId}
        state={state.variant}
        glyph={state.glyph}
        label={state.label}
      />
      <p
        data-field="error-reason"
        className="font-mono text-t1"
        style={{
          fontSize: "11px",
          letterSpacing: "0.04em",
        }}
      >
        {entry.reason}
      </p>
      <p
        data-field="error-message"
        className="font-mono text-t2"
        style={{
          fontSize: "10px",
          letterSpacing: "0.04em",
          lineHeight: 1.5,
        }}
      >
        {entry.message}
      </p>
    </article>
  );
}

export function OnchainDrawer({
  entries,
  initialOpen = false,
}: OnchainDrawerProps): React.JSX.Element {
  // nowSeconds anchor for age math. Pinned-server-side; tests can mock
  // by passing a deterministic Date.now via vitest fake timers if needed.
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (entries.length === 0) {
    return (
      <details
        data-section="onchain-drawer"
        data-state="absent"
        open={initialOpen}
        style={{
          border: "1px dashed var(--color-border-strong)",
          background: "var(--color-raised)",
          padding: "14px 20px",
        }}
      >
        <summary
          className="font-mono uppercase text-t3"
          style={{
            fontSize: "10px",
            letterSpacing: "0.18em",
            cursor: "pointer",
          }}
        >
          On-chain · absent
        </summary>
        <p
          className="mt-3 font-mono text-t3"
          style={{
            fontSize: "11px",
            letterSpacing: "0.04em",
            lineHeight: 1.5,
          }}
        >
          Subject manifest declares no on-chain primary address, or the
          orchestrator did not query any chains. onchainRecency falls
          back to the subject's nonce / cap-1000.
        </p>
      </details>
    );
  }

  const okCount = entries.filter((e) => e.kind === "ok").length;
  const errorCount = entries.length - okCount;

  return (
    <details
      data-section="onchain-drawer"
      data-state="ok"
      data-entry-count={entries.length}
      open={initialOpen}
      style={{
        border: "1px solid var(--color-border)",
        background: "var(--color-raised)",
      }}
    >
      <summary
        data-block="drawer-trigger"
        className="flex flex-wrap items-baseline justify-between gap-3"
        style={{
          padding: "14px 20px",
          cursor: "pointer",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <span
          className="font-mono uppercase text-t1"
          style={{
            fontSize: "11px",
            letterSpacing: "0.18em",
          }}
        >
          On-chain · {entries.length} chain
          {entries.length === 1 ? "" : "s"}
        </span>
        <span
          className="font-mono text-t3"
          style={{
            fontSize: "10px",
            letterSpacing: "0.06em",
          }}
        >
          {okCount} verified · {errorCount} failed
        </span>
      </summary>

      <div
        data-block="chain-grid"
        className="grid gap-3 md:grid-cols-2"
        style={{
          padding: "20px",
        }}
      >
        {entries.map((entry, i) =>
          entry.kind === "ok" ? (
            <OkChainCard
              key={`${entry.chainId}-${i}`}
              entry={entry}
              nowSeconds={nowSeconds}
            />
          ) : (
            <ErrorChainCard
              key={`${entry.chainId}-${i}`}
              entry={entry}
            />
          ),
        )}
      </div>

      <p
        data-field="drawer-meta"
        className="text-t3"
        style={{
          padding: "12px 20px 16px",
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: "10px",
          letterSpacing: "0.04em",
          background: "var(--color-bg)",
        }}
      >
        On-chain reads are RPC truth — every signal counts × 1.00 (EPIC
        §10 lock). Transfer-count enrichment requires US-115b indexer
        keys; absent chains fall back to nonce/cap-1000.
      </p>
    </details>
  );
}
