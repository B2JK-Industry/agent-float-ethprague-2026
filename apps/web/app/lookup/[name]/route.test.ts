import { describe, it, expect, vi, beforeEach } from "vitest";

import { GET } from "./route";

const resolveMock = vi.fn();

vi.mock("@upgrade-siren/evidence", () => ({
  resolveEnsRecords: (...args: unknown[]) => resolveMock(...args),
}));

function callGet(name: string) {
  const request = new Request(`https://upgradesiren.app/lookup/${name}`);
  return GET(request, { params: Promise.resolve({ name }) });
}

function ensOk(anyPresent: boolean) {
  return {
    kind: "ok",
    name: "x",
    chainId: 1,
    records: {
      chainId: null,
      proxy: null,
      owner: null,
      schema: null,
      upgradeManifestRaw: null,
    },
    flags: {},
    anyUpgradeSirenRecordPresent: anyPresent,
  };
}

describe("/lookup/[name] route handler (US-131 mode-detection)", () => {
  beforeEach(() => {
    resolveMock.mockReset();
  });

  it("redirects to /r/<name> when sepolia carries upgrade-siren records", async () => {
    resolveMock.mockImplementation((_n, opts) =>
      Promise.resolve(
        opts.chainId === 11155111 ? ensOk(true) : ensOk(false),
      ),
    );

    const res = await callGet("vault.demo.upgradesiren.eth");

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toMatch(
      /\/r\/vault\.demo\.upgradesiren\.eth$/,
    );
  });

  it("redirects to /r/<name> when mainnet carries upgrade-siren records", async () => {
    resolveMock.mockImplementation((_n, opts) =>
      Promise.resolve(opts.chainId === 1 ? ensOk(true) : ensOk(false)),
    );

    const res = await callGet("aave.eth");

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toMatch(/\/r\/aave\.eth$/);
  });

  it("redirects to /b/<name> when neither chain carries upgrade-siren records (Bench Mode)", async () => {
    resolveMock.mockResolvedValue(ensOk(false));

    const res = await callGet("vitalik.eth");

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toMatch(/\/b\/vitalik\.eth$/);
  });

  it("redirects to /b/<name> when ENS resolution errors on both chains (no /r/ false-positive)", async () => {
    resolveMock.mockResolvedValue({
      kind: "error",
      reason: "rpc_error",
      message: "no rpc",
    });

    const res = await callGet("nope.eth");

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toMatch(/\/b\/nope\.eth$/);
  });

  it("falls back to /b/<name> when resolveEnsRecords throws unexpectedly", async () => {
    resolveMock.mockRejectedValue(new Error("network down"));

    const res = await callGet("oops.eth");

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toMatch(/\/b\/oops\.eth$/);
  });

  it("preserves URI-encoded names through the redirect", async () => {
    resolveMock.mockResolvedValue(ensOk(false));

    const res = await callGet("subject%20space.eth");

    expect(res.headers.get("location")).toMatch(
      /\/b\/subject%20space\.eth$/,
    );
  });
});
