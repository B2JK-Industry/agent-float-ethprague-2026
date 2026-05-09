import Link from "next/link";

import { EnsLookupForm } from "../components/EnsLookupForm";
import { PublicReadInput } from "../components/PublicReadInput";

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
          Enter the ENS name of any Ethereum protocol. We resolve the proxy,
          fetch Sourcify evidence, and tell you whether the next upgrade is
          safe to approve.
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
          records — the highest-confidence verdict.
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
