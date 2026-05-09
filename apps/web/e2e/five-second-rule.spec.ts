// US-052 — Five-second-rule regression. The brand promise is verdict-text
// visible within 5000ms of navigation (booth-judge moment, GATE-20).
//
// Three demo scenarios (per US-050):
//   /r/safe.upgrade-siren-demo.eth        expects SAFE
//   /r/dangerous.upgrade-siren-demo.eth   expects SIREN
//   /r/unverified.upgrade-siren-demo.eth  expects SIREN
//
// The verdict word is rendered by `<VerdictCard>` (US-042), which surfaces it
// as `[data-testid="verdict-word"]` inside `[role="region"][data-verdict=...]`.
// The `/r/[name]` route wiring VerdictCard up to fixture data lands alongside
// this spec — the per-scenario assertions are real and active.

import { test, expect } from "@playwright/test";

const FIVE_SECONDS_MS = 5000;
const SCENARIOS = [
  {
    key: "safe",
    href: "/r/safe.upgrade-siren-demo.eth",
    expected: "SAFE",
  },
  {
    key: "dangerous",
    href: "/r/dangerous.upgrade-siren-demo.eth",
    expected: "SIREN",
  },
  {
    key: "unverified",
    href: "/r/unverified.upgrade-siren-demo.eth",
    expected: "SIREN",
  },
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

    for (const { key } of SCENARIOS) {
      await expect(
        page.locator(`li[data-scenario="${key}"]`),
      ).toBeVisible({ timeout: FIVE_SECONDS_MS });
    }
  });

  for (const scenario of SCENARIOS) {
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
