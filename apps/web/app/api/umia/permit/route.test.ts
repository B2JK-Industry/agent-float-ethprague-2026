import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decodeAbiParameters } from "viem";

import { GET } from "./route";

const loadBenchMock = vi.fn();

vi.mock("../../../b/[name]/loadBench", () => ({
  loadBench: (...args: unknown[]) => loadBenchMock(...args),
}));

const HOOK = "0xcccccccccccccccccccccccccccccccccccccccc";
const WALLET = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
// Anvil/Foundry default account 0 — well-known test key, never used for prod.
const TEST_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

function loaded(tier: string, score: number, primaryAddress: string | null) {
  return {
    kind: "loaded" as const,
    evidence: {
      subject: { name: "alice.eth", primaryAddress },
    },
    score: { tier, score_100: score },
    engines: [],
  };
}

function call(query: Record<string, string>): Promise<Response> {
  const params = new URLSearchParams(query);
  const url = `https://upgradesiren.app/api/umia/permit?${params.toString()}`;
  return GET(new Request(url));
}

describe("/api/umia/permit", () => {
  beforeEach(() => {
    loadBenchMock.mockReset();
    delete process.env.REPORT_SIGNER_PRIVATE_KEY;
  });
  afterEach(() => {
    delete process.env.REPORT_SIGNER_PRIVATE_KEY;
  });

  it("400s on missing required params", async () => {
    const res = await call({ wallet: WALLET, step: "1" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe("bad_request");
  });

  it("400s on invalid wallet", async () => {
    const res = await call({
      subject: "alice.eth",
      wallet: "not-an-address",
      step: "1",
      minTier: "B",
      hookAddress: HOOK,
      chainId: "11155111",
    });
    expect(res.status).toBe(400);
  });

  it("400s on unknown minTier", async () => {
    const res = await call({
      subject: "alice.eth",
      wallet: WALLET,
      step: "1",
      minTier: "X",
      hookAddress: HOOK,
      chainId: "11155111",
    });
    expect(res.status).toBe(400);
  });

  it("502s when loadBench fails", async () => {
    loadBenchMock.mockResolvedValue({
      kind: "error",
      reason: "rpc_error",
      message: "no rpc",
    });
    const res = await call({
      subject: "alice.eth",
      wallet: WALLET,
      step: "1",
      minTier: "B",
      hookAddress: HOOK,
      chainId: "11155111",
      controllerCheck: "false",
    });
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.reason).toBe("bench_load_failed");
  });

  it("403 controller_mismatch when wallet != primaryAddress", async () => {
    loadBenchMock.mockResolvedValue(
      loaded("A", 75, "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"),
    );
    const res = await call({
      subject: "alice.eth",
      wallet: WALLET,
      step: "1",
      minTier: "B",
      hookAddress: HOOK,
      chainId: "11155111",
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.reason).toBe("controller_mismatch");
  });

  it("403 tier_below_threshold when observed < required", async () => {
    loadBenchMock.mockResolvedValue(loaded("D", 30, WALLET));
    const res = await call({
      subject: "alice.eth",
      wallet: WALLET,
      step: "1",
      minTier: "A",
      hookAddress: HOOK,
      chainId: "11155111",
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.reason).toBe("tier_below_threshold");
    expect(body.observed).toBe("D");
    expect(body.required).toBe("A");
  });

  it("403 no_primary_address when subject has no addr() result", async () => {
    loadBenchMock.mockResolvedValue(loaded("B", 60, null));
    const res = await call({
      subject: "alice.eth",
      wallet: WALLET,
      step: "1",
      minTier: "B",
      hookAddress: HOOK,
      chainId: "11155111",
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.reason).toBe("no_primary_address");
  });

  it("200 mock mode when REPORT_SIGNER_PRIVATE_KEY is absent", async () => {
    loadBenchMock.mockResolvedValue(loaded("A", 78, WALLET));
    const res = await call({
      subject: "alice.eth",
      wallet: WALLET,
      step: "2",
      minTier: "B",
      hookAddress: HOOK,
      chainId: "11155111",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.mode).toBe("mock");
    expect(body.mock).toBe(true);
    expect(body.permit.hookData).toMatch(/^0x01/);
    expect(body.evidence.observedTier).toBe("A");
  });

  it("200 signed mode when REPORT_SIGNER_PRIVATE_KEY is set; hookData round-trips abi.decode", async () => {
    process.env.REPORT_SIGNER_PRIVATE_KEY = TEST_KEY;
    loadBenchMock.mockResolvedValue(loaded("S", 95, WALLET));
    const res = await call({
      subject: "alice.eth",
      wallet: WALLET,
      step: "3",
      minTier: "A",
      hookAddress: HOOK,
      chainId: "11155111",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.mode).toBe("signed");
    expect(body.mock).toBe(false);
    expect(body.permit.signer.toLowerCase()).not.toBe(
      "0x0000000000000000000000000000000000000000",
    );
    expect(body.permit.hookData).toMatch(/^0x01/);

    // Round-trip the (step, deadline, signature) tuple from the wire-
    // format payload to prove encodeHookData wrote canonical bytes.
    const payload = ("0x" + body.permit.hookData.slice(4)) as `0x${string}`;
    const [step, deadline, signature] = decodeAbiParameters(
      [
        { name: "permitStep", type: "uint256" },
        { name: "deadline", type: "uint256" },
        { name: "signature", type: "bytes" },
      ],
      payload,
    );
    expect(step).toBe(3n);
    expect(deadline).toBeGreaterThan(0n);
    expect(signature).toMatch(/^0x[0-9a-fA-F]{130}$/);
  });

  it("controllerCheck=false bypasses controller gate but still enforces tier", async () => {
    loadBenchMock.mockResolvedValue(
      loaded("A", 75, "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"),
    );
    const res = await call({
      subject: "alice.eth",
      wallet: WALLET,
      step: "1",
      minTier: "B",
      hookAddress: HOOK,
      chainId: "11155111",
      controllerCheck: "false",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.mode).toBe("mock");
  });
});
