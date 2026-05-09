// US-068 — Live verdict pipeline. Bridges the Stream B `@upgrade-siren/evidence`
// engine to the `/r/[name]` route's `<VerdictCard>` rendering surface.
//
// Modes:
//   ?mock=true            → render the FIXTURE_REPORTS entry for the name
//                           (booth fallback; explicit user opt-in).
//   default (signed)      → ENS resolves with `upgrade-siren:*` records →
//                           signed-manifest path: parseUpgradeManifest +
//                           readImplementationSlot + fetchSourcifyStatus +
//                           computeVerdict.
//   ?mode=public-read     → caller intent is public-read; same chain reads
//                           but mode is forced to "public-read" so the
//                           verdict caps at REVIEW.
//   ENS resolves, no records, no public-read intent → empty state caller.
//   ENS does not resolve → empty state caller.
//
// All fetches happen on the server (this module is imported only from
// `page.tsx` and `report.json/route.ts`, both server-only). RPC URLs come
// from env vars set on Vercel: `ALCHEMY_RPC_SEPOLIA`, `ALCHEMY_RPC_MAINNET`,
// `ENS_RPC_URL`. Sepolia is tried first because the demo subnames
// (`*.upgrade-siren-demo.eth`) live there per `contracts/DEPLOYMENTS.md`.
//
// Out of scope for this PR (Stream B follow-up):
//   * Fetching the report JSON from `manifest.reportUri` and verifying its
//     EIP-712 signature with `verifyReportSignature` — done here would make
//     every demo lookup go through `https://upgradesiren.app/r/<n>.json`,
//     which is not yet deployed. We pass `signatureVerification: null` and
//     let `computeVerdict` handle missing-signature per the rule table
//     (SIREN in signed-manifest mode without a verified signature).
//   * Full ABI / storage diff — requires fetching both implementation
//     metadata via `fetchSourcifyMetadata`. Engine accepts `null` for those
//     and skips the corresponding findings. Stream C ships the renderers
//     in US-046/US-047 already; full pipeline wiring is future work.

import {
  computeVerdict,
  fetchSourcifyStatus,
  hashManifest,
  parseUpgradeManifest,
  readImplementationSlot,
  resolveEnsRecords,
  type ComputeVerdictResult,
  type EnsResolutionOk,
  type EnsResolutionResult,
  type SourcifyMatchLevel,
  type UpgradeManifest,
  type Verdict as EngineVerdict,
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

export type LoadReportOptions = {
  readonly mockMode: boolean;
  readonly publicReadIntent: boolean;
};

export type LoadReportResult =
  | { readonly kind: "loaded"; readonly report: SirenReport; readonly source: "fixture" | "live" }
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

export async function loadReport(
  name: string,
  options: LoadReportOptions,
): Promise<LoadReportResult> {
  if (options.mockMode) {
    const { report } = loadFixture(name);
    return { kind: "loaded", report, source: "fixture" };
  }

  const resolved = await tryResolveEns(name);
  if (resolved === null) {
    return { kind: "empty", reason: "ens_not_found" };
  }
  const { ens, chainId: ensChainId } = resolved;

  const hasUpgradeSirenRecords = ens.anyUpgradeSirenRecordPresent;
  if (!hasUpgradeSirenRecords && !options.publicReadIntent) {
    // ENS resolves but has no upgrade-siren records and the caller did not
    // ask for public-read fallback explicitly. The caller renders an empty
    // state with a public-read CTA.
    return { kind: "empty", reason: "no_records_no_intent" };
  }

  const mode: "signed-manifest" | "public-read" = hasUpgradeSirenRecords
    ? "signed-manifest"
    : "public-read";

  // Manifest parse (signed-manifest mode only)
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

  // chainId for proxy + Sourcify reads — manifest authoritative when present,
  // otherwise the ENS resolution chain.
  const proxyChainId = manifest?.chainId ?? ensChainId;
  const proxyAddress: Address | null =
    manifest?.proxy ?? parseAddress(ens.records.proxy);

  // Live implementation slot read (EIP-1967).
  let liveImplementation: Address | null = null;
  if (proxyAddress !== null) {
    const slot = await readImplementationSlot(proxyChainId, proxyAddress, {
      rpcUrl: rpcUrlForChain(proxyChainId),
    });
    if (slot.kind === "ok") {
      liveImplementation = slot.implementation;
    }
  }

  // Sourcify status for current + previous (manifest-declared or live-derived).
  const currentImpl: Address | null =
    manifest?.currentImpl ?? liveImplementation;
  const previousImpl: Address | null = manifest?.previousImpl ?? null;

  let currentSourcifyMatch: SourcifyMatchLevel | null = null;
  if (currentImpl !== null) {
    const r = await fetchSourcifyStatus(proxyChainId, currentImpl);
    if (r.kind === "ok") currentSourcifyMatch = r.value.match;
  }

  let previousSourcifyMatch: SourcifyMatchLevel | null = null;
  if (previousImpl !== null) {
    const r = await fetchSourcifyStatus(proxyChainId, previousImpl);
    if (r.kind === "ok") previousSourcifyMatch = r.value.match;
  }

  // Compute the verdict deterministically from what we have.
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
    abiDiff: null,
    storageDiff: null,
    // signature verification deferred — see header note. Engine handles
    // null in signed-manifest mode by emitting SIGNATURE_MISSING.
    signatureVerification: null,
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
      // Signature path is not wired in this PR — the report bytes that the
      // signature would attest live behind `manifest.reportUri`, which is not
      // yet hosted. The engine has already accounted for this by emitting a
      // SIGNATURE_MISSING finding; we mirror that in the auth field so the
      // rendered SignatureStatusBadge says "no operator signature" rather
      // than fabricating a state.
      status: "unsigned",
      signatureType: null,
      signer: null,
      signature: null,
      signedAt: null,
    },
    recommendedAction: recommendedActionFor(verdictResult.verdict),
    mock: false,
    generatedAt: new Date().toISOString(),
  };

  return { kind: "loaded", report, source: "live" };
}
