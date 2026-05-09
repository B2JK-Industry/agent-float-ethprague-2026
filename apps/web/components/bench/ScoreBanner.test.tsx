import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ScoreBanner } from "./ScoreBanner";
import { honestClaimsDisclaimer } from "../../lib/branding";

import type { ScoreResult, Tier } from "@upgrade-siren/evidence";

function makeScore(overrides: Partial<ScoreResult> = {}): ScoreResult {
  return {
    seniority: 0.6,
    relevance: 0.66,
    score_raw: 0.63,
    score_100: 63,
    tier: "B",
    ceilingApplied: "none",
    breakdown: {
      seniority: { components: [], sum: 0.6 },
      relevance: { components: [], sum: 0.66 },
    },
    meta: {
      mode: "manifest",
      nonZeroSourceCount: 3,
      githubVerified: false,
      seniorityComponentIds: [],
      relevanceComponentIds: [],
    },
    ...overrides,
  } as ScoreResult;
}

describe("ScoreBanner (US-132)", () => {
  it("renders score_100, tier monogram, and tier label as the 5-second moment", () => {
    render(<ScoreBanner score={makeScore()} />);
    const banner = screen.getByLabelText("Score banner");
    expect(banner.getAttribute("data-tier")).toBe("B");
    expect(
      banner.querySelector('[data-field="score-big"]')?.textContent,
    ).toBe("63");
    expect(
      banner.querySelector('[data-block="tier-monogram"]')?.textContent,
    ).toBe("B");
  });

  it("renders 100-scaled axis values (NOT raw [0,1] floats)", () => {
    const { container } = render(
      <ScoreBanner score={makeScore({ seniority: 0.601, relevance: 0.663 })} />,
    );
    expect(
      container.querySelector('[data-field="seniority"]')?.textContent,
    ).toBe("60");
    expect(
      container.querySelector('[data-field="relevance"]')?.textContent,
    ).toBe("66");
  });

  it("scoreBig has font-variant-numeric tabular-nums and zero transition (banned-motion v2 §5C)", () => {
    const { container } = render(<ScoreBanner score={makeScore()} />);
    const big = container.querySelector(
      '[data-field="score-big"]',
    ) as HTMLElement;
    expect(big.style.fontVariantNumeric).toBe("tabular-nums");
    // v2 §5C: numbers land at full value, never animate.
    expect(big.style.transition).toBe("none");
  });

  it("tier monogram is a 120×120 square with 2px solid currentColor border", () => {
    const { container } = render(<ScoreBanner score={makeScore()} />);
    const mono = container.querySelector(
      '[data-block="tier-monogram"]',
    ) as HTMLElement;
    expect(mono.className).toMatch(/h-\[120px\].*w-\[120px\]/);
    // Browsers normalize currentColor → currentcolor when echoing inline styles.
    expect(mono.style.border.toLowerCase()).toBe("2px solid currentcolor");
  });

  it("renders v1 max label = 79 by default (US-114b merged 2026-05-09 18:12Z)", () => {
    const { container } = render(<ScoreBanner score={makeScore()} />);
    const meta = container.querySelector('[data-field="score-meta"]');
    expect(meta?.textContent).toMatch(/v1 max\s*79/);
    // QA H-10 regression guard: never advertise the historical P0=66
    // ceiling once US-114b is merged. Engine returns 79; banner must
    // match.
    expect(meta?.textContent).not.toMatch(/v1 P0 max\s*66/);
  });

  it("v1 ceiling is overridable via prop (single number — P0/full split retired)", () => {
    const { container } = render(
      <ScoreBanner score={makeScore()} v1Max={100} />,
    );
    const meta = container.querySelector('[data-field="score-meta"]');
    expect(meta?.textContent).toMatch(/v1 max\s*100/);
  });

  it("renders the honest-claims disclaimer in-band on the banner (GATE-14 / EPIC §10.5)", () => {
    render(<ScoreBanner score={makeScore()} />);
    expect(screen.getByText(honestClaimsDisclaimer)).toBeInTheDocument();
  });

  it("US-139: disclaimer is the verbatim launch-prompt copy (no 'public' qualifier)", () => {
    expect(honestClaimsDisclaimer).toBe(
      "Score measures verifiability and code-quality signals. It does not predict intent.",
    );
  });

  it("US-139: disclaimer lives inside the score-banner section (in-band, not tooltip / footnote)", () => {
    const { container } = render(<ScoreBanner score={makeScore()} />);
    const banner = container.querySelector('[data-section="score-banner"]');
    const disclaimer = container.querySelector(
      '[data-section="honest-claims"]',
    );
    expect(disclaimer).not.toBeNull();
    expect(banner?.contains(disclaimer ?? null)).toBe(true);
    expect(disclaimer?.tagName.toLowerCase()).toBe("p");
  });

  it("US-139: disclaimer renders in serif italic — Bench v2 §3 'human voice' role", () => {
    const { container } = render(<ScoreBanner score={makeScore()} />);
    const disclaimer = container.querySelector(
      '[data-section="honest-claims"]',
    ) as HTMLElement;
    expect(disclaimer.style.fontFamily).toMatch(/--font-serif/);
    expect(disclaimer.style.fontStyle).toBe("italic");
  });

  it("outcome chip variant maps tier B → emerge", () => {
    const { container } = render(<ScoreBanner score={makeScore({ tier: "B" })} />);
    expect(
      container
        .querySelector('[data-chip="outcome"]')
        ?.getAttribute("data-variant"),
    ).toBe("emerge");
  });

  it("outcome chip variant maps tier A → fast", () => {
    const { container } = render(
      <ScoreBanner score={makeScore({ tier: "A", score_100: 78 })} />,
    );
    expect(
      container
        .querySelector('[data-chip="outcome"]')
        ?.getAttribute("data-variant"),
    ).toBe("fast");
  });

  it("outcome chip variant maps tier D → block (uses --o-block; DOES NOT collide with siren-red usage rule)", () => {
    const { container } = render(
      <ScoreBanner score={makeScore({ tier: "D", score_100: 30 })} />,
    );
    expect(
      container
        .querySelector('[data-chip="outcome"]')
        ?.getAttribute("data-variant"),
    ).toBe("block");
  });

  it("renders tier ladder with all 6 rows (S row visible with v2 footnote — never hidden)", () => {
    const { container } = render(<ScoreBanner score={makeScore()} />);
    const rows = container.querySelectorAll("[data-ladder-tier]");
    expect(rows.length).toBe(6);
    const tiers: Array<string | null> = Array.from(rows).map((r) =>
      r.getAttribute("data-ladder-tier"),
    );
    expect(tiers).toEqual(["S", "A", "B", "C", "D", "U"]);

    const sRow = container.querySelector('[data-ladder-tier="S"]');
    expect(sRow?.textContent).toMatch(/v2: requires verified GitHub cross-sign/i);
  });

  it("marks the current tier row in the ladder with data-current=true", () => {
    const { container } = render(<ScoreBanner score={makeScore({ tier: "C", score_100: 50 })} />);
    const cRow = container.querySelector('[data-ladder-tier="C"]');
    expect(cRow?.getAttribute("data-current")).toBe("true");
    const sRow = container.querySelector('[data-ladder-tier="S"]');
    expect(sRow?.getAttribute("data-current")).toBe("false");
  });

  it("public-read mode shows confidence chip with tier-ceiling-A label (GATE-32)", () => {
    const { container } = render(
      <ScoreBanner
        score={makeScore({
          ceilingApplied: "public_read_a",
          meta: {
            mode: "public-read",
            nonZeroSourceCount: 2,
            githubVerified: false,
            seniorityComponentIds: [],
            relevanceComponentIds: [],
          },
        })}
      />,
    );
    const chip = container.querySelector('[data-chip="confidence"]');
    expect(chip?.getAttribute("data-variant")).toBe("public-read");
    expect(chip?.textContent).toMatch(/public-read.*tier ceiling A/i);
  });

  it("manifest mode does NOT render the public-read confidence chip", () => {
    const { container } = render(<ScoreBanner score={makeScore()} />);
    expect(container.querySelector('[data-chip="confidence"]')).toBeNull();
  });

  const TIER_TO_TOKEN: Record<Tier, string> = {
    S: "var(--color-tier-a)",
    A: "var(--color-tier-a)",
    B: "var(--color-tier-b)",
    C: "var(--color-tier-c)",
    D: "var(--color-tier-d)",
    U: "var(--color-tier-u)",
  };

  for (const tier of ["A", "B", "C", "D", "U"] as const) {
    it(`tier ${tier} → tier monogram + score-big use the matching --color-tier-* token`, () => {
      const { container } = render(
        <ScoreBanner score={makeScore({ tier, score_100: 50 })} />,
      );
      const mono = container.querySelector(
        '[data-block="tier-monogram"]',
      ) as HTMLElement;
      const big = container.querySelector(
        '[data-field="score-big"]',
      ) as HTMLElement;
      expect(mono.style.color).toBe(TIER_TO_TOKEN[tier]);
      expect(big.style.color).toBe(TIER_TO_TOKEN[tier]);
    });
  }
});
