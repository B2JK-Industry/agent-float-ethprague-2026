import type { Metadata } from "next";
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
import { VerdictCard } from "../../../components/VerdictCard";

import { loadReport } from "./loadReport";

import type { SirenReport } from "@upgrade-siren/shared";

export const metadata: Metadata = {
  title: "Verdict — Upgrade Siren",
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

function abiSummaryFor(report: SirenReport): {
  selectorCount: number;
  riskyAddedCount: number;
} {
  const riskyAdded = report.findings.filter((f) =>
    /selector|sweep|admin/i.test(f.title),
  ).length;
  return {
    selectorCount: 12 + riskyAdded,
    riskyAddedCount: riskyAdded,
  };
}

function storageSummaryFor(report: SirenReport): {
  tag: "compatible" | "incompatible" | "unknown";
  label: string;
} {
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

function reportUrlFor(name: string): string {
  // Served by `apps/web/app/r/[name]/report.json/route.ts` so the link returns
  // a real SirenReport JSON payload, not the dynamic-route HTML page that a
  // bare `.json` suffix on `/r/[name]` would resolve to.
  return `/r/${encodeURIComponent(name)}/report.json`;
}

function HeaderNav(): React.JSX.Element {
  return (
    <header className="flex items-center justify-between">
      <Link
        href="/"
        className="font-mono text-xs uppercase tracking-[0.18em] text-t2 hover:text-t1"
      >
        ← Upgrade Siren
      </Link>
      <Link
        href="/demo"
        className="font-mono text-xs uppercase tracking-[0.18em] text-t2 hover:text-t1"
      >
        Booth demo →
      </Link>
    </header>
  );
}

function PendingFallback(): React.JSX.Element {
  return (
    <section
      aria-label="Loading evidence"
      data-state="loading"
      className="rounded-md border border-border bg-raised p-4"
    >
      <LoadingChecklist steps={pendingChecklist()} />
    </section>
  );
}

async function VerdictResultBody({
  name,
  mockMode,
  publicReadIntent,
}: {
  name: string;
  mockMode: boolean;
  publicReadIntent: boolean;
}): Promise<React.JSX.Element> {
  const result = await loadReport(name, { mockMode, publicReadIntent });

  if (result.kind === "empty" || result.kind === "error") {
    return <EmptyStateNoRecords name={name} />;
  }

  const { report, source } = result;
  const steps = loadingStepsFor(report);
  const abiSummary = abiSummaryFor(report);
  const storageSummary = storageSummaryFor(report);
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
        className="rounded-md border border-border bg-raised p-4"
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
          reportUrl={reportUrl}
        />
        <Link
          href="/demo"
          className="rounded border border-t1 px-3 py-1 font-mono text-xs uppercase tracking-wider text-t1 hover:bg-bg"
        >
          Pick another scenario
        </Link>
      </div>

      <section
        aria-label="Governance comment"
        className="rounded-md border border-border bg-raised p-6"
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
  const publicReadIntent = modeParam === "public-read";
  const mockMode = mockParam === "true" || mockParam === "1";

  return (
    <main
      className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12"
      data-page="verdict-result"
      data-mode={mockMode ? "mock" : publicReadIntent ? "public-read" : "live"}
    >
      <HeaderNav />
      <Suspense fallback={<PendingFallback />}>
        <VerdictResultBody
          name={name}
          mockMode={mockMode}
          publicReadIntent={publicReadIntent}
        />
      </Suspense>
    </main>
  );
}
