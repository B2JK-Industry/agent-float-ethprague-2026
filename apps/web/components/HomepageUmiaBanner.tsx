// Homepage sponsor banner for Umia (ETHPrague 2026 sponsor track).
// Sits between the hero and the demo scenarios. Server component — no
// client interactivity. Just the brand mention, the value prop, and a
// link to the official site + a hint that the actual application form
// lives on the per-subject /b/[name] page after a verdict is computed.

import Link from "next/link";

export function HomepageUmiaBanner(): React.JSX.Element {
  return (
    <section
      data-section="umia-sponsor-banner"
      aria-label="Launch with Umia"
      className="flex flex-col gap-4 border border-border bg-surface p-6 lg:flex-row lg:items-start lg:justify-between"
    >
      <div className="flex flex-col gap-2 lg:max-w-2xl">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-t3">
          Launch with Umia · ETHPrague 2026 sponsor
        </span>
        <h2 className="font-display text-xl font-semibold text-t1">
          Want to launch a real promising project in one click?
        </h2>
        <p className="text-sm leading-relaxed text-t2">
          Umia is the Community Track venture launcher. After you generate
          a Bench verdict for your project, Siren turns it into a
          draft <code className="font-mono text-t1">umia venture apply</code>{" "}
          payload — ENS records prefilled, schema-validated, JSON
          download only (no upload, no real CLI execution yet).
        </p>
        <p className="text-xs text-t3">
          Look up any ENS name above to land on a Bench page, then expand
          “Prepare Umia application” at the bottom of the report.
        </p>
      </div>
      <div className="flex flex-col items-stretch gap-2 lg:items-end">
        <a
          href="https://www.umia.finance"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 border border-accent bg-bg px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-accent hover:bg-accent hover:text-bg"
        >
          About Umia ↗
        </a>
        <Link
          href="/b/vitalik.eth"
          className="inline-flex items-center justify-center gap-2 border border-border bg-bg px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-t2 hover:border-t1 hover:text-t1"
        >
          Try the form on a sample report →
        </Link>
      </div>
    </section>
  );
}
