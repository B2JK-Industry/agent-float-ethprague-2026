// Bench-mode demo scenarios (post-2026-05-10 pivot).
//
// Daniel directive: landing page demo tiles point at /b/[name] subjects only;
// the verdict-mode `/r/[name]` route stays functional but no longer surfaces
// as a primary FE path. Sponsor judges who need the Sourcify-anchored single-
// contract path can still navigate via direct URL.
//
// Subjects below are LIVE — manifest fixtures committed in
// apps/web/public/manifests/, ENS records provisioned on Sepolia (US-146)
// or live mainnet (vitalik.eth). The runner card renders the expected
// tier band so judges can compare predicted vs actual without surprise.

import type { Verdict } from "@upgrade-siren/shared";

export const DEMO_SCENARIO_KEYS = [
  "agent-curated",
  "human-public",
  "rich-records",
  "mainnet-public",
] as const;

export type DemoScenarioKey = (typeof DEMO_SCENARIO_KEYS)[number];

export type DemoScenarioMode = "signed-manifest" | "public-read";

export type DemoScenarioBucket = "S" | "A" | "B" | "C" | "D" | "U";

export type DemoScenario = {
  readonly key: DemoScenarioKey;
  readonly label: string;
  /** ENS name routed to /b/[name]. */
  readonly target: string | null;
  readonly mode: DemoScenarioMode;
  /** Predicted tier band — guidance to the visitor before they click. */
  readonly expectedBucket: DemoScenarioBucket;
  readonly description: string;
  /**
   * @deprecated kept on the type for backward-compat with code that still
   * reads `expectedVerdict`. New callers should read `expectedBucket`.
   */
  readonly expectedVerdict: Verdict | "REVIEW";
};

export const DEMO_SCENARIOS: readonly DemoScenario[] = [
  {
    key: "agent-curated",
    label: "Curated AI agent",
    target: "siren-agent-demo.upgrade-siren-demo.eth",
    mode: "signed-manifest",
    expectedBucket: "A",
    expectedVerdict: "SAFE",
    description:
      "Signed agent-bench manifest on Sepolia. ai-agent kind, declared Sourcify entries + GitHub owner — full four-source verdict.",
  },
  {
    key: "human-public",
    label: "Real human profile",
    target: "letadlo.eth",
    mode: "public-read",
    expectedBucket: "C",
    expectedVerdict: "REVIEW",
    description:
      "Sepolia ENS with com.github + description + url text records. Public-read fallback infers GitHub source from com.github — no signed claim, ×0.6 trust discount applies.",
  },
  {
    key: "rich-records",
    label: "Rich ENS records",
    target: "agent-kikiriki.eth",
    mode: "public-read",
    expectedBucket: "C",
    expectedVerdict: "REVIEW",
    description:
      "Sepolia ENS with 11 text records — Project_A/B/C URLs, description, location, avatar. Demonstrates the ENS-internal subgraph signal end-to-end.",
  },
  {
    key: "mainnet-public",
    label: "Mainnet ENS demo",
    target: "vitalik.eth",
    mode: "public-read",
    expectedBucket: "A",
    expectedVerdict: "REVIEW",
    description:
      "Famous mainnet ENS profile via the mainnet ENS subgraph. Public-read mode caps tier at A regardless of axis sums — honest demo of the public-read ceiling.",
  },
] as const;

/**
 * Build the Bench Mode route href for a scenario.
 * Returns `null` when the scenario has no target yet (greyed-out tile).
 */
export function buildScenarioHref(scenario: DemoScenario): string | null {
  if (scenario.target === null) return null;
  return `/b/${encodeURIComponent(scenario.target)}`;
}

export function findScenario(key: DemoScenarioKey): DemoScenario {
  const match = DEMO_SCENARIOS.find((s) => s.key === key);
  if (!match) {
    throw new Error(`unknown demo scenario key: ${key}`);
  }
  return match;
}