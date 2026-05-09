import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

import HomePage from "./page";
import { DEMO_SCENARIOS, buildScenarioHref } from "./demo/demo.config";

// EnsLookupForm + PublicReadInput call useRouter() from next/navigation; in
// vitest there is no Next.js app-router provider, so stub the hook.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe("HomePage", () => {
  it("renders the canonical Bench-mode hero copy", () => {
    render(<HomePage />);
    // Post-2026-05-10 pivot: hero leads with the Bench Mode pitch
    // ("Type any ENS name. Get a 0–100 benchmark.") and the
    // "No data, no score." sub-tagline. The legacy
    // "Verdict in five seconds." headline is gone.
    expect(
      screen.getByRole("heading", { name: /type any ens name/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/no data, no score\./i)).toBeInTheDocument();
  });

  it("does not contain stale scaffold/placeholder/coming-soon wording", () => {
    const { container } = render(<HomePage />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/ships later/i);
    expect(text).not.toMatch(/coming soon/i);
    expect(text).not.toMatch(/scaffold \(US-037\)/i);
    expect(text).not.toMatch(/subsequent items/i);
  });

  it("mounts the Bench-mode EnsLookupForm in the hero", () => {
    render(<HomePage />);
    // PublicReadInput was retired with the single-contract band on
    // 2026-05-10 — only EnsLookupForm remains in the hero.
    expect(document.getElementById("ens-lookup-input")).toBeInTheDocument();
    expect(document.getElementById("public-read-input")).toBeNull();
  });

  it("renders the booth-scenarios section linking each scenario to its /b route", () => {
    render(<HomePage />);
    const section = screen.getByRole("region", {
      name: /try the booth scenarios/i,
    });
    const list = within(section).getByRole("list", {
      name: /canonical demo scenarios/i,
    });
    expect(within(list).getAllByRole("listitem")).toHaveLength(
      DEMO_SCENARIOS.length,
    );

    for (const scenario of DEMO_SCENARIOS) {
      const li = within(list)
        .getAllByRole("listitem")
        .find((el) => el.getAttribute("data-scenario") === scenario.key);
      expect(li).toBeDefined();
      const href = buildScenarioHref(scenario);
      if (href === null) {
        const span = li!.querySelector('[aria-disabled="true"]');
        expect(span).not.toBeNull();
      } else {
        expect(li!.querySelector("a")).toHaveAttribute("href", href);
        expect(href.startsWith("/b/")).toBe(true);
      }
    }
  });

  it("links 'Open demo runner' to /demo", () => {
    render(<HomePage />);
    const link = screen.getByRole("link", { name: /open demo runner/i });
    expect(link).toHaveAttribute("href", "/demo");
  });

  it("footer links to /demo", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("link", { name: /booth demo →/i }),
    ).toHaveAttribute("href", "/demo");
  });
});
