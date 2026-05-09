// Upgrade Siren brand tokens as a Tailwind 4 theme preset.
//
// Source-of-truth: assets/brand/tokens.css (Bench v2 Foundations + v1
// Sequential Review, supplied 2026-05-09). This file is mechanically
// derived to keep Tailwind utility classes aligned with the canonical
// CSS variables.
//
// Two consumption paths:
//
//   import { brandTheme } from "../../assets/brand/tailwind-preset";
//   import type { Config } from "tailwindcss";
//   const config: Config = { theme: { extend: brandTheme }, ... };
//
// Or paste `brandThemeCss` into apps/web/app/globals.css after
// `@import "tailwindcss";`. Both paths produce the same utility names.
//
// Bench Mode (Epic 2) adds tier / src / o / conf / paper-stamp scoped
// tokens that did not exist in US-067. Where US-067 (paper) and Bench v2
// disagreed, Bench v2 wins (paper #FAFAF8 → #F5F1E6). Verdict-* tokens
// from US-067 stay unchanged for backward compat with /r/[name] route.
//
// This file is intentionally framework-free (no `tailwindcss` import).

// 1A · SURFACES & INK
const BG = "#0A0E10";
const SURFACE = "#14191C";
const RAISED = "#1B2125";
const BORDER = "#232A2F";
const BORDER_STRONG = "#39434A";
const T3 = "#5C6770";
const T2 = "#8B969C";
const T1 = "#E8EDEF";

// 1B · TIER LETTERS
const TIER_A = "#7AD9FF";
const TIER_B = "#E8EDEF";
const TIER_C = "#B3A36A";
const TIER_D = "#7E6240";
const TIER_U = "#5C6770";

// 1C · SOURCE STATES
const SRC_VERIFIED = "#7AD9FF";
const SRC_PARTIAL = "#B3A36A";
const SRC_DISCOUNTED = "#7E6240";
const SRC_DEGRADED = "#FFB020";
const SRC_MISSING = "#5C6770";

// 1D · OUTCOMES
const O_FAST = "#7AD9FF";
const O_EMERGE = "#E8EDEF";
const O_EVID = "#B3A36A";
const O_BLOCK = "#FF3B30";

// 1E · CONFIDENCE
const CONF_HI = "#E8EDEF";
const CONF_MD = "#B3A36A";
const CONF_LO = "#7E6240";

// 1F · PAPER & STAMP (Bench v2 §1F — paper hex updated from US-067 #FAFAF8)
const PAPER = "#F5F1E6";
const PAPER_ALT = "#EDE7D5";
const INK = "#1B1A14";
const INK_SOFT = "#5A5645";
const RULE = "#C7BE9F";
const STAMP = "#9E1E14";

// 1G · ACCENT & SIGNAL
const ACCENT = "#00B8D9";
const SAFE = "#00D67A";
const REVIEW = "#FFB020";
const SIREN = "#FF3B30";

// US-067 verdict-* tokens (Single-Contract /r/[name] path) — unchanged
const SAFE_ON_LIGHT = "#00703F";
const REVIEW_ON_LIGHT = "#8E4400";
const SIREN_ON_LIGHT = "#B9140C";
const SAFE_SURF = "#062A1B";
const REVIEW_SURF = "#2A1C00";
const SIREN_SURF = "#2D0B09";

// 3 · TYPE STACKS
const FONT_DISPLAY = [
  "var(--font-space-grotesk)",
  '"Space Grotesk"',
  "ui-sans-serif",
  "system-ui",
  "sans-serif",
];
const FONT_BODY = [
  "var(--font-inter)",
  '"Inter"',
  "ui-sans-serif",
  "system-ui",
  "sans-serif",
];
const FONT_MONO = [
  "var(--font-jetbrains-mono)",
  '"JetBrains Mono"',
  "ui-monospace",
  "SFMono-Regular",
  "Menlo",
  "monospace",
];
const FONT_SERIF = [
  "var(--font-source-serif-4)",
  '"Source Serif 4"',
  "ui-serif",
  "Georgia",
  "serif",
];

export type BrandColorToken =
  // verdict-* (Single-Contract /r/[name])
  | "verdict-safe"
  | "verdict-review"
  | "verdict-siren"
  | "verdict-safe-on-light"
  | "verdict-review-on-light"
  | "verdict-siren-on-light"
  | "verdict-safe-surf"
  | "verdict-review-surf"
  | "verdict-siren-surf"
  // Surfaces & ink
  | "bg"
  | "surface"
  | "raised"
  | "border"
  | "border-strong"
  | "t3"
  | "t2"
  | "t1"
  | "accent"
  | "safe"
  | "review"
  | "siren"
  // Tier letters
  | "tier-a"
  | "tier-b"
  | "tier-c"
  | "tier-d"
  | "tier-u"
  // Source states
  | "src-verified"
  | "src-partial"
  | "src-discounted"
  | "src-degraded"
  | "src-missing"
  // Outcomes
  | "o-fast"
  | "o-emerge"
  | "o-evid"
  | "o-block"
  // Confidence
  | "conf-hi"
  | "conf-md"
  | "conf-lo"
  // Paper & stamp
  | "paper"
  | "paper-alt"
  | "ink"
  | "ink-soft"
  | "rule"
  | "stamp";

export type BrandFontToken = "display" | "body" | "mono" | "serif";

export const brandTheme: {
  colors: Record<BrandColorToken, string>;
  fontFamily: Record<BrandFontToken, string[]>;
} = {
  colors: {
    "verdict-safe": SAFE,
    "verdict-review": REVIEW,
    "verdict-siren": SIREN,
    "verdict-safe-on-light": SAFE_ON_LIGHT,
    "verdict-review-on-light": REVIEW_ON_LIGHT,
    "verdict-siren-on-light": SIREN_ON_LIGHT,
    "verdict-safe-surf": SAFE_SURF,
    "verdict-review-surf": REVIEW_SURF,
    "verdict-siren-surf": SIREN_SURF,
    bg: BG,
    surface: SURFACE,
    raised: RAISED,
    border: BORDER,
    "border-strong": BORDER_STRONG,
    t3: T3,
    t2: T2,
    t1: T1,
    accent: ACCENT,
    safe: SAFE,
    review: REVIEW,
    siren: SIREN,
    "tier-a": TIER_A,
    "tier-b": TIER_B,
    "tier-c": TIER_C,
    "tier-d": TIER_D,
    "tier-u": TIER_U,
    "src-verified": SRC_VERIFIED,
    "src-partial": SRC_PARTIAL,
    "src-discounted": SRC_DISCOUNTED,
    "src-degraded": SRC_DEGRADED,
    "src-missing": SRC_MISSING,
    "o-fast": O_FAST,
    "o-emerge": O_EMERGE,
    "o-evid": O_EVID,
    "o-block": O_BLOCK,
    "conf-hi": CONF_HI,
    "conf-md": CONF_MD,
    "conf-lo": CONF_LO,
    paper: PAPER,
    "paper-alt": PAPER_ALT,
    ink: INK,
    "ink-soft": INK_SOFT,
    rule: RULE,
    stamp: STAMP,
  },
  fontFamily: {
    display: FONT_DISPLAY,
    body: FONT_BODY,
    mono: FONT_MONO,
    serif: FONT_SERIF,
  },
};

// Tailwind 4 CSS-first equivalent — paste into globals.css after
// `@import "tailwindcss";` for CSS-only configuration.
export const brandThemeCss = `@theme {
  /* Verdict (Single-Contract /r/[name]) — US-067 */
  --color-verdict-safe: ${SAFE};
  --color-verdict-review: ${REVIEW};
  --color-verdict-siren: ${SIREN};
  --color-verdict-safe-on-light: ${SAFE_ON_LIGHT};
  --color-verdict-review-on-light: ${REVIEW_ON_LIGHT};
  --color-verdict-siren-on-light: ${SIREN_ON_LIGHT};
  --color-verdict-safe-surf: ${SAFE_SURF};
  --color-verdict-review-surf: ${REVIEW_SURF};
  --color-verdict-siren-surf: ${SIREN_SURF};

  /* Surfaces & ink (v2 §1A) */
  --color-bg: ${BG};
  --color-surface: ${SURFACE};
  --color-raised: ${RAISED};
  --color-border: ${BORDER};
  --color-border-strong: ${BORDER_STRONG};
  --color-t3: ${T3};
  --color-t2: ${T2};
  --color-t1: ${T1};
  --color-accent: ${ACCENT};
  --color-safe: ${SAFE};
  --color-review: ${REVIEW};
  --color-siren: ${SIREN};

  /* Tier letters (v2 §1B) */
  --color-tier-a: ${TIER_A};
  --color-tier-b: ${TIER_B};
  --color-tier-c: ${TIER_C};
  --color-tier-d: ${TIER_D};
  --color-tier-u: ${TIER_U};

  /* Source states (v2 §1C) */
  --color-src-verified: ${SRC_VERIFIED};
  --color-src-partial: ${SRC_PARTIAL};
  --color-src-discounted: ${SRC_DISCOUNTED};
  --color-src-degraded: ${SRC_DEGRADED};
  --color-src-missing: ${SRC_MISSING};

  /* Outcomes (v2 §1D) */
  --color-o-fast: ${O_FAST};
  --color-o-emerge: ${O_EMERGE};
  --color-o-evid: ${O_EVID};
  --color-o-block: ${O_BLOCK};

  /* Confidence (v2 §1E) */
  --color-conf-hi: ${CONF_HI};
  --color-conf-md: ${CONF_MD};
  --color-conf-lo: ${CONF_LO};

  /* Paper & stamp (v2 §1F) */
  --color-paper: ${PAPER};
  --color-paper-alt: ${PAPER_ALT};
  --color-ink: ${INK};
  --color-ink-soft: ${INK_SOFT};
  --color-rule: ${RULE};
  --color-stamp: ${STAMP};

  /* Type (v2 §3) */
  --font-display: ${FONT_DISPLAY.join(", ")};
  --font-body: ${FONT_BODY.join(", ")};
  --font-mono: ${FONT_MONO.join(", ")};
  --font-serif: ${FONT_SERIF.join(", ")};
}`;

export default brandTheme;