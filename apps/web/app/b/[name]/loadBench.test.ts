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
});
