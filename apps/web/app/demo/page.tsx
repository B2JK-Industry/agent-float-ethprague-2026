import type { Metadata } from "next";
import Link from "next/link";

import { DEMO_SCENARIOS, buildScenarioHref } from "./demo.config";

export const metadata: Metadata = {
  title: "Upgrade Siren — booth demo",
  description: "Four scenarios: safe, dangerous, unverified, live public-read.",
};

const VERDICT_TONE_CLASS: Record<string, string> = {
  SAFE: "border-verdict-safe text-verdict-safe",
  REVIEW: "border-verdict-review text-verdict-review",
  SIREN: "border-verdict-siren text-verdict-siren",
};

export default function DemoPage(): React.JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-3">
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-t2">
          Booth · ETHPrague 2026
        </span>
        <h1 className="font-display text-5xl font-bold tracking-tight text-t1">
          Demo runner
        </h1>
        <p className="max-w-2xl text-sm text-t2">
          Four scenarios. ENS resolves, the proxy implementation is read from
          chain, Sourcify evidence loads, the operator signature is verified —
          all in under five seconds. Each row leads to the live verdict page on
          Sepolia.
        </p>
      </header>

      <ol
        role="list"
        aria-label="Demo scenarios"
        className="flex flex-col gap-3"
      >
        {DEMO_SCENARIOS.map((scenario) => {
          const href = buildScenarioHref(scenario);
          const toneClass =
            VERDICT_TONE_CLASS[scenario.expectedVerdict] ??
            "border-border text-t2";
          const targetLabel = scenario.target ?? "target pending US-062";

          return (
            <li
              key={scenario.key}
              data-scenario={scenario.key}
              data-disabled={href === null ? "true" : "false"}
            >
              {href !== null ? (
                <Link
                  href={href}
                  className="flex flex-col gap-2 rounded-md border border-border bg-raised p-4 transition-colors hover:border-t1"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display text-lg font-semibold text-t1">
                      {scenario.label}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs ${toneClass}`}
                    >
                      <span aria-hidden>
                        {scenario.expectedVerdict === "SAFE"
                          ? "✓"
                          : scenario.expectedVerdict === "REVIEW"
                            ? "▤"
                            : "▮"}
                      </span>
                      {scenario.expectedVerdict}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-accent">
                    {targetLabel}
                  </span>
                  <span className="text-sm text-t2">
                    {scenario.description}
                  </span>
                </Link>
              ) : (
                <div
                  role="group"
                  aria-disabled="true"
                  className="flex cursor-not-allowed flex-col gap-2 rounded-md border border-dashed border-border bg-raised p-4 opacity-60"
                  data-state="pending-target"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display text-lg font-semibold text-t1">
                      {scenario.label}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs ${toneClass}`}
                    >
                      <span aria-hidden>▤</span>
                      {scenario.expectedVerdict}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-t3">
                    {targetLabel}
                  </span>
                  <span className="text-sm text-t2">
                    {scenario.description}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <footer className="border-t border-border pt-6 font-mono text-xs text-t3">
        Sepolia · upgrade-siren-demo.eth · operator{" "}
        <span className="text-t2">0x747E…0cfC</span>
      </footer>
    </main>
  );
}
