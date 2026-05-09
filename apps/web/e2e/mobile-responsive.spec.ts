// US-054 — Mobile responsive layout regression at iPhone 14 Pro viewport
// (390 × 844). DAO voters on phones are real-world; the booth-day demo
// audience is desktop, but the public verdict page must hold up at small
// viewports without horizontal scroll, with hit areas ≥ 44 × 44 (Apple HIG
// minimum recommended tap-target size), and without critical content cut
// off below the fold.
//
// Runs against the booth-stable `?mock=true` fixture path (US-068) so the
// e2e suite is hermetic — no live RPC required.

import { test, expect, type Page } from "@playwright/test";

const VIEWPORT = { width: 390, height: 844 } as const;
const MIN_TAP_TARGET = 44; // px

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

async function assertNoHorizontalScroll(page: Page): Promise<void> {
  // documentElement.scrollWidth > clientWidth → horizontal overflow.
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
    };
  });
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
}

test.describe("mobile responsive (390 × 844)", () => {
  test.use({ viewport: VIEWPORT });

  for (const scenario of SCENARIOS) {
    test(`${scenario.key}: verdict word visible without horizontal scroll`, async ({
      page,
    }) => {
      await page.goto(scenario.href);
      const verdictWord = page.getByTestId("verdict-word");
      await expect(verdictWord).toHaveText(scenario.expected);
      await expect(verdictWord).toBeInViewport();
      await assertNoHorizontalScroll(page);
    });
  }

  test("evidence drawer trigger button has ≥ 44×44 tap area", async ({
    page,
  }) => {
    await page.goto(SCENARIOS[0].href);
    const evidenceButton = page.getByRole("button", { name: /^evidence$/i });
    await expect(evidenceButton).toBeVisible();
    const box = await evidenceButton.boundingBox();
    expect(box).not.toBeNull();
    if (box === null) return;
    expect(box.width).toBeGreaterThanOrEqual(MIN_TAP_TARGET);
    expect(box.height).toBeGreaterThanOrEqual(MIN_TAP_TARGET);
  });

  // Note: a `<ShareVerdictLink>` button is added to the verdict-result page
  // by US-053 (PR #92, in flight). When that merges, add a sibling tap-area
  // assertion here. Until then we only enforce the existing controls
  // (evidence trigger, header links).

  test("home page renders without horizontal scroll on mobile", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /verdict in five seconds/i }),
    ).toBeVisible();
    await assertNoHorizontalScroll(page);
  });

  test("/demo runner renders without horizontal scroll on mobile", async ({
    page,
  }) => {
    await page.goto("/demo");
    await expect(
      page.getByRole("list", { name: /demo scenarios/i }),
    ).toBeVisible();
    await assertNoHorizontalScroll(page);
  });

  test("evidence drawer fits the mobile viewport when expanded", async ({
    page,
  }) => {
    await page.goto(SCENARIOS[0].href);
    await page.getByRole("button", { name: /^evidence$/i }).click();
    const drawer = page.getByRole("dialog", { name: /evidence drawer/i });
    await expect(drawer).toBeVisible();
    const box = await drawer.boundingBox();
    expect(box).not.toBeNull();
    if (box === null) return;
    expect(box.width).toBeLessThanOrEqual(VIEWPORT.width);
  });
});
