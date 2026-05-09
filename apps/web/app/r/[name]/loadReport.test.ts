import { describe, it, expect, vi, beforeEach } from "vitest";

import { loadReport } from "./loadReport";
import { FIXTURE_SUBNAMES } from "./fixtures";

import type {
  ComputeVerdictInput,
  ComputeVerdictResult,
  Eip1967ReadResult,
  EnsResolutionResult,
  Result,
  SourcifyError,
  SourcifyStatus,
  ParseManifestResult,
  UpgradeManifest,
} from "@upgrade-siren/evidence";

vi.mock("@upgrade-siren/evidence", () => {
  return {
    resolveEnsRecords: vi.fn(),
    readImplementationSlot: vi.fn(),
    fetchSourcifyStatus: vi.fn(),
    fetchSourcifyMetadata: vi.fn().mockResolvedValue({
      kind: "error",
      error: { reason: "not_found", message: "no metadata" },
    }),
    parseUpgradeManifest: vi.fn(),
    computeVerdict: vi.fn(),
    hashManifest: vi.fn(() => "0x" + "ab".repeat(32)),
    verifyReportFromManifest: vi.fn().mockResolvedValue({
      kind: "error",
      reason: "signature_missing",
      message: "no report bytes",
    }),
    diffAbiRiskySelectors: vi.fn(() => ({
      added: [],
      removed: [],
      addedAny: false,
      removedAny: false,
    })),
    diffStorageLayout: vi.fn(() => ({
      kind: "unknown_missing_layout",
      changes: [],
      appended: [],
    })),
    diffSourceFiles: vi.fn(() => []),
    runPublicReadFallback: vi.fn().mockResolvedValue({
      kind: "ok",
      mode: "public-read",
      confidence: "public-read",
      inputKind: "address",
      inputName: null,
      proxyAddress: "0x87870BCA3F3fd6335C3F4ce8392D69350B4fA4E2",
      currentImplementation: "0x05f2e3ca9c8b9ce7b5b80e57db2f4bd8e8fb3322",
      sourcifyStatus: "exact_match",
      sourcifyMetadata: null,
      notes: ["input recognised as raw 0x address"],
    }),
  };
});

import {
  resolveEnsRecords,
  readImplementationSlot,
  fetchSourcifyStatus,
  parseUpgradeManifest,
  computeVerdict,
} from "@upgrade-siren/evidence";

beforeEach(() => {
  // Stub the global fetch so the live signed-manifest path's
  // `fetchReportBytes` returns null (→ signatureVerification missing).
  // Tests that exercise verifyReportFromManifest's success path can
  // override per-test.
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 404,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  });
});

const PROXY = "0x8391fa804d3755493e3C9D362D49c339C4469388" as const;
const VAULT_V1 = "0xC53d3879aCF9Dd9d6fCF8Ed9B335A410Cc66Eb30" as const;
const VAULT_V2_SAFE = "0x9A9DCb4CE0F03aCB6aa8e26905D6aBb93c95B774" as const;
const OPERATOR = "0x747E453F13B5B14313E25393Eb443fbAaA250cfC" as const;

function ensSepoliaWithRecords(): EnsResolutionResult {
  return {
    kind: "ok",
    name: FIXTURE_SUBNAMES.safe,
    chainId: 11155111,
    records: {
      chainId: "11155111",
      proxy: PROXY,
      owner: OPERATOR,
      schema: "upgrade-siren-manifest@1",
      upgradeManifestRaw: JSON.stringify({
        schema: "upgrade-siren-manifest@1",
        chainId: 11155111,
        proxy: PROXY,
        previousImpl: VAULT_V1,
        currentImpl: VAULT_V2_SAFE,
        reportUri: "https://upgradesiren.app/r/safe.json",
        reportHash: "0x" + "cd".repeat(32),
        version: 1,
        effectiveFrom: "2026-05-09T12:00:00Z",
        previousManifestHash: "0x" + "00".repeat(32),
      }),
    },
    flags: {
      chainIdPresent: true,
      proxyPresent: true,
      ownerPresent: true,
      schemaPresent: true,
      upgradeManifestPresent: true,
      agentContextPresent: false,
      agentEndpointWebPresent: false,
      agentEndpointMcpPresent: false,
    },
    anyUpgradeSirenRecordPresent: true,
    agentContext: null,
    agentEndpointWeb: null,
    agentEndpointMcp: null,
  };
}

function parsedManifestForSafe(): ParseManifestResult {
  const manifest: UpgradeManifest = {
    schema: "upgrade-siren-manifest@1",
    chainId: 11155111,
    proxy: PROXY,
    previousImpl: VAULT_V1,
    currentImpl: VAULT_V2_SAFE,
    reportUri: "https://upgradesiren.app/r/safe.json",
    reportHash: ("0x" + "cd".repeat(32)) as `0x${string}`,
    version: 1,
    effectiveFrom: "2026-05-09T12:00:00Z",
    previousManifestHash: ("0x" + "00".repeat(32)) as `0x${string}`,
  };
  return { kind: "ok", value: manifest };
}

function liveImplOk(impl: `0x${string}`): Eip1967ReadResult {
  return {
    kind: "ok",
    implementation: impl,
    slotValue: ("0x" +
      impl.slice(2).padStart(64, "0").toLowerCase()) as `0x${string}`,
  };
}

function sourcifyExact(
  chainId: number,
  address: `0x${string}`,
): Result<SourcifyStatus, SourcifyError> {
  return {
    kind: "ok",
    value: { chainId, address, match: "exact_match" },
  };
}

function sourcifyNotFound(
  chainId: number,
  address: `0x${string}`,
): Result<SourcifyStatus, SourcifyError> {
  return {
    kind: "ok",
    value: { chainId, address, match: "not_found" },
  };
}

function computeSafe(): ComputeVerdictResult {
  return {
    verdict: "SAFE",
    findings: [
      {
        id: "VERIFICATION_CURRENT",
        severity: "info",
        title: "Both implementations verified on Sourcify",
        evidence: {},
      },
    ],
    summary: "SAFE: No risk signals detected.",
    mode: "signed-manifest",
    confidence: "operator-signed",
  };
}

function computeSiren(): ComputeVerdictResult {
  return {
    verdict: "SIREN",
    findings: [
      {
        id: "SIGNATURE_MISSING",
        severity: "critical",
        title: "Production manifest is unsigned",
        evidence: {},
      },
    ],
    summary: "SIREN: Production manifest is unsigned.",
    mode: "signed-manifest",
    confidence: "operator-signed",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadReport — fixture path", () => {
  it("returns the fixture for known subnames when mockMode=true", async () => {
    const result = await loadReport(FIXTURE_SUBNAMES.safe, {
      mockMode: true,
      publicReadIntent: false,
    });
    expect(result.kind).toBe("loaded");
    if (result.kind !== "loaded") return;
    expect(result.source).toBe("fixture");
    expect(result.report.name).toBe(FIXTURE_SUBNAMES.safe);
    expect(result.report.mock).toBe(true);
    expect(vi.mocked(resolveEnsRecords)).not.toHaveBeenCalled();
  });

  it("returns publicReadFixture for unknown names when mockMode=true", async () => {
    const result = await loadReport("aave.eth", {
      mockMode: true,
      publicReadIntent: false,
    });
    expect(result.kind).toBe("loaded");
    if (result.kind !== "loaded") return;
    expect(result.report.verdict).toBe("REVIEW");
    expect(result.report.mode).toBe("public-read");
  });
});

describe("loadReport — live signed-manifest path", () => {
  it("returns SAFE for the canonical safe.upgrade-siren-demo.eth fixture inputs", async () => {
    vi.mocked(resolveEnsRecords).mockResolvedValueOnce(
      ensSepoliaWithRecords(),
    );
    vi.mocked(parseUpgradeManifest).mockReturnValueOnce(parsedManifestForSafe());
    vi.mocked(readImplementationSlot).mockResolvedValueOnce(
      liveImplOk(VAULT_V2_SAFE),
    );
    vi.mocked(fetchSourcifyStatus)
      .mockResolvedValueOnce(sourcifyExact(11155111, VAULT_V2_SAFE))
      .mockResolvedValueOnce(sourcifyExact(11155111, VAULT_V1));
    vi.mocked(computeVerdict).mockReturnValueOnce(computeSafe());

    const result = await loadReport(FIXTURE_SUBNAMES.safe, {
      mockMode: false,
      publicReadIntent: false,
    });

    expect(result.kind).toBe("loaded");
    if (result.kind !== "loaded") return;
    expect(result.source).toBe("live");
    expect(result.report.verdict).toBe("SAFE");
    expect(result.report.mock).toBe(false);
    expect(result.report.mode).toBe("signed-manifest");
    expect(result.report.proxy).toBe(PROXY);
    expect(result.report.currentImplementation).toBe(VAULT_V2_SAFE);
    expect(result.report.previousImplementation).toBe(VAULT_V1);
    expect(result.report.recommendedAction).toBe("approve");
  });

  it("forwards the engine's SIREN verdict when computeVerdict says so", async () => {
    vi.mocked(resolveEnsRecords).mockResolvedValueOnce(
      ensSepoliaWithRecords(),
    );
    vi.mocked(parseUpgradeManifest).mockReturnValueOnce(parsedManifestForSafe());
    vi.mocked(readImplementationSlot).mockResolvedValueOnce(
      liveImplOk(VAULT_V2_SAFE),
    );
    vi.mocked(fetchSourcifyStatus)
      .mockResolvedValueOnce(sourcifyNotFound(11155111, VAULT_V2_SAFE))
      .mockResolvedValueOnce(sourcifyExact(11155111, VAULT_V1));
    vi.mocked(computeVerdict).mockReturnValueOnce(computeSiren());

    const result = await loadReport(FIXTURE_SUBNAMES.unverified, {
      mockMode: false,
      publicReadIntent: false,
    });

    expect(result.kind).toBe("loaded");
    if (result.kind !== "loaded") return;
    expect(result.report.verdict).toBe("SIREN");
    expect(result.report.recommendedAction).toBe("reject");
    // current Sourcify shows not_found → currentVerified === false
    expect(result.report.sourcify.currentVerified).toBe(false);
  });

  it("passes the correct chainId from the manifest into the chain reads", async () => {
    vi.mocked(resolveEnsRecords).mockResolvedValueOnce(
      ensSepoliaWithRecords(),
    );
    vi.mocked(parseUpgradeManifest).mockReturnValueOnce(parsedManifestForSafe());
    vi.mocked(readImplementationSlot).mockResolvedValueOnce(
      liveImplOk(VAULT_V2_SAFE),
    );
    vi.mocked(fetchSourcifyStatus)
      .mockResolvedValueOnce(sourcifyExact(11155111, VAULT_V2_SAFE))
      .mockResolvedValueOnce(sourcifyExact(11155111, VAULT_V1));
    vi.mocked(computeVerdict).mockReturnValueOnce(computeSafe());

    await loadReport(FIXTURE_SUBNAMES.safe, {
      mockMode: false,
      publicReadIntent: false,
    });

    expect(vi.mocked(readImplementationSlot)).toHaveBeenCalledWith(
      11155111,
      PROXY,
      expect.any(Object),
    );
    expect(vi.mocked(fetchSourcifyStatus)).toHaveBeenCalledWith(
      11155111,
      VAULT_V2_SAFE,
    );
  });

  it("threads a valid signature through to auth.status='valid' + signer when verifyReportFromManifest succeeds", async () => {
    vi.mocked(resolveEnsRecords).mockResolvedValueOnce(
      ensSepoliaWithRecords(),
    );
    vi.mocked(parseUpgradeManifest).mockReturnValueOnce(parsedManifestForSafe());
    vi.mocked(readImplementationSlot).mockResolvedValueOnce(
      liveImplOk(VAULT_V2_SAFE),
    );
    vi.mocked(fetchSourcifyStatus)
      .mockResolvedValueOnce(sourcifyExact(11155111, VAULT_V2_SAFE))
      .mockResolvedValueOnce(sourcifyExact(11155111, VAULT_V1));
    vi.mocked(computeVerdict).mockReturnValueOnce(computeSafe());

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: () =>
        Promise.resolve(new TextEncoder().encode("{}").buffer),
    });

    const ev = await import("@upgrade-siren/evidence");
    vi.mocked(ev.verifyReportFromManifest).mockResolvedValueOnce({
      kind: "ok",
      report: {
        auth: {
          status: "valid",
          signatureType: "EIP-712",
          signer: OPERATOR,
          signature: ("0x" + "ab".repeat(65)) as `0x${string}`,
          signedAt: "2026-05-09T12:00:00Z",
        },
      } as never,
      signer: OPERATOR,
      reportHash: ("0x" + "cd".repeat(32)) as `0x${string}`,
    });

    const result = await loadReport(FIXTURE_SUBNAMES.safe, {
      mockMode: false,
      publicReadIntent: false,
    });
    expect(result.kind).toBe("loaded");
    if (result.kind !== "loaded") return;
    expect(result.report.auth.status).toBe("valid");
    expect(result.report.auth.signer).toBe(OPERATOR);
    expect(result.report.auth.signatureType).toBe("EIP-712");
  });

  it("renders auth.status='unsigned' when report-bytes fetch fails", async () => {
    vi.mocked(resolveEnsRecords).mockResolvedValueOnce(
      ensSepoliaWithRecords(),
    );
    vi.mocked(parseUpgradeManifest).mockReturnValueOnce(parsedManifestForSafe());
    vi.mocked(readImplementationSlot).mockResolvedValueOnce(
      liveImplOk(VAULT_V2_SAFE),
    );
    vi.mocked(fetchSourcifyStatus)
      .mockResolvedValueOnce(sourcifyExact(11155111, VAULT_V2_SAFE))
      .mockResolvedValueOnce(sourcifyExact(11155111, VAULT_V1));
    vi.mocked(computeVerdict).mockReturnValueOnce(computeSafe());

    const result = await loadReport(FIXTURE_SUBNAMES.safe, {
      mockMode: false,
      publicReadIntent: false,
    });

    expect(result.kind).toBe("loaded");
    if (result.kind !== "loaded") return;
    expect(result.report.auth.status).toBe("unsigned");
    expect(result.report.auth.signer).toBeNull();
  });

  it("threads abiDiff/storageDiff/sourceFileDiffs through to LoadReportLoaded", async () => {
    vi.mocked(resolveEnsRecords).mockResolvedValueOnce(
      ensSepoliaWithRecords(),
    );
    vi.mocked(parseUpgradeManifest).mockReturnValueOnce(parsedManifestForSafe());
    vi.mocked(readImplementationSlot).mockResolvedValueOnce(
      liveImplOk(VAULT_V2_SAFE),
    );
    vi.mocked(fetchSourcifyStatus)
      .mockResolvedValueOnce(sourcifyExact(11155111, VAULT_V2_SAFE))
      .mockResolvedValueOnce(sourcifyExact(11155111, VAULT_V1));
    vi.mocked(computeVerdict).mockReturnValueOnce(computeSafe());

    const ev = await import("@upgrade-siren/evidence");
    vi.mocked(ev.fetchSourcifyMetadata)
      .mockResolvedValueOnce({
        kind: "ok",
        value: { abi: [], storageLayout: null, sources: {} } as never,
      })
      .mockResolvedValueOnce({
        kind: "ok",
        value: { abi: [], storageLayout: null, sources: {} } as never,
      });
    vi.mocked(ev.diffAbiRiskySelectors).mockReturnValueOnce({
      added: [],
      removed: [],
      addedAny: false,
      removedAny: false,
    });
    vi.mocked(ev.diffStorageLayout).mockReturnValueOnce({
      kind: "compatible_appended_only",
      changes: [],
      appended: [],
    });
    vi.mocked(ev.diffSourceFiles).mockReturnValueOnce([
      {
        path: "Vault.sol",
        status: "modified",
        unifiedDiff:
          "--- a/Vault.sol\n+++ b/Vault.sol\n@@ -1,1 +1,1 @@\n-old\n+new",
        hunks: { added: 1, removed: 1 },
      },
    ]);

    const result = await loadReport(FIXTURE_SUBNAMES.safe, {
      mockMode: false,
      publicReadIntent: false,
    });
    expect(result.kind).toBe("loaded");
    if (result.kind !== "loaded") return;
    expect(result.abiDiff).toBeDefined();
    expect(result.storageDiff?.kind).toBe("compatible_appended_only");
    expect(result.sourceFileDiffs?.length).toBe(1);
    expect(result.sourceFileDiffs?.[0]?.path).toBe("Vault.sol");
  });
});

describe("loadReport — public-read path", () => {
  it("loads even when ENS has no upgrade-siren records, when publicReadIntent=true", async () => {
    const ensNoRecords: EnsResolutionResult = {
      kind: "ok",
      name: "aave.eth",
      chainId: 1,
      records: {
        chainId: null,
        proxy: null,
        owner: null,
        schema: null,
        upgradeManifestRaw: null,
      },
      flags: {
        chainIdPresent: false,
        proxyPresent: false,
        ownerPresent: false,
        schemaPresent: false,
        upgradeManifestPresent: false,
        agentContextPresent: false,
        agentEndpointWebPresent: false,
        agentEndpointMcpPresent: false,
      },
      anyUpgradeSirenRecordPresent: false,
      agentContext: null,
      agentEndpointWeb: null,
      agentEndpointMcp: null,
    };

    // Sepolia returns no records → fall through to mainnet, which has plain
    // ENS resolution (no upgrade-siren records).
    vi.mocked(resolveEnsRecords)
      .mockResolvedValueOnce({
        kind: "error",
        reason: "rpc_error",
        message: "ENS not found on Sepolia",
      })
      .mockResolvedValueOnce(ensNoRecords);

    vi.mocked(computeVerdict).mockReturnValueOnce({
      verdict: "REVIEW",
      findings: [
        {
          id: "PUBLIC_READ_MODE",
          severity: "warning",
          title: "Public-read mode caps verdict at REVIEW",
          evidence: {},
        },
      ],
      summary: "REVIEW: Public-read mode.",
      mode: "public-read",
      confidence: "public-read",
    });

    const result = await loadReport("aave.eth", {
      mockMode: false,
      publicReadIntent: true,
    });

    expect(result.kind).toBe("loaded");
    if (result.kind !== "loaded") return;
    expect(result.report.verdict).toBe("REVIEW");
    expect(result.report.mode).toBe("public-read");
    // No proxy / chain reads happen on a no-records ENS
    expect(vi.mocked(readImplementationSlot)).not.toHaveBeenCalled();
  });

  it("returns empty when ENS resolves with no records and no public-read intent", async () => {
    vi.mocked(resolveEnsRecords)
      .mockResolvedValueOnce({
        kind: "error",
        reason: "rpc_error",
        message: "not on Sepolia",
      })
      .mockResolvedValueOnce({
        kind: "ok",
        name: "aave.eth",
        chainId: 1,
        records: {
          chainId: null,
          proxy: null,
          owner: null,
          schema: null,
          upgradeManifestRaw: null,
        },
        flags: {
          chainIdPresent: false,
          proxyPresent: false,
          ownerPresent: false,
          schemaPresent: false,
          upgradeManifestPresent: false,
          agentContextPresent: false,
          agentEndpointWebPresent: false,
          agentEndpointMcpPresent: false,
        },
        anyUpgradeSirenRecordPresent: false,
        agentContext: null,
        agentEndpointWeb: null,
        agentEndpointMcp: null,
      });

    const result = await loadReport("aave.eth", {
      mockMode: false,
      publicReadIntent: false,
    });

    expect(result.kind).toBe("empty");
    if (result.kind !== "empty") return;
    expect(result.reason).toBe("no_records_no_intent");
  });
});

describe("loadReport — ENS resolution error", () => {
  it("returns empty when both Sepolia and mainnet ENS fail", async () => {
    vi.mocked(resolveEnsRecords)
      .mockResolvedValueOnce({
        kind: "error",
        reason: "invalid_name",
        message: "bad",
      })
      .mockResolvedValueOnce({
        kind: "error",
        reason: "rpc_error",
        message: "rpc",
      });

    const result = await loadReport("nonexistent.eth", {
      mockMode: false,
      publicReadIntent: false,
    });

    expect(result.kind).toBe("empty");
    if (result.kind !== "empty") return;
    expect(result.reason).toBe("ens_not_found");
  });
});

describe("loadReport — raw 0x address bypass (US-082)", () => {
  it("bypasses tryResolveEns and calls runPublicReadFallback when name is a 0x40-hex address", async () => {
    const RAW = "0x87870BCA3F3fd6335C3F4ce8392D69350B4fA4E2";

    const result = await loadReport(RAW, {
      mockMode: false,
      publicReadIntent: false,
    });

    expect(result.kind).toBe("loaded");
    if (result.kind !== "loaded") return;
    expect(result.report.mode).toBe("public-read");
    expect(result.report.verdict).toBe("REVIEW");
    expect(result.report.proxy.toLowerCase()).toBe(
      "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2",
    );
    // resolveEnsRecords must not have been called for the raw-address path.
    expect(vi.mocked(resolveEnsRecords)).not.toHaveBeenCalled();
  });

  it("serves raw-address public-read from prewarmed cache when available", async () => {
    const RAW = "0x87870BCA3F3fd6335C3F4ce8392D69350B4fA4E2";
    const implementation =
      "0x05f2e3ca9c8b9ce7b5b80e57db2f4bd8e8fb3322";
    const slot =
      `0x${"0".repeat(24)}${implementation.slice(2)}` as const;
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          eip1967Slot: slot,
          sourcify: { match: "exact_match" },
        }),
    });

    const ev = await import("@upgrade-siren/evidence");
    const result = await loadReport(RAW, {
      mockMode: false,
      publicReadIntent: true,
      origin: "https://upgrade-siren.vercel.app",
    });

    expect(result.kind).toBe("loaded");
    if (result.kind !== "loaded") return;
    expect(result.report.mode).toBe("public-read");
    expect(result.report.verdict).toBe("REVIEW");
    expect(result.report.currentImplementation.toLowerCase()).toBe(
      implementation,
    );
    expect(result.report.sourcify.currentVerified).toBe(true);
    expect(result.report.findings.map((f) => f.title)).toContain(
      "prewarmed booth cache hit for public-read target",
    );
    expect(vi.mocked(ev.runPublicReadFallback)).not.toHaveBeenCalled();
  });

  it("forwards a public-read fallback engine error as kind:'error'", async () => {
    const ev = await import("@upgrade-siren/evidence");
    vi.mocked(ev.runPublicReadFallback).mockResolvedValueOnce({
      kind: "error",
      reason: "unsupported_chain",
      message: "publicRead: unsupported chainId 137",
    });

    const result = await loadReport(
      "0x0000000000000000000000000000000000000001",
      { mockMode: false, publicReadIntent: false },
    );
    expect(result.kind).toBe("error");
    if (result.kind !== "error") return;
    expect(result.reason).toBe("public_read_unsupported_chain");
  });

  it("does NOT trigger raw-address bypass for plausible ENS names", async () => {
    vi.mocked(resolveEnsRecords)
      .mockResolvedValueOnce({
        kind: "error",
        reason: "invalid_name",
        message: "x",
      })
      .mockResolvedValueOnce({
        kind: "error",
        reason: "invalid_name",
        message: "y",
      });

    await loadReport("aave.eth", {
      mockMode: false,
      publicReadIntent: false,
    });

    const ev = await import("@upgrade-siren/evidence");
    expect(vi.mocked(ev.runPublicReadFallback)).not.toHaveBeenCalled();
  });
});
