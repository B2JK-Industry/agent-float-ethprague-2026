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
   * (e.g. `/cache/<chainId>/<address>.json`, `/reports/<X>.json`) into
   * absolute URLs that `fetch` accepts on the server. When the route
   * handler / page has access to the origin, pass it through; otherwise
   * we fall back to relative-only fetches (which only resolve on the
   * client, not on the server).
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
  // US-084: Sepolia + mainnet ENS resolution runs in parallel. The previous
  // sequential shape ("Sepolia first, mainnet only if Sepolia returns no
  // records") cost up to 2 round trips for mainnet-only names — pushing
  // dangerous + unverified well past the 5000ms budget. Running both
  // concurrently costs one extra RPC call per name (the Sepolia miss for
  // mainnet names) but keeps the wall-clock to a single round trip.
  // Selection priority is unchanged: Sepolia + upgrade-siren records →
  // mainnet → Sepolia (no records) → null.
  const [sepolia, mainnet] = await Promise.all([
    resolveEnsRecords(name, {
      chainId: SEPOLIA_CHAIN_ID,
      rpcUrl: rpcUrlForChain(SEPOLIA_CHAIN_ID),
    }),
    resolveEnsRecords(name, {
      chainId: MAINNET_CHAIN_ID,
      rpcUrl: rpcUrlForChain(MAINNET_CHAIN_ID),
    }),
  ]);

  if (sepolia.kind === "ok" && sepolia.anyUpgradeSirenRecordPresent) {
    return { ens: sepolia, chainId: SEPOLIA_CHAIN_ID };
  }
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

// US-084: prewarmed cache lookup. When NEXT_PUBLIC_BOOTH_FALLBACK=1 (or the
// server-side BOOTH_FALLBACK=1 mirror), prefer cached Sourcify + EIP-1967
// data fetched offline by `scripts/booth/prewarm-cache.ts` over live RPC /
// Sourcify round trips. Cache files live at
//   apps/web/public/cache/<chainId>/<address>.json
// and are static-served by Next.js.
type PrewarmCacheEntry = {
  readonly fetchedAt: string;
  readonly sourcify: { readonly match?: SourcifyMatchLevel | "not_found" } | null;
  readonly manifestRaw: string | null;
  readonly eip1967Slot: string | null;
  readonly ensName?: string | null;
};

function isBoothFallbackEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_BOOTH_FALLBACK === "1" ||
    process.env.BOOTH_FALLBACK === "1"
  );
}

async function readPrewarmedCacheEntry(
  origin: string | undefined,
  chainId: number,
  address: Address,
): Promise<PrewarmCacheEntry | null> {
  if (!isBoothFallbackEnabled()) return null;
  const path = `/cache/${chainId}/${address.toLowerCase()}.json`;
  const url = origin ? `${origin}${path}` : path;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as PrewarmCacheEntry;
  } catch {
    return null;
  }
}

function cachedSlotImplementation(
  entry: PrewarmCacheEntry,
): Address | null {
  const slot = entry.eip1967Slot;
  if (!slot || slot.length < 42) return null;
  // Last 20 bytes (40 hex chars) of the 32-byte slot value.
  const tail = slot.slice(-40).toLowerCase();
  if (/^0+$/.test(tail)) return null;
  return (`0x${tail}`) as Address;
}

function cachedSourcifyMatch(
  entry: PrewarmCacheEntry,
): SourcifyMatchLevel | null {
  const m = entry.sourcify?.match;
  if (m === "exact_match" || m === "match" || m === "not_found") return m;
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

  // US-084 ⊕ US-081: parallelize EIP-1967 slot + 2× Sourcify status +
  // 2× Sourcify metadata + report-bytes fetch. When the manifest is
  // present, currentImpl + previousImpl are known up front, so the
  // entire fetch fan-out runs as a single Promise.all batch — landing
  // in roughly one round trip vs. the previous sequential ~5–10s.
  //
  // Cache-first short circuit when NEXT_PUBLIC_BOOTH_FALLBACK=1: read
  // the prewarmed cache for the proxy address; if the entry is fresh
  // enough for booth use, skip the EIP-1967 round trip. Sourcify status
  // still needs the manifest-declared or slot-derived current/previous
  // impls, which the manifest provides in signed-manifest mode.
  const proxyCacheEntry =
    proxyAddress !== null
      ? await readPrewarmedCacheEntry(options.origin, proxyChainId, proxyAddress)
      : null;

  const slotPromise: Promise<Address | null> =
    proxyAddress === null
      ? Promise.resolve(null)
      : proxyCacheEntry !== null
        ? Promise.resolve(cachedSlotImplementation(proxyCacheEntry))
        : readImplementationSlot(proxyChainId, proxyAddress, {
            rpcUrl: rpcUrlForChain(proxyChainId),
          }).then((slot) =>
            slot.kind === "ok" ? slot.implementation : null,
          );

  // Manifest is authoritative for currentImpl / previousImpl. When manifest
  // is absent (public-read mode), currentImpl falls back to the live slot —
  // the Sourcify + metadata fetches for that address are therefore deferred
  // until the slot resolves.
  const currentImplFromManifest: Address | null = manifest?.currentImpl ?? null;
  const previousImpl: Address | null = manifest?.previousImpl ?? null;

  // Status-fetch helpers honour the prewarmed cache too: cache hit returns
  // the cached match; cache miss runs the live Sourcify status fetch.
  const fetchStatusOrCache = async (
    addr: Address | null,
  ): Promise<SourcifyMatchLevel | null> => {
    if (addr === null) return null;
    const cached = await readPrewarmedCacheEntry(options.origin, proxyChainId, addr);
    if (cached !== null) {
      const m = cachedSourcifyMatch(cached);
      if (m !== null) return m;
    }
    const r = await fetchSourcifyStatus(proxyChainId, addr);
    return r.kind === "ok" ? r.value.match : null;
  };

  // Report-bytes prefetch: only fires when manifest is present (signed mode).
  // Independent of all other fetches, so joins the same Promise.all batch.
  const reportBytesPromise: Promise<Uint8Array | null> =
    mode === "signed-manifest" && manifest !== null
      ? fetchReportBytes(manifest.reportUri, options.origin)
      : Promise.resolve(null);

  // Six independent reads in parallel: slot + 2× sourcify status + 2× sourcify
  // metadata + report bytes.
  const [
    liveImplementation,
    currentManifestStatus,
    previousStatus,
    currentMetadataFromManifest,
    previousMetadata,
    reportBytes,
  ] = await Promise.all([
    slotPromise,
    fetchStatusOrCache(currentImplFromManifest),
    fetchStatusOrCache(previousImpl),
    fetchMetadataIfAddress(proxyChainId, currentImplFromManifest),
    fetchMetadataIfAddress(proxyChainId, previousImpl),
    reportBytesPromise,
  ]);

  const currentImpl: Address | null =
    currentImplFromManifest ?? liveImplementation;

  // Public-read fallback path: manifest didn't declare currentImpl, so the
  // slot read produced it now — do the deferred Sourcify status + metadata
  // fetches sequentially. Cache-aware; usually a no-op for signed-manifest.
  const currentSourcifyMatch: SourcifyMatchLevel | null =
    currentManifestStatus !== null || currentImpl === null
      ? currentManifestStatus
      : await fetchStatusOrCache(currentImpl);

  const previousSourcifyMatch: SourcifyMatchLevel | null = previousStatus;

  const currentMetadata: SourcifyMetadata | null =
    currentMetadataFromManifest ??
    (currentImpl !== null && currentImplFromManifest === null
      ? await fetchMetadataIfAddress(proxyChainId, currentImpl)
      : null);

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

  // Signature verification — uses the now-prefetched report bytes.
  let signatureVerification: VerifySignatureResult | null = null;
  let signedAt: string | null = null;
  let signatureBytes: `0x${string}` | null = null;
  let signerAddress: Address | null = null;
  if (mode === "signed-manifest" && manifest !== null && ownerAddress !== null) {
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
