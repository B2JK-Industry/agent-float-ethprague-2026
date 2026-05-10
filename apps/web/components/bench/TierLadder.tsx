// Tier-ladder reference block. Extracted from ScoreBanner per Daniel's
// 2026-05-10 layout call: render to the right of the subject chips
// (kind / mode), at the same vertical height — not under the banner.
//
// Thresholds MUST match TIER_THRESHOLDS in
// packages/evidence/src/score/weights.ts. Score 59 lands in A under
// the engine math (A ≥ 50), so the legend must say A ≥ 50 too.

type Tier = "S" | "A" | "B" | "C" | "D" | "U";

const TIER_COLOR_VAR: Record<Tier, string> = {
  S: "var(--color-tier-a)",
  A: "var(--color-tier-a)",
  B: "var(--color-tier-b)",
  C: "var(--color-tier-c)",
  D: "var(--color-tier-d)",
  U: "var(--color-tier-u)",
};

const LADDER_ROWS: ReadonlyArray<{
  readonly tier: Tier;
  readonly threshold: string;
  readonly note?: string;
}> = [
  {
    tier: "S",
    threshold: ">= 65",
    note: "v2: requires verified GitHub cross-sign",
  },
  { tier: "A", threshold: ">= 50" },
  { tier: "B", threshold: ">= 35" },
  { tier: "C", threshold: ">= 20" },
  { tier: "D", threshold: "<  20" },
  { tier: "U", threshold: "< 2 sources", note: "unrated, in queue" },
];

export function TierLadder({
  currentTier,
}: {
  readonly currentTier: Tier;
}): React.JSX.Element {
  return (
    <details
      data-block="tier-ladder"
      className="border border-border bg-surface p-3"
      open
    >
      <summary
        className="cursor-pointer font-mono uppercase text-t3"
        style={{
          fontSize: "10px",
          letterSpacing: "0.18em",
        }}
      >
        Tier ladder
      </summary>
      <ul
        className="mt-2 flex flex-col gap-1 font-mono"
        style={{
          fontSize: "11px",
          lineHeight: 1.55,
          letterSpacing: "0.06em",
        }}
      >
        {LADDER_ROWS.map((row) => (
          <li
            key={row.tier}
            data-ladder-tier={row.tier}
            data-current={row.tier === currentTier}
            className="grid grid-cols-[24px_64px_1fr] items-baseline gap-3"
          >
            <span
              style={{
                color: TIER_COLOR_VAR[row.tier],
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "14px",
                lineHeight: 1,
                letterSpacing: "-0.01em",
                border: "1px solid currentColor",
                borderStyle: row.tier === "U" ? "dashed" : "solid",
                display: "inline-grid",
                placeItems: "center",
                width: "20px",
                height: "20px",
              }}
              aria-hidden="true"
            >
              {row.tier}
            </span>
            <span className="text-t2">{row.threshold}</span>
            {row.note ? (
              <span className="text-t3" style={{ fontStyle: "italic" }}>
                {row.note}
              </span>
            ) : (
              <span aria-hidden="true" />
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
