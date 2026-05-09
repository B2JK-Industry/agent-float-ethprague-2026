import { describe, it, expect, vi, beforeEach } from "vitest";

import { loadBench } from "./loadBench";

import type {
  MultiSourceEvidence,
  ScoreResult,
} from "@upgrade-siren/evidence";

const orchestrateMock = vi.fn();
const computeScoreMock = vi.fn();

vi.mock("@upgrade-siren/evidence", () => ({
  orchestrateSubject: (...args: unknown[]) => orchestrateMock(...args),
  computeScore: (...args: unknown[]) => computeScoreMock(...args),
}));

const SAMPLE_EVIDENCE = {
  subject: {
    name: "siren-agent-demo.upgrade-siren-demo.eth",
    chainId: 1,
    mode: "manifest",
    primaryAddress: "0xPRIMARY00000000000000000000000000000000",
    kind: "ai-agent",
    manifest: null,
  },
  sourcify: [],
  github: { kind: "absent" },
  onchain: [],
  ensInternal: { kind: "absent" },
  crossChain: null,
  failures: [],
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

describe("loadBench", () => {
  beforeEach(() => {
    orchestrateMock.mockReset();
    computeScoreMock.mockReset();
  });

  it("calls orchestrateSubject then computeScore and returns the typed shape", async () => {
    orchestrateMock.mockResolvedValue(SAMPLE_EVIDENCE);
    computeScoreMock.mockReturnValue(SAMPLE_SCORE);

    const result = await loadBench(
      "siren-agent-demo.upgrade-siren-demo.eth",
      { nowSeconds: 1_715_000_000 },
    );

    expect(orchestrateMock).toHaveBeenCalledTimes(1);
    expect(orchestrateMock).toHaveBeenCalledWith(
      "siren-agent-demo.upgrade-siren-demo.eth",
      expect.objectContaining({ chainId: 1 }),
    );
    expect(computeScoreMock).toHaveBeenCalledWith(SAMPLE_EVIDENCE, {
      nowSeconds: 1_715_000_000,
    });

    expect(result.kind).toBe("loaded");
    if (result.kind !== "loaded") throw new Error("unreachable");
    expect(result.evidence).toBe(SAMPLE_EVIDENCE);
    expect(result.score).toBe(SAMPLE_SCORE);
  });

  it("threads through env-derived rpc / pat / graph-key into orchestrator options", async () => {
    process.env.ALCHEMY_RPC_MAINNET = "https://example/rpc";
    process.env.GITHUB_PAT = "pat_x";
    process.env.GRAPH_API_KEY = "graph_x";
    orchestrateMock.mockResolvedValue(SAMPLE_EVIDENCE);
    computeScoreMock.mockReturnValue(SAMPLE_SCORE);

    await loadBench("subject.eth", { nowSeconds: 1 });

    expect(orchestrateMock).toHaveBeenCalledWith(
      "subject.eth",
      expect.objectContaining({
        rpcUrl: "https://example/rpc",
        githubPat: "pat_x",
        graphApiKey: "graph_x",
      }),
    );

    delete process.env.ALCHEMY_RPC_MAINNET;
    delete process.env.GITHUB_PAT;
    delete process.env.GRAPH_API_KEY;
  });

  it("returns kind:'error' reason:orchestrator_throw when orchestrator throws unexpectedly", async () => {
    orchestrateMock.mockRejectedValue(new Error("rpc 503"));

    const result = await loadBench("subject.eth", { nowSeconds: 1 });

    expect(result.kind).toBe("error");
    if (result.kind !== "error") throw new Error("unreachable");
    expect(result.reason).toBe("orchestrator_throw");
    expect(result.message).toContain("rpc 503");
    expect(computeScoreMock).not.toHaveBeenCalled();
  });

  it("returns kind:'error' reason:score_throw when computeScore throws", async () => {
    orchestrateMock.mockResolvedValue(SAMPLE_EVIDENCE);
    computeScoreMock.mockImplementation(() => {
      throw new Error("score bug");
    });

    const result = await loadBench("subject.eth", { nowSeconds: 1 });

    expect(result.kind).toBe("error");
    if (result.kind !== "error") throw new Error("unreachable");
    expect(result.reason).toBe("score_throw");
  });

  // HOTFIX 2026-05-09 (US-117-hotfix-timeout): regression suite for the
  // page-level orchestrator deadline. Live repro on /b/vitalik.eth was
  // HTTP 000 / 70s / 0-byte body — orchestrator's per-source fan-out
  // had no deadline, so a hung Sourcify/ENS-subgraph call burned the
  // full Vercel function budget.

  it("returns kind:'error' reason:orchestrator_timeout when orchestrator misses the deadline", async () => {
    // Orchestrator never resolves — simulates a hung Sourcify all-chains
    // lookup or ENS subgraph call.
    orchestrateMock.mockReturnValue(new Promise(() => {}));

    const result = await loadBench("vitalik.eth", {
      nowSeconds: 1,
      orchestratorTimeoutMs: 50,
    });

    expect(result.kind).toBe("error");
    if (result.kind !== "error") throw new Error("unreachable");
    expect(result.reason).toBe("orchestrator_timeout");
    expect(result.message).toMatch(/orchestrator timeout 50ms/);
    expect(computeScoreMock).not.toHaveBeenCalled();
  });

  it("succeeds within the deadline when orchestrator resolves quickly", async () => {
    orchestrateMock.mockResolvedValue(SAMPLE_EVIDENCE);
    computeScoreMock.mockReturnValue(SAMPLE_SCORE);

    const start = Date.now();
    const result = await loadBench("subject.eth", {
      nowSeconds: 1,
      orchestratorTimeoutMs: 5_000,
    });
    const elapsed = Date.now() - start;

    expect(result.kind).toBe("loaded");
    expect(elapsed).toBeLessThan(5_000);
  });

  it("does not race a thrown error past the timeout label (preserve original error)", async () => {
    orchestrateMock.mockRejectedValue(new Error("rpc 503 fast"));

    const result = await loadBench("subject.eth", {
      nowSeconds: 1,
      orchestratorTimeoutMs: 5_000,
    });

    expect(result.kind).toBe("error");
    if (result.kind !== "error") throw new Error("unreachable");
    // Distinct from orchestrator_timeout — the throw beat the deadline.
    expect(result.reason).toBe("orchestrator_throw");
    expect(result.message).toContain("rpc 503 fast");
  });

  it("default timeout is 12 seconds (Vercel function-budget headroom)", async () => {
    // Easiest assertion: when orchestrator NEVER resolves and we don't
    // override the timeout, loadBench takes >100ms (proves the default
    // is above the 50ms test value, not 0). We don't actually wait 12s
    // here — short slow promise resolves before default fires, proving
    // the default isn't immediate.
    orchestrateMock.mockImplementation(
      () => new Promise<MultiSourceEvidence>((resolve) => setTimeout(() => resolve(SAMPLE_EVIDENCE), 100)),
    );
    computeScoreMock.mockReturnValue(SAMPLE_SCORE);

    const result = await loadBench("subject.eth", { nowSeconds: 1 });

    // Default 12s did NOT fire on a 100ms call — loaded path returned.
    expect(result.kind).toBe("loaded");
  });
});
