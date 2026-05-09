// Per launch prompt §"Visual identity": the Bench Mode sub-brand wording is
// gated behind US-143 (collision check). Keep the literal in one place so a
// rename after collision-check outcome is a single-line edit across every
// component that references it.
export const BENCH_SUB_BRAND = "Upgrade Siren Bench" as const;

// Bench-mode sub-tagline. Per EPIC §18: appears only on `/b/[name]`
// surfaces. The master tagline "No source, no upgrade." stays on `/` and
// `/r/[name]`.
export const BENCH_SUB_TAGLINE = "No data, no score." as const;
