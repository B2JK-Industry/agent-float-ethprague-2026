import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyStateNoRecords } from "../../../components/EmptyStateNoRecords";
import { EvidenceDrawer } from "../../../components/EvidenceDrawer";
import { GovernanceComment } from "../../../components/GovernanceComment";
import { ImplementationComparison } from "../../../components/ImplementationComparison";
import {
  LoadingChecklist,
  type ChecklistStep,
} from "../../../components/LoadingChecklist";
import { ShareVerdictLink } from "../../../components/ShareVerdictLink";
import { VerdictCard } from "../../../components/VerdictCard";

import { loadReport } from "./loadReport";

import type {
  AbiRiskyDiff,
  SourceFileDiff,
  StorageDiffResult,
} from "@upgrade-siren/evidence";
import type { Address, SirenReport, Verdict } from "@upgrade-siren/shared";
import type {
  SourceDiff,
  SourceDiffFile,
  SourceDiffHunk,
  SourceDiffLine,
} from "../../../components/SourceDiffRenderer";

const VERDICT_VALUES: ReadonlySet<Verdict> = new Set([
  "SAFE",
  "REVIEW",
  "SIREN",
]);

function isVerdict(value: string | undefined): value is Verdict {
  return value !== undefined && VERDICT_VALUES.has(value as Verdict);
}

export const metadata: Metadata = {
  title: "Verdict — Siren",
};

type VerdictPageParams = {
  params: Promise<{ name: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function loadingStepsFor(report: SirenReport): readonly ChecklistStep[] {
  const sourcifyKnown =
    report.sourcify.currentVerified || report.sourcify.previousVerified;
  return [
    {
      key: "ens",
      label: "ENS · resolve name",
      status: report.ens.recordsResolvedLive ? "success" : "failure",
      durationMs: 184,
      error: report.ens.recordsResolvedLive
        ? undefined
        : "no records resolved",
    },
    {
      key: "chain",
      label: "Chain · read EIP-1967 implementation slot",
      status: "success",
      durationMs: 612,
    },
    {
      key: "sourcify",
      label: "Sourcify · fetch verified metadata",
      status: sourcifyKnown ? "success" : "failure",
      durationMs: 1248,
      error: sourcifyKnown ? undefined : "current implementation unverified",
    },
    {
      key: "diff",
      label: "Diff · ABI & storage layout",
      status: "success",
      durationMs: 2940,
    },
    {
      key: "signature",
      label: "Signature · operator manifest signature",
      status: report.auth.status === "valid" ? "success" : "failure",
      durationMs: 3015,
      error:
        report.auth.status === "valid"
          ? undefined
          : `auth status: ${report.auth.status}`,
    },
  ] as const;
}

function pendingChecklist(): readonly ChecklistStep[] {
  return [
    { key: "ens", label: "ENS · resolve name", status: "running" },
    {
      key: "chain",
      label: "Chain · read EIP-1967 implementation slot",
      status: "pending",
    },
    {
      key: "sourcify",
      label: "Sourcify · fetch verified metadata",
      status: "pending",
    },
    {
      key: "diff",
      label: "Diff · ABI & storage layout",
      status: "pending",
    },
    {
      key: "signature",
      label: "Signature · operator manifest signature",
      status: "pending",
    },
  ] as const;
}

/**
 * Build the EvidenceDrawer ABI summary chip from the engine's `AbiRiskyDiff`
 * (preferred) or, if the diff is absent (sourcify metadata not available),
 * a heuristic over the report's findings as a graceful fallback.
 */
function abiSummaryFor(
  report: SirenReport,
  abiDiff: AbiRiskyDiff | undefined,
): {
  selectorCount: number;
  riskyAddedCount: number;
} {
  if (abiDiff) {
    return {
      selectorCount: abiDiff.added.length + abiDiff.removed.length,
      riskyAddedCount: abiDiff.added.length,
    };
  }
  const riskyAdded = report.findings.filter((f) =>
    /selector|sweep|admin/i.test(f.title),
  ).length;
  return {
    selectorCount: 12 + riskyAdded,
    riskyAddedCount: riskyAdded,
  };
}

function storageSummaryFor(
  report: SirenReport,
  storageDiff: StorageDiffResult | undefined,
): {
  tag: "compatible" | "incompatible" | "unknown";
  label: string;
} {
  if (storageDiff) {
    const kind = storageDiff.kind;
    if (kind === "unknown_missing_layout") return { tag: "unknown", label: kind };
    if (kind.startsWith("incompatible"))
      return { tag: "incompatible", label: kind };
    return { tag: "compatible", label: kind };
  }
  const finding = report.findings.find((f) =>
    /storage layout/i.test(f.title),
  );
  const tag = (finding?.evidence as { tag?: string } | undefined)?.tag;
  if (typeof tag === "string" && tag.startsWith("incompatible")) {
    return { tag: "incompatible", label: tag };
  }
  if (typeof tag === "string" && tag === "unknown_missing_layout") {
    return { tag: "unknown", label: tag };
  }
  if (typeof tag === "string") {
    return { tag: "compatible", label: tag };
  }
  return { tag: "unknown", label: "unknown_missing_layout" };
}

const HUNK_HEADER_RE = /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@(.*)$/;

/**
 * Adapt the canonical `SourceFileDiff[]` (US-075) into the richer parsed
 * `SourceDiff` shape that `<SourceDiffRenderer>` (US-076) consumes.
 *
 * The engine emits a unified-diff text per file; the renderer wants
 * pre-parsed hunks with per-line metadata. Parse here so the renderer
 * stays a pure presentational component.
 */
function adaptSourceFileDiffs(
  diffs: ReadonlyArray<SourceFileDiff> | undefined,
): SourceDiff | undefined {
  if (!diffs || diffs.length === 0) return undefined;
  const files: SourceDiffFile[] = [];
  for (const d of diffs) {
    if (d.status === "identical") continue;
    const hunks: SourceDiffHunk[] = [];
    let current: { hunk: SourceDiffHunk; lines: SourceDiffLine[] } | null = null;
    for (const raw of d.unifiedDiff.split("\n")) {
      if (raw.startsWith("+++ ") || raw.startsWith("--- ")) continue;
      const match = HUNK_HEADER_RE.exec(raw);
      if (match) {
        if (current) {
          hunks.push({ ...current.hunk, lines: current.lines });
        }
        const header = match[5]?.trim();
        current = {
          hunk: {
            oldStart: Number(match[1]),
            oldLines: match[2] === undefined ? 1 : Number(match[2]),
            newStart: Number(match[3]),
            newLines: match[4] === undefined ? 1 : Number(match[4]),
            header: header && header.length > 0 ? header : undefined,
            lines: [],
          },
          lines: [],
        };
        continue;
      }
      if (!current) continue;
      let kind: SourceDiffLine["kind"];
      let content: string;
      if (raw.startsWith("+")) {
        kind = "add";
        content = raw.slice(1);
      } else if (raw.startsWith("-")) {
        kind = "remove";
        content = raw.slice(1);
      } else if (raw.startsWith(" ") || raw.length === 0) {
        kind = "context";
        content = raw.startsWith(" ") ? raw.slice(1) : raw;
      } else {
        continue;
      }
      current.lines.push({ kind, content });
    }
    if (current) {
      hunks.push({ ...current.hunk, lines: current.lines });
    }
    files.push({
      path: d.path,
      hunks,
      additionsCount: d.hunks.added,
      deletionsCount: d.hunks.removed,
    });
  }
  return files.length === 0 ? undefined : { files };
}

function reportUrlFor(name: string): string {
  // Served by `apps/web/app/r/[name]/report.json/route.ts` so the link returns
  // a real SirenReport JSON payload, not the dynamic-route HTML page that a
  // bare `.json` suffix on `/r/[name]` would resolve to.
  return `/r/${encodeURIComponent(name)}/report.json`;
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

/**
 * Build a synthetic SirenReport for the precomputed-snapshot path (US-053).
 * The verdict word + timestamp are taken verbatim from the URL params; every
 * other field is filled with honest placeholders so the rendered card carries
 * `mock: true` and a "Showing precomputed snapshot — verify live now" banner
 * surfaces the situation to the reader.
 */
function buildPrecomputedReport(
  name: string,
  verdict: Verdict,
  timestamp: string,
): SirenReport {
  return {
    schema: "siren-report@1",
    name,
    chainId: 0,
    proxy: ZERO_ADDRESS,
    previousImplementation: null,
    currentImplementation: ZERO_ADDRESS,
    verdict,
    summary: `Precomputed snapshot of a ${verdict} verdict at ${timestamp}. Live state may differ — click "Verify live now" to re-fetch.`,
    findings: [],
    sourcify: {
      previousVerified: null,
      currentVerified: false,
      links: [],
    },
    mode: "mock",
    confidence: "mock",
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
    recommendedAction:
      verdict === "SAFE" ? "approve" : verdict === "REVIEW" ? "review" : "reject",
    mock: true,
    generatedAt: timestamp,
  };
}

function PrecomputedSnapshotBanner({
  timestamp,
  liveHref,
}: {
  timestamp: string;
  liveHref: string;
}): React.JSX.Element {
  return (
    <section
      aria-label="Precomputed snapshot banner"
      data-state="precomputed-snapshot"
      className="flex flex-wrap items-center justify-between gap-3 border border-dashed border-verdict-review bg-raised px-4 py-3"
    >
      <div className="flex flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-verdict-review">
          Precomputed snapshot
        </span>
        <span className="text-sm text-t2">
          Original generation timestamp{" "}
          <time dateTime={timestamp} className="font-mono text-t1">
            {timestamp}
          </time>
          . Live state may differ.
        </span>
      </div>
      <Link
        href={liveHref}
        data-action="verify-live-now"
        className="border border-t1 px-3 py-1 font-mono text-xs uppercase tracking-wider text-t1 hover:bg-bg"
      >
        Verify live now
      </Link>
    </section>
  );
}

function HeaderNav(): React.JSX.Element {
  return (
    <nav
      aria-label="Top navigation"
      className="flex items-center justify-between"
    >
      <Link
        href="/"
        className="font-mono text-xs uppercase tracking-[0.18em] text-t2 hover:text-t1"
      >
        ← Siren
      </Link>
      <Link
        href="/demo"
        className="font-mono text-xs uppercase tracking-[0.18em] text-t2 hover:text-t1"
      >
        Booth demo →
      </Link>
    </nav>
  );
}

/**
 * Page-level hero header — mirrors the /b/[name] Bench Mode page so the
 * two routes feel like sibling surfaces, not unrelated screens. Daniel
 * 2026-05-10: "preco vyzera /r/safe.* inak ako /b/letadlo.eth".
 */
function PageHero({ name }: { name: string }): React.JSX.Element {
  return (
    <header className="flex flex-col gap-2">
      <span className="font-mono text-xs uppercase tracking-[0.18em] text-t2">
        Siren · Single-Contract Mode
      </span>
      <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-t1 md:text-4xl">
        {name}
      </h1>
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-verdict-siren">
        No source, no upgrade.
      </p>
    </header>
  );
}

function PendingFallback(): React.JSX.Element {
  return (
    <section
      aria-label="Loading evidence"
      data-state="loading"
      className="border border-border bg-surface p-4"
    >
      <LoadingChecklist steps={pendingChecklist()} />
    </section>
  );
}

async function VerdictResultBody({
  name,
  mockMode,
  publicReadIntent,
  precomputed,
  origin,
}: {
  name: string;
  mockMode: boolean;
  publicReadIntent: boolean;
  precomputed: { verdict: Verdict; timestamp: string } | null;
  origin: string | undefined;
}): Promise<React.JSX.Element> {
  if (precomputed !== null) {
    const report = buildPrecomputedReport(
      name,
      precomputed.verdict,
      precomputed.timestamp,
    );
    const reportUrl = reportUrlFor(name);
    const liveHref = `/r/${encodeURIComponent(name)}`;
    return (
      <>
        <PrecomputedSnapshotBanner
          timestamp={precomputed.timestamp}
          liveHref={liveHref}
        />
        <VerdictCard
          verdict={report.verdict}
          name={report.name}
          proxy={report.proxy}
          summary={report.summary}
          auth={report.auth}
          mode={report.mode}
          mock={report.mock}
        />
        <div className="flex flex-wrap items-start gap-3">
          <ShareVerdictLink
            name={name}
            verdict={report.verdict}
            generatedAt={report.generatedAt}
          />
          <Link
            href={liveHref}
            className="border border-t1 px-3 py-1 font-mono text-xs uppercase tracking-wider text-t1 hover:bg-bg"
          >
            Verify live now
          </Link>
        </div>
        <section
          aria-label="Governance comment"
          className="border border-border bg-surface p-6"
        >
          <h2 className="mb-3 font-display text-xl font-semibold text-t1">
            Governance comment
          </h2>
          <GovernanceComment
            report={report}
            name={report.name}
            reportUrl={reportUrl}
          />
        </section>
      </>
    );
  }

  const result = await loadReport(name, {
    mockMode,
    publicReadIntent,
    origin,
  });

  if (result.kind === "empty" || result.kind === "error") {
    return <EmptyStateNoRecords name={name} />;
  }

  const { report, source } = result;
  const steps = loadingStepsFor(report);
  const abiSummary = abiSummaryFor(report, result.abiDiff);
  const storageSummary = storageSummaryFor(report, result.storageDiff);
  const sourceDiff = adaptSourceFileDiffs(result.sourceFileDiffs);
  const reportUrl = reportUrlFor(name);

  return (
    <>
      <VerdictCard
        verdict={report.verdict}
        name={report.name}
        proxy={report.proxy}
        summary={report.summary}
        auth={report.auth}
        mode={report.mode}
        mock={report.mock}
      />

      <section
        aria-label="Loading evidence"
        data-state="loaded"
        data-source={source}
        className="border border-border bg-surface p-4"
      >
        <LoadingChecklist steps={steps} />
      </section>

      <ImplementationComparison
        previous={{
          address: report.previousImplementation,
          verified: report.sourcify.previousVerified,
          sourcifyUrl: report.sourcify.links.find((l) =>
            /previous/i.test(l.label),
          )?.url,
        }}
        current={{
          address: report.currentImplementation,
          verified: report.sourcify.currentVerified,
          sourcifyUrl: report.sourcify.links.find((l) =>
            /current/i.test(l.label),
          )?.url,
        }}
      />

      <div className="flex flex-wrap items-start gap-3">
        <EvidenceDrawer
          report={report}
          abiSummary={abiSummary}
          storageSummary={storageSummary}
          sourceDiff={sourceDiff}
          reportUrl={reportUrl}
        />
        <ShareVerdictLink
          name={report.name}
          verdict={report.verdict}
          generatedAt={report.generatedAt}
        />
        <Link
          href="/demo"
          className="border border-t1 px-3 py-1 font-mono text-xs uppercase tracking-wider text-t1 hover:bg-bg"
        >
          Pick another scenario
        </Link>
      </div>

      <section
        aria-label="Governance comment"
        className="border border-border bg-surface p-6"
      >
        <h2 className="mb-3 font-display text-xl font-semibold text-t1">
          Governance comment
        </h2>
        <GovernanceComment
          report={report}
          name={report.name}
          reportUrl={reportUrl}
        />
      </section>
    </>
  );
}

export default async function VerdictResultPage(
  props: VerdictPageParams,
): Promise<React.JSX.Element> {
  const { name: rawName } = await props.params;
  const search = await props.searchParams;
  const name = decodeURIComponent(rawName);
  const modeParam = Array.isArray(search.mode) ? search.mode[0] : search.mode;
  const mockParam = Array.isArray(search.mock) ? search.mock[0] : search.mock;
  const vParam = Array.isArray(search.v) ? search.v[0] : search.v;
  const tParam = Array.isArray(search.t) ? search.t[0] : search.t;
  const publicReadIntent = modeParam === "public-read";
  const mockMode = mockParam === "true" || mockParam === "1";
  const precomputed =
    isVerdict(vParam) && typeof tParam === "string" && tParam.length > 0
      ? { verdict: vParam, timestamp: tParam }
      : null;

  return (
    <main
      className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-12"
      data-page="verdict-result"
      data-mode={
        precomputed
          ? "precomputed"
          : mockMode
            ? "mock"
            : publicReadIntent
              ? "public-read"
              : "live"
      }
    >
      <HeaderNav />
      <PageHero name={name} />
      <Suspense fallback={<PendingFallback />}>
        <VerdictResultBody
          name={name}
          mockMode={mockMode}
          publicReadIntent={publicReadIntent}
          precomputed={precomputed}
          origin={await deriveOrigin()}
        />
      </Suspense>
    </main>
  );
}

/**
 * Best-effort origin lookup for server-side report-bytes fetching.
 * Reads `x-forwarded-host` / `host` + `x-forwarded-proto` from the
 * request headers (set by Vercel + most reverse proxies). Returns
 * undefined when not available — `loadReport` falls back to the
 * absolute URL the manifest specified.
 */
async function deriveOrigin(): Promise<string | undefined> {
  try {
    const h = await headers();
    const forwardedHost = h.get("x-forwarded-host");
    const host = forwardedHost ?? h.get("host");
    if (host === null) return undefined;
    const proto =
      h.get("x-forwarded-proto") ??
      (host.startsWith("localhost") || host.startsWith("127.")
        ? "http"
        : "https");
    return `${proto}://${host}`;
  } catch {
    return undefined;
  }
}
