import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";

import DemoPage from "./page";
import {
  DEMO_SCENARIOS,
  buildScenarioHref,
  findScenario,
  type DemoScenario,
} from "./demo.config";

describe("demo.config", () => {
  it("exposes exactly four scenarios in agent → human → rich → mainnet order", () => {
    expect(DEMO_SCENARIOS).toHaveLength(4);
    expect(DEMO_SCENARIOS.map((s) => s.key)).toEqual([
      "agent-curated",
      "human-public",
      "rich-records",
      "mainnet-public",
    ]);
  });

  it("agent-curated points at the Sepolia signed manifest subject and predicts tier B", () => {
    const agent = findScenario("agent-curated");
    expect(agent.target).toBe("siren-agent-demo.upgrade-siren-demo.eth");
    expect(agent.mode).toBe("signed-manifest");
    expect(agent.expectedBucket).toBe("B");
    expect(buildScenarioHref(agent)).toBe(
      "/b/siren-agent-demo.upgrade-siren-demo.eth",
    );
  });

  it("human-public points at letadlo.eth (Sepolia public-read) and predicts tier D", () => {
    const human = findScenario("human-public");
    expect(human.target).toBe("letadlo.eth");
    expect(human.mode).toBe("public-read");
    expect(human.expectedBucket).toBe("D");
    expect(buildScenarioHref(human)).toBe("/b/letadlo.eth");
  });

  it("rich-records points at agent-kikiriki.eth and predicts tier D", () => {
    const rich = findScenario("rich-records");
    expect(rich.target).toBe("agent-kikiriki.eth");
    expect(rich.mode).toBe("public-read");
    expect(rich.expectedBucket).toBe("D");
    expect(buildScenarioHref(rich)).toBe("/b/agent-kikiriki.eth");
  });

  it("mainnet-public points at vitalik.eth and predicts tier A (public-read cap)", () => {
    const mainnet = findScenario("mainnet-public");
    expect(mainnet.target).toBe("vitalik.eth");
    expect(mainnet.mode).toBe("public-read");
    expect(mainnet.expectedBucket).toBe("A");
    expect(buildScenarioHref(mainnet)).toBe("/b/vitalik.eth");
  });

  it("buildScenarioHref encodes special characters in ENS targets", () => {
    const synthetic: DemoScenario = {
      key: "agent-curated",
      label: "Synthetic",
      target: "spaced name.eth",
      mode: "signed-manifest",
      expectedBucket: "B",
      expectedVerdict: "SAFE",
      description: "synthetic for test",
    };
    expect(buildScenarioHref(synthetic)).toBe("/b/spaced%20name.eth");
  });

  it("buildScenarioHref returns null for scenarios with target=null", () => {
    const synthetic: DemoScenario = {
      key: "agent-curated",
      label: "Synthetic",
      target: null,
      mode: "signed-manifest",
      expectedBucket: "U",
      expectedVerdict: "SAFE",
      description: "synthetic for test",
    };
    expect(buildScenarioHref(synthetic)).toBeNull();
  });

  it("findScenario throws for unknown keys", () => {
    expect(() => findScenario("nonexistent" as never)).toThrow(
      /unknown demo scenario key/,
    );
  });
});

describe("DemoPage", () => {
  it("renders all four scenarios with their data-scenario attribute", () => {
    render(<DemoPage />);
    const list = screen.getByRole("list", { name: /demo scenarios/i });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    const keys = items.map((li) => li.getAttribute("data-scenario"));
    expect(keys).toEqual([
      "agent-curated",
      "human-public",
      "rich-records",
      "mainnet-public",
    ]);
  });

  it("renders each scenario as a Next link to /b/<target>", () => {
    render(<DemoPage />);
    expect(
      screen.getByRole("link", { name: /curated ai agent/i }),
    ).toHaveAttribute(
      "href",
      "/b/siren-agent-demo.upgrade-siren-demo.eth",
    );
    expect(
      screen.getByRole("link", { name: /real human profile/i }),
    ).toHaveAttribute("href", "/b/letadlo.eth");
    expect(
      screen.getByRole("link", { name: /rich ens records/i }),
    ).toHaveAttribute("href", "/b/agent-kikiriki.eth");
    expect(
      screen.getByRole("link", { name: /mainnet ens demo/i }),
    ).toHaveAttribute("href", "/b/vitalik.eth");
  });

  it("each scenario shows its expected tier monogram", () => {
    render(<DemoPage />);
    const list = screen.getByRole("list", { name: /demo scenarios/i });
    // 1× B, 2× D, 1× A
    const monograms = within(list)
      .getAllByRole("listitem")
      .map((li) =>
        li
          .querySelector(".font-display.text-3xl.font-bold")
          ?.textContent?.trim(),
      );
    expect(monograms.sort()).toEqual(["A", "B", "D", "D"]);
  });

  it("surfaces signed-manifest vs public-read mode chip", () => {
    render(<DemoPage />);
    const list = screen.getByRole("list", { name: /demo scenarios/i });
    const modeChips = within(list)
      .getAllByRole("listitem")
      .map((li) =>
        li.querySelector("[data-mode]")?.getAttribute("data-mode"),
      );
    expect(modeChips).toEqual([
      "signed-manifest",
      "public-read",
      "public-read",
      "public-read",
    ]);
  });
});