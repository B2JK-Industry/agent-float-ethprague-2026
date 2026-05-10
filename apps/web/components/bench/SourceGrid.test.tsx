import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { SourceGrid } from "./SourceGrid";
import { getDemoMock } from "../../lib/demoMocks";

import type {
  GithubEvidence,
  EnsInternalEvidence,
  MultiSourceEvidence,
  OnchainEntryEvidence,
  SourcifyEntryEvidence,
} from "@upgrade-siren/evidence";

function makeEvidence(overrides: {
  sourcify?: ReadonlyArray<SourcifyEntryEvidence>;
  github?: GithubEvidence;
  onchain?: ReadonlyArray<OnchainEntryEvidence>;
  ensInternal?: EnsInternalEvidence;
} = {}): MultiSourceEvidence {
  return {
    subject: {
      name: "x.eth",
      chainId: 1,
      mode: "manifest",
      primaryAddress: "0xPRIMARY00000000000000000000000000000000",
      kind: "ai-agent",
      manifest: null,
    },
    sourcify: overrides.sourcify ?? [],
    github: overrides.github ?? { kind: "absent" },
    onchain: overrides.onchain ?? [],
    ensInternal: overrides.ensInternal ?? { kind: "absent" },
    crossChain: null,
    failures: [],
  } as unknown as MultiSourceEvidence;
}

function tileFor(container: HTMLElement, key: string): HTMLElement {
  const el = container.querySelector(
    `[data-source="${key}"]`,
  ) as HTMLElement | null;
  if (!el) throw new Error(`tile not found: ${key}`);
  return el;
}

describe("SourceGrid (US-133)", () => {
  it("renders 4 tiles in fixed order: sourcify, github, onchain, ens", () => {
    const { container } = render(<SourceGrid evidence={makeEvidence()} />);
    const tiles = container.querySelectorAll("[data-source]");
    expect(tiles.length).toBe(4);
    const keys = Array.from(tiles).map((t) => t.getAttribute("data-source"));
    expect(keys).toEqual(["sourcify", "github", "onchain", "ens"]);
  });

  it("every tile renders the carry-rule triple: dot color + glyph + multiplier (v2 §2B)", () => {
    const { container } = render(<SourceGrid evidence={makeEvidence()} />);
    for (const t of Array.from(container.querySelectorAll("[data-source]"))) {
      expect(t.querySelector('[data-field="dot"]')).not.toBeNull();
      expect(t.querySelector('[data-field="glyph"]')).not.toBeNull();
      expect(t.querySelector('[data-field="multiplier"]')).not.toBeNull();
      expect(t.querySelector('[data-field="label"]')).not.toBeNull();
    }
  });

  it("github with kind:'ok' is mapped to the discounted state (× 0.60), v1 trust-discount", () => {
    const { container } = render(
      <SourceGrid
        evidence={makeEvidence({
          github: {
            kind: "ok",
            value: { topRepos: [], owner: "x" },
          } as unknown as GithubEvidence,
        })}
      />,
    );
    const github = tileFor(container, "github");
    expect(github.getAttribute("data-state")).toBe("discounted");
    expect(
      github
        .querySelector('[data-field="multiplier"]')
        ?.getAttribute("data-multiplier"),
    ).toBe("× 0.60");
  });

  it("github absent is mapped to missing with dashed border (carry-rule v2 §2B identifier)", () => {
    const { container } = render(
      <SourceGrid
        evidence={makeEvidence({ github: { kind: "absent" } })}
      />,
    );
    const github = tileFor(container, "github");
    expect(github.getAttribute("data-state")).toBe("missing");
    expect(github.style.border).toMatch(/dashed/);
    // Carry-rule check: missing tiles also get a dashed dot, not a colored fill.
    const dot = github.querySelector('[data-field="dot"]') as HTMLElement;
    expect(dot.style.background).toBe("transparent");
    expect(dot.style.border).toMatch(/dashed/);
  });

  it("github error renders invalid state with × 'INVALID' label", () => {
    const { container } = render(
      <SourceGrid
        evidence={makeEvidence({
          github: {
            kind: "error",
            reason: "rate_limit",
            message: "429",
          },
        })}
      />,
    );
    const github = tileFor(container, "github");
    expect(github.getAttribute("data-state")).toBe("invalid");
    expect(
      github.querySelector('[data-field="multiplier"]')?.textContent,
    ).toBe("INVALID");
  });

  it("sourcify all-ok exact-match → verified", () => {
    const ok: SourcifyEntryEvidence = {
      kind: "ok",
      chainId: 1,
      address: "0xA" as `0x${string}`,
      label: "x",
      deep: { match: "exact_match" } as unknown as SourcifyEntryEvidence extends {
        deep: infer D;
      }
        ? D
        : never,
      patterns: [],
      licenseCompiler: {} as unknown as SourcifyEntryEvidence extends {
        licenseCompiler: infer LC;
      }
        ? LC
        : never,
    } as SourcifyEntryEvidence;
    const { container } = render(
      <SourceGrid evidence={makeEvidence({ sourcify: [ok, ok] })} />,
    );
    const tile = tileFor(container, "sourcify");
    expect(tile.getAttribute("data-state")).toBe("verified");
  });

  it("sourcify mixed (one ok, one error) → partial", () => {
    const ok = {
      kind: "ok",
      chainId: 1,
      address: "0xA",
      label: "x",
      deep: { match: "exact_match" },
      patterns: [],
      licenseCompiler: {},
    } as unknown as SourcifyEntryEvidence;
    const err = {
      kind: "error",
      chainId: 1,
      address: "0xB",
      label: "y",
      reason: "404",
      message: "not_found",
    } as unknown as SourcifyEntryEvidence;
    const { container } = render(
      <SourceGrid evidence={makeEvidence({ sourcify: [ok, err] })} />,
    );
    const tile = tileFor(container, "sourcify");
    expect(tile.getAttribute("data-state")).toBe("partial");
  });

  it("sourcify all-error → invalid", () => {
    const err = {
      kind: "error",
      chainId: 1,
      address: "0xA",
      label: "x",
      reason: "404",
      message: "not_found",
    } as unknown as SourcifyEntryEvidence;
    const { container } = render(
      <SourceGrid evidence={makeEvidence({ sourcify: [err, err] })} />,
    );
    const tile = tileFor(container, "sourcify");
    expect(tile.getAttribute("data-state")).toBe("invalid");
  });

  it("sourcify empty → missing", () => {
    const { container } = render(<SourceGrid evidence={makeEvidence()} />);
    const tile = tileFor(container, "sourcify");
    expect(tile.getAttribute("data-state")).toBe("missing");
  });

  it("onchain all-ok → verified, mixed → partial, all-error → invalid, empty → missing", () => {
    const ok: OnchainEntryEvidence = {
      kind: "ok",
      chainId: 1,
      value: {} as unknown as OnchainEntryEvidence extends { value: infer V }
        ? V
        : never,
    } as OnchainEntryEvidence;
    const err: OnchainEntryEvidence = {
      kind: "error",
      chainId: 1,
      reason: "rpc",
      message: "down",
    };
    {
      const { container } = render(
        <SourceGrid evidence={makeEvidence({ onchain: [ok, ok] })} />,
      );
      expect(tileFor(container, "onchain").getAttribute("data-state")).toBe(
        "verified",
      );
    }
    {
      const { container } = render(
        <SourceGrid evidence={makeEvidence({ onchain: [ok, err] })} />,
      );
      expect(tileFor(container, "onchain").getAttribute("data-state")).toBe(
        "partial",
      );
    }
    {
      const { container } = render(
        <SourceGrid evidence={makeEvidence({ onchain: [err] })} />,
      );
      expect(tileFor(container, "onchain").getAttribute("data-state")).toBe(
        "invalid",
      );
    }
    {
      const { container } = render(<SourceGrid evidence={makeEvidence()} />);
      expect(tileFor(container, "onchain").getAttribute("data-state")).toBe(
        "missing",
      );
    }
  });

  it("ens kind:'ok' → verified, error → invalid, absent → missing", () => {
    const ok: EnsInternalEvidence = {
      kind: "ok",
      value: {} as unknown as EnsInternalEvidence extends { value: infer V }
        ? V
        : never,
    } as EnsInternalEvidence;
    {
      const { container } = render(
        <SourceGrid evidence={makeEvidence({ ensInternal: ok })} />,
      );
      expect(tileFor(container, "ens").getAttribute("data-state")).toBe(
        "verified",
      );
    }
    {
      const { container } = render(
        <SourceGrid
          evidence={makeEvidence({
            ensInternal: { kind: "error", reason: "rate", message: "429" },
          })}
        />,
      );
      expect(tileFor(container, "ens").getAttribute("data-state")).toBe(
        "invalid",
      );
    }
    {
      const { container } = render(<SourceGrid evidence={makeEvidence()} />);
      expect(tileFor(container, "ens").getAttribute("data-state")).toBe(
        "missing",
      );
    }
  });

  it("missing tiles always have dashed border + dashed dot (v2 §2B reserved identifier)", () => {
    const { container } = render(<SourceGrid evidence={makeEvidence()} />);
    const tiles = container.querySelectorAll('[data-state="missing"]');
    expect(tiles.length).toBeGreaterThanOrEqual(3);
    for (const t of Array.from(tiles)) {
      const el = t as HTMLElement;
      expect(el.style.border).toMatch(/dashed/);
    }
  });

  it("non-missing tiles never have dashed border (carry-rule reservation)", () => {
    const ok = {
      kind: "ok",
      chainId: 1,
      address: "0xA",
      label: "x",
      deep: { match: "exact_match" },
      patterns: [],
      licenseCompiler: {},
    } as unknown as SourcifyEntryEvidence;
    const { container } = render(
      <SourceGrid
        evidence={makeEvidence({
          sourcify: [ok],
          github: {
            kind: "ok",
            value: {},
          } as unknown as GithubEvidence,
        })}
      />,
    );
    const sourcifyTile = tileFor(container, "sourcify");
    const githubTile = tileFor(container, "github");
    expect(sourcifyTile.style.border).not.toMatch(/dashed/);
    expect(githubTile.style.border).not.toMatch(/dashed/);
  });

  it("vitalik.eth curated Tier A fixture has no empty-source placeholder tiles", () => {
    const demo = getDemoMock("vitalik.eth");
    expect(demo).toBeDefined();
    if (!demo) throw new Error("missing vitalik.eth demo fixture");

    const { container } = render(<SourceGrid evidence={demo.evidence} />);
    for (const key of ["sourcify", "github", "onchain", "ens"] as const) {
      expect(tileFor(container, key).getAttribute("data-state")).not.toBe(
        "missing",
      );
    }
    expect(container.textContent).not.toMatch(/no projects in manifest/i);
    expect(container.textContent).not.toMatch(/no PAT \/ no claim/i);
    expect(container.textContent).not.toMatch(/no chains queried/i);
    expect(container.textContent).not.toMatch(/no Graph API key/i);
  });
});
