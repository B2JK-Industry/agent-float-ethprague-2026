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
  it("renders the canonical Upgrade Siren hero copy", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { name: /verdict in five seconds/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/no source, no upgrade\./i)).toBeInTheDocument();
  });

  it("does not contain stale scaffold/placeholder/coming-soon wording", () => {
    const { container } = render(<HomePage />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/ships later/i);
    expect(text).not.toMatch(/coming soon/i);
    expect(text).not.toMatch(/scaffold \(US-037\)/i);
    expect(text).not.toMatch(/subsequent items/i);
  });

  it("mounts EnsLookupForm and PublicReadInput", () => {
    render(<HomePage />);
    // EnsLookupForm exposes input id="ens-lookup-input";
    // PublicReadInput exposes input id="public-read-input".
    expect(document.getElementById("ens-lookup-input")).toBeInTheDocument();
    expect(document.getElementById("public-read-input")).toBeInTheDocument();
  });

  it("renders the booth-scenarios section linking each scenario to its /r route", () => {
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
        // greyed-out chip
        const span = li!.querySelector('[aria-disabled="true"]');
        expect(span).not.toBeNull();
      } else {
        expect(li!.querySelector("a")).toHaveAttribute("href", href);
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
