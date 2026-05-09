// US-118 score-engine constants. Locked per Section 21 D-A (relevance
// weights accepted as default) and D-G (trust-discount 0.6).
//
// Hard rule from `prompts/launch/dev-b-bench.md` Score-engine
// non-negotiables:
//
//   "TRUST_DISCOUNT_UNVERIFIED = 0.6 exported as named constant from
//    packages/evidence/src/score/weights.ts. SENIORITY_WEIGHTS and
//    RELEVANCE_WEIGHTS lifted to the same file. Daniel's relevance
//    override (D-A) targets that one file."
//
// Trust labels mirror EPIC §9 — only `github.*` signals are unverified
// in v1. Sourcify, ENS-internal, and on-chain are verified.

export const TRUST_DISCOUNT_UNVERIFIED = 0.6;
export const TRUST_DISCOUNT_VERIFIED = 1.0;

export type TrustLabel = 'verified' | 'unverified';

export interface WeightedComponent {
  readonly weight: number;
  readonly trust: TrustLabel;
}

// EPIC §10.2 Seniority axis (LOCKED). Sum of weights = 1.0.
//   compileSuccess  0.25 verified   (Sourcify)
//   ciPassRate      0.20 unverified (GitHub P1 — null until US-114b)
//   testPresence    0.15 unverified (GitHub P0)
//   bugHygiene      0.10 unverified (GitHub P1 — null until US-114b)
//   repoHygiene     0.15 unverified (GitHub P0 README+LICENSE in v1)
//   releaseCadence  0.15 unverified (GitHub P1 — null until US-114b)
export const SENIORITY_WEIGHTS = {
  compileSuccess: { weight: 0.25, trust: 'verified' },
  ciPassRate: { weight: 0.2, trust: 'unverified' },
  testPresence: { weight: 0.15, trust: 'unverified' },
  bugHygiene: { weight: 0.1, trust: 'unverified' },
  repoHygiene: { weight: 0.15, trust: 'unverified' },
  releaseCadence: { weight: 0.15, trust: 'unverified' },
} as const satisfies Record<string, WeightedComponent>;

export type SeniorityComponentId = keyof typeof SENIORITY_WEIGHTS;

// EPIC §10.3 Relevance axis (provisional accepted via Section 21 D-A).
// Override target file when Daniel reshapes — this single file is the
// single source of truth.
//   sourcifyRecency  0.30 verified
//   githubRecency    0.30 unverified
//   onchainRecency   0.25 verified
//   ensRecency       0.15 verified
export const RELEVANCE_WEIGHTS = {
  sourcifyRecency: { weight: 0.3, trust: 'verified' },
  githubRecency: { weight: 0.3, trust: 'unverified' },
  onchainRecency: { weight: 0.25, trust: 'verified' },
  ensRecency: { weight: 0.15, trust: 'verified' },
} as const satisfies Record<string, WeightedComponent>;

export type RelevanceComponentId = keyof typeof RELEVANCE_WEIGHTS;

// 0.5 / 0.5 axis split — locked.
export const AXIS_WEIGHTS = {
  seniority: 0.5,
  relevance: 0.5,
} as const;

// Tier thresholds (EPIC §10.1).
//
// Refactor 2026-05-10: thresholds re-calibrated for the rebalanced
// axis architecture (seniority=quality, relevance=anti-scam) where
// per-axis sum=1.0 invariant is enforced and trust-discount math
// makes realistic max axis ~0.55-0.65 rather than the old 0.79
// pre-refactor ceiling.
//
// New tier mapping (score_100 = round(0.5*sen + 0.5*rel * 100)):
//   S 65+   exceptional (must clear all engines + cross-sign GitHub)
//   A 50-64 strong (mature subject, multi-source verified)
//   B 35-49 mid (some signals, partial coverage)
//   C 20-34 emerging (recent activity, sparse depth)
//   D 0-19  unrated / scam-shaped (very few signals, anti-scam triggers)
export const TIER_THRESHOLDS = {
  S: 65,
  A: 50,
  B: 35,
  C: 20,
  D: 0,
} as const;

// Public-read mode never reaches above the A label even if score_100
// math would land higher (per EPIC §7 and Section 21 D-I).
export const PUBLIC_READ_TIER_CAP: 'A' = 'A';

// U tier ("unrated") triggers when fewer than this many sources have
// non-zero evidence. EPIC §10.1.
export const U_TIER_MIN_NONZERO_SOURCES = 2;

export function trustFactor(label: TrustLabel): number {
  return label === 'verified' ? TRUST_DISCOUNT_VERIFIED : TRUST_DISCOUNT_UNVERIFIED;
}
