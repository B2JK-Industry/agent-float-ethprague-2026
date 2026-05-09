"use client";

import Link from "next/link";

export type EmptyStateNoRecordsProps = {
  /** ENS name that resolved but has no upgrade-siren:* records. */
  name: string;
};

/**
 * GATE-26 empty state: ENS resolved cleanly but the operator has not
 * published any `upgrade-siren:*` records on this name. We still want
 * the user to be able to act on the name, so we offer the public-read
 * fallback CTA (US-019 / US-020 verdict path) rather than 404-ing.
 */
export function EmptyStateNoRecords({
  name,
}: EmptyStateNoRecordsProps): React.JSX.Element {
  const publicReadHref = `/r/${encodeURIComponent(name)}?mode=public-read`;
  return (
    <section
      role="region"
      aria-label="No upgrade-siren records"
      data-state="empty-no-records"
      className="flex flex-col items-start gap-3 rounded-md border border-dashed border-border-strong bg-raised p-6"
    >
      <span className="font-mono text-xs uppercase tracking-[0.18em] text-accent">
        Public-read fallback
      </span>
      <h2 className="font-display text-2xl font-semibold text-t1">
        No upgrade-siren records on this name.
      </h2>
      <p className="max-w-prose text-sm text-t2">
        We resolved <span className="font-mono text-accent">{name}</span>, but
        the operator has not published a signed{" "}
        <code className="font-mono">upgrade-siren:*</code> manifest. We can
        still verify chain state and Sourcify evidence directly — the verdict
        will be labelled <span className="text-verdict-review">REVIEW</span>{" "}
        (or <span className="text-verdict-siren">SIREN</span> when a rule
        triggers) and never{" "}
        <span className="text-verdict-safe">SAFE</span>.
      </p>
      <Link
        href={publicReadHref}
        data-cta="public-read"
        className="rounded border border-t1 px-3 py-2 font-mono text-sm uppercase tracking-wider text-t1 hover:bg-bg"
      >
        Continue with public-read
      </Link>
    </section>
  );
}
