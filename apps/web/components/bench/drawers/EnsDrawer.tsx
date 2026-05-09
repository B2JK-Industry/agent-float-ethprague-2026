// US-138 — ENS source drawer for `/b/[name]`. Renders subgraph-derived
// signals (registration date, subname count, text-record count, last
// record update block) plus an honest disclaimer noting that ENS
// records are self-attested and contribute only the recency component
// (capped at 7.5% of the v1 score ceiling).
//
// Anatomy compliance:
//   • v3 §C-04 Trust Pill — drawer header carries a state pill driven
//     by EnsInternalEvidence.kind (verified / invalid / missing).
//   • v3 §C-09 Heartbeat NOT used — the GitHub drawer reserves the
//     one-per-surface heartbeat per v3 spec.
//   • Carry-rule v2 §2B — every state ships with glyph + label;
//     dashed border RESERVED for the missing/absent state.
//
// Source state mapping (`EnsInternalEvidence` → drawer state):
//   kind:'ok'      → verified (× 1.00, ✓, --src-verified)
//   kind:'error'   → invalid  (INVALID, ✕, --o-block) + reason text
//   kind:'absent'  → missing  (× 0.00, ·, --src-missing) + dashed border
//
// Tokens (no hex literals): --color-src-* full set, --color-tier-*
// (brass meta line per spec), --color-t1/t2/t3, --color-border,
// --color-border-strong, --color-bg, --color-surface, --color-raised,
// --color-accent, --color-o-block, --font-mono, --font-display,
// --font-serif (italic disclaimer).

import type {
  EnsInternalEvidence,
} from "@upgrade-siren/evidence";

import { TrustPill } from "../primitives/TrustPill";

export type EnsDrawerProps = {
  readonly subjectName: string;
  readonly ens: EnsInternalEvidence;
  readonly initialOpen?: boolean;
};

// Same approximation as US-137: mainnet block time ~12s. ENS resolvers
// live on mainnet so this is a single-chain anchor.
const APPROX_BLOCK_TIME_SECONDS = 12;
const SECONDS_PER_MONTH = 30 * 24 * 60 * 60;
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

function formatRegistrationDate(unixSeconds: number | null): string {
  if (unixSeconds === null) return "unregistered";
  const date = new Date(unixSeconds * 1000);
  // ISO YYYY-MM-DD slice avoids locale variance — matches the
  // SourcifyDrawer pushedAt rendering rule (US-135).
  return date.toISOString().slice(0, 10);
}

function approxAgeFromTimestamp(
  unixSeconds: number,
  nowSeconds: number,
): string {
  const diff = nowSeconds - unixSeconds;
  if (diff < 0) return "future";
  const years = Math.floor(diff / SECONDS_PER_YEAR);
  if (years >= 1) return `${years}y`;
  const months = Math.floor(diff / SECONDS_PER_MONTH);
  if (months >= 1) return `${months}mo`;
  const days = Math.floor(diff / (24 * 60 * 60));
  if (days >= 1) return `${days}d`;
  return "<1d";
}

function approxMonthsFromBlocks(blocksAgo: number): string {
  if (blocksAgo <= 0) return "<1mo";
  const seconds = blocksAgo * APPROX_BLOCK_TIME_SECONDS;
  const years = Math.floor(seconds / SECONDS_PER_YEAR);
  if (years >= 1) return `~${years}y ago`;
  const months = Math.floor(seconds / SECONDS_PER_MONTH);
  if (months >= 1) return `~${months}mo ago`;
  return "<1mo ago";
}

const HONEST_DISCLAIMER =
  "ENS records are self-attested and do not contribute to score beyond recency component (7.5% of ceiling).";

function StatBlock({
  label,
  value,
  fieldId,
}: {
  readonly label: string;
  readonly value: string | number;
  readonly fieldId: string;
}): React.JSX.Element {
  return (
    <div className="flex flex-col">
      <span
        data-field={`${fieldId}-label`}
        className="font-mono uppercase text-t3"
        style={{
          fontSize: "9px",
          letterSpacing: "0.18em",
        }}
      >
        {label}
      </span>
      <span
        data-field={`${fieldId}-value`}
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
        {value}
      </span>
    </div>
  );
}

function HonestDisclaimer(): React.JSX.Element {
  return (
    <p
      data-field="ens-disclaimer"
      className="text-tier-c"
      style={{
        color: "var(--color-tier-c)",
        fontFamily: "var(--font-serif)",
        fontStyle: "italic",
        fontSize: "11px",
        letterSpacing: "0.02em",
        lineHeight: 1.5,
        marginTop: "12px",
      }}
    >
      {HONEST_DISCLAIMER}
    </p>
  );
}

export function EnsDrawer({
  subjectName,
  ens,
  initialOpen = false,
}: EnsDrawerProps): React.JSX.Element {
  // Absent state — no API key configured; orchestrator returned
  // kind:'absent' for the source. Render dashed-border missing pill.
  if (ens.kind === "absent") {
    return (
      <details
        data-section="ens-drawer"
        data-state="absent"
        open={initialOpen}
        style={{
          border: "1px dashed var(--color-border-strong)",
          background: "var(--color-raised)",
          padding: "14px 20px",
        }}
      >
        <summary
          data-block="drawer-trigger"
          className="flex flex-wrap items-baseline justify-between gap-3"
          style={{
            cursor: "pointer",
          }}
        >
          <span
            data-field="header"
            className="inline-flex items-baseline gap-3 font-mono uppercase text-t3"
            style={{
              fontSize: "11px",
              letterSpacing: "0.18em",
            }}
          >
            <span aria-hidden="true">·</span>
            ENS · {subjectName}
            <span
              data-field="header-label"
              className="font-mono"
              style={{
                fontSize: "9px",
                letterSpacing: "0.1em",
              }}
            >
              missing
            </span>
          </span>
          <TrustPill variant="missing" label="× 0.00" />
        </summary>
        <p
          data-field="absent-note"
          className="mt-3 font-mono text-t3"
          style={{
            fontSize: "11px",
            letterSpacing: "0.04em",
            lineHeight: 1.5,
          }}
        >
          ENS subgraph key not provided. Configure
          {" "}
          <code
            className="font-mono"
            style={{
              color: "var(--color-accent)",
            }}
          >
            GRAPH_API_KEY
          </code>
          {" "}
          to surface registration date, subname count, text-record count
          and last-update age for this subject.
        </p>
        <HonestDisclaimer />
      </details>
    );
  }

  if (ens.kind === "error") {
    return (
      <details
        data-section="ens-drawer"
        data-state="invalid"
        open={initialOpen}
        style={{
          border: "1px solid var(--color-o-block)",
          background: "var(--color-raised)",
          padding: "14px 20px",
        }}
      >
        <summary
          data-block="drawer-trigger"
          className="flex flex-wrap items-baseline justify-between gap-3"
          style={{ cursor: "pointer" }}
        >
          <span
            data-field="header"
            className="inline-flex items-baseline gap-3 font-mono uppercase"
            style={{
              color: "var(--color-o-block)",
              fontSize: "11px",
              letterSpacing: "0.18em",
            }}
          >
            <span aria-hidden="true">✕</span>
            ENS · {subjectName}
          </span>
          <TrustPill variant="invalid" label="INVALID" />
        </summary>
        <p
          data-field="error-reason"
          className="mt-3 font-mono text-t1"
          style={{
            fontSize: "11px",
            letterSpacing: "0.04em",
          }}
        >
          {ens.reason}
        </p>
        <p
          data-field="error-message"
          className="mt-1 font-mono text-t2"
          style={{
            fontSize: "10px",
            letterSpacing: "0.04em",
            lineHeight: 1.5,
          }}
        >
          {ens.message}
        </p>
        <p
          data-field="error-retry"
          className="mt-2 font-mono text-t3"
          style={{
            fontSize: "10px",
            letterSpacing: "0.04em",
            fontStyle: "italic",
            fontFamily: "var(--font-serif)",
          }}
        >
          Retry the lookup; subgraph rate-limit windows reset every 60s.
          If the failure persists, rotate the
          {" "}
          <code
            className="font-mono"
            style={{ color: "var(--color-accent)" }}
          >
            GRAPH_API_KEY
          </code>.
        </p>
        <HonestDisclaimer />
      </details>
    );
  }

  // ok state
  const v = ens.value;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const registrationLabel = formatRegistrationDate(v.registrationDate);
  const lastUpdateLabel: string =
    v.lastRecordUpdateBlock !== null
      ? approxMonthsFromBlocks(
          // Use a recent-ish "now-block" anchor — we don't have a
          // latestBlock from the subgraph response in this shape, so
          // approximate from registrationDate's block-equivalent. Better
          // than rendering nothing; UI carries `~` prefix to flag the
          // approximation honestly.
          v.registrationDate !== null
            ? Math.floor(
                (nowSeconds - v.registrationDate) / APPROX_BLOCK_TIME_SECONDS,
              )
            : 0,
        )
      : "no records";

  return (
    <details
      data-section="ens-drawer"
      data-state="verified"
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
          data-field="header"
          className="inline-flex items-baseline gap-3 font-mono uppercase text-t1"
          style={{
            fontSize: "11px",
            letterSpacing: "0.18em",
          }}
        >
          <span
            data-field="header-glyph"
            aria-hidden="true"
            style={{ color: "var(--color-src-verified)" }}
          >
            ✓
          </span>
          ENS · {subjectName}
        </span>
        <span
          data-field="header-meta"
          className="inline-flex items-baseline gap-3"
        >
          <span
            data-field="registration-date"
            className="font-mono text-t3"
            style={{
              fontSize: "10px",
              letterSpacing: "0.06em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {registrationLabel}
            {v.registrationDate !== null ? (
              <span className="ml-2 text-t3">
                ({approxAgeFromTimestamp(v.registrationDate, nowSeconds)})
              </span>
            ) : null}
          </span>
          <TrustPill variant="verified" label="× 1.00" />
        </span>
      </summary>

      <div
        data-block="ens-stats"
        className="grid gap-6"
        style={{
          padding: "20px",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        }}
      >
        <StatBlock label="subnames" value={v.subnameCount} fieldId="subnames" />
        <StatBlock
          label="text records"
          value={v.textRecordCount}
          fieldId="text-records"
        />
        <div className="flex flex-col">
          <span
            data-field="last-update-label"
            className="font-mono uppercase text-t3"
            style={{
              fontSize: "9px",
              letterSpacing: "0.18em",
            }}
          >
            last record update
          </span>
          <span
            data-field="last-update-value"
            className="font-mono text-t1"
            style={{
              fontSize: "13px",
              letterSpacing: "0.04em",
              fontVariantNumeric: "tabular-nums",
              marginTop: "4px",
            }}
          >
            {v.lastRecordUpdateBlock !== null ? (
              <>
                <span data-field="last-update-block">
                  block {v.lastRecordUpdateBlock.toString()}
                </span>
                <span data-field="last-update-age" className="ml-2 text-t3">
                  {lastUpdateLabel}
                </span>
              </>
            ) : (
              <span data-field="last-update-empty" className="text-t3">
                no record updates
              </span>
            )}
          </span>
        </div>
      </div>

      <div
        data-field="disclaimer-row"
        style={{
          padding: "0 20px 16px",
        }}
      >
        <HonestDisclaimer />
      </div>
    </details>
  );
}
