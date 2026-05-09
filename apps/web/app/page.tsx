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
            Upgrade-risk alarm · ETHPrague 2026
          </span>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-t1 md:text-5xl lg:text-6xl">
            Verdict in
            <br />
            five seconds.
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-t2">
            Type any Ethereum protocol&apos;s ENS name. Upgrade Siren resolves
            the proxy, fetches Sourcify evidence, verifies the operator
            signature, and renders a single SAFE / REVIEW / SIREN verdict.
            Or type any ENS subject for a 0–100 benchmark across four data
            sources — Sourcify · GitHub · on-chain · ENS-internal.
          </p>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-verdict-siren">
            No source, no upgrade.
          </p>
        </div>
        <div
          aria-label="Verdict palette preview"
          data-section="palette"
          className="flex flex-col items-stretch justify-center gap-3 lg:items-end"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-t3">
            Three states · one glance
          </span>
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-1 lg:gap-2">
            {(["SAFE", "REVIEW", "SIREN"] as const).map((v) => (
              <div
                key={v}
                data-verdict={v}
                className={`flex items-center justify-between gap-3 border bg-bg px-4 py-3 font-mono text-sm uppercase tracking-[0.16em] ${VERDICT_TONE_CLASS[v]}`}
              >
                <span aria-hidden className="text-lg">
                  {VERDICT_GLYPH[v]}
                </span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TWO FRONT DOORS ───────────────────────────────────────────── */}
      <section
        aria-label="Two front doors"
        data-section="front-doors"
        className="grid gap-6 lg:grid-cols-2"
      >
        {/* Door 1: signed manifest path → /r/[name] */}
        <div className="flex flex-col gap-4 border border-border bg-surface p-6">
          <header className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-t1">
              Signed manifest path
            </h2>
            <span
              data-route-tag="r"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent"
            >
              /r/[name]
            </span>
          </header>
          <p className="text-sm leading-relaxed text-t2">
            For protocols that publish{" "}
            <code className="font-mono text-accent">upgrade-siren:*</code>{" "}
            records — operator-signed, the highest-confidence verdict.
            EIP-712 signature verified against the canonical owner.
          </p>
          <div
            aria-hidden="true"
            style={{ borderTop: "1px dotted var(--color-border)" }}
          />
          <EnsLookupForm />
        </div>

        {/* Door 2: public-read fallback → /r/ caps at REVIEW (Bench mode separately documented) */}
        <div className="flex flex-col gap-4 border border-border bg-surface p-6">
          <header className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-t1">
              Public-read fallback
            </h2>
            <span
              data-route-tag="public-read"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent"
            >
              /r/[name]
            </span>
          </header>
          <p className="text-sm leading-relaxed text-t2">
            For protocols without Upgrade Siren records — bytecode and Sourcify
            evidence only. Verdict caps at{" "}
            <span className="text-verdict-review">REVIEW</span>; never{" "}
            <span className="text-verdict-safe">SAFE</span>.
          </p>
          <div
            aria-hidden="true"
            style={{ borderTop: "1px dotted var(--color-border)" }}
          />
          <PublicReadInput />
        </div>
      </section>

      {/* BENCH MODE BAND ───────────────────────────────────────────── */}
      <section
        aria-label="Bench Mode entry"
        data-section="bench-entry"
        className="flex flex-col gap-4 border border-accent bg-surface p-6 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
            Bench mode · second front door
          </span>
          <h2 className="font-display text-2xl font-semibold text-t1">
            Type any ENS name. Get a 0–100 benchmark.
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-t2">
            Subject benchmark across four data sources with structural
            trust-discount on unverified claims. Sourcify (× 1.0) ·
            GitHub (× 0.6) · on-chain (× 1.0) · ENS-internal (× 1.0).
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-verdict-siren">
            No data, no score.
          </p>
        </div>
        <Link
          href="/b/siren-agent-demo.upgrade-siren-demo.eth"
          className="inline-flex shrink-0 items-center gap-2 border border-accent bg-bg px-5 py-3 font-mono text-sm uppercase tracking-[0.18em] text-accent hover:bg-accent hover:text-bg"
        >
          Open Bench
          <span aria-hidden>→</span>
        </Link>
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
              Canonical Sepolia fixtures
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
          Four canonical Sepolia scenarios. Each click drops you into the
          live verdict result page with full pipeline output.
        </p>
        <ul
          role="list"
          aria-label="Canonical demo scenarios"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
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
                    className={`flex h-full flex-col gap-3 border border-dashed bg-bg p-4 font-mono opacity-60 ${tone}`}
                  >
                    <span className="flex items-baseline justify-between gap-2 text-xs uppercase tracking-[0.18em]">
                      <span aria-hidden className="text-lg">
                        {glyph}
                      </span>
                      <span>{scenario.expectedVerdict}</span>
                    </span>
                    <span className="text-sm normal-case tracking-normal text-t1">
                      {scenario.label}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-t3">
                      pending US-062
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
                    <span aria-hidden className="text-lg">
                      {glyph}
                    </span>
                    <span>{scenario.expectedVerdict}</span>
                  </span>
                  <span className="text-sm normal-case tracking-normal text-t1">
                    {scenario.label}
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
        <span>Sourcify · ENS · EIP-1967 · EIP-712</span>
        <Link
          href="/demo"
          className="text-t3 hover:text-accent"
        >
          Booth demo →
        </Link>
      </footer>
    </main>
  );
}