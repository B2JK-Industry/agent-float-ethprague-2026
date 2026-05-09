"use client";

export type ErrorStateUnsignedReportProps = {
  /** ENS name the unsigned report claims to be for. */
  name: string;
  /** Optional EIP-712 owner address advertised in upgrade-siren:owner. */
  owner?: string;
};

/**
 * Unsigned production report. Per GATE-24, the verdict engine refuses any
 * production-mode report without a valid EIP-712 signature recovering to
 * `upgrade-siren:owner` and locks the verdict to SIREN. This component is
 * the user-facing surface for that lock — verdict is SIREN, the reason is
 * explicit (no operator signature), and there is no override.
 */
export function ErrorStateUnsignedReport({
  name,
  owner,
}: ErrorStateUnsignedReportProps): React.JSX.Element {
  return (
    <section
      role="alert"
      aria-label="Unsigned production report"
      data-state="error-unsigned-report"
      data-verdict="SIREN"
      className="flex flex-col items-start gap-3 border border-verdict-siren bg-verdict-siren-surf p-6"
    >
      <span className="font-mono text-xs uppercase tracking-[0.18em] text-verdict-siren">
        Verdict · do not approve
      </span>
      <h2 className="font-display text-3xl font-bold tracking-tight text-verdict-siren">
        SIREN · no operator signature
      </h2>
      <p className="max-w-prose text-sm text-t2">
        The Siren Report fetched for{" "}
        <span className="font-mono text-accent">{name}</span> is unsigned, so
        the verdict engine cannot prove that the report was authorised by{" "}
        {owner ? (
          <span className="font-mono text-t1">{owner}</span>
        ) : (
          <span>the operator advertised in <code className="font-mono">upgrade-siren:owner</code></span>
        )}
        . By GATE-24 the verdict is locked to{" "}
        <span className="text-verdict-siren">SIREN</span> until a valid
        EIP-712 signature is published.
      </p>
      <p className="max-w-prose text-xs text-t3">
        This is not a contract-content failure. The contract may still be safe;
        without an operator signature we just can&apos;t prove the report
        attached to it is.
      </p>
    </section>
  );
}
