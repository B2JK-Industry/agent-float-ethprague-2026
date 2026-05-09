import Link from "next/link";

import { EnsLookupForm } from "../components/EnsLookupForm";
import { DEMO_SCENARIOS, buildScenarioHref } from "./demo/demo.config";

const TIER_TONE_CLASS: Record<string, string> = {
  S: "border-tier-a text-tier-a",
  A: "border-tier-a text-tier-a",
  B: "border-tier-b text-tier-b",
  C: "border-tier-c text-tier-c",
  D: "border-tier-d text-tier-d",
  U: "border-tier-u text-tier-u",
};

// Score thresholds match packages/evidence/src/score/weights.ts. v1
// final-score ceiling is 79; S is reserved for verified-GitHub v2.
const TIER_RANGE: Record<string, string> = {
  S: "90+",
  A: "75–89",
  B: "60–74",
  C: "45–59",
  D: "0–44",
  U: "no data",
};

export default function HomePage(): React.JSX.Element {
  return (
    <main
      className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-12"
      data-route="home"
    >
      {/* HERO BAND ─────────────────────────────────────────────────── */}
      <section
        aria-label="Hero"
        data-section="hero"
        className="grid gap-8 border border-border bg-surface px-8 py-10 lg:grid-cols-[1.5fr_1fr] lg:gap-12"
      >
        <div className="flex flex-col gap-4">
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-t2">
            Bench mode · ETHPrague 2026
          </span>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-t1 md:text-5xl lg:text-6xl">
            Type any ENS name.
            <br />
            Get a 0–100 benchmark.
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-t2">
            Subject benchmark across four data sources with structural
            trust-discount on unverified claims. Sourcify (× 1.0) ·
            GitHub (× 0.6) · on-chain (× 1.0) · ENS-internal (× 1.0).
            Score 0–79 v1 ceiling, tier ladder S → U.
          </p>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-verdict-siren">
            No data, no score.
          </p>
          <div className="pt-2">
            <EnsLookupForm />
          </div>
        </div>
        <div
          aria-label="Tier ladder palette"
          data-section="palette"
          className="flex flex-col items-stretch justify-center gap-3 lg:items-end"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-t3">
            Six tiers · one glance
          </span>
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-2">
            {(["S", "A", "B", "C", "D", "U"] as const).map((t) => (
              <div
                key={t}
                data-tier={t}
                className={`flex items-center justify-between gap-3 border bg-bg px-4 py-3 font-mono uppercase tracking-[0.16em] ${TIER_TONE_CLASS[t]}`}
              >
                <span
                  aria-hidden
                  className="font-display text-2xl font-bold leading-none"
                >
                  {t}
                </span>
                <span
                  className="text-right text-[10px] tracking-[0.18em] text-t3"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {TIER_RANGE[t]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO SCENARIOS BAND ───────────────────────────────────────── */}
      <section
        aria-label="Try the booth scenarios"
        data-section="scenarios"
        className="flex flex-col gap-4 border border-border bg-surface p-6"
      >
        <header className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-t3">
              Live ENS subjects · Bench Mode
            </span>
            <h2 className="font-display text-lg font-semibold text-t1">
              Try the booth scenarios
            </h2>
          </div>
          <Link
            href="/demo"
            className="font-mono text-xs uppercase tracking-[0.18em] text-accent hover:text-t1"
          >
            Open demo runner →
          </Link>
        </header>
        <p className="text-sm leading-relaxed text-t2">
          Four canonical ENS subjects — one curated agent on Sepolia, two
          public-read profiles, one mainnet name. Each click drops you
          into the Bench Mode page with the live four-source breakdown.
        </p>
        <ul
          role="list"
          aria-label="Canonical demo scenarios"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {DEMO_SCENARIOS.map((scenario) => {
            const href = buildScenarioHref(scenario);
            const tone =
              TIER_TONE_CLASS[scenario.expectedBucket] ??
              "border-border text-t2";

            if (href === null) {
              return (
                <li key={scenario.key} data-scenario={scenario.key}>
                  <span
                    aria-disabled="true"
                    data-state="pending-target"
                    className={`flex h-full flex-col gap-3 border border-dashed bg-bg p-4 font-mono opacity-60 ${tone}`}
                  >
                    <span className="flex items-baseline justify-between gap-2 text-xs uppercase tracking-[0.18em]">
                      <span className="font-display text-2xl font-bold leading-none">
                        {scenario.expectedBucket}
                      </span>
                      <span className="text-[10px]">tier</span>
                    </span>
                    <span className="text-sm normal-case tracking-normal text-t1">
                      {scenario.label}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-t3">
                      pending target
                    </span>
                  </span>
                </li>
              );
            }

            return (
              <li key={scenario.key} data-scenario={scenario.key}>
                <Link
                  href={href}
                  className={`flex h-full flex-col gap-3 border bg-bg p-4 font-mono hover:bg-surface ${tone}`}
                >
                  <span className="flex items-baseline justify-between gap-2 text-xs uppercase tracking-[0.18em]">
                    <span className="font-display text-2xl font-bold leading-none">
                      {scenario.expectedBucket}
                    </span>
                    <span className="text-[10px]">tier</span>
                  </span>
                  <span className="text-sm normal-case tracking-normal text-t1">
                    {scenario.label}
                  </span>
                  <span
                    className="text-[10px] uppercase tracking-[0.16em] text-t3"
                    data-mode={scenario.mode}
                  >
                    {scenario.mode === "signed-manifest"
                      ? "signed manifest"
                      : "public-read"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* WHY THIS MATTERS BAND ─────────────────────────────────────── */}
      <section
        aria-label="Why this matters"
        data-section="why"
        className="grid gap-4 lg:grid-cols-3"
      >
        <div className="flex flex-col gap-2 border border-border bg-surface p-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-t3">
            Sourcify-anchored
          </span>
          <span
            className="font-display text-3xl font-bold leading-none tracking-tight text-tier-a"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            ×1.0
          </span>
          <p className="text-xs leading-relaxed text-t2">
            Verified bytecode is the only source that can&apos;t be faked.
            The other three discount honestly.
          </p>
        </div>
        <div className="flex flex-col gap-2 border border-border bg-surface p-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-t3">
            ENS-named subject
          </span>
          <span
            className="font-display text-3xl font-bold leading-none tracking-tight text-accent"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            *.eth
          </span>
          <p className="text-xs leading-relaxed text-t2">
            Every subject is an ENS name. No URLs, no opaque IDs —
            human-readable trust anchors only.
          </p>
        </div>
        <div className="flex flex-col gap-2 border border-border bg-surface p-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-t3">
            Trust-discounted
          </span>
          <span
            className="font-display text-3xl font-bold leading-none tracking-tight text-tier-c"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            ×0.6
          </span>
          <p className="text-xs leading-relaxed text-t2">
            Unverified GitHub claims contribute at 0.6 weight — never
            hidden, never inflated. v1 max final score: 79.
          </p>
        </div>
      </section>

      {/* FOOTER ────────────────────────────────────────────────────── */}
      <footer className="flex items-center justify-between border-t border-border pt-6 font-mono text-xs uppercase tracking-[0.16em] text-t3">
        <span>ENS · Sourcify · GitHub · on-chain</span>
        <Link href="/demo" className="text-t3 hover:text-accent">
          Booth demo →
        </Link>
      </footer>
    </main>
  );
}