"use client";

export type ErrorStateMalformedManifestProps = {
  /** Raw value of the `upgrade-siren:upgrade_manifest` ENS text record. */
  raw: string;
  /** Parser error message (e.g. "invalid JSON at line 12"). */
  reason: string;
  /**
   * Which mode the verdict engine is in when the malformed manifest is
   * encountered. Per `packages/evidence/src/verdict/absentRecords.ts`, a
   * malformed manifest in `signed-manifest` mode is `SIREN`, and `REVIEW`
   * in `public-read` mode. Defaults to `signed-manifest` because that is
   * the only mode in which a manifest is even fetched.
   */
  mode?: "signed-manifest" | "public-read";
};

/**
 * Malformed manifest. The verdict engine maps this to either SIREN
 * (signed-manifest mode) or REVIEW (already in public-read mode) per the
 * canonical rule table in `packages/evidence/src/verdict/absentRecords.ts`.
 * This component is the *debug* surface that shows what the operator
 * actually published so they can fix it.
 */
export function ErrorStateMalformedManifest({
  raw,
  reason,
  mode = "signed-manifest",
}: ErrorStateMalformedManifestProps): React.JSX.Element {
  const isSignedManifest = mode === "signed-manifest";
  const verdictWord = isSignedManifest ? "SIREN" : "REVIEW";
  const verdictReason = isSignedManifest
    ? "the verdict engine cannot trust a malformed manifest in signed-manifest mode and locks the verdict to SIREN"
    : "the engine continues in public-read mode and downgrades confidence to REVIEW";
  return (
    <section
      role="alert"
      aria-label="Malformed manifest"
      data-state="error-malformed-manifest"
      data-mode={mode}
      data-verdict={verdictWord}
      className="flex flex-col items-start gap-3 border border-verdict-siren bg-verdict-siren-surf p-6"
    >
      <span className="font-mono text-xs uppercase tracking-[0.18em] text-verdict-siren">
        Manifest · {reason}
      </span>
      <h2 className="font-display text-2xl font-semibold text-t1">
        upgrade-siren:upgrade_manifest is not valid.
      </h2>
      <p className="max-w-prose text-sm text-t2">
        Verdict: <span className="font-mono text-verdict-siren">{verdictWord}</span>{" "}
        — {verdictReason}. Operators should fix the record at the ENS
        resolver; the raw record content as currently published is shown
        below for inspection.
      </p>
      <details
        data-record="upgrade-siren:upgrade_manifest"
        className="w-full max-w-prose border border-border bg-bg"
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
