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

  // US-117 carry-rule v2 §2B: per-source timeouts inside the
  // orchestrator surface as `kind:'error' reason:'source_timeout'` per
  // tile rather than triggering the page-level `orchestrator_timeout`.
  // loadBench must pass partial evidence through unchanged so the
  // renderer can show missing pills on timed-out tiles + scored
  // contributions on the OK ones.
  it("Partial evidence renders score with missing components — loadBench passes timed-out tiles through to computeScore", async () => {
    const partialEvidence = {
      subject: {
        name: "vitalik.eth",
        chainId: 1,
        mode: "public-read",
        primaryAddress: "0xPRIMARY00000000000000000000000000000000",
        kind: null,
        manifest: null,
      },
      // Sourcify entry timed out → tile renders missing pill.
      sourcify: [
        {
          kind: "error",
          chainId: 1,
          address: "0xBBB",
          label: "vault",
          reason: "source_timeout",
          message: "sourcify-deep:1:0xBBB: per-source timeout 4000ms",
        },
      ],
      // GitHub responded OK.
      github: { kind: "ok", value: { owner: "vbuterin", user: null, repos: [] } },
      // On-chain responded OK across both default chains.
      onchain: [
        {
          kind: "ok",
          chainId: 1,
          value: {
            chainId: 1,
            address: "0xPRIMARY00000000000000000000000000000000",
            nonce: 100,
            firstTxBlock: 18_000_000n,
            firstTxTimestamp: 1700000000,
            latestBlock: 19_000_000n,
          },
        },
      ],
      // ENS-internal subgraph timed out → tile renders missing pill.
      ensInternal: {
        kind: "error",
        reason: "source_timeout",
        message: "ens-internal:vitalik.eth: per-source timeout 4000ms",
      },
      crossChain: null,
      // Failures aggregate logged by orchestrator.
      failures: [
        { kind: "error", source: "sourcify", reason: "source_timeout", message: "tile timeout" },
        { kind: "error", source: "ens-internal", reason: "source_timeout", message: "tile timeout" },
      ],
    } as unknown as MultiSourceEvidence;

    orchestrateMock.mockResolvedValue(partialEvidence);
    // Score engine reads ok sources (github + onchain), ignores the
    // timed-out tiles. Tier ceiling A still applies in public-read mode
    // — that's the score engine's job. Here we lock that loadBench
    // returns kind:'loaded' (NOT kind:'error' orchestrator_timeout) so
    // the renderer gets the partial evidence + the score.
    const partialScore = {
      ...SAMPLE_SCORE,
      seniority: 0.18,
      relevance: 0.30,
      score_100: 24,
      tier: "D",
      meta: { ...SAMPLE_SCORE.meta, mode: "public-read", nonZeroSourceCount: 2 },
    } as unknown as ScoreResult;
    computeScoreMock.mockReturnValue(partialScore);

    const result = await loadBench("vitalik.eth", { nowSeconds: 1_715_000_000 });

    expect(result.kind).toBe("loaded");
    if (result.kind !== "loaded") throw new Error("unreachable");
    // Evidence threaded through unchanged — renderer sees source_timeout
    // entries and renders missing pills on those tiles.
    expect(result.evidence).toBe(partialEvidence);
    expect(result.evidence.sourcify[0]?.kind).toBe("error");
    expect(result.evidence.ensInternal.kind).toBe("error");
    expect(result.evidence.github.kind).toBe("ok");
    expect(result.evidence.onchain[0]?.kind).toBe("ok");
    // Score computed honestly off the OK sources.
    expect(result.score).toBe(partialScore);
    expect(result.score.tier).toBe("D");
    expect(result.score.meta.mode).toBe("public-read");
    // computeScore was invoked with the partial evidence — no early
    // bail-out on timeout entries.
    expect(computeScoreMock).toHaveBeenCalledWith(partialEvidence, {
      nowSeconds: 1_715_000_000,
    });
  });
});
