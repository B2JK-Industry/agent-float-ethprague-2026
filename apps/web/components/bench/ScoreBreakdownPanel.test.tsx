import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { ScoreBreakdownPanel } from "./ScoreBreakdownPanel";

import type {
  ScoreComponentBreakdown,
  ScoreResult,
} from "@upgrade-siren/evidence";

function comp(
  id: string,
  weight: number,
  value: number | null,
  trust: "verified" | "unverified",
  contribution: number,
  status: ScoreComponentBreakdown["status"] = "computed",
): ScoreComponentBreakdown {
  return {
    id,
    weight,
    value,
    trust,
    trustFactor: trust === "verified" ? 1.0 : 0.6,
    contribution,
    status,
  };
}

function score(overrides: Partial<ScoreResult> = {}): ScoreResult {
  // Mock the EPIC §11 mockup numbers exactly:
  //   compileSuccess: 0.25 × 1.00 × 1.0 = 0.250
  //   ciPassRate:     0.20 × 0.92 × 0.6 = 0.110
  //   testPresence:   0.15 × 0.85 × 0.6 = 0.077
  //   bugHygiene:     0.10 × 0.78 × 0.6 = 0.047
  //   repoHygiene:    0.15 × 0.80 × 0.6 = 0.072
  //   releaseCadence: 0.15 × 0.50 × 0.6 = 0.045
  //   Σ = 0.601 → seniority 60 of 100
  //   relevance components similarly Σ → 0.663 / 66
  return {
    seniority: 0.601,
    relevance: 0.663,
    score_raw: 0.632,
    score_100: 63,
    tier: "B",
    ceilingApplied: "none",
    breakdown: {
      seniority: {
        components: [
          comp("compileSuccess", 0.25, 1.0, "verified", 0.25),
          comp("ciPassRate", 0.2, 0.92, "unverified", 0.11),
          comp("testPresence", 0.15, 0.85, "unverified", 0.077),
          comp("bugHygiene", 0.1, 0.78, "unverified", 0.047),
          comp("repoHygiene", 0.15, 0.8, "unverified", 0.072),
          comp("releaseCadence", 0.15, 0.5, "unverified", 0.045),
        ],
        sum: 0.601,
      },
      relevance: {
        components: [
          comp("sourcifyRecency", 0.3, 1.0, "verified", 0.3),
          comp("githubRecency", 0.3, 0.78, "unverified", 0.14),
          comp("onchainRecency", 0.25, 0.62, "verified", 0.155),
          comp("ensRecency", 0.15, 0.45, "verified", 0.068),
        ],
        sum: 0.663,
      },
    },
    meta: {
      mode: "manifest",
      nonZeroSourceCount: 4,
      githubVerified: false,
      seniorityComponentIds: [],
      relevanceComponentIds: [],
    },
    ...overrides,
  } as ScoreResult;
}

describe("ScoreBreakdownPanel (US-134, GATE-30 surface)", () => {
  it("renders the SCORE MATH header band per §8 pattern", () => {
    const { container } = render(<ScoreBreakdownPanel score={score()} />);
    const head = container.querySelector('[data-block="math-head"]');
    expect(head?.textContent).toMatch(/score math.*how 63 was built.*open ledger/i);
  });

  it("renders seniority + relevance axes side by side", () => {
    const { container } = render(<ScoreBreakdownPanel score={score()} />);
    expect(
      container.querySelector('[data-axis="seniority"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-axis="relevance"]'),
    ).not.toBeNull();
  });

  it("seniority axis lists all 6 components in extractor order", () => {
    const { container } = render(<ScoreBreakdownPanel score={score()} />);
    const seniority = container.querySelector('[data-axis="seniority"]');
    const ids = Array.from(
      seniority?.querySelectorAll("[data-component]") ?? [],
    ).map((n) => n.getAttribute("data-component"));
    expect(ids).toEqual([
      "compileSuccess",
      "ciPassRate",
      "testPresence",
      "bugHygiene",
      "repoHygiene",
      "releaseCadence",
    ]);
  });

  it("each component row renders weight × value × trustFactor = contribution", () => {
    const { container } = render(<ScoreBreakdownPanel score={score()} />);
    const compileSuccess = container.querySelector(
      '[data-component="compileSuccess"]',
    );
    expect(
      compileSuccess?.querySelector('[data-field="weight"]')?.textContent,
    ).toBe("0.25");
    expect(
      compileSuccess?.querySelector('[data-field="value"]')?.textContent,
    ).toBe("1.00");
    expect(
      compileSuccess
        ?.querySelector('[data-field="trust-factor"]')
        ?.getAttribute("data-multiplier"),
    ).toBe("× 1.0");
    expect(
      compileSuccess
        ?.querySelector('[data-field="contribution"]')
        ?.textContent,
    ).toBe("= 0.250");
  });

  it("× 0.6 column is rendered (NEVER hidden) for every unverified component — GATE-30", () => {
    const { container } = render(<ScoreBreakdownPanel score={score()} />);
    const unverifiedRows = container.querySelectorAll(
      '[data-trust="unverified"]',
    );
    expect(unverifiedRows.length).toBeGreaterThan(0);
    for (const row of Array.from(unverifiedRows)) {
      const factor = row
        .querySelector('[data-field="trust-factor"]')
        ?.getAttribute("data-multiplier");
      expect(factor).toBe("× 0.6");
    }
  });

  it("verified components render × 1.0 (the verified-trust factor)", () => {
    const { container } = render(<ScoreBreakdownPanel score={score()} />);
    const verifiedRows = container.querySelectorAll(
      '[data-trust="verified"]',
    );
    for (const row of Array.from(verifiedRows)) {
      const factor = row
        .querySelector('[data-field="trust-factor"]')
        ?.getAttribute("data-multiplier");
      expect(factor).toBe("× 1.0");
    }
  });

  it("Σ line renders raw discounted sum + 100-scale axis value (NO normalization to ceiling)", () => {
    const { container } = render(<ScoreBreakdownPanel score={score()} />);
    const seniority = container.querySelector('[data-axis="seniority"]');
    const sumLine = seniority?.querySelector('[data-field="sum-line"]');
    expect(sumLine?.textContent).toMatch(/Σ\s*=\s*0\.601/);
    expect(sumLine?.textContent).toMatch(/seniority\s*60\s*of 100/i);
    // Banned (GATE-30): "0.601 / 0.700 → 86" — never appears.
    expect(sumLine?.textContent).not.toMatch(/0\.601\s*\/\s*0\.700/);
    expect(sumLine?.textContent).not.toMatch(/86/);
  });

  it("ceiling label is rendered as DECORATIVE text, not as a divisor", () => {
    const { container } = render(<ScoreBreakdownPanel score={score()} />);
    const seniority = container.querySelector('[data-axis="seniority"]');
    const ceiling = seniority?.querySelector('[data-field="ceiling-label"]');
    expect(ceiling?.textContent).toMatch(
      /max reachable v1\s*=\s*70/i,
    );
    expect(ceiling?.textContent).toMatch(
      /verify github cross-sign to lift/i,
    );
    const relevanceCeiling = container
      .querySelector('[data-axis="relevance"]')
      ?.querySelector('[data-field="ceiling-label"]');
    expect(relevanceCeiling?.textContent).toMatch(/max reachable v1\s*=\s*88/);
  });

  it("C-07 Math Line: expression renders 0.5 × seniority + 0.5 × relevance with one intermediate step", () => {
    const { container } = render(<ScoreBreakdownPanel score={score()} />);
    const expr = container.querySelector('[data-field="math-expression"]');
    expect(expr?.querySelector('[data-field="math-seniority"]')?.textContent).toBe("60");
    expect(expr?.querySelector('[data-field="math-relevance"]')?.textContent).toBe("66");
    expect(expr?.querySelector('[data-field="math-step"]')?.textContent).toBe("63.00");
  });

  it("C-07 Math Line: result renders display 700 32px in tier color, ALWAYS two decimals (v3 §C-07)", () => {
    const { container } = render(<ScoreBreakdownPanel score={score()} />);
    const result = container.querySelector(
      '[data-field="math-result"]',
    ) as HTMLElement;
    // score.score_raw = 0.632 → × 100 → 63.20 (always two decimals)
    expect(result.textContent).toBe("63.20");
    expect(result.style.fontSize).toBe("32px");
    expect(result.style.fontWeight).toBe("700");
    expect(
      container.querySelector('[data-field="math-tier-letter"]')?.textContent,
    ).toBe("B");
  });

  it("C-06 Axis Bar: name + weight header reads 'SENIORITY · w 0.50 · 100pt max'", () => {
    const { container } = render(<ScoreBreakdownPanel score={score()} />);
    const seniorityHeader = container
      .querySelector('[data-axis="seniority"]')
      ?.querySelector('[data-field="axis-header"]');
    expect(seniorityHeader?.textContent).toMatch(/seniority/i);
    expect(seniorityHeader?.textContent).toMatch(/w 0\.50.*100pt max/i);
  });

  it("C-06 Axis Bar: earned/max renders 18px display 600 tabular-nums", () => {
    const { container } = render(<ScoreBreakdownPanel score={score()} />);
    const earnedMax = container
      .querySelector('[data-axis="seniority"]')
      ?.querySelector('[data-field="earned-max"]') as HTMLElement;
    expect(earnedMax.style.fontSize).toBe("18px");
    expect(earnedMax.style.fontWeight).toBe("600");
    expect(earnedMax.querySelector('[data-field="earned"]')?.textContent).toBe(
      "60",
    );
    expect(earnedMax.querySelector('[data-field="max"]')?.textContent).toBe(
      "/ 100",
    );
  });

  it("C-06 Axis Bar: fill threshold ≥0.80 → cyan (--src-verified)", () => {
    const s = score({
      breakdown: {
        seniority: { components: [], sum: 0.85 },
        relevance: { components: [], sum: 0.5 },
      },
    });
    const { container } = render(<ScoreBreakdownPanel score={s} />);
    const fill = container
      .querySelector('[data-axis="seniority"]')
      ?.querySelector('[data-field="fill-bar"]');
    expect(fill?.getAttribute("data-fill-color")).toBe(
      "var(--color-src-verified)",
    );
  });

  it("C-06 Axis Bar: fill threshold 0.50-0.79 → brass (--src-partial)", () => {
    const s = score({
      breakdown: {
        seniority: { components: [], sum: 0.6 },
        relevance: { components: [], sum: 0.5 },
      },
    });
    const { container } = render(<ScoreBreakdownPanel score={s} />);
    const fill = container
      .querySelector('[data-axis="seniority"]')
      ?.querySelector('[data-field="fill-bar"]');
    expect(fill?.getAttribute("data-fill-color")).toBe(
      "var(--color-src-partial)",
    );
  });

  it("C-06 Axis Bar: fill threshold <0.50 → bronze (--src-discounted)", () => {
    const s = score({
      breakdown: {
        seniority: { components: [], sum: 0.3 },
        relevance: { components: [], sum: 0.4 },
      },
    });
    const { container } = render(<ScoreBreakdownPanel score={s} />);
    const fill = container
      .querySelector('[data-axis="seniority"]')
      ?.querySelector('[data-field="fill-bar"]');
    expect(fill?.getAttribute("data-fill-color")).toBe(
      "var(--color-src-discounted)",
    );
  });

  it("C-06 Axis Bar: fill width is sum × 100% (NEVER divided by ceiling)", () => {
    const s = score({
      breakdown: {
        seniority: { components: [], sum: 0.601 },
        relevance: { components: [], sum: 0.663 },
      },
    });
    const { container } = render(<ScoreBreakdownPanel score={s} />);
    const fill = container
      .querySelector('[data-axis="seniority"]')
      ?.querySelector('[data-field="fill-bar"]') as HTMLElement;
    // 0.601 × 100 = 60.1; rounded down to integer in our impl: 60
    // (we use sum100 = round(sum * 100))
    expect(fill.style.width).toBe("60%");
  });

  it("C-06 Axis Bar: fill bar has transition:none (banned-motion v2 §5C / v3 C-06 do/don't)", () => {
    const { container } = render(<ScoreBreakdownPanel score={score()} />);
    const fill = container
      .querySelector('[data-axis="seniority"]')
      ?.querySelector('[data-field="fill-bar"]') as HTMLElement;
    expect(fill.style.transition).toBe("none");
  });

  it("final ceiling label spells v1 max = 79 + S-reservation note (US-114b merged)", () => {
    const { container } = render(<ScoreBreakdownPanel score={score()} />);
    const finalCeiling = container.querySelector(
      '[data-field="final-ceiling-label"]',
    );
    expect(finalCeiling?.textContent).toMatch(/v1\s*=\s*79.*→\s*A/);
    expect(finalCeiling?.textContent).toMatch(/S reserved for verified-GitHub v2/i);
  });

  it("v1 max ceiling is overridable via prop (single number now per US-114b merge)", () => {
    const { container } = render(
      <ScoreBreakdownPanel
        score={score()}
        v1Max={66}
        v1FullSeniorityMax={70}
        v1FullRelevanceMax={88}
      />,
    );
    expect(
      container.querySelector('[data-field="final-ceiling-label"]')?.textContent,
    ).toMatch(/v1\s*=\s*66/);
  });

  it("renders status badge for null_p1 components (P1, awaits US-114b)", () => {
    const s = score({
      breakdown: {
        seniority: {
          components: [
            comp("compileSuccess", 0.25, 1.0, "verified", 0.25),
            comp("ciPassRate", 0.2, null, "unverified", 0, "null_p1"),
          ],
          sum: 0.25,
        },
        relevance: {
          components: [],
          sum: 0,
        },
      },
    });
    const { container } = render(<ScoreBreakdownPanel score={s} />);
    const ciRow = container.querySelector('[data-component="ciPassRate"]');
    expect(
      ciRow?.querySelector('[data-field="status-badge"]')?.textContent,
    ).toMatch(/P1.*awaits US-114b/);
    expect(
      ciRow?.querySelector('[data-field="value"]')?.textContent,
    ).toBe("—");
  });

  it("does NOT contain the banned normalization fragment '0.601 / 0.700 → 86' anywhere", () => {
    const { container } = render(<ScoreBreakdownPanel score={score()} />);
    const text = container.textContent ?? "";
    // GATE-30 verbatim banned pattern.
    expect(text).not.toMatch(/0\.601\s*\/\s*0\.700/);
    // The number 86 must not surface from a normalized calc — search
    // for the explicit fragment "→ 86" so we don't false-flag legit
    // contexts like ENS expirations etc. (none in this panel).
    expect(text).not.toMatch(/→\s*86/);
  });

  describe("evaluator engines overlay (eval bridge)", () => {
    const stubEngine = (
      recordKey: "addr.eth" | "description" | "url",
      seniority: number,
      relevance: number,
      trust: number,
    ) => ({
      recordKey,
      exists: true,
      validity: 1 as const,
      liveness: 1 as const,
      seniority,
      relevance,
      trust,
      weight: 1,
      signals: { seniorityBreakdown: [], relevanceBreakdown: [], antiSignals: [] },
      evidence: [],
      confidence: "complete" as const,
      durationMs: 5,
      cacheHit: false,
      errors: [],
    });

    it("hides the eval section when both engines list is empty AND no bonus prop", () => {
      const { container } = render(<ScoreBreakdownPanel score={score()} />);
      expect(container.querySelector('[data-section="eval-engines"]')).toBeNull();
    });

    it("renders the eval section when engines and a non-zero bonus are passed", () => {
      const { container } = render(
        <ScoreBreakdownPanel
          score={score()}
          evalEngines={[
            stubEngine("addr.eth", 0.4, 0.6, 0.7),
            stubEngine("description", 0.3, 0.5, 0.6),
          ]}
          evalBonus={{ seniority: 0.04, relevance: 0.06, appliedToScore100: 5 }}
        />,
      );
      const section = container.querySelector('[data-section="eval-engines"]');
      expect(section).not.toBeNull();
      expect(section?.getAttribute("data-bonus-applied")).toBe("5");
      expect(container.querySelector('[data-engine="addr.eth"]')).not.toBeNull();
      expect(container.querySelector('[data-engine="description"]')).not.toBeNull();
      expect(container.querySelector('[data-field="bonus-applied"]')?.textContent).toBe("+5");
    });

    it("filters out engines with exists:false (only registered + non-empty rows render)", () => {
      const absent = stubEngine("url", 0, 0, 0);
      const { container } = render(
        <ScoreBreakdownPanel
          score={score()}
          evalEngines={[
            stubEngine("addr.eth", 0.4, 0.6, 0.7),
            { ...absent, exists: false, validity: 0 as const },
          ]}
          evalBonus={{ seniority: 0.04, relevance: 0.06, appliedToScore100: 5 }}
        />,
      );
      expect(container.querySelector('[data-engine="addr.eth"]')).not.toBeNull();
      expect(container.querySelector('[data-engine="url"]')).toBeNull();
    });
  });
});
