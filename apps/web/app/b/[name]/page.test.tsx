import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import BenchPage from "./page";

import type {
  MultiSourceEvidence,
  ScoreResult,
} from "@upgrade-siren/evidence";

vi.mock("./loadBench", () => ({
  loadBench: vi.fn(),
}));

import { loadBench } from "./loadBench";

const SAMPLE_EVIDENCE = {
  subject: {
    name: "siren-agent-demo.upgrade-siren-demo.eth",
    chainId: 1,
    mode: "manifest",
    primaryAddress: "0xPRIMARY00000000000000000000000000000000",
    kind: "ai-agent",
    manifest: null,
  },
  sourcify: [{ kind: "ok" }, { kind: "error" }],
  github: { kind: "absent" },
  onchain: [{ kind: "ok" }],
  ensInternal: { kind: "absent" },
  crossChain: null,
  failures: [{ kind: "error", source: "sourcify", reason: "x", message: "y" }],
} as unknown as MultiSourceEvidence;

const SAMPLE_SCORE = {
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
} as unknown as ScoreResult;

const loadBenchMock = vi.mocked(loadBench);

function pageProps(name: string): Parameters<typeof BenchPage>[0] {
  return { params: Promise.resolve({ name }) };
}

describe("BenchPage (US-131 foundation)", () => {
  it("renders subject name + sub-tagline + sub-brand on loaded result", async () => {
    loadBenchMock.mockResolvedValue({
      kind: "loaded",
      evidence: SAMPLE_EVIDENCE,
      score: SAMPLE_SCORE,
    });

    const ui = await BenchPage(
      pageProps("siren-agent-demo.upgrade-siren-demo.eth"),
    );
    render(ui);

    expect(
      screen.getByRole("heading", {
        name: "siren-agent-demo.upgrade-siren-demo.eth",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/upgrade siren bench/i)).toBeInTheDocument();
    expect(screen.getByText(/no data, no score\./i)).toBeInTheDocument();
  });

  it("foundation banner block exposes score_100, tier, and axis values", async () => {
    loadBenchMock.mockResolvedValue({
      kind: "loaded",
      evidence: SAMPLE_EVIDENCE,
      score: SAMPLE_SCORE,
    });

    const ui = await BenchPage(pageProps("subject.eth"));
    const { container } = render(ui);

    const score = container.querySelector('[data-field="score_100"]');
    const tier = container.querySelector('[data-field="tier"]');
    const seniority = container.querySelector('[data-field="seniority"]');
    const relevance = container.querySelector('[data-field="relevance"]');

    expect(score?.textContent).toBe("63");
    expect(tier?.textContent).toBe("B");
    expect(seniority?.textContent).toBe("0.600");
    expect(relevance?.textContent).toBe("0.660");
  });

  it("renders 'manifest' / 'public-read' mode chip from evidence.subject.mode", async () => {
    loadBenchMock.mockResolvedValue({
      kind: "loaded",
      evidence: {
        ...SAMPLE_EVIDENCE,
        subject: { ...SAMPLE_EVIDENCE.subject, mode: "public-read" },
      },
      score: SAMPLE_SCORE,
    });

    const ui = await BenchPage(pageProps("subject.eth"));
    const { container } = render(ui);

    const modeChip = container.querySelector('[data-chip="mode"]');
    expect(modeChip?.textContent).toBe("public-read");
  });

  it("kind chip falls back to 'subject' label when manifest mode but kind is null (public-read)", async () => {
    loadBenchMock.mockResolvedValue({
      kind: "loaded",
      evidence: {
        ...SAMPLE_EVIDENCE,
        subject: {
          ...SAMPLE_EVIDENCE.subject,
          mode: "public-read",
          kind: null,
        },
      },
      score: SAMPLE_SCORE,
    });

    const ui = await BenchPage(pageProps("subject.eth"));
    const { container } = render(ui);

    expect(
      container.querySelector('[data-chip="kind"]')?.textContent,
    ).toBe("subject");
  });

  it("source foundation block lists 4 sources with their evidence kinds", async () => {
    loadBenchMock.mockResolvedValue({
      kind: "loaded",
      evidence: SAMPLE_EVIDENCE,
      score: SAMPLE_SCORE,
    });

    const ui = await BenchPage(pageProps("subject.eth"));
    const { container } = render(ui);

    const grid = container.querySelector('[data-foundation="grid"]');
    expect(grid).not.toBeNull();
    expect(grid!.querySelector('[data-source="sourcify"]')?.textContent).toMatch(
      /2 entries/,
    );
    expect(grid!.querySelector('[data-source="github"]')?.textContent).toMatch(
      /absent/,
    );
    expect(grid!.querySelector('[data-source="onchain"]')?.textContent).toMatch(
      /1 chain\b/,
    );
    expect(
      grid!.querySelector('[data-source="ens-internal"]')?.textContent,
    ).toMatch(/absent/);
  });

  it("renders typed error section when loadBench returns kind:'error'", async () => {
    loadBenchMock.mockResolvedValue({
      kind: "error",
      reason: "orchestrator_throw",
      message: "rpc 503",
    });

    const ui = await BenchPage(pageProps("subject.eth"));
    render(ui);

    expect(screen.getByText(/bench evaluation failed/i)).toBeInTheDocument();
    expect(screen.getByText(/orchestrator_throw/i)).toBeInTheDocument();
    expect(screen.getByText(/rpc 503/i)).toBeInTheDocument();
  });

  it("decodes URL-encoded subject names (URI escapes from /lookup redirect)", async () => {
    loadBenchMock.mockResolvedValue({
      kind: "loaded",
      evidence: SAMPLE_EVIDENCE,
      score: SAMPLE_SCORE,
    });

    const ui = await BenchPage(pageProps("subject%20space.eth"));
    render(ui);

    expect(
      screen.getByRole("heading", { name: "subject space.eth" }),
    ).toBeInTheDocument();
  });
});
