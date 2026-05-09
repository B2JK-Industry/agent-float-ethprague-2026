import Link from "next/link";

import { EnsLookupForm } from "../components/EnsLookupForm";
import { PublicReadInput } from "../components/PublicReadInput";
import { DEMO_SCENARIOS, buildScenarioHref } from "./demo/demo.config";

const VERDICT_TONE_CLASS: Record<string, string> = {
  SAFE: "border-verdict-safe text-verdict-safe",
  REVIEW: "border-verdict-review text-verdict-review",
  SIREN: "border-verdict-siren text-verdict-siren",
};

const VERDICT_GLYPH: Record<string, string> = {
  SAFE: "✓",
  REVIEW: "▤",
  SIREN: "▮",
};

export default function HomePage(): React.JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-12 px-6 py-16">
      <header className="flex flex-col gap-4">
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-t2">
          Upgrade-risk alarm · ETHPrague 2026
        </span>
        <h1 className="font-display text-5xl font-bold leading-tight tracking-tight text-t1 md:text-6xl">
          Verdict in five seconds.
        </h1>
        <p className="max-w-2xl text-lg text-t2">
          Enter the ENS name of any Ethereum protocol. Upgrade Siren resolves
          the proxy, fetches Sourcify evidence, verifies the operator
          signature, and renders a single SAFE / REVIEW / SIREN verdict —
          or any ENS name (agent, project, team) for a 0–100 benchmark.
          <span className="block pt-2 font-mono text-xs uppercase tracking-[0.18em] text-verdict-siren">
            No source, no upgrade.
          </span>
        </p>
      </header>

      <section
        aria-label="Lookup by ENS name"
        className="flex flex-col gap-2 rounded-md border border-border bg-raised p-6"
      >
        <h2 className="font-display text-lg font-semibold text-t1">
          Signed manifest path
        </h2>
        <p className="text-sm text-t2">
          For protocols that publish{" "}
          <code className="font-mono text-accent">upgrade-siren:*</code>{" "}
          records — operator-signed, the highest-confidence verdict.
        </p>
        <EnsLookupForm />
      </section>

      <section
        aria-label="Lookup via public-read fallback"
        className="flex flex-col gap-2 rounded-md border border-border bg-raised p-6"
      >
        <h2 className="font-display text-lg font-semibold text-t1">
          Public-read fallback
        </h2>
        <p className="text-sm text-t2">
          For protocols without Upgrade Siren records — bytecode and Sourcify
          evidence only. Verdict caps at{" "}
          <span className="text-verdict-review">REVIEW</span>; never{" "}
          <span className="text-verdict-safe">SAFE</span>.
        </p>
        <PublicReadInput />
      </section>

      <section
        aria-label="Try the booth scenarios"
        className="flex flex-col gap-3 rounded-md border border-border bg-raised p-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-t1">
            Try the booth scenarios
          </h2>
          <Link
            href="/demo"
            className="font-mono text-xs uppercase tracking-[0.18em] text-accent hover:text-t1"
          >
            Open demo runner →
          </Link>
        </div>
        <p className="text-sm text-t2">
          Four canonical Sepolia scenarios — each clicks through to the live
          verdict result page.
        </p>
        <ul
          role="list"
          aria-label="Canonical demo scenarios"
          className="flex flex-wrap gap-2 pt-1"
        >
          {DEMO_SCENARIOS.map((scenario) => {
            const href = buildScenarioHref(scenario);
            const tone =
              VERDICT_TONE_CLASS[scenario.expectedVerdict] ??
              "border-border text-t2";
            const glyph = VERDICT_GLYPH[scenario.expectedVerdict] ?? "·";

            if (href === null) {
              return (
                <li key={scenario.key} data-scenario={scenario.key}>
                  <span
                    aria-disabled="true"
                    data-state="pending-target"
                    className={`inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-dashed px-3 py-1 font-mono text-xs opacity-60 ${tone}`}
                  >
                    <span aria-hidden>{glyph}</span>
                    {scenario.label}
                    <span className="text-t3">· pending US-062</span>
                  </span>
                </li>
              );
            }

            return (
              <li key={scenario.key} data-scenario={scenario.key}>
                <Link
                  href={href}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs hover:bg-bg ${tone}`}
                >
                  <span aria-hidden>{glyph}</span>
                  {scenario.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section
        aria-label="Verdict palette preview"
        className="flex flex-wrap items-center justify-start gap-3 border-t border-border pt-6"
      >
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-t3">
          Three states · one glance
        </span>
        <span className="inline-flex items-center gap-2 rounded-md border border-verdict-safe px-3 py-1 font-mono text-sm text-verdict-safe">
          <span aria-hidden>✓</span>SAFE
        </span>
        <span className="inline-flex items-center gap-2 rounded-md border border-verdict-review px-3 py-1 font-mono text-sm text-verdict-review">
          <span aria-hidden>▤</span>REVIEW
        </span>
        <span className="inline-flex items-center gap-2 rounded-md border border-verdict-siren px-3 py-1 font-mono text-sm text-verdict-siren">
          <span aria-hidden>▮</span>SIREN
        </span>
      </section>

      <footer className="flex items-center justify-between border-t border-border pt-6 font-mono text-xs text-t3">
        <span>Sourcify · ENS · EIP-1967</span>
        <Link href="/demo" className="hover:text-t1">
          Booth demo →
        </Link>
      </footer>
    </main>
  );
}
