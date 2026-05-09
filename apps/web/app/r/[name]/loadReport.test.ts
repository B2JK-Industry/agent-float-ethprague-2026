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
    parseUpgradeManifest: vi.fn(),
    computeVerdict: vi.fn(),
    hashManifest: vi.fn(() => "0x" + "ab".repeat(32)),
  };
});

import {
  resolveEnsRecords,
  readImplementationSlot,
  fetchSourcifyStatus,
  parseUpgradeManifest,
  computeVerdict,
} from "@upgrade-siren/evidence";

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

  it("never fabricates auth status — auth.status is always 'unsigned' on the live path until Stream B wires verifyReportSignature", async () => {
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
