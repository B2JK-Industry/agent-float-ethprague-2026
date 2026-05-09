import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import VerdictResultPage from "./page";
import { FIXTURE_REPORTS, FIXTURE_SUBNAMES } from "./fixtures";

type PageParams = {
  params: Promise<{ name: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function paramsFor(
  name: string,
  search: Record<string, string> = {},
): PageParams {
  return {
    params: Promise.resolve({ name: encodeURIComponent(name) }),
    searchParams: Promise.resolve(search),
  };
}

async function renderPage(props: PageParams): Promise<void> {
  const ui = await VerdictResultPage(props);
  render(ui);
}

describe("VerdictResultPage", () => {
  it("renders the SAFE fixture for vault.upgrade-siren-demo.eth", async () => {
    await renderPage(paramsFor(FIXTURE_SUBNAMES.vault));
    const card = screen.getByRole("region", { name: /SAFE verdict/i });
    expect(card.getAttribute("data-verdict")).toBe("SAFE");
    expect(screen.getByTestId("verdict-word").textContent).toBe("SAFE");
    expect(card.getAttribute("data-mock")).toBe("true");
  });

  it("renders the SAFE fixture for safe.upgrade-siren-demo.eth", async () => {
    await renderPage(paramsFor(FIXTURE_SUBNAMES.safe));
    expect(
      screen.getByRole("region", { name: /SAFE verdict/i }).getAttribute("data-verdict"),
    ).toBe("SAFE");
  });

  it("renders the SIREN fixture for dangerous.upgrade-siren-demo.eth", async () => {
    await renderPage(paramsFor(FIXTURE_SUBNAMES.dangerous));
    const card = screen.getByRole("region", { name: /SIREN verdict/i });
    expect(card.getAttribute("data-verdict")).toBe("SIREN");
    expect(screen.getByTestId("verdict-word").textContent).toBe("SIREN");
  });

  it("renders the SIREN fixture for unverified.upgrade-siren-demo.eth", async () => {
    await renderPage(paramsFor(FIXTURE_SUBNAMES.unverified));
    expect(
      screen.getByRole("region", { name: /SIREN verdict/i }).getAttribute("data-verdict"),
    ).toBe("SIREN");
  });

  it("renders the public-read REVIEW fixture for unknown name with ?mode=public-read", async () => {
    await renderPage(paramsFor("aave.eth", { mode: "public-read" }));
    const card = screen.getByRole("region", { name: /REVIEW verdict/i });
    expect(card.getAttribute("data-verdict")).toBe("REVIEW");
    expect(card.getAttribute("data-mode")).toBe("public-read");
  });

  it("renders EmptyStateNoRecords for an unknown name without mode hint", async () => {
    await renderPage(paramsFor("unknown.eth"));
    const empty = screen.getByRole("region", {
      name: /no upgrade-siren records/i,
    });
    expect(empty.getAttribute("data-state")).toBe("empty-no-records");
    expect(empty.textContent).toMatch(/unknown\.eth/);
    expect(screen.queryByTestId("verdict-word")).not.toBeInTheDocument();
  });

  it("decodes URL-encoded ENS names from the route param", async () => {
    await renderPage(paramsFor("vault.upgrade-siren-demo.eth"));
    expect(screen.getAllByText(/vault\.upgrade-siren-demo\.eth/).length).toBeGreaterThan(0);
  });

  it("uses the dangerous fixture's expected report content", async () => {
    await renderPage(paramsFor(FIXTURE_SUBNAMES.dangerous));
    const fixture = FIXTURE_REPORTS.dangerous;
    expect(fixture.verdict).toBe("SIREN");
    expect(fixture.recommendedAction).toBe("reject");
    expect(fixture.findings.some((f) => /sweep/i.test(f.title))).toBe(true);
  });
});
