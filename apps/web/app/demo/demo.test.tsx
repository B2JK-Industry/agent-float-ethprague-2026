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
  it("exposes exactly four scenarios in safe → dangerous → unverified → live order", () => {
    expect(DEMO_SCENARIOS).toHaveLength(4);
    expect(DEMO_SCENARIOS.map((s) => s.key)).toEqual([
      "safe",
      "dangerous",
      "unverified",
      "live-public-read",
    ]);
  });

  it("safe scenario points at the live Sepolia subname and expects SAFE", () => {
    const safe = findScenario("safe");
    expect(safe.target).toBe("safe.upgrade-siren-demo.eth");
    expect(safe.mode).toBe("signed-manifest");
    expect(safe.expectedVerdict).toBe("SAFE");
    expect(buildScenarioHref(safe)).toBe(
      "/r/safe.upgrade-siren-demo.eth",
    );
  });

  it("dangerous scenario points at the dangerous subname and expects SIREN", () => {
    const dangerous = findScenario("dangerous");
    expect(dangerous.target).toBe("dangerous.upgrade-siren-demo.eth");
    expect(dangerous.expectedVerdict).toBe("SIREN");
    expect(buildScenarioHref(dangerous)).toBe(
      "/r/dangerous.upgrade-siren-demo.eth?mock=true",
    );
  });

  it("unverified scenario points at the unverified subname and expects SIREN", () => {
    const unverified = findScenario("unverified");
    expect(unverified.target).toBe("unverified.upgrade-siren-demo.eth");
    expect(unverified.expectedVerdict).toBe("SIREN");
    expect(buildScenarioHref(unverified)).toBe(
      "/r/unverified.upgrade-siren-demo.eth?mock=true",
    );
  });

  it("live-public-read scenario points at Aave V3 Pool (US-062 chosen) and expects REVIEW", () => {
    const live = findScenario("live-public-read");
    expect(live.target).toBe("0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2");
    expect(live.mode).toBe("public-read");
    expect(live.expectedVerdict).toBe("REVIEW");
    expect(buildScenarioHref(live)).toBe(
      "/r/0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2?mode=public-read",
    );
  });

  it("buildScenarioHref appends ?mode=public-read for public-read scenarios with a target", () => {
    const synthetic: DemoScenario = {
      key: "live-public-read",
      label: "Synthetic",
      target: "aave-v3-pool.eth",
      mode: "public-read",
      expectedVerdict: "REVIEW",
      description: "synthetic for test",
    };
    expect(buildScenarioHref(synthetic)).toBe(
      "/r/aave-v3-pool.eth?mode=public-read",
    );
  });

  it("buildScenarioHref encodes special characters in ENS targets", () => {
    const synthetic: DemoScenario = {
      key: "safe",
      label: "Synthetic",
      target: "spaced name.eth",
      mode: "signed-manifest",
      expectedVerdict: "SAFE",
      description: "synthetic for test",
    };
    expect(buildScenarioHref(synthetic)).toBe("/r/spaced%20name.eth");
  });

  it("findScenario throws for unknown keys", () => {
    expect(() =>
      findScenario("nonexistent" as never),
    ).toThrow(/unknown demo scenario key/);
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
      "safe",
      "dangerous",
      "unverified",
      "live-public-read",
    ]);
  });

  it("renders the safe / dangerous / unverified rows as Next links to /r/<subname>", () => {
    render(<DemoPage />);
    expect(
      screen.getByRole("link", { name: /safe upgrade/i }),
    ).toHaveAttribute("href", "/r/safe.upgrade-siren-demo.eth");
    expect(
      screen.getByRole("link", { name: /dangerous upgrade/i }),
    ).toHaveAttribute("href", "/r/dangerous.upgrade-siren-demo.eth?mock=true");
    expect(
      screen.getByRole("link", { name: /unverified upgrade/i }),
    ).toHaveAttribute("href", "/r/unverified.upgrade-siren-demo.eth?mock=true");
  });

  it("renders the live-public-read row as an active link to the Aave V3 Pool target", () => {
    render(<DemoPage />);
    const liveRow = screen
      .getByRole("list", { name: /demo scenarios/i })
      .querySelector('li[data-scenario="live-public-read"]');
    expect(liveRow?.getAttribute("data-disabled")).not.toBe("true");
    const link = liveRow?.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe(
      "/r/0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2?mode=public-read",
    );
  });

  it("each scenario shows its expected-verdict chip", () => {
    render(<DemoPage />);
    const list = screen.getByRole("list", { name: /demo scenarios/i });
    expect(within(list).getAllByText("SAFE").length).toBeGreaterThanOrEqual(1);
    expect(within(list).getAllByText("REVIEW").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(within(list).getAllByText("SIREN").length).toBe(2);
  });
});
