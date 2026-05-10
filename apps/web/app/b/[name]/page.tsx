// US-131 — `/b/[name]` route stub. Foundation for Bench Mode UX:
// the banner, source grid, breakdown panel, and per-source drawers
// are filled in by US-132 / US-133 / US-134 / US-135-138.
//
// What this stub renders:
//   • header with subject name + kind chip + Bench sub-tagline
//   • a foundation block exposing tier + score_100 + axis values
//     (the banner contract US-132 replaces)
//   • a foundation block exposing per-source evidence kind + failure
//     summary (the source grid US-133 replaces)
//   • mode chip ("manifest" / "public-read") so judges can see
//     which path the orchestrator took
//
// What this stub does NOT render (deferred):
//   • polished score banner (US-132)
//   • source grid with verified/unverified badges + contributions (US-133)
//   • breakdown panel with × 0.6 trust column (US-134, GATE-30)
//   • per-source drawers (US-135 Sourcify, US-136 GitHub, US-137 OnChain,
//     US-138 ENS)
//
// Sub-tagline placement: per EPIC §18 the "No data, no score." sub-tagline
// appears only on `/b/[name]` surfaces; the master tagline stays on `/`
// and `/r/[name]`.

import type { Metadata } from "next";

import { EnsContractsPanel } from "../../../components/bench/EnsContractsPanel";
import { PassportPanel } from "../../../components/bench/PassportPanel";
import { ScoreBanner } from "../../../components/bench/ScoreBanner";
import { ScoreBreakdownPanel } from "../../../components/bench/ScoreBreakdownPanel";
import { SocialsPanel } from "../../../components/bench/SocialsPanel";
import { SourceGrid } from "../../../components/bench/SourceGrid";
import { TierLadder } from "../../../components/bench/TierLadder";
import { TxAnalyticsPanel } from "../../../components/bench/TxAnalyticsPanel";
import { WalletAnalyticsPanel } from "../../../components/bench/WalletAnalyticsPanel";
import { EnsDrawer } from "../../../components/bench/drawers/EnsDrawer";
import { GitHubDrawer } from "../../../components/bench/drawers/GitHubDrawer";
import { OnchainDrawer } from "../../../components/bench/drawers/OnchainDrawer";
import { SourcifyDrawer } from "../../../components/bench/drawers/SourcifyDrawer";
import { UmiaPermitSectionLoader } from "../../../components/umia/UmiaPermitSectionLoader";
import { UmiaVentureApplySection } from "../../../components/umia/UmiaVentureApplySection";
import { CompareDiffBanner } from "../../../components/compare/CompareDiffBanner";
import { BENCH_SUB_BRAND, BENCH_SUB_TAGLINE } from "../../../lib/branding";
import { isDemoMockSubject } from "../../../lib/demoMocks";
import { loadLatestAttestationForSubject } from "../../../lib/easStore";
import { BenchPublishWidgetLoader as BenchPublishWidget } from "../../../components/bench/BenchPublishWidgetLoader";
import { loadBench, type LoadBenchResult } from "./loadBench";

type PageProps = {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ compare?: string | string[] }>;
};

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { name: rawName } = await props.params;
  const name = decodeURIComponent(rawName);
  return {
    title: `${BENCH_SUB_BRAND} — ${name}`,
  };
}

const KIND_LABEL: Record<string, string> = {
  "ai-agent": "ai-agent",
  "human-team": "human-team",
  project: "project",
};

function kindChipText(kind: string | null): string {
  if (kind === null) return "subject";
  return KIND_LABEL[kind] ?? kind;
}

function modeChipText(mode: "manifest" | "public-read"): string {
  return mode === "manifest" ? "signed manifest" : "public-read";
}

export default async function BenchPage(
  props: PageProps,
): Promise<React.JSX.Element> {
  const { name: rawName } = await props.params;
  const search = await props.searchParams;
  const compareUidRaw = Array.isArray(search.compare)
    ? search.compare[0]
    : search.compare;
  const compareUid =
    typeof compareUidRaw === "string" && /^0x[a-fA-F0-9]{64}$/.test(compareUidRaw)
      ? (compareUidRaw as `0x${string}`)
      : null;
  const name = decodeURIComponent(rawName);
  const result: LoadBenchResult = await loadBench(name);
  const isMockedDemo = isDemoMockSubject(name);
  const easBundle = await loadLatestAttestationForSubject(name).catch(
    () => null,
  );
  const subjectAddress =
    result.kind === "loaded"
      ? (result.evidence.subject.primaryAddress as `0x${string}` | null)
      : null;
  // Live score/tier piped to the publish widget so self-attest mode
  // (no Turso row) carries the same values the page renders, not the
  // placeholder score=0/tier="U".
  const liveScore = result.kind === "loaded" ? result.score.score_100 : null;
  const liveTier = result.kind === "loaded" ? result.score.tier : null;

  return (
    <main
      className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-12"
      data-route="bench"
      data-mock-demo={isMockedDemo ? "true" : "false"}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-t2">
            {BENCH_SUB_BRAND}
          </span>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-t1 md:text-4xl">
            {name}
          </h1>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-verdict-siren">
            {BENCH_SUB_TAGLINE}
          </p>
        </div>
        <BenchPublishWidget
          subjectName={name}
          subjectAddress={subjectAddress}
          easBundle={easBundle}
          liveScore={liveScore}
          liveTier={liveTier}
          liveComputedAt={null}
        />
      </header>

      {compareUid !== null && result.kind === "loaded" ? (
        <CompareDiffBanner
          uid={compareUid}
          evidence={result.evidence}
          score={result.score}
        />
      ) : null}

      {isMockedDemo ? (
        <section
          aria-label="Booth demo notice"
          data-section="booth-demo-notice"
          className="flex flex-wrap items-center justify-between gap-3 border border-dashed border-tier-c bg-bg px-4 py-3"
        >
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-tier-c">
              Booth demo · curated snapshot
            </span>
            <span className="text-sm text-t2">
              Score below is a tuned booth fixture so the predicted tier
              on the landing tile matches what you see here. Live four-source
              orchestration runs for any other ENS name you type in.
            </span>
          </div>
        </section>
      ) : null}

      {result.kind === "error" ? (
        <section
          aria-label="Bench Mode error"
          data-section="bench-error"
          className="rounded-md border border-verdict-siren bg-raised p-4"
        >
          <h2 className="font-display text-lg font-semibold text-verdict-siren">
            Bench evaluation failed
          </h2>
          <p className="text-sm text-t2">
            <span className="font-mono">{result.reason}</span> — {result.message}
          </p>
        </section>
      ) : (
        <BenchFoundation result={result} />
      )}
    </main>
  );
}

// Foundation rendering — extracted into its own component so US-132 /
// US-133 / US-134 PRs can swap pieces of it without touching the page
// scaffolding. Marked `data-foundation` so Playwright (US-125-127) can
// assert presence of the foundation surface in this US-131 PR and the
// banner/grid surfaces in subsequent PRs.
function BenchFoundation({
  result,
}: {
  result: { kind: "loaded" } & {
    evidence: import("@upgrade-siren/evidence").MultiSourceEvidence;
    score: import("@upgrade-siren/evidence").ScoreResult;
    engines: ReadonlyArray<import("@upgrade-siren/evidence").EngineContribution>;
  };
}): React.JSX.Element {
  const { evidence, score, engines } = result;
  const subject = evidence.subject;

  return (
    <>
      <div
        data-row="subject-and-ladder"
        className="grid items-start gap-4 lg:grid-cols-[1fr_minmax(240px,320px)]"
      >
        <section
          aria-label="Subject identity"
          data-section="subject"
          className="flex flex-wrap items-center gap-2 text-sm"
        >
          <span
            data-chip="kind"
            className="rounded border border-t1 px-2 py-0.5 font-mono text-xs uppercase tracking-[0.18em]"
          >
            {kindChipText(subject.kind)}
          </span>
          <span
            data-chip="mode"
            className="rounded border border-t1 px-2 py-0.5 font-mono text-xs uppercase tracking-[0.18em]"
          >
            {modeChipText(subject.mode)}
          </span>
        </section>
        <TierLadder currentTier={score.tier as "S" | "A" | "B" | "C" | "D" | "U"} />
      </div>

      <ScoreBanner score={score} />

      <SourceGrid evidence={evidence} />

      <EnsContractsPanel evidence={evidence} />

      <ScoreBreakdownPanel score={score} engines={engines} />

      <WalletAnalyticsPanel evidence={evidence} />

      <PassportPanel evidence={evidence} />

      <TxAnalyticsPanel evidence={evidence} />

      <SocialsPanel evidence={evidence} engines={engines} />

      {evidence.failures.length > 0 ? (
        <p
          data-field="failure-count"
          className="text-xs text-verdict-review"
        >
          {evidence.failures.length} per-source failure
          {evidence.failures.length === 1 ? "" : "s"} — see source drawers
          for details.
        </p>
      ) : null}

      <SourcifyDrawer
        entries={evidence.sourcify}
        etherscanFallback={evidence.etherscanFallback}
        primaryAddress={evidence.subject.primaryAddress}
      />

      <GitHubDrawer github={evidence.github} />

      <OnchainDrawer entries={evidence.onchain} />

      <EnsDrawer
        subjectName={evidence.subject.name}
        ens={evidence.ensInternal}
      />

      <UmiaVentureApplySection evidence={evidence} score={score} />

      <UmiaPermitSectionLoader subjectName={evidence.subject.name} />
    </>
  );
}
