// Upgrade Siren brand tokens as a Tailwind 4 theme preset.
// Generated to match assets/brand/brand-tokens.json (single source of truth
// is assets/brand/brand-manual.html :root block).
//
// Consumption:
//   import { brandTheme } from "../../assets/brand/tailwind-preset";
//   import type { Config } from "tailwindcss";
//   const config: Config = { theme: { extend: brandTheme }, ... };
//
// Or paste the @theme CSS string into apps/web/app/globals.css below
// `@import "tailwindcss";`. Either path produces the same utility names:
//   bg-verdict-safe / text-verdict-safe / border-verdict-safe
//   bg-surface / bg-raised / border-border / border-border-strong
//   text-t1 / text-t2 / text-t3 / text-accent
//   font-display / font-body / font-mono
//
// This file is intentionally framework-free (no `tailwindcss` import) so
// it can be consumed from any package in the monorepo without resolving
// types from a peer dep.

const SAFE = "#00D67A";
const REVIEW = "#FFB020";
const SIREN = "#FF3B30";
const SAFE_ON_LIGHT = "#00703F";
const REVIEW_ON_LIGHT = "#8E4400";
const SIREN_ON_LIGHT = "#B9140C";
const SAFE_SURF = "#062A1B";
const REVIEW_SURF = "#2A1C00";
const SIREN_SURF = "#2D0B09";

const BG = "#0A0E10";
const SURFACE = "#14191C";
const RAISED = "#1B2125";
const BORDER = "#232A2F";
const BORDER_STRONG = "#39434A";
const T3 = "#5C6770";
const T2 = "#8B969C";
const T1 = "#E8EDEF";
const ACCENT = "#00B8D9";
const PAPER = "#FAFAF8";
const INK = "#0A0E10";

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

export type BrandColorToken =
  | "verdict-safe"
  | "verdict-review"
  | "verdict-siren"
  | "verdict-safe-on-light"
  | "verdict-review-on-light"
  | "verdict-siren-on-light"
  | "verdict-safe-surf"
  | "verdict-review-surf"
  | "verdict-siren-surf"
  | "bg"
  | "surface"
  | "raised"
  | "border"
  | "border-strong"
  | "t3"
  | "t2"
  | "t1"
  | "accent"
  | "paper"
  | "ink";

export type BrandFontToken = "display" | "body" | "mono";

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
    paper: PAPER,
    ink: INK,
  },
  fontFamily: {
    display: FONT_DISPLAY,
    body: FONT_BODY,
    mono: FONT_MONO,
  },
};

// Tailwind 4 CSS-first equivalent — paste into globals.css after
// `@import "tailwindcss";` if you prefer CSS-only configuration.
// (apps/web/app/globals.css already mirrors this @theme block locally.)
export const brandThemeCss = `@theme {
  --color-verdict-safe: ${SAFE};
  --color-verdict-review: ${REVIEW};
  --color-verdict-siren: ${SIREN};
  --color-verdict-safe-on-light: ${SAFE_ON_LIGHT};
  --color-verdict-review-on-light: ${REVIEW_ON_LIGHT};
  --color-verdict-siren-on-light: ${SIREN_ON_LIGHT};
  --color-verdict-safe-surf: ${SAFE_SURF};
  --color-verdict-review-surf: ${REVIEW_SURF};
  --color-verdict-siren-surf: ${SIREN_SURF};
  --color-bg: ${BG};
  --color-surface: ${SURFACE};
  --color-raised: ${RAISED};
  --color-border: ${BORDER};
  --color-border-strong: ${BORDER_STRONG};
  --color-t3: ${T3};
  --color-t2: ${T2};
  --color-t1: ${T1};
  --color-accent: ${ACCENT};
  --color-paper: ${PAPER};
  --color-ink: ${INK};
  --font-display: ${FONT_DISPLAY.join(", ")};
  --font-body: ${FONT_BODY.join(", ")};
  --font-mono: ${FONT_MONO.join(", ")};
}`;

export default brandTheme;
