// US-133 — Bench Mode source grid. Four tiles (Sourcify / GitHub /
// On-chain / ENS) per `assets/brand/COMPONENT_PATTERNS.md` §11 source
// row pattern, lifted into a 4-column tile grid.
//
// Carry-rule (Bench v2 §2B): every tile renders the mandatory
// glyph + label + multiplier triple. Color is redundancy, never the
// sole signal — judges or color-blind viewers always see the discount
// in the multiplier column.
//
// State variants per §11 + v2 §1C:
//   verified    — green dot, ×1.00, ✓
//   partial     — amber-tan dot, ×0.85, ⊘
//   discounted  — brown dot, ×0.60 (the canonical GitHub trust factor), ⊘
//   degraded    — orange dot, "degraded", ⚠
//   missing     — dashed border + grey dot, ×0.00, ·
//   invalid     — red dot, "INVALID", ✕
//
// Tokens used (no hex literals):
//   --color-src-verified / --src-partial / --src-discounted
//   --color-src-degraded / --src-missing / --color-o-block (invalid)
//   --color-t1 / --t2 / --t3 / --color-border-strong
//   --b-dash via inline style for missing tiles only (carry-rule v2 §2B
//   identifier — dashed border is RESERVED for missing source).

import type {
  EnsInternalEvidence,
  GithubEvidence,
  MultiSourceEvidence,
  OnchainEntryEvidence,
  SourcifyEntryEvidence,
} from "@upgrade-siren/evidence";

export type SourceState =
  | "verified"
  | "partial"
  | "discounted"
  | "degraded"
  | "missing"
  | "invalid";

export type SourceKey = "sourcify" | "github" | "onchain" | "ens";

export type SourceGridProps = {
  readonly evidence: MultiSourceEvidence;
};

type SourceTile = {
  readonly key: SourceKey;
  readonly label: string;
  readonly state: SourceState;
  readonly multiplier: string;
  readonly meta: string;
};

const STATE_COLOR_VAR: Record<SourceState, string> = {
  verified: "var(--color-src-verified)",
  partial: "var(--color-src-partial)",
  discounted: "var(--color-src-discounted)",
  degraded: "var(--color-src-degraded)",
  missing: "var(--color-src-missing)",
  invalid: "var(--color-o-block)",
};

const STATE_GLYPH: Record<SourceState, string> = {
  verified: "✓",
  partial: "⊘",
  discounted: "⊘",
  degraded: "⚠",
  missing: "·",
  invalid: "✕",
};

// Glyph aria-label so screen readers don't read raw ✓ as "check mark"
// when the state-name carries more meaning. Keeps the carry-rule v2
// §2B intact for assistive tech.
const STATE_ARIA: Record<SourceState, string> = {
  verified: "verified source",
  partial: "partial-match source",
  discounted: "discounted source",
  degraded: "degraded source",
  missing: "missing source",
  invalid: "invalid source",
};

function classifySourcify(
  entries: ReadonlyArray<SourcifyEntryEvidence>,
): { state: SourceState; meta: string } {
  if (entries.length === 0) {
    return { state: "missing", meta: "no projects in manifest" };
  }
  const okEntries = entries.filter((e) => e.kind === "ok");
  const errorCount = entries.length - okEntries.length;
  if (okEntries.length === 0) {
    return {
      state: "invalid",
      meta: `${entries.length} entr${entries.length === 1 ? "y" : "ies"} failed`,
    };
  }
  // All ok — distinguish exact_match (verified) from partial match.
  // Optional chain on `.deep` so test fixtures without a full SourcifyDeep
  // shape still render (production orchestrator always populates deep).
  const allExact = okEntries.every(
    (e) => e.kind === "ok" && e.deep?.match === "exact_match",
  );
  if (allExact && errorCount === 0) {
    return {
      state: "verified",
      meta: `${entries.length} exact-match entr${
        entries.length === 1 ? "y" : "ies"
      }`,
    };
  }
  if (errorCount > 0) {
    return {
      state: "partial",
      meta: `${okEntries.length}/${entries.length} verified, ${errorCount} failed`,
    };
  }
  return {
    state: "partial",
    meta: `${okEntries.length} entr${
      okEntries.length === 1 ? "y" : "ies"
    } (mixed match levels)`,
  };
}

function classifyGithub(
  github: GithubEvidence,
): { state: SourceState; meta: string } {
  if (github.kind === "absent") {
    return {
      state: "missing",
      meta: "no PAT / no claim in manifest",
    };
  }
  if (github.kind === "error") {
    return { state: "invalid", meta: github.reason };
  }
  // v1: GitHub is ALWAYS discounted (× 0.6 trust factor per Section 21
  // D-G lock). Schema field github.verified flips this in v2 once cross-
  // sign verification ships; until then the discount is structural.
  return {
    state: "discounted",
    meta: "claim trusted, × 0.60 until cross-signed",
  };
}

function classifyOnchain(
  entries: ReadonlyArray<OnchainEntryEvidence>,
): { state: SourceState; meta: string } {
  if (entries.length === 0) {
    return { state: "missing", meta: "no chains queried" };
  }
  const okCount = entries.filter((e) => e.kind === "ok").length;
  const errorCount = entries.length - okCount;
  if (okCount === 0) {
    return {
      state: "invalid",
      meta: `${entries.length} chain${entries.length === 1 ? "" : "s"} failed`,
    };
  }
  if (errorCount > 0) {
    return {
      state: "partial",
      meta: `${okCount}/${entries.length} chains ok`,
    };
  }
  return {
    state: "verified",
    meta: `${okCount} chain${okCount === 1 ? "" : "s"} verified`,
  };
}

function classifyEns(
  ens: EnsInternalEvidence,
): { state: SourceState; meta: string } {
  if (ens.kind === "absent") {
    return { state: "missing", meta: "no Graph API key" };
  }
  if (ens.kind === "error") {
    return { state: "invalid", meta: ens.reason };
  }
  return { state: "verified", meta: "subgraph live" };
}

const STATE_MULTIPLIER: Record<SourceState, string> = {
  verified: "× 1.00",
  partial: "× 0.85",
  discounted: "× 0.60",
  degraded: "degraded",
  missing: "× 0.00",
  invalid: "INVALID",
};

function buildTiles(evidence: MultiSourceEvidence): ReadonlyArray<SourceTile> {
  const sourcify = classifySourcify(evidence.sourcify);
  const github = classifyGithub(evidence.github);
  const onchain = classifyOnchain(evidence.onchain);
  const ens = classifyEns(evidence.ensInternal);
  return [
    {
      key: "sourcify",
      label: "Sourcify",
      state: sourcify.state,
      multiplier: STATE_MULTIPLIER[sourcify.state],
      meta: sourcify.meta,
    },
    {
      key: "github",
      label: "GitHub",
      state: github.state,
      multiplier: STATE_MULTIPLIER[github.state],
      meta: github.meta,
    },
    {
      key: "onchain",
      label: "On-chain",
      state: onchain.state,
      multiplier: STATE_MULTIPLIER[onchain.state],
      meta: onchain.meta,
    },
    {
      key: "ens",
      label: "ENS",
      state: ens.state,
      multiplier: STATE_MULTIPLIER[ens.state],
      meta: ens.meta,
    },
  ];
}

function tileBorder(state: SourceState): string {
  if (state === "missing") {
    // Carry-rule v2 §2B: dashed border RESERVED for missing source only.
    return "1px dashed var(--color-border-strong)";
  }
  return "1px solid var(--color-border)";
}

export function SourceGrid({
  evidence,
}: SourceGridProps): React.JSX.Element {
  const tiles = buildTiles(evidence);

  return (
    <section
      data-section="source-grid"
      aria-label="Source grid"
      className="grid gap-3 md:grid-cols-2 lg:grid-cols-4"
    >
      {tiles.map((tile) => {
        const color = STATE_COLOR_VAR[tile.state];
        const isMissing = tile.state === "missing";
        return (
          <article
            key={tile.key}
            data-source={tile.key}
            data-state={tile.state}
            aria-label={`${tile.label} source · ${STATE_ARIA[tile.state]}`}
            style={{
              border: tileBorder(tile.state),
              background: "var(--color-surface)",
              padding: "16px",
              display: "grid",
              gridTemplateColumns: "14px 1fr auto",
              gap: "10px",
              alignItems: "center",
            }}
          >
            {/* Dot — color-paired-with-glyph carry-rule (v2 §2B). The
                glyph below is the redundancy; this dot is the at-a-glance
                color signal. */}
            <span
              data-field="dot"
              aria-hidden="true"
              style={{
                width: "10px",
                height: "10px",
                background: isMissing ? "transparent" : color,
                border: isMissing
                  ? "1px dashed var(--color-border-strong)"
                  : "0",
                flexShrink: 0,
              }}
            />
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span
                  aria-hidden="true"
                  data-field="glyph"
                  style={{
                    color,
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  {STATE_GLYPH[tile.state]}
                </span>
                <span
                  data-field="label"
                  className="font-mono text-t1"
                  style={{
                    fontSize: "12px",
                    letterSpacing: "0.06em",
                  }}
                >
                  {tile.label}
                </span>
              </div>
              <span
                data-field="meta"
                className="font-mono text-t3"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.04em",
                  wordBreak: "break-word",
                }}
              >
                {tile.meta}
              </span>
            </div>
            <span
              data-field="multiplier"
              data-multiplier={tile.multiplier}
              style={{
                color,
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                letterSpacing: "0.08em",
                padding: "3px 8px",
                border: "1px solid currentColor",
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
              }}
            >
              {tile.multiplier}
            </span>
          </article>
        );
      })}
    </section>
  );
}
