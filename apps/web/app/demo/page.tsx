import type { Metadata } from "next";
import Link from "next/link";

import { DEMO_SCENARIOS, buildScenarioHref } from "./demo.config";

export const metadata: Metadata = {
  title: "Siren — booth demo",
  description:
    "Four ENS subjects, four breakdowns. Curated agent + two public-read profiles + mainnet name.",
};

const TIER_TONE_CLASS: Record<string, string> = {
  S: "border-tier-a text-tier-a",
  A: "border-tier-a text-tier-a",
  B: "border-tier-b text-tier-b",
  C: "border-tier-c text-tier-c",
  D: "border-tier-d text-tier-d",
  U: "border-tier-u text-tier-u",
};

export default function DemoPage(): React.JSX.Element {
  return (
    <main
      className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12"
      data-route="demo"
    >
      <header className="flex flex-col gap-3">
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-t2">
          Booth · ETHPrague 2026
        </span>
        <h1 className="font-display text-5xl font-bold tracking-tight text-t1">
          Demo runner
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-t2">
          Four ENS subjects across the Bench Mode pipeline. One curated
          Sepolia agent (signed manifest), two public-read Sepolia
          profiles, one mainnet name. Each click drops you into the
          live four-source breakdown.
        </p>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-verdict-siren">
          No data, no score.
        </p>
      </header>

      <ol
        role="list"
        aria-label="Demo scenarios"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {DEMO_SCENARIOS.map((scenario) => {
          const href = buildScenarioHref(scenario);
          const tone =
            TIER_TONE_CLASS[scenario.expectedBucket] ??
            "border-border text-t2";
          const targetLabel = scenario.target ?? "target pending";

          if (href === null) {
            return (
              <li
                key={scenario.key}
                data-scenario={scenario.key}
                data-disabled="true"
              >
                <div
                  role="group"
                  aria-disabled="true"
                  data-state="pending-target"
                  className={`flex h-full cursor-not-allowed flex-col gap-3 border border-dashed bg-bg p-5 opacity-60 ${tone}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-3xl font-bold leading-none">
                      {scenario.expectedBucket}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-t3">
                      tier
                    </span>
                  </div>
                  <span className="font-display text-base font-semibold text-t1">
                    {scenario.label}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-t3 break-all">
                    {targetLabel}
                  </span>
                  <span className="text-xs leading-relaxed text-t2">
                    {scenario.description}
                  </span>
                </div>
              </li>
            );
          }

          return (
            <li
              key={scenario.key}
              data-scenario={scenario.key}
              data-disabled="false"
            >
              <Link
                href={href}
                className={`flex h-full flex-col gap-3 border bg-bg p-5 hover:bg-surface ${tone}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-3xl font-bold leading-none">
                    {scenario.expectedBucket}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-t3">
                    tier
                  </span>
                </div>
                <span className="font-display text-base font-semibold text-t1">
                  {scenario.label}
                </span>
                <span
                  data-mode={scenario.mode}
                  className="font-mono text-[10px] uppercase tracking-[0.16em] text-t3"
                >
                  {scenario.mode === "signed-manifest"
                    ? "signed manifest"
                    : "public-read"}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent break-all">
                  {targetLabel}
                </span>
                <span className="text-xs leading-relaxed text-t2">
                  {scenario.description}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      <footer className="border-t border-border pt-6 font-mono text-xs uppercase tracking-[0.16em] text-t3">
        ENS · Sourcify · GitHub · on-chain ·{" "}
        <span className="text-t2">operator 0x747E…0cfC</span>
      </footer>
    </main>
  );
}