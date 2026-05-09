// US-068 + US-081 — Live verdict pipeline. Bridges the Stream B
// `@upgrade-siren/evidence` engine to the `/r/[name]` route's
// `<VerdictCard>` rendering surface.
//
// US-081 wires four primitives that the original US-068 pipeline left as
// `null` placeholders:
//
//   verifyReportFromManifest (US-069)  — fetch report bytes, hash + verify
//                                        EIP-712 signature against
//                                        `upgrade-siren:owner`.
//   fetchSourcifyMetadata    (US-025)  — full ABI + storage layout +
//                                        sources for prev + curr impls.
//   diffAbiRiskySelectors   (US-026)  — added/removed risky selectors.
//   diffStorageLayout       (US-027)  — slot-by-slot compatibility.
//   diffSourceFiles         (US-075)  — per-file source diffs.
//
// The result is fed to `computeVerdict` so the engine sees real evidence
// rather than the previous `signatureVerification: null, abiDiff: null,
// storageDiff: null` empty-features call (which forced SIREN even on the
// V1 baseline because absent signature in signed-manifest mode is a hard
// SIREN trigger).
//
// Modes:
//   ?mock=true            → render the FIXTURE_REPORTS entry for the name
//                           (booth fallback; explicit user opt-in).
//   default (signed)      → live path; signed-manifest if upgrade-siren:*
//                           records present, public-read fallback otherwise.
//   ?mode=public-read     → caller intent; mode forced to "public-read".
//   ENS resolves, no records, no public-read intent → empty state.
//   ENS does not resolve → empty state.
//
// All fetches happen on the server. RPC URLs come from env vars set on
// Vercel: `ALCHEMY_RPC_SEPOLIA`, `ALCHEMY_RPC_MAINNET`, `ENS_RPC_URL`.
//
// Report-bytes resolution: the manifest's `reportUri` is rewritten from
// `https://upgradesiren.app/r/<X>.json` to `/reports/<X>.json` so that
// the static asset hosted by Next.js (apps/web/public/reports/*.json)
// satisfies the fetch even when the canonical domain is not yet
// reachable. If the rewrite fails, the original URL is tried.

import {
  computeVerdict,
  diffAbiRiskySelectors,
  diffSourceFiles,
  diffStorageLayout,
  fetchSourcifyMetadata,
  fetchSourcifyStatus,
  hashManifest,
  parseUpgradeManifest,
  readImplementationSlot,
  resolveEnsRecords,
  runPublicReadFallback,
  verifyReportFromManifest,
  type AbiRiskyDiff,
  type ComputeVerdictResult,
  type EnsResolutionOk,
  type EnsResolutionResult,
  type PublicReadOk,
  type ReportTrustResult,
  type SourceFileDiff,
  type SourcifyMatchLevel,
  type SourcifyMetadata,
  type StorageDiffResult,
  type UpgradeManifest,
  type Verdict as EngineVerdict,
  type VerifySignatureFailureReason,
  type VerifySignatureResult,
} from "@upgrade-siren/evidence";

import type {
  Address,
  RecommendedAction,
  SirenReport,
  SirenReportFinding,
} from "@upgrade-siren/shared";

import {
  FIXTURE_REPORTS,
  SUBNAME_TO_FIXTURE,
  publicReadFixture,
  type FixtureKey,
} from "./fixtures";

const SEPOLIA_CHAIN_ID = 11155111;
const MAINNET_CHAIN_ID = 1;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

const REPORT_URI_HOST_REWRITES: ReadonlyArray<{
  match: RegExp;
  rewrite: string;
}> = [
  // Production canonical → static asset hosted by apps/web/public/reports/.
  { match: /^https?:\/\/upgradesiren\.app\/r\//i, rewrite: "/reports/" },
  // Future-proof for upgradesiren.eth ENS gateway:
  { match: /^https?:\/\/upgradesiren\.eth\/r\//i, rewrite: "/reports/" },
];

export type LoadReportOptions = {
  readonly mockMode: boolean;
  readonly publicReadIntent: boolean;
  /**
   * Origin of the incoming HTTP request, used to resolve relative paths
   * (e.g. `/reports/<n>.json`) into absolute URLs that `fetch` accepts on
   * the server. When the route handler / page has access to the origin,
   * pass it through; otherwise we fall back to relative-only fetches
   * (which only work in the browser, not on the server).
   */
  readonly origin?: string;
};

export type LoadReportLoaded = {
  readonly kind: "loaded";
  readonly report: SirenReport;
  readonly source: "fixture" | "live";
  readonly abiDiff?: AbiRiskyDiff;
  readonly storageDiff?: StorageDiffResult;
  readonly sourceFileDiffs?: ReadonlyArray<SourceFileDiff>;
};

export type LoadReportResult =
  | LoadReportLoaded
  | { readonly kind: "empty"; readonly reason: "ens_not_found" | "no_records_no_intent" }
  | { readonly kind: "error"; readonly reason: string; readonly message: string };

function rpcUrlForChain(chainId: number): string | undefined {
  if (chainId === SEPOLIA_CHAIN_ID) {
    return process.env.ALCHEMY_RPC_SEPOLIA ?? process.env.ENS_RPC_URL;
  }
  if (chainId === MAINNET_CHAIN_ID) {
    return process.env.ALCHEMY_RPC_MAINNET ?? process.env.ENS_RPC_URL;
  }
  return process.env.ENS_RPC_URL;
}

function parseAddress(value: string | null): Address | null {
  if (!value) return null;
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) return null;
  return value as Address;
}

function recommendedActionFor(verdict: EngineVerdict): RecommendedAction {
  if (verdict === "SAFE") return "approve";
  if (verdict === "REVIEW") return "review";
  return "reject";
}

function mapFindings(
  findings: ComputeVerdictResult["findings"],
): readonly SirenReportFinding[] {
  return findings.map((f) => ({
    id: String(f.id),
    severity: f.severity,
    title: f.title,
    evidence: f.evidence,
  }));
}

function sourcifyVerifiedFromMatch(
  match: SourcifyMatchLevel | null,
): boolean {
  return match === "exact_match" || match === "match";
}

function loadFixture(name: string): { report: SirenReport } {
  const fixtureKey: FixtureKey | undefined = SUBNAME_TO_FIXTURE[name];
  if (fixtureKey) {
    return { report: FIXTURE_REPORTS[fixtureKey] };
  }
  return { report: publicReadFixture(name) };
}

async function tryResolveEns(
  name: string,
): Promise<{ ens: EnsResolutionOk; chainId: number } | null> {
  // Try Sepolia first (demo subnames live there per DEPLOYMENTS.md), fall
  // through to mainnet if Sepolia returns no upgrade-siren records.
  const sepolia: EnsResolutionResult = await resolveEnsRecords(name, {
    chainId: SEPOLIA_CHAIN_ID,
    rpcUrl: rpcUrlForChain(SEPOLIA_CHAIN_ID),
  });
  if (sepolia.kind === "ok" && sepolia.anyUpgradeSirenRecordPresent) {
    return { ens: sepolia, chainId: SEPOLIA_CHAIN_ID };
  }

  const mainnet: EnsResolutionResult = await resolveEnsRecords(name, {
    chainId: MAINNET_CHAIN_ID,
    rpcUrl: rpcUrlForChain(MAINNET_CHAIN_ID),
  });
  if (mainnet.kind === "ok") {
    return { ens: mainnet, chainId: MAINNET_CHAIN_ID };
  }
  if (sepolia.kind === "ok") {
    // Sepolia resolved but with no upgrade-siren records — still a valid
    // public-read target on the parent's chain.
    return { ens: sepolia, chainId: SEPOLIA_CHAIN_ID };
  }
  return null;
}

/**
 * Translate a manifest reportUri to a URL we can actually fetch from this
 * deployment. Production canonical hosts (upgradesiren.app /
 * upgradesiren.eth) rewrite to the local `/reports/` static asset path so
 * the fetch lands on the bytes that ship with apps/web/public.
 */
function candidateReportUrls(reportUri: string, origin: string | undefined): string[] {
  const out: string[] = [];
  for (const { match, rewrite } of REPORT_URI_HOST_REWRITES) {
    if (match.test(reportUri)) {
      const path = reportUri.replace(match, rewrite);
      if (origin) out.push(`${origin}${path}`);
      out.push(path);
      break;
    }
  }
  out.push(reportUri);
  return out;
}

async function fetchReportBytes(
  reportUri: string,
  origin: string | undefined,
): Promise<Uint8Array | null> {
  for (const url of candidateReportUrls(reportUri, origin)) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: { accept: "application/json" },
      });
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      return new Uint8Array(buf);
    } catch {
      // try next candidate
    }
  }
  return null;
}

const REPORT_TRUST_REASON_MAP: Record<
  Exclude<ReportTrustResult, { kind: "ok" }>["reason"],
  VerifySignatureFailureReason
> = {
  malformed_json: "malformed_signature",
  malformed_report_shape: "malformed_signature",
  hash_mismatch: "malformed_signature",
  signature_missing: "missing_signature",
  signature_invalid: "malformed_signature",
  unsupported_signature_type: "unsupported_signature_type",
  owner_mismatch: "owner_mismatch",
};

function reportTrustToVerifyResult(
  trust: ReportTrustResult,
): VerifySignatureResult {
  if (trust.kind === "ok") {
    return { valid: true, recovered: trust.signer };
  }
  return {
    valid: false,
    reason: REPORT_TRUST_REASON_MAP[trust.reason],
    message: trust.message,
    recovered: trust.recovered,
  };
}

async function fetchMetadataIfAddress(
  chainId: number,
  address: Address | null,
): Promise<SourcifyMetadata | null> {
  if (address === null) return null;
  const result = await fetchSourcifyMetadata(chainId, address);
  return result.kind === "ok" ? result.value : null;
}

const RAW_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function isRawAddress(input: string): boolean {
  return RAW_ADDRESS_RE.test(input.trim());
}

/**
 * Build a SirenReport from the public-read fallback engine's result. The
 * raw-address branch (US-082) cannot resolve ENS records — there are none —
 * so the engine emits a deliberately conservative public-read shape:
 *   verdict capped at REVIEW; mode = "public-read"; auth = unsigned;
 *   sourcify links derived from the matcher; previousImpl unknown.
 */
function buildPublicReadReportFromAddress(
  name: string,
  result: PublicReadOk,
): SirenReport {
  const sourcifyMatch = result.sourcifyStatus;
  const currentVerified = sourcifyVerifiedFromMatch(sourcifyMatch);
  const links = result.currentImplementation !== null && currentVerified
    ? [
        {
          label: "Sourcify · current",
          url: `https://sourcify.dev/#/lookup/${result.currentImplementation}`,
        },
      ]
    : [];
  return {
    schema: "siren-report@1",
    name,
    chainId: MAINNET_CHAIN_ID,
    proxy: result.proxyAddress,
    previousImplementation: null,
    currentImplementation: result.currentImplementation ?? result.proxyAddress,
    // Public-read fallback never produces SAFE per docs/02 rule table.
    // Without ENS records there is no signed manifest to attest, so the
    // engine returns REVIEW (or SIREN if a hard rule fired). The fallback
    // primitive does not run the verdict engine; it only assembles the
    // primitives. Return REVIEW as the conservative default.
    verdict: "REVIEW",
    summary:
      "Public-read fallback (raw 0x address). No upgrade-siren records — verdict capped at REVIEW; never SAFE.",
    findings: result.notes.map((note, i) => ({
      id: `PUBLIC_READ_NOTE_${i}`,
      severity: "info" as const,
      title: note,
      evidence: { kind: result.inputKind },
    })),
    sourcify: {
      previousVerified: null,
      currentVerified,
      links,
    },
    mode: "public-read",
    confidence: "public-read",
    ens: {
      recordsResolvedLive: false,
      manifestHash: null,
      owner: null,
    },
    auth: {
      status: "unsigned",
      signatureType: null,
      signer: null,
      signature: null,
      signedAt: null,
    },
    recommendedAction: "review",
    mock: false,
    generatedAt: new Date().toISOString(),
  };
}

export async function loadReport(
  name: string,
  options: LoadReportOptions,
): Promise<LoadReportResult> {
  if (options.mockMode) {
    const { report } = loadFixture(name);
    return { kind: "loaded", report, source: "fixture" };
  }

  // US-082: raw 0x-prefixed address bypasses ENS — go straight to the
  // public-read fallback engine. resolveEnsRecords does not accept raw
  // addresses (only plausible ENS names), so without this branch the
  // Aave V3 Pool / arbitrary-contract scenario fails at the ENS gate.
  if (isRawAddress(name)) {
    const fallback = await runPublicReadFallback(name.trim(), {
      chainId: MAINNET_CHAIN_ID,
      rpcUrl: rpcUrlForChain(MAINNET_CHAIN_ID),
    });
    if (fallback.kind === "error") {
      return {
        kind: "error",
        reason: `public_read_${fallback.reason}`,
        message: fallback.message,
      };
    }
    return {
      kind: "loaded",
      report: buildPublicReadReportFromAddress(name, fallback),
      source: "live",
    };
  }

  const resolved = await tryResolveEns(name);
  if (resolved === null) {
    return { kind: "empty", reason: "ens_not_found" };
  }
  const { ens, chainId: ensChainId } = resolved;

  const hasUpgradeSirenRecords = ens.anyUpgradeSirenRecordPresent;
  if (!hasUpgradeSirenRecords && !options.publicReadIntent) {
    return { kind: "empty", reason: "no_records_no_intent" };
  }

  const mode: "signed-manifest" | "public-read" = hasUpgradeSirenRecords
    ? "signed-manifest"
    : "public-read";

  // Manifest parse (signed-manifest mode only).
  const manifestRaw = ens.records.upgradeManifestRaw;
  const manifestPresent = manifestRaw !== null;
  let manifest: UpgradeManifest | null = null;
  let manifestParseOk = false;
  if (manifestRaw !== null) {
    const parsed = parseUpgradeManifest(manifestRaw);
    if (parsed.kind === "ok") {
      manifest = parsed.value;
      manifestParseOk = true;
    }
  }

  const ownerAddress = parseAddress(ens.records.owner);
  const ownerPresent = ownerAddress !== null;

  // chainId for proxy + Sourcify reads — manifest authoritative when present.
  const proxyChainId = manifest?.chainId ?? ensChainId;
  const proxyAddress: Address | null =
    manifest?.proxy ?? parseAddress(ens.records.proxy);

  // Live implementation slot read (EIP-1967).
  const slotResult =
    proxyAddress !== null
      ? await readImplementationSlot(proxyChainId, proxyAddress, {
          rpcUrl: rpcUrlForChain(proxyChainId),
        })
      : null;
  const liveImplementation: Address | null =
    slotResult?.kind === "ok" ? slotResult.implementation : null;

  // Pick prev + curr implementations: manifest authoritative if present,
  // live-slot otherwise.
  const currentImpl: Address | null =
    manifest?.currentImpl ?? liveImplementation;
  const previousImpl: Address | null = manifest?.previousImpl ?? null;

  // Sourcify metadata + status — runs sequentially in this PR; US-084
  // wraps these in Promise.all for the 5-second perf budget.
  const currentStatusResult =
    currentImpl !== null
      ? await fetchSourcifyStatus(proxyChainId, currentImpl)
      : null;
  const previousStatusResult =
    previousImpl !== null
      ? await fetchSourcifyStatus(proxyChainId, previousImpl)
      : null;

  const currentSourcifyMatch: SourcifyMatchLevel | null =
    currentStatusResult?.kind === "ok"
      ? currentStatusResult.value.match
      : null;
  const previousSourcifyMatch: SourcifyMatchLevel | null =
    previousStatusResult?.kind === "ok"
      ? previousStatusResult.value.match
      : null;

  const currentMetadata = await fetchMetadataIfAddress(proxyChainId, currentImpl);
  const previousMetadata = await fetchMetadataIfAddress(proxyChainId, previousImpl);

  // Diffs — only meaningful when both metadata present.
  const abiDiff: AbiRiskyDiff | null =
    currentMetadata && previousMetadata
      ? diffAbiRiskySelectors(previousMetadata.abi, currentMetadata.abi)
      : null;

  const storageDiff: StorageDiffResult | null =
    currentMetadata && previousMetadata
      ? diffStorageLayout(
          previousMetadata.storageLayout ?? null,
          currentMetadata.storageLayout ?? null,
        )
      : null;

  const sourceFileDiffs: ReadonlyArray<SourceFileDiff> =
    currentMetadata && previousMetadata
      ? diffSourceFiles(previousMetadata, currentMetadata)
      : [];

  // Signature verification — fetch report bytes, hash + recover EIP-712
  // signer, compare against upgrade-siren:owner.
  let signatureVerification: VerifySignatureResult | null = null;
  let signedAt: string | null = null;
  let signatureBytes: `0x${string}` | null = null;
  let signerAddress: Address | null = null;
  if (mode === "signed-manifest" && manifest !== null && ownerAddress !== null) {
    const reportBytes = await fetchReportBytes(manifest.reportUri, options.origin);
    if (reportBytes === null) {
      signatureVerification = {
        valid: false,
        reason: "missing_signature",
        message: `report bytes unavailable from ${manifest.reportUri}`,
      };
    } else {
      const trust = await verifyReportFromManifest(
        manifest,
        reportBytes,
        ownerAddress,
      );
      signatureVerification = reportTrustToVerifyResult(trust);
      if (trust.kind === "ok") {
        signerAddress = trust.signer;
        signedAt = trust.report.auth.signedAt;
        signatureBytes = trust.report.auth.signature;
      }
    }
  }

  // Compute the verdict deterministically from the now-populated inputs.
  const verdictResult = computeVerdict({
    mode,
    mock: false,
    manifestPresent,
    manifestParseOk,
    manifest,
    ownerPresent,
    ownerAddress,
    liveImplementation,
    currentSourcifyMatch,
    previousSourcifyMatch,
    abiDiff,
    storageDiff,
    signatureVerification,
  });

  const sourcifyLinks = [
    previousImpl !== null && previousSourcifyMatch !== "not_found" && previousSourcifyMatch !== null
      ? {
          label: "Sourcify · previous",
          url: `https://sourcify.dev/#/lookup/${previousImpl}`,
        }
      : null,
    currentImpl !== null && currentSourcifyMatch !== "not_found" && currentSourcifyMatch !== null
      ? {
          label: "Sourcify · current",
          url: `https://sourcify.dev/#/lookup/${currentImpl}`,
        }
      : null,
  ].filter((link): link is { label: string; url: string } => link !== null);

  const manifestHash = manifest ? hashManifest(manifest) : null;

  const authStatus: SirenReport["auth"]["status"] =
    signatureVerification === null
      ? "unsigned"
      : signatureVerification.valid
        ? "valid"
        : signatureVerification.reason === "missing_signature"
          ? "unsigned"
          : "invalid";

  const report: SirenReport = {
    schema: "siren-report@1",
    name,
    chainId: proxyChainId,
    proxy: proxyAddress ?? ZERO_ADDRESS,
    previousImplementation: previousImpl,
    currentImplementation: currentImpl ?? ZERO_ADDRESS,
    verdict: verdictResult.verdict,
    summary: verdictResult.summary,
    findings: mapFindings(verdictResult.findings),
    sourcify: {
      previousVerified:
        previousImpl === null
          ? null
          : sourcifyVerifiedFromMatch(previousSourcifyMatch),
      currentVerified: sourcifyVerifiedFromMatch(currentSourcifyMatch),
      links: sourcifyLinks,
    },
    mode,
    confidence: verdictResult.confidence,
    ens: {
      recordsResolvedLive: true,
      manifestHash,
      owner: ownerAddress,
    },
    auth: {
      status: authStatus,
      signatureType: authStatus === "valid" ? "EIP-712" : null,
      signer: signerAddress,
      signature: signatureBytes,
      signedAt,
    },
    recommendedAction: recommendedActionFor(verdictResult.verdict),
    mock: false,
    generatedAt: new Date().toISOString(),
  };

  return {
    kind: "loaded",
    report,
    source: "live",
    abiDiff: abiDiff ?? undefined,
    storageDiff: storageDiff ?? undefined,
    sourceFileDiffs,
  };
}
