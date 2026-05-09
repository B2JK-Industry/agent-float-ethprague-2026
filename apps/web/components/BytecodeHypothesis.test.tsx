import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";

import {
  BytecodeHypothesis,
  type BytecodeMatchResult,
} from "./BytecodeHypothesis";

const V1_DERIVED_HIGH_CONFIDENCE: BytecodeMatchResult = {
  confidence: 1.0,
  hypothesis: "V1-derived",
  matchedSelectors: [
    {
      name: "deposit",
      selector: "0xb6b55f25" as `0x${string}`,
    },
    {
      name: "withdraw",
      selector: "0x2e1a7d4d" as `0x${string}`,
    },
  ],
  unmatchedSelectors: [],
  storageConstants: {
    eip1967Slot: true,
    initializableNamespace: true,
    ozPatterns: false,
  },
  metadataTrailPresent: false,
};

const UNKNOWN_LOW_CONFIDENCE: BytecodeMatchResult = {
  confidence: 0.32,
  hypothesis: "unknown",
  matchedSelectors: [],
  unmatchedSelectors: [
    {
      name: "sweep",
      selector: "0x01ffc9a7" as `0x${string}`,
    },
  ],
  storageConstants: {
    eip1967Slot: false,
    initializableNamespace: false,
    ozPatterns: false,
  },
  metadataTrailPresent: false,
};

const V1_DERIVED_WITH_METADATA: BytecodeMatchResult = {
  confidence: 0.95,
  hypothesis: "V1-derived",
  matchedSelectors: [
    { name: "totalSupply", selector: "0x18160ddd" as `0x${string}` },
  ],
  unmatchedSelectors: [],
  storageConstants: {
    eip1967Slot: true,
    initializableNamespace: false,
    ozPatterns: true,
  },
  metadataTrailPresent: true,
};

describe("BytecodeHypothesis", () => {
  it("renders the V1-derived hypothesis copy with confidence percentage", () => {
    render(<BytecodeHypothesis result={V1_DERIVED_HIGH_CONFIDENCE} />);
    const section = screen.getByRole("region", {
      name: /bytecode hypothesis/i,
    });
    expect(section.getAttribute("data-hypothesis")).toBe("V1-derived");
    expect(section.textContent).toMatch(/V1-derived/);
    expect(
      section.querySelector("[data-confidence]")?.textContent,
    ).toMatch(/^100% match$/);
  });

  it("renders the 'metadata trail missing' amber badge when metadataTrailPresent === false", () => {
    render(<BytecodeHypothesis result={V1_DERIVED_HIGH_CONFIDENCE} />);
    const badge = screen
      .getByRole("region", { name: /bytecode hypothesis/i })
      .querySelector('[data-metadata-trail="missing"]');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toMatch(/metadata trail missing/i);
    expect(badge?.className).toContain("border-verdict-review");
  });

  it("renders the 'metadata trail present' badge when metadataTrailPresent === true", () => {
    render(<BytecodeHypothesis result={V1_DERIVED_WITH_METADATA} />);
    const badge = screen
      .getByRole("region", { name: /bytecode hypothesis/i })
      .querySelector('[data-metadata-trail="present"]');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toMatch(/metadata trail present/i);
    expect(badge?.className).toContain("border-verdict-safe");
  });

  it("uses the verdict-review surface tone for the hypothesis section (per spec)", () => {
    render(<BytecodeHypothesis result={V1_DERIVED_HIGH_CONFIDENCE} />);
    const section = screen.getByRole("region", {
      name: /bytecode hypothesis/i,
    });
    expect(section.className).toContain("bg-verdict-review-surf");
    expect(section.className).toContain("border-verdict-review");
  });

  it("flags confidence ≥ 0.9 with the verdict-review accent badge (high tone)", () => {
    render(<BytecodeHypothesis result={V1_DERIVED_HIGH_CONFIDENCE} />);
    const badge = screen
      .getByRole("region", { name: /bytecode hypothesis/i })
      .querySelector("[data-confidence]");
    expect(badge?.getAttribute("data-tone")).toBe("high");
    expect(badge?.className).toContain("text-verdict-review");
  });

  it("flags confidence < 0.9 with the neutral border-strong badge (low tone)", () => {
    render(<BytecodeHypothesis result={UNKNOWN_LOW_CONFIDENCE} />);
    const badge = screen
      .getByRole("region", { name: /bytecode hypothesis/i })
      .querySelector("[data-confidence]");
    expect(badge?.getAttribute("data-tone")).toBe("low");
    expect(badge?.textContent).toMatch(/^32% match$/);
  });

  it("renders the matched + unmatched selector lists with their counts", () => {
    render(<BytecodeHypothesis result={V1_DERIVED_HIGH_CONFIDENCE} />);
    const section = screen.getByRole("region", {
      name: /bytecode hypothesis/i,
    });
    const matched = section.querySelector('[data-list="matched"]');
    const unmatched = section.querySelector('[data-list="unmatched"]');
    expect(matched?.textContent).toMatch(/Matched selectors \(2\)/);
    expect(unmatched?.textContent).toMatch(/none/);

    const items = matched?.querySelectorAll("[data-selector]") ?? [];
    expect(items.length).toBe(2);
    expect(items[0].getAttribute("data-selector")).toBe("0xb6b55f25");
  });

  it("lists the storage-layout constants that the matcher detected", () => {
    render(<BytecodeHypothesis result={V1_DERIVED_HIGH_CONFIDENCE} />);
    const section = screen.getByRole("region", {
      name: /bytecode hypothesis/i,
    });
    expect(section.textContent).toMatch(/EIP-1967 slot/);
    expect(section.textContent).toMatch(/Initializable namespace/);
    expect(section.textContent).not.toMatch(/OZ patterns/);
  });

  it("shows 'No storage-layout constants detected' when the matcher found none", () => {
    render(<BytecodeHypothesis result={UNKNOWN_LOW_CONFIDENCE} />);
    expect(
      screen.getByText(/no storage-layout constants detected/i),
    ).toBeInTheDocument();
  });

  it("shows the unknown-hypothesis copy when hypothesis === 'unknown'", () => {
    render(<BytecodeHypothesis result={UNKNOWN_LOW_CONFIDENCE} />);
    const copy = screen
      .getByRole("region", { name: /bytecode hypothesis/i })
      .querySelector('[data-hypothesis="unknown"]');
    expect(copy?.textContent).toMatch(/unknown/i);
  });
});
