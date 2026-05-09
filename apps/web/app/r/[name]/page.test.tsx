// Page-level smoke tests for the live verdict route.
//
// Detailed verdict-shape assertions live in `loadReport.test.ts` (which
// mocks `@upgrade-siren/evidence`). Here we only assert the page-level
// shell + how it threads `mockMode` / `publicReadIntent` from the URL
// search params into `loadReport`. The `<Suspense>` boundary means the
// async body does not render synchronously in vitest, so we don't assert
// inside it — those assertions move to `loadReport.test.ts` and to each
// component's own test file.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

import { FIXTURE_SUBNAMES } from "./fixtures";

vi.mock("./loadReport", () => ({
  loadReport: vi.fn().mockResolvedValue({
    kind: "empty",
    reason: "ens_not_found",
  }),
}));

import VerdictResultPage from "./page";
import { loadReport } from "./loadReport";

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

async function renderPage(props: PageParams): Promise<HTMLElement> {
  const ui = await VerdictResultPage(props);
  const { container } = render(ui);
  const main = container.querySelector('[data-page="verdict-result"]');
  if (!(main instanceof HTMLElement)) {
    throw new Error("expected main[data-page='verdict-result'] element");
  }
  return main;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("VerdictResultPage", () => {
  it("threads no-mock + no-public-read params as data-mode='live'", async () => {
    const main = await renderPage(paramsFor(FIXTURE_SUBNAMES.safe));
    expect(main.getAttribute("data-mode")).toBe("live");
    expect(loadReport).toHaveBeenCalledWith(FIXTURE_SUBNAMES.safe, {
      mockMode: false,
      publicReadIntent: false,
    });
  });

  it("recognises ?v=<verdict>&t=<timestamp> as precomputed snapshot mode", async () => {
    const main = await renderPage(
      paramsFor(FIXTURE_SUBNAMES.safe, {
        v: "SAFE",
        t: "2026-05-09T12:00:00Z",
      }),
    );
    expect(main.getAttribute("data-mode")).toBe("precomputed");
    // loadReport must NOT be called on the precomputed path — the verdict
    // is read straight from the URL params, no engine round-trip.
    expect(loadReport).not.toHaveBeenCalled();
  });

  it("ignores ?v=<verdict> when t= is missing (falls through to live)", async () => {
    const main = await renderPage(
      paramsFor(FIXTURE_SUBNAMES.safe, { v: "SAFE" }),
    );
    expect(main.getAttribute("data-mode")).toBe("live");
    expect(loadReport).toHaveBeenCalledTimes(1);
  });

  it("ignores ?v=garbage even with t= present (must be SAFE/REVIEW/SIREN)", async () => {
    const main = await renderPage(
      paramsFor(FIXTURE_SUBNAMES.safe, {
        v: "MAYBE",
        t: "2026-05-09T12:00:00Z",
      }),
    );
    expect(main.getAttribute("data-mode")).toBe("live");
    expect(loadReport).toHaveBeenCalledTimes(1);
  });

  it("threads ?mock=true into mockMode and tags the page data-mode='mock'", async () => {
    const main = await renderPage(
      paramsFor(FIXTURE_SUBNAMES.dangerous, { mock: "true" }),
    );
    expect(main.getAttribute("data-mode")).toBe("mock");
    expect(loadReport).toHaveBeenCalledWith(FIXTURE_SUBNAMES.dangerous, {
      mockMode: true,
      publicReadIntent: false,
    });
  });

  it("accepts ?mock=1 as the same fixture opt-in", async () => {
    const main = await renderPage(
      paramsFor(FIXTURE_SUBNAMES.unverified, { mock: "1" }),
    );
    expect(main.getAttribute("data-mode")).toBe("mock");
    expect(loadReport).toHaveBeenCalledWith(FIXTURE_SUBNAMES.unverified, {
      mockMode: true,
      publicReadIntent: false,
    });
  });

  it("threads ?mode=public-read into publicReadIntent and tags the page data-mode='public-read'", async () => {
    const main = await renderPage(
      paramsFor("aave.eth", { mode: "public-read" }),
    );
    expect(main.getAttribute("data-mode")).toBe("public-read");
    expect(loadReport).toHaveBeenCalledWith("aave.eth", {
      mockMode: false,
      publicReadIntent: true,
    });
  });

  it("decodes URL-encoded ENS names from the route param before calling loadReport", async () => {
    await renderPage(paramsFor("vault.upgrade-siren-demo.eth"));
    expect(loadReport).toHaveBeenCalledWith(
      "vault.upgrade-siren-demo.eth",
      expect.any(Object),
    );
  });

  it("renders the back/booth links in the static header", async () => {
    const main = await renderPage(paramsFor(FIXTURE_SUBNAMES.safe));
    const links = main.querySelectorAll("a[href]");
    const hrefs = Array.from(links, (a) => a.getAttribute("href"));
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/demo");
  });
});
