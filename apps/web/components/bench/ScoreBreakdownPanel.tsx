// US-134 — Bench Mode score breakdown panel (GATE-30 surface).
//
// v3 atom composition:
//   • C-06 Axis Bar × 2 (seniority + relevance) — bar fill ≥0.80 cyan,
//     0.50-0.79 brass, <0.50 bronze; line items beneath the bar with
//     dotted dividers; tabular-nums on every numeric column.
//   • C-07 Math Line — final formula presentation, mono 13 expression,
//     display 700 32px result in tier color, ALWAYS two decimals.
//
// GATE-30 verbatim (docs/06-acceptance-gates.md):
//   "Trust-discount factor 0.6 is applied to every unverified-source
//    signal AND is visibly rendered in the breakdown panel as a × 0.6
//    column. Raw-discounted axis only — no normalization to ceiling.
//    v1 max final score is 79 (tier A); S-tier reserved for verified-
//    GitHub v2."
//
// Banned (kills GATE-30): rendering `0.601 / 0.700 → 86`. The 0.70 /
// 0.88 ceilings appear ONLY as decorative labels, never as divisors.
// EPIC §10 spells it out twice; launch prompt 2026-05-09 reaffirms.
//
// Tokens (no hex literals): --color-tier-*, --color-src-verified
// /partial/discounted, --color-t1/t2/t3, --color-border, --color-surface,
// --color-bg, --color-border-strong, --font-display, --font-mono,
// --font-serif (italic ceiling labels).

import type {
  ScoreAxisBreakdown,
  ScoreComponentBreakdown,
  ScoreResult,
  Tier,
} from "@upgrade-siren/evidence";

export type ScoreBreakdownPanelProps = {
  readonly score: ScoreResult;
  /**
   * v1 max-final-score ceiling — label-only, NEVER a divisor. US-114b
   * merged 2026-05-09 18:12Z, raising the actual ceiling from the P0
   * 66 to the full 79. Single ceiling now; the P0/full split is
   * historical.
   */
  readonly v1Max?: number;
  /** Per-axis full-v1 ceilings (label-only). EPIC §10.1 reachable-ceilings. */
  readonly v1FullSeniorityMax?: number;
  readonly v1FullRelevanceMax?: number;
};

const DEFAULT_V1_MAX = 79;
const DEFAULT_V1_FULL_SENIORITY_MAX = 70;
const DEFAULT_V1_FULL_RELEVANCE_MAX = 88;

const AXIS_WEIGHT = 0.5; // both axes split 0.5 / 0.5 per EPIC §10.1 lock

const TIER_COLOR_VAR: Record<Tier, string> = {
  S: "var(--color-tier-a)",
  A: "var(--color-tier-a)",
  B: "var(--color-tier-b)",
  C: "var(--color-tier-c)",
  D: "var(--color-tier-d)",
  U: "var(--color-tier-u)",
};

// C-06 fill threshold mapping (v3 spec): >=0.80 cyan, 0.50-0.79 brass,
// <0.50 bronze. Driven by the axis ratio (sum ÷ full v1 ceiling).
function fillColorVar(ratio: number): string {
  if (ratio >= 0.8) return "var(--color-src-verified)";
  if (ratio >= 0.5) return "var(--color-src-partial)";
  return "var(--color-src-discounted)";
}

function axis100(sum: number): number {
  return Math.round(sum * 100);
}

function fmt(value: number, dp: number): string {
  return value.toFixed(dp);
}

function statusBadge(comp: ScoreComponentBreakdown): string | null {
  if (comp.status === "null_p1") return "(P1, awaits US-114b)";
  if (comp.status === "null_no_data") return "(no data)";
  return null;
}

function valueLabel(comp: ScoreComponentBreakdown): string {
  if (comp.value === null) return "—";
  return fmt(comp.value, 2);
}

function AxisBar({
  axisLabel,
  axis,
  axisDataAttr,
  fullMax100,
}: {
  readonly axisLabel: string;
  readonly axis: ScoreAxisBreakdown;
  readonly axisDataAttr: "seniority" | "relevance";
  readonly fullMax100: number;
}): React.JSX.Element {
  const sum100 = axis100(axis.sum);
  // C-06 threshold uses the raw sum [0,1]. Threshold lives on the
  // axis VALUE itself, not on a ratio against ceiling — keeps the
  // gate-30 contract intact (no ceiling math).
  const fillColor = fillColorVar(axis.sum);
  // Width of the fill: axis 100-scaled out of 100 max. NOT divided by
  // ceiling. The fill width is always sum × 100% so a discounted axis
  // visibly sits short of "full" — that's the point.
  const fillPct = Math.max(0, Math.min(100, sum100));

  return (
    <section
      data-axis={axisDataAttr}
      data-block="axis-bar"
      className="px-5 py-4"
      aria-label={`${axisLabel} axis bar`}
    >
      {/* C-06 name + weight header */}
      <header className="mb-2 flex items-baseline justify-between gap-3">
        <span
          data-field="axis-header"
          className="font-mono uppercase"
          style={{
            fontSize: "10px",
            letterSpacing: "0.16em",
          }}
        >
          <b className="font-medium text-t1">{axisLabel}</b>
          <span className="text-t3" style={{ marginLeft: "8px" }}>
            w {fmt(AXIS_WEIGHT, 2)} · 100pt max
          </span>
        </span>
        <span
          data-field="earned-max"
          className="inline-flex items-baseline gap-1"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "18px",
            lineHeight: 1,
            letterSpacing: "-0.01em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <b data-field="earned" className="text-t1">
            {sum100}
          </b>
          <span
            data-field="max"
            className="text-t3"
            style={{ fontSize: "13px" }}
          >
            / 100
          </span>
        </span>
      </header>

      {/* C-06 fill bar — 6px high, no animation on score change */}
      <div
        role="presentation"
        data-field="fill-track"
        className="relative"
        style={{
          height: "6px",
          background: "var(--color-border)",
          marginBottom: "12px",
        }}
      >
        <div
          data-field="fill-bar"
          data-fill-color={fillColor}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: `${fillPct}%`,
            background: fillColor,
            transition: "none",
          }}
        />
      </div>

      {/* Line items — each component's weight × value × trust = contribution.
          GATE-30: × 0.6 column never hidden. */}
      <ul
        className="m-0 list-none p-0"
        data-block="line-items"
        style={{ borderTop: "1px dotted var(--color-border)" }}
      >
        {axis.components.map((comp) => {
          const badge = statusBadge(comp);
          const trustColor =
            comp.trust === "verified"
              ? "var(--color-src-verified)"
              : "var(--color-src-discounted)";
          return (
            <li
              key={comp.id}
              data-component={comp.id}
              data-status={comp.status}
              data-trust={comp.trust}
              className="grid items-center gap-x-4 gap-y-1"
              style={{
                gridTemplateColumns:
                  "minmax(170px, 1.4fr) 56px 56px 64px 72px",
                padding: "6px 0",
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.04em",
                lineHeight: 1.4,
                borderBottom: "1px dotted var(--color-border)",
              }}
            >
              <span data-field="label" className="text-t1">
                {comp.id}
                {badge ? (
                  <span
                    data-field="status-badge"
                    className="ml-2 text-t3"
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontStyle: "italic",
                      fontSize: "10px",
                      letterSpacing: 0,
                    }}
                  >
                    {badge}
                  </span>
                ) : null}
              </span>
              <span
                data-field="weight"
                className="text-right text-t1"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {fmt(comp.weight, 2)}
              </span>
              <span
                data-field="value"
                className="text-right text-t1"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {valueLabel(comp)}
              </span>
              <span
                data-field="trust-factor"
                data-multiplier={
                  comp.trust === "verified" ? "× 1.0" : "× 0.6"
                }
                className="text-right"
                style={{
                  fontVariantNumeric: "tabular-nums",
                  color: trustColor,
                }}
              >
                × {fmt(comp.trustFactor, 1)}
              </span>
              <span
                data-field="contribution"
                className="text-right text-t1"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                = {fmt(comp.contribution, 3)}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Σ line — raw discounted sum (GATE-30 verbatim banner) */}
      <p
        data-field="sum-line"
        className="mt-3 font-mono text-t1"
        style={{
          fontSize: "12px",
          letterSpacing: "0.04em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        Σ ={" "}
        <b data-field="sum-raw" className="font-medium">
          {fmt(axis.sum, 3)}
        </b>
        {" → "}
        <span data-field="axis-name">{axisDataAttr}</span>{" "}
        <b data-field="axis-100-inline" className="font-medium">
          {sum100}
        </b>{" "}
        of 100
      </p>
      <p
        data-field="ceiling-label"
        className="mt-1 text-t3"
        style={{
          fontSize: "10px",
          letterSpacing: "0.04em",
          fontStyle: "italic",
          fontFamily: "var(--font-serif)",
        }}
      >
        (max reachable v1 = {fullMax100}; verify GitHub cross-sign to lift)
      </p>
    </section>
  );
}

export function ScoreBreakdownPanel({
  score,
  v1Max = DEFAULT_V1_MAX,
  v1FullSeniorityMax = DEFAULT_V1_FULL_SENIORITY_MAX,
  v1FullRelevanceMax = DEFAULT_V1_FULL_RELEVANCE_MAX,
}: ScoreBreakdownPanelProps): React.JSX.Element {
  const tierColor = TIER_COLOR_VAR[score.tier];
  const seniority100 = axis100(score.seniority);
  const relevance100 = axis100(score.relevance);
  // C-07 result rendered to two decimals always (score_raw × 100).
  const finalTwoDecimals = fmt(score.score_raw * 100, 2);

  return (
    <section
      data-section="score-breakdown"
      data-tier={score.tier}
      aria-label="Score breakdown panel"
      className="border border-border bg-surface"
    >
      {/* Math head */}
      <header
        data-block="math-head"
        className="font-mono uppercase text-t3"
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid var(--color-border)",
          fontSize: "10px",
          letterSpacing: "0.18em",
        }}
      >
        Score math · how {score.score_100} was built · open ledger
      </header>

      {/* Two-axis grid (responsive 1-col below 780px per L-F pattern) */}
      <div
        data-block="math-grid"
        className="grid grid-cols-1 md:grid-cols-2"
      >
        <AxisBar
          axisLabel="Seniority"
          axis={score.breakdown.seniority}
          axisDataAttr="seniority"
          fullMax100={v1FullSeniorityMax}
        />
        <div
          className="md:border-l md:border-border"
          style={{ borderLeft: "1px solid var(--color-border)" }}
        >
          <AxisBar
            axisLabel="Relevance"
            axis={score.breakdown.relevance}
            axisDataAttr="relevance"
            fullMax100={v1FullRelevanceMax}
          />
        </div>
      </div>

      {/* C-07 Math Line — final formula resolution.
          v3 spec: mono 13 expression, two intermediate steps max,
          result display 700 32px tier color two decimals always. */}
      <div
        data-block="math-line"
        className="flex flex-wrap items-baseline justify-between gap-4"
        style={{
          padding: "18px 20px",
          background: "var(--color-bg)",
          borderTop: "1px solid var(--color-border-strong)",
        }}
      >
        <span
          data-field="math-label"
          className="text-t3 uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.16em",
          }}
        >
          Final score
        </span>
        <span
          data-field="math-expression"
          className="text-t1"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            letterSpacing: "0.04em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span className="text-t3">0.5&nbsp;×&nbsp;</span>
          <b data-field="math-seniority" className="font-medium">
            {seniority100}
          </b>
          <span className="text-t3">&nbsp;+&nbsp;0.5&nbsp;×&nbsp;</span>
          <b data-field="math-relevance" className="font-medium">
            {relevance100}
          </b>
          <span className="text-t3">&nbsp;=&nbsp;</span>
          <b data-field="math-step" className="font-medium">
            {fmt((seniority100 + relevance100) / 2, 2)}
          </b>
        </span>
        <span
          data-field="math-result-row"
          className="ml-auto inline-flex items-baseline gap-3"
        >
          <span aria-hidden="true" className="text-t3">
            →
          </span>
          <b
            data-field="math-result"
            style={{
              color: tierColor,
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "32px",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {finalTwoDecimals}
          </b>
          <span
            data-field="math-tier"
            className="font-mono uppercase text-t3"
            style={{
              fontSize: "10px",
              letterSpacing: "0.16em",
            }}
          >
            Tier{" "}
            <b
              data-field="math-tier-letter"
              className="font-medium"
              style={{ color: tierColor }}
            >
              {score.tier}
            </b>
          </span>
        </span>
      </div>

      {/* Final ceiling label — GATE-30 verbatim wording. v1 P0 + full + S
          reservation. Italic serif so it reads like a footnote. */}
      <p
        data-field="final-ceiling-label"
        className="text-t3"
        style={{
          padding: "12px 20px 16px",
          fontSize: "10px",
          letterSpacing: "0.04em",
          fontStyle: "italic",
          fontFamily: "var(--font-serif)",
          background: "var(--color-bg)",
        }}
      >
        (max reachable v1 = {v1Max} → A; S reserved for verified-GitHub v2)
      </p>
    </section>
  );
}
