import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { TierLadder } from "./TierLadder";

describe("TierLadder (extracted from ScoreBanner 2026-05-10)", () => {
  it("renders all 6 tier rows with thresholds matching weights.ts", () => {
    const { container } = render(<TierLadder currentTier="B" />);
    const rows = container.querySelectorAll("[data-ladder-tier]");
    expect(rows.length).toBe(6);
    const tiers = Array.from(rows).map((r) => r.getAttribute("data-ladder-tier"));
    expect(tiers).toEqual(["S", "A", "B", "C", "D", "U"]);
  });

  it("S row carries the v2 footnote so judges see the ceiling reason", () => {
    const { container } = render(<TierLadder currentTier="A" />);
    const sRow = container.querySelector('[data-ladder-tier="S"]');
    expect(sRow?.textContent).toMatch(/v2: requires verified GitHub cross-sign/i);
  });

  it("threshold copy reflects engine values (S>=65, A>=50, B>=35, C>=20)", () => {
    const { container } = render(<TierLadder currentTier="A" />);
    const aRow = container.querySelector('[data-ladder-tier="A"]');
    const bRow = container.querySelector('[data-ladder-tier="B"]');
    const cRow = container.querySelector('[data-ladder-tier="C"]');
    const sRow = container.querySelector('[data-ladder-tier="S"]');
    expect(sRow?.textContent).toMatch(/>=\s*65/);
    expect(aRow?.textContent).toMatch(/>=\s*50/);
    expect(bRow?.textContent).toMatch(/>=\s*35/);
    expect(cRow?.textContent).toMatch(/>=\s*20/);
  });

  it("marks the current tier row with data-current=true", () => {
    const { container } = render(<TierLadder currentTier="C" />);
    expect(
      container
        .querySelector('[data-ladder-tier="C"]')
        ?.getAttribute("data-current"),
    ).toBe("true");
    expect(
      container
        .querySelector('[data-ladder-tier="S"]')
        ?.getAttribute("data-current"),
    ).toBe("false");
  });

  it("<details> defaults to open so the v2 footnote is visible without a click", () => {
    const { container } = render(<TierLadder currentTier="B" />);
    const ladder = container.querySelector(
      '[data-block="tier-ladder"]',
    ) as HTMLDetailsElement | null;
    expect(ladder).not.toBeNull();
    expect(ladder?.tagName.toLowerCase()).toBe("details");
    expect(ladder?.open).toBe(true);
  });
});
