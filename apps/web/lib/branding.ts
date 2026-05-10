// Master brand mark. Rebranded 2026-05-10 per Daniel: "Upgrade Siren"
// → "Siren" (or "Siren Protocol" formally). Visual-only swap; ENS demo
// parents, Vercel domain, and workspace package names are untouched
// (see Phase A note in the audit handover).
export const MASTER_BRAND = "Siren" as const;
export const MASTER_BRAND_FORMAL = "Siren Protocol" as const;

// Umbrella sentence — what Siren is, in one line.
export const MASTER_UMBRELLA =
  "Siren is a public verification layer for Ethereum-native actors, contracts, and agents." as const;
// Shorter alternate hero strap: used in the homepage hero under the H1.
export const MASTER_STRAP = "Siren turns public evidence into trust signals." as const;

// Bench Mode sub-brand. One literal, swap once.
export const BENCH_SUB_BRAND = "Siren Bench" as const;

// Bench-mode sub-tagline. Per EPIC §18: appears only on `/b/[name]`
// surfaces. The master tagline "No source, no upgrade." stays on `/` and
// `/r/[name]`.
export const BENCH_SUB_TAGLINE = "No data, no score." as const;

// Honest-claims disclaimer (US-139, EPIC §10.5 + GATE-14). Rendered
// in-band on the score banner — never as tooltip, never as footnote.
// Copy locked per launch prompt 2026-05-09: this is the verbatim string.
export const honestClaimsDisclaimer =
  "Score measures verifiability and code-quality signals. It does not predict intent." as const;
