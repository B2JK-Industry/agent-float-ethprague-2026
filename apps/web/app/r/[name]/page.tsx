import type { Metadata } from "next";
import Link from "next/link";

import { EmptyStateNoRecords } from "../../../components/EmptyStateNoRecords";
import { EvidenceDrawer } from "../../../components/EvidenceDrawer";
import { GovernanceComment } from "../../../components/GovernanceComment";
import { ImplementationComparison } from "../../../components/ImplementationComparison";
import {
  LoadingChecklist,
  type ChecklistStep,
} from "../../../components/LoadingChecklist";
import { VerdictCard } from "../../../components/VerdictCard";

import {
  FIXTURE_REPORTS,
  SUBNAME_TO_FIXTURE,
  publicReadFixture,
} from "./fixtures";

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
  return `/r/${encodeURIComponent(name)}.json`;
}

export default async function VerdictResultPage(
  props: VerdictPageParams,
): Promise<React.JSX.Element> {
  const { name: rawName } = await props.params;
  const search = await props.searchParams;
  const name = decodeURIComponent(rawName);
  const modeParam = Array.isArray(search.mode) ? search.mode[0] : search.mode;
  const isPublicReadIntent = modeParam === "public-read";

  const fixtureKey = SUBNAME_TO_FIXTURE[name];
  const report: SirenReport | null = fixtureKey
    ? FIXTURE_REPORTS[fixtureKey]
    : isPublicReadIntent
      ? publicReadFixture(name)
      : null;

  if (report === null) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-16">
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
        <EmptyStateNoRecords name={name} />
      </main>
    );
  }

  const steps = loadingStepsFor(report);
  const abiSummary = abiSummaryFor(report);
  const storageSummary = storageSummaryFor(report);
  const reportUrl = reportUrlFor(name);

  return (
    <main
      className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12"
      data-page="verdict-result"
    >
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

      <VerdictCard
        verdict={report.verdict}
        name={report.name}
        proxy={report.proxy}
        summary={report.summary}
        auth={report.auth}
        mode={report.mode}
        mock={report.mock}
      />

      <section aria-label="Loading evidence" className="rounded-md border border-border bg-raised p-4">
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
    </main>
  );
}
