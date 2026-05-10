// US-132 — Bench Mode score banner. Per `assets/brand/COMPONENT_PATTERNS.md`
// §5 (report head). Five-second moment for `/b/[name]`: judges read score,
// tier, both axes, and the v1 ceiling label within one second of paint.
//
// Anatomy (Bench v2 §5):
//   • tier monogram — 120×120 square, display 700 88px, 2px border in tier color
//   • score-big   — display 700 88px tabular-nums, tier color, no transition
//                   (v2 §5C banned: "numbers land at full value, never animate")
//   • score-meta  — mono 11px lh 1.55, three lines: / 100 · TIER X · v1 ceiling
//   • outcome chip — mono 11px upper, currentColor border + 6px dot
//
// Tier ladder block sits below the banner head per the user's directive
// 2026-05-09: render the S row with a "v2: requires verified GitHub
// cross-sign" footnote — never as if reachable in v1.
//
// All colors come from tokens (var(--color-*)). Hex literals are banned
// per `prompts/design-brief.md` Bench Mode canonical-spec section.

import type { ScoreResult, Tier } from "@upgrade-siren/evidence";

import { honestClaimsDisclaimer } from "../../lib/branding";

export type ScoreBannerProps = {
  readonly score: ScoreResult;
  /**
   * v1 max-final-score ceiling — label-only, NEVER a divisor. US-114b
   * merged 2026-05-09 18:12Z, raising the actual ceiling from the
   * pre-114b P0 = 66 to the full v1 = 79. The P0/full split is
   * historical; default is now a single 79. Prop allows override for
   * historical PR rebuilds (e.g. score engine pinned to a pre-114b
   * commit) and for the v2 cross-sign-verified path that lifts the
   * ceiling to 100.
   */
  readonly v1Max?: number;
};

const DEFAULT_V1_MAX = 79;

// Tier → CSS variable mapping. v1 currently can never reach S (capped by
// 0.6 GitHub trust factor); the S row in the ladder uses tier-a as the
// glyph color but is footnoted "v2: requires verified GitHub cross-sign".
const TIER_COLOR_VAR: Record<Tier, string> = {
  S: "var(--color-tier-a)",
  A: "var(--color-tier-a)",
  B: "var(--color-tier-b)",
  C: "var(--color-tier-c)",
  D: "var(--color-tier-d)",
  U: "var(--color-tier-u)",
};

// Tier → outcome chip variant per Bench v2 §1D.
type OutcomeKey = "fast" | "emerge" | "evid" | "block" | "unrated";

const TIER_TO_OUTCOME: Record<Tier, OutcomeKey> = {
  S: "fast",
  A: "fast",
  B: "emerge",
  C: "evid",
  D: "block",
  U: "unrated",
};

const OUTCOME_LABEL: Record<OutcomeKey, string> = {
  fast: "Fast-track",
  emerge: "Emerging",
  evid: "Evidence required",
  block: "Block",
  unrated: "Unrated",
};

const OUTCOME_COLOR_VAR: Record<OutcomeKey, string> = {
  fast: "var(--color-o-fast)",
  emerge: "var(--color-o-emerge)",
  evid: "var(--color-o-evid)",
  block: "var(--color-o-block)",
  unrated: "var(--color-tier-u)",
};

function axis100(value: number): number {
  // Score axes are raw discounted Σ in [0,1]. The banner shows them as
  // X / 100 — same scale as score_100. NEVER divides by ceiling (GATE-30).
  return Math.round(value * 100);
}

export function ScoreBanner({
  score,
  v1Max = DEFAULT_V1_MAX,
}: ScoreBannerProps): React.JSX.Element {
  const tier = score.tier;
  const tierColor = TIER_COLOR_VAR[tier];
  const outcome = TIER_TO_OUTCOME[tier];
  const outcomeColor = OUTCOME_COLOR_VAR[outcome];
  const seniority100 = axis100(score.seniority);
  const relevance100 = axis100(score.relevance);
  const isPublicRead = score.meta.mode === "public-read";

  return (
    <section
      data-section="score-banner"
      data-tier={tier}
      aria-label="Score banner"
      className="border-b border-border pb-6"
    >
      {/* Report head — §5 layout */}
      <div
        className="flex flex-wrap items-start gap-6"
        data-block="report-head"
      >
        {/* Tier monogram — §5 large square */}
        <div
          data-block="tier-monogram"
          data-tier-mono={tier}
          aria-label={`Tier ${tier}`}
          className="flex h-[120px] w-[120px] flex-shrink-0 items-center justify-center"
          style={{
            border: "2px solid currentColor",
            color: tierColor,
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "88px",
            lineHeight: 1,
            letterSpacing: "-0.04em",
          }}
        >
          {tier}
        </div>

        {/* Head meta — score row + axes + outcome chip */}
        <div className="flex min-w-0 flex-1 flex-col gap-3" data-block="head-meta">
          <span
            className="font-mono uppercase text-t3"
            style={{
              fontSize: "10px",
              letterSpacing: "0.18em",
            }}
          >
            Score
          </span>

          <div className="flex flex-wrap items-baseline gap-[18px]" data-block="score-row">
            {/* Score-big — §5 headline number, banned-motion compliant */}
            <span
              data-field="score-big"
              data-score={score.score_100}
              style={{
                color: tierColor,
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "88px",
                lineHeight: 0.85,
                letterSpacing: "-0.04em",
                fontVariantNumeric: "tabular-nums",
                transition: "none",
              }}
            >
              {score.score_100}
            </span>

            {/* Score-meta — three-line cluster per §5 */}
            <div
              data-field="score-meta"
              className="flex flex-col gap-0 font-mono text-t2"
              style={{
                fontSize: "11px",
                lineHeight: 1.55,
                letterSpacing: "0.06em",
              }}
            >
              <span>
                / <b className="font-medium text-t1">100</b>
              </span>
              <span>
                Tier <b className="font-medium text-t1">{tier}</b>
              </span>
            </div>
          </div>

          {/* Axes line */}
          <div
            data-field="axes"
            className="font-mono text-t2"
            style={{
              fontSize: "11px",
              letterSpacing: "0.06em",
            }}
          >
            Seniority{" "}
            <b
              data-field="seniority"
              className="font-medium text-t1"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {seniority100}
            </b>{" "}
            · Relevance{" "}
            <b
              data-field="relevance"
              className="font-medium text-t1"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {relevance100}
            </b>
          </div>

          {/* Outcome chip — §5 currentColor border + dot */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              data-chip="outcome"
              data-variant={outcome}
              className="inline-flex items-center font-mono uppercase"
              style={{
                color: outcomeColor,
                border: "1px solid currentColor",
                gap: "10px",
                padding: "9px 14px",
                fontSize: "11px",
                letterSpacing: "0.18em",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "currentColor",
                  flexShrink: 0,
                }}
              />
              {OUTCOME_LABEL[outcome]}
            </span>
            {isPublicRead ? (
              <span
                data-chip="confidence"
                data-variant="public-read"
                className="font-mono uppercase text-t3"
                style={{
                  border: "1px solid var(--color-border-strong)",
                  padding: "5px 10px",
                  fontSize: "10px",
                  letterSpacing: "0.18em",
                }}
              >
                confidence: public-read · tier ceiling A
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* US-139 — Honest-claims disclaimer rendered in-band on the
          score banner. Per EPIC §10.5 + GATE-14: never tooltip, never
          footnote. Copy is locked verbatim in lib/branding.ts via
          `honestClaimsDisclaimer` so a Daniel/Orch copy edit is one
          line. Serif italic styling reads as the "human voice" row
          per Bench v2 §3 type system (claims + asides → Source Serif). */}
      <p
        data-field="disclaimer"
        data-section="honest-claims"
        className="mt-5 max-w-3xl"
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: "13px",
          lineHeight: 1.5,
          color: "var(--color-t2)",
        }}
      >
        {honestClaimsDisclaimer}
      </p>

      {/* Tier ladder — renders the S row with v2 footnote. Per launch
          prompt 2026-05-09: don't hide S; don't imply it's reachable.
          Daniel 2026-05-10: tier ladder moved out of ScoreBanner into
          a standalone TierLadder block rendered next to the subject
          chip row in /b/[name]. */}
    </section>
  );
}
