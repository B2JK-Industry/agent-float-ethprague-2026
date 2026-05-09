"use client";

export type ErrorStateMalformedManifestProps = {
  /** Raw value of the `upgrade-siren:upgrade_manifest` ENS text record. */
  raw: string;
  /** Parser error message (e.g. "invalid JSON at line 12"). */
  reason: string;
};

/**
 * Malformed manifest. The verdict engine treats this as no-manifest (per
 * `docs/02-product-architecture.md`), so the user gets public-read mode in
 * the verdict path; this component is the *debug* surface that shows what
 * the operator actually published, so they can fix it.
 */
export function ErrorStateMalformedManifest({
  raw,
  reason,
}: ErrorStateMalformedManifestProps): React.JSX.Element {
  return (
    <section
      role="alert"
      aria-label="Malformed manifest"
      data-state="error-malformed-manifest"
      className="flex flex-col items-start gap-3 rounded-md border border-verdict-siren bg-verdict-siren-surf p-6"
    >
      <span className="font-mono text-xs uppercase tracking-[0.18em] text-verdict-siren">
        Manifest · {reason}
      </span>
      <h2 className="font-display text-2xl font-semibold text-t1">
        upgrade-siren:upgrade_manifest is not valid.
      </h2>
      <p className="max-w-prose text-sm text-t2">
        The verdict engine treats this name as no-manifest and continues in
        public-read mode. Operators should fix the record at the ENS resolver;
        the raw record content as currently published is shown below for
        inspection.
      </p>
      <details
        data-record="upgrade-siren:upgrade_manifest"
        className="w-full max-w-prose rounded border border-border bg-bg"
      >
        <summary className="cursor-pointer px-3 py-2 font-mono text-xs uppercase tracking-wider text-t2">
          Show raw record content
        </summary>
        <pre
          data-testid="malformed-manifest-raw"
          className="overflow-x-auto whitespace-pre-wrap break-all border-t border-border p-3 font-mono text-xs text-t1"
        >
          {raw}
        </pre>
      </details>
    </section>
  );
}
