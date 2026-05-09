import type {
  RelevanceComponentId,
  SeniorityComponentId,
  TrustLabel,
} from './weights.js';

// `null` = component cannot be computed yet (e.g. P1 GitHub enrichment
// not shipped, or no evidence available). Score engine treats null as
// 0 in the contribution sum but renders `— (P1)` / `— (no data)` in
// the breakdown so the math stays explainable.
export type ComponentStatus = 'computed' | 'null_p1' | 'null_no_data';

export interface ScoreComponentBreakdown {
  readonly id: string;
  readonly weight: number;
  readonly value: number | null;
  readonly trust: TrustLabel;
  readonly trustFactor: number;
  readonly contribution: number;
  readonly status: ComponentStatus;
  // Optional human-readable note rendered in the breakdown panel —
  // e.g. "fallback: nonce / cap 1000" for onchainRecency degraded path.
  readonly note?: string;
}

export interface ScoreAxisBreakdown {
  readonly components: ReadonlyArray<ScoreComponentBreakdown>;
  // Σ contribution. Raw discounted value, NOT normalized to ceiling.
  // GATE-30: "raw-discounted axis only — no normalization to ceiling".
  readonly sum: number;
}

export type Tier = 'S' | 'A' | 'B' | 'C' | 'D' | 'U';

export type CeilingApplied = 'none' | 'public_read_a' | 'unrated';

export interface ScoreResult {
  readonly seniority: number;        // raw discounted Σ, 0..1
  readonly relevance: number;        // raw discounted Σ, 0..1
  readonly score_raw: number;        // 0.5 seniority + 0.5 relevance
  readonly score_100: number;        // round(score_raw * 100)
  readonly tier: Tier;
  readonly ceilingApplied: CeilingApplied;
  readonly breakdown: {
    readonly seniority: ScoreAxisBreakdown;
    readonly relevance: ScoreAxisBreakdown;
  };
  readonly meta: {
    readonly mode: 'manifest' | 'public-read';
    readonly nonZeroSourceCount: number;
    // For drawer rendering: whether the GitHub source was claimed but
    // not verified. v1 max-final-score-79 surfacing reads this.
    readonly githubVerified: boolean;
    // Echo of the inputs the engine read so the breakdown is fully
    // self-describing (judges can re-derive any tuple by hand).
    readonly seniorityComponentIds: ReadonlyArray<SeniorityComponentId>;
    readonly relevanceComponentIds: ReadonlyArray<RelevanceComponentId>;
  };
}
