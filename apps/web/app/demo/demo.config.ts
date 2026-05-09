// Booth demo orchestration config (US-050).
//
// Names match `contracts/DEPLOYMENTS.md` — the live Sepolia subnames
// provisioned in US-010. Do not invent new names here; mirror DEPLOYMENTS.md.
//
// `live-public-read` is intentionally left as `target: null` until Tracker
// US-062 picks the live mainnet protocol target. The runner greys out that
// row instead of 404-ing — see US-050 backlog notes.

import type { Verdict } from "@upgrade-siren/shared";

export const DEMO_SCENARIO_KEYS = [
  "safe",
  "dangerous",
  "unverified",
  "live-public-read",
] as const;

export type DemoScenarioKey = (typeof DEMO_SCENARIO_KEYS)[number];

export type DemoScenarioMode = "signed-manifest" | "public-read";

export type DemoScenario = {
  readonly key: DemoScenarioKey;
  readonly label: string;
  /** ENS name or 0x address. `null` = pending US-062, render greyed-out. */
  readonly target: string | null;
  readonly mode: DemoScenarioMode;
  readonly useMock?: boolean;
  readonly expectedVerdict: Verdict | "REVIEW";
  readonly description: string;
};

export const DEMO_SCENARIOS: readonly DemoScenario[] = [
  {
    key: "safe",
    label: "Safe upgrade",
    target: "safe.upgrade-siren-demo.eth",
    mode: "signed-manifest",
    expectedVerdict: "SAFE",
    description:
      "Verified V1 → V2Safe with compatible storage and no risky selectors.",
  },
  {
    key: "dangerous",
    label: "Dangerous upgrade",
    target: "dangerous.upgrade-siren-demo.eth",
    mode: "signed-manifest",
    useMock: true,
    expectedVerdict: "SIREN",
    description:
      "Booth snapshot: V2 adds sweep() and reorders storage — drains the vault.",
  },
  {
    key: "unverified",
    label: "Unverified upgrade",
    target: "unverified.upgrade-siren-demo.eth",
    mode: "signed-manifest",
    useMock: true,
    expectedVerdict: "SIREN",
    description:
      "Booth snapshot: current implementation is not verified on Sourcify. No source, no upgrade.",
  },
  {
    key: "live-public-read",
    label: "Aave V3 Pool (mainnet, live)",
    target: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
    mode: "public-read",
    expectedVerdict: "REVIEW",
    description:
      "Real Aave V3 Pool proxy on Ethereum mainnet (no upgrade-siren records). Public-read fallback: verdict capped at REVIEW (never SAFE without operator manifest); evidence from live chain state + Sourcify metadata.",
  },
] as const;

/**
 * Build the verdict route href for a scenario.
 * Returns `null` when the scenario has no target yet (greyed-out row).
 */
export function buildScenarioHref(scenario: DemoScenario): string | null {
  if (scenario.target === null) return null;
  const path = `/r/${encodeURIComponent(scenario.target)}`;
  const params = new URLSearchParams();
  if (scenario.mode === "public-read") params.set("mode", "public-read");
  if (scenario.useMock === true) params.set("mock", "true");
  const query = params.toString();
  return query.length > 0 ? `${path}?${query}` : path;
}

export function findScenario(key: DemoScenarioKey): DemoScenario {
  const match = DEMO_SCENARIOS.find((s) => s.key === key);
  if (!match) {
    throw new Error(`unknown demo scenario key: ${key}`);
  }
  return match;
}
