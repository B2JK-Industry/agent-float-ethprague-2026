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

import { ScoreBanner } from "../../../components/bench/ScoreBanner";
import { GitHubDrawer } from "../../../components/bench/drawers/GitHubDrawer";
import { BENCH_SUB_BRAND, BENCH_SUB_TAGLINE } from "../../../lib/branding";
import { loadBench, type LoadBenchResult } from "./loadBench";

type PageProps = {
  params: Promise<{ name: string }>;
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
  const name = decodeURIComponent(rawName);
  const result: LoadBenchResult = await loadBench(name);

  return (
    <main
      className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-12"
      data-route="bench"
    >
      <header className="flex flex-col gap-2">
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-t2">
          {BENCH_SUB_BRAND}
        </span>
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-t1 md:text-4xl">
          {name}
        </h1>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-verdict-siren">
          {BENCH_SUB_TAGLINE}
        </p>
      </header>

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
  };
}): React.JSX.Element {
  const { evidence, score } = result;
  const subject = evidence.subject;

  return (
    <>
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

      <ScoreBanner score={score} />

      <section
        aria-label="Source evidence foundation"
        data-section="source-foundation"
        data-foundation="grid"
        className="rounded-md border border-border bg-raised p-6"
      >
        <h2 className="font-display text-lg font-semibold text-t1">
          Sources
        </h2>
        <ul className="mt-3 flex flex-col gap-2 font-mono text-sm">
          <li data-source="sourcify">
            sourcify · {evidence.sourcify.length} entr
            {evidence.sourcify.length === 1 ? "y" : "ies"}
          </li>
          <li data-source="github">github · {evidence.github.kind}</li>
          <li data-source="onchain">
            onchain · {evidence.onchain.length} chain
            {evidence.onchain.length === 1 ? "" : "s"}
          </li>
          <li data-source="ens-internal">
            ens-internal · {evidence.ensInternal.kind}
          </li>
        </ul>
        {evidence.failures.length > 0 ? (
          <p
            data-field="failure-count"
            className="mt-3 text-xs text-verdict-review"
          >
            {evidence.failures.length} per-source failure
            {evidence.failures.length === 1 ? "" : "s"} — Sourcify drawer
            (US-135), on-chain drawer (US-137), ENS drawer (US-138)
            surface details when those PRs land.
          </p>
        ) : null}
      </section>

      <GitHubDrawer github={evidence.github} />
    </>
  );
}
