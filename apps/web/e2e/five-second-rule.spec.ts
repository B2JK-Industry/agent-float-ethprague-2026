// US-052 — Five-second-rule regression. The brand promise is verdict-text
// visible within 5000ms of navigation (booth-judge moment, GATE-20).
//
// Four demo scenarios — all on Sepolia per `contracts/DEPLOYMENTS.md`:
//   /r/vault.upgrade-siren-demo.eth        expects SAFE   (canonical baseline)
//   /r/safe.upgrade-siren-demo.eth         expects SAFE   (V1 → V2Safe)
//   /r/dangerous.upgrade-siren-demo.eth    expects SIREN  (V1 → V2Dangerous)
//   /r/unverified.upgrade-siren-demo.eth   expects SIREN  (unverified impl)
//
// `?mock=true` is appended on every per-scenario URL so the e2e suite is
// hermetic — the verdict route's live path (US-068) hits Alchemy + Sourcify
// servers, which adds variance and a hard dependency on env vars in CI.
// The booth runs in `?mock=true` mode anyway (US-050 demo-runner pattern),
// so this matches the actual demo behaviour. Live path is exercised by
// production smoke tests, not by this regression check.
//
// Verdict word is rendered by `<VerdictCard>` (US-042) and surfaced as
// `[data-testid="verdict-word"]` inside `[role="region"][data-verdict=...]`.

import { test, expect } from "@playwright/test";

const FIVE_SECONDS_MS = 5000;

// Per-scenario verdict-text assertions cover all four signed-manifest demo
// subnames committed in `contracts/DEPLOYMENTS.md` — the booth picks any of
// them; each must clear the 5000ms budget.
const VERDICT_SCENARIOS = [
  {
    key: "vault",
    href: "/r/vault.upgrade-siren-demo.eth?mock=true",
    expected: "SAFE",
  },
  {
    key: "safe",
    href: "/r/safe.upgrade-siren-demo.eth?mock=true",
    expected: "SAFE",
  },
  {
    key: "dangerous",
    href: "/r/dangerous.upgrade-siren-demo.eth?mock=true",
    expected: "SIREN",
  },
  {
    key: "unverified",
    href: "/r/unverified.upgrade-siren-demo.eth?mock=true",
    expected: "SIREN",
  },
] as const;

// `/demo` runner (US-050) only renders four scenario rows: the three
// signed-manifest scenarios plus `live-public-read`. The vault baseline is
// not on that page (it is the canonical pre-upgrade state, accessible via
// direct ENS lookup) — keep this list aligned with `demo.config.ts`.
const DEMO_RUNNER_SCENARIO_KEYS = [
  "safe",
  "dangerous",
  "unverified",
  "live-public-read",
] as const;

test.describe("five-second rule", () => {
  test("/demo runner page renders four scenario rows within 5000ms", async ({
    page,
  }) => {
    const start = Date.now();
    await page.goto("/demo");
    await expect(
      page.getByRole("list", { name: /demo scenarios/i }),
    ).toBeVisible({ timeout: FIVE_SECONDS_MS });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(FIVE_SECONDS_MS);

    for (const key of DEMO_RUNNER_SCENARIO_KEYS) {
      await expect(
        page.locator(`li[data-scenario="${key}"]`),
      ).toBeVisible({ timeout: FIVE_SECONDS_MS });
    }
  });

  for (const scenario of VERDICT_SCENARIOS) {
    test(
      `${scenario.key}: verdict word visible within 5000ms at ${scenario.href}`,
      async ({ page }) => {
        const start = Date.now();
        await page.goto(scenario.href);
        const verdictWord = page.getByTestId("verdict-word");
        await expect(verdictWord).toHaveText(scenario.expected, {
          timeout: FIVE_SECONDS_MS,
        });
        const elapsed = Date.now() - start;
        expect(elapsed).toBeLessThan(FIVE_SECONDS_MS);
      },
    );
  }
});
