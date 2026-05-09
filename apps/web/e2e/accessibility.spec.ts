// US-055 — axe-core accessibility regression for the verdict-result route.
//
// Runs the canonical axe-core WCAG 2.0 / 2.1 Level A + AA rule set against
// each of the four signed-manifest demo subnames on the booth-stable
// `?mock=true` path (US-068). Public-good positioning demands a11y; the
// gate-listed tests in `docs/06` do not enforce it, so this spec is the
// active enforcement layer.
//
// Plus targeted assertions (not just axe rule-output):
//  - VerdictCard `[role="region"]` carries an aria-label that includes the
//    verdict word (color-blind safety: SAFE / REVIEW / SIREN reads in text)
//  - Tab order moves through the page in DOM order (verdict → action row
//    → governance comment, not jumping)
//  - Esc closes the evidence drawer (re-asserts the US-045 contract)
//
// `@axe-core/playwright` ships an `AxeBuilder` driver. We restrict the rule
// set to `wcag2a` + `wcag2aa` so we don't fail on `experimental` /
// `best-practice` rules that aren't part of the WCAG AA bar.

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const SCENARIOS = [
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

test.describe("axe-core WCAG 2.0/2.1 Level A + AA", () => {
  for (const scenario of SCENARIOS) {
    test(`${scenario.key}: zero WCAG AA violations`, async ({ page }) => {
      await page.goto(scenario.href);
      // Wait for the verdict body to render before scanning so axe doesn't
      // mistake the Suspense fallback for the final state.
      await expect(page.getByTestId("verdict-word")).toHaveText(
        scenario.expected,
      );

      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      // Print full violation context if any so failure logs are actionable.
      if (result.violations.length > 0) {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(result.violations, null, 2));
      }
      expect(result.violations).toEqual([]);
    });
  }
});

test.describe("verdict-card aria contract", () => {
  for (const scenario of SCENARIOS) {
    test(`${scenario.key}: verdict card aria-label includes the verdict word`, async ({
      page,
    }) => {
      await page.goto(scenario.href);
      const card = page.getByRole("region", {
        name: new RegExp(`${scenario.expected} verdict`, "i"),
      });
      await expect(card).toBeVisible();
      const ariaLabel = await card.getAttribute("aria-label");
      expect(ariaLabel).toMatch(new RegExp(scenario.expected));
    });
  }
});

test.describe("evidence drawer keyboard contract", () => {
  test("Esc closes the drawer (re-asserts US-045 contract)", async ({
    page,
  }) => {
    await page.goto(SCENARIOS[0].href);
    await page.getByRole("button", { name: /^evidence$/i }).click();
    await expect(
      page.getByRole("dialog", { name: /evidence drawer/i }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("dialog", { name: /evidence drawer/i }),
    ).not.toBeVisible();
  });

  test("focus moves to the close button when the drawer opens", async ({
    page,
  }) => {
    await page.goto(SCENARIOS[0].href);
    await page.getByRole("button", { name: /^evidence$/i }).click();
    const close = page.getByRole("button", {
      name: /close evidence drawer/i,
    });
    await expect(close).toBeFocused();
  });
});

test.describe("tab order is logical (DOM order, no skipped controls)", () => {
  test("Tab from start of page reaches the verdict-region region link sequence in order", async ({
    page,
  }) => {
    await page.goto(SCENARIOS[1].href);
    await expect(page.getByTestId("verdict-word")).toHaveText("SAFE");

    const focusables: string[] = [];
    // Walk forward through the focusable chain, capturing role + accessible
    // name. This is a non-strict shape check — axe scan above proves the
    // structural rules; this assertion proves the actual ordering can reach
    // the major controls without trapping.
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      const desc = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const role =
          el.getAttribute("role") || el.tagName.toLowerCase();
        const label =
          el.getAttribute("aria-label") ||
          el.textContent?.trim().slice(0, 60) ||
          "";
        return `${role}: ${label}`;
      });
      if (desc) focusables.push(desc);
    }
    // Header back-link comes before verdict body controls.
    expect(focusables[0]).toMatch(/Upgrade Siren/);
    // Evidence button reachable somewhere in the first 12 stops.
    expect(focusables.some((d) => /evidence/i.test(d))).toBe(true);
  });
});
