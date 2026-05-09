import { describe, it, expect, vi, beforeEach } from "vitest";

import { loadBench } from "./loadBench";

import type {
  EngineContribution,
  MultiSourceEvidence,
  ScoreResult,
} from "@upgrade-siren/evidence";

const orchestrateMock = vi.fn();
const runEnginesMock = vi.fn();
const aggregateEnginesMock = vi.fn();
const resolvedRecordsFromEvidenceMock = vi.fn();
const ensureEnginesRegisteredMock = vi.fn();
const listRegisteredEnginesMock = vi.fn();
const isSourceEngineMock = vi.fn((engine: { category?: string }) => engine.category === 'source');

vi.mock("@upgrade-siren/evidence", () => ({
  orchestrateSubject: (...args: unknown[]) => orchestrateMock(...args),
  runEngines: (...args: unknown[]) => runEnginesMock(...args),
  aggregateEngines: (...args: unknown[]) => aggregateEnginesMock(...args),
  resolvedRecordsFromEvidence: (...args: unknown[]) => resolvedRecordsFromEvidenceMock(...args),
  ensureEnginesRegistered: (...args: unknown[]) => ensureEnginesRegisteredMock(...args),
  listRegisteredEngines: (...args: unknown[]) => listRegisteredEnginesMock(...args),
  isSourceEngine: (engine: { category?: string }) => isSourceEngineMock(engine),
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

const STUB_CONTRIBUTION: EngineContribution = {
  engineId: "addr.eth",
  category: "record",
  exists: true,
  validity: 1,
  liveness: 1,
  seniority: 0.4,
  relevance: 0.6,
  trust: 0.7,
  weight: 1,
  seniorityWeight: 1,
  relevanceWeight: 1,
  signals: { seniorityBreakdown: [], relevanceBreakdown: [], antiSignals: [] },
  evidence: [],
  confidence: "complete",
  durationMs: 5,
  cacheHit: false,
  errors: [],
};

describe("loadBench (unified Engine refactor 2026-05-09)", () => {
  beforeEach(() => {
    orchestrateMock.mockReset();
    runEnginesMock.mockReset();
    aggregateEnginesMock.mockReset();
    resolvedRecordsFromEvidenceMock.mockReset();
    ensureEnginesRegisteredMock.mockReset();
    listRegisteredEnginesMock.mockReset();
    listRegisteredEnginesMock.mockReturnValue([]);
    resolvedRecordsFromEvidenceMock.mockReturnValue(new Map());
    runEnginesMock.mockResolvedValue({
      contributions: new Map([[STUB_CONTRIBUTION.engineId, STUB_CONTRIBUTION]]),
      status: "complete",
      startedAtMs: 0,
      finishedAtMs: 1,
    });
    aggregateEnginesMock.mockReturnValue(SAMPLE_SCORE);
  });

  it("calls orchestrateSubject then runEngines + aggregateEngines and returns the typed shape", async () => {
    orchestrateMock.mockResolvedValue(SAMPLE_EVIDENCE);

    const result = await loadBench(
      "siren-agent-demo.upgrade-siren-demo.eth",
      { nowSeconds: 1_715_000_000 },
    );

    expect(orchestrateMock).toHaveBeenCalledTimes(1);
    expect(orchestrateMock).toHaveBeenCalledWith(
      "siren-agent-demo.upgrade-siren-demo.eth",
      expect.objectContaining({ chainId: 1 }),
    );
    expect(ensureEnginesRegisteredMock).toHaveBeenCalled();
    expect(runEnginesMock).toHaveBeenCalledTimes(1);
    expect(aggregateEnginesMock).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ evidence: SAMPLE_EVIDENCE, nowSeconds: 1_715_000_000 }),
    );

    expect(result.kind).toBe("loaded");
    if (result.kind !== "loaded") throw new Error("unreachable");
    expect(result.evidence).toBe(SAMPLE_EVIDENCE);
    expect(result.score).toBe(SAMPLE_SCORE);
    expect(result.engines).toHaveLength(1);
    expect(result.engines[0]?.engineId).toBe("addr.eth");
  });

  it("threads through env-derived rpc / pat / graph-key into orchestrator options", async () => {
    process.env.ALCHEMY_RPC_MAINNET = "https://example/rpc";
    process.env.GITHUB_PAT = "pat_x";
    process.env.GRAPH_API_KEY = "graph_x";
    orchestrateMock.mockResolvedValue(SAMPLE_EVIDENCE);

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
    expect(runEnginesMock).not.toHaveBeenCalled();
    expect(aggregateEnginesMock).not.toHaveBeenCalled();
  });

  it("returns kind:'error' reason:score_throw when runEngines throws", async () => {
    orchestrateMock.mockResolvedValue(SAMPLE_EVIDENCE);
    runEnginesMock.mockRejectedValue(new Error("engine pipeline boom"));

    const result = await loadBench("subject.eth", { nowSeconds: 1 });

    expect(result.kind).toBe("error");
    if (result.kind !== "error") throw new Error("unreachable");
    expect(result.reason).toBe("score_throw");
  });

  it("returns kind:'error' reason:score_throw when aggregateEngines throws", async () => {
    orchestrateMock.mockResolvedValue(SAMPLE_EVIDENCE);
    aggregateEnginesMock.mockImplementation(() => {
      throw new Error("aggregator bug");
    });

    const result = await loadBench("subject.eth", { nowSeconds: 1 });

    expect(result.kind).toBe("error");
    if (result.kind !== "error") throw new Error("unreachable");
    expect(result.reason).toBe("score_throw");
  });

  it("returns kind:'error' reason:orchestrator_timeout when orchestrator misses the deadline", async () => {
    orchestrateMock.mockReturnValue(new Promise(() => {}));

    const result = await loadBench("vitalik.eth", {
      nowSeconds: 1,
      orchestratorTimeoutMs: 50,
    });

    expect(result.kind).toBe("error");
    if (result.kind !== "error") throw new Error("unreachable");
    expect(result.reason).toBe("orchestrator_timeout");
    expect(result.message).toMatch(/orchestrator timeout 50ms/);
    expect(runEnginesMock).not.toHaveBeenCalled();
  });

  it("succeeds within the deadline when orchestrator resolves quickly", async () => {
    orchestrateMock.mockResolvedValue(SAMPLE_EVIDENCE);

    const start = Date.now();
    const result = await loadBench("subject.eth", {
      nowSeconds: 1,
      orchestratorTimeoutMs: 5_000,
    });
    const elapsed = Date.now() - start;

    expect(result.kind).toBe("loaded");
    expect(elapsed).toBeLessThan(5_000);
  });

  it("default timeout is 12 seconds (Vercel function-budget headroom)", async () => {
    orchestrateMock.mockImplementation(
      () => new Promise<MultiSourceEvidence>((resolve) => setTimeout(() => resolve(SAMPLE_EVIDENCE), 100)),
    );

    const result = await loadBench("subject.eth", { nowSeconds: 1 });

    expect(result.kind).toBe("loaded");
  });

  it("partial evidence still flows through the engine pipeline (no early bail)", async () => {
    const partialEvidence = {
      subject: {
        name: "vitalik.eth",
        chainId: 1,
        mode: "public-read",
        primaryAddress: "0xPRIMARY00000000000000000000000000000000",
        kind: null,
        manifest: null,
      },
      sourcify: [],
      github: { kind: "error", reason: "rate_limited", message: "github rate limited" },
      onchain: [],
      ensInternal: { kind: "error", reason: "source_timeout", message: "ens timeout" },
      crossChain: null,
      failures: [{ kind: "error", source: "github", reason: "rate_limited", message: "rl" }],
    } as unknown as MultiSourceEvidence;

    orchestrateMock.mockResolvedValue(partialEvidence);

    const result = await loadBench("vitalik.eth", { nowSeconds: 1 });

    expect(result.kind).toBe("loaded");
    if (result.kind !== "loaded") throw new Error("unreachable");
    expect(aggregateEnginesMock).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ evidence: partialEvidence }),
    );
  });
});
