"use client";

export type ErrorStateSourcifyProps = {
  /** HTTP status from Sourcify, e.g. 503 / 429. */
  status?: number;
  /** Optional cached-evidence timestamp shown when fall-back data exists. */
  cachedAt?: string;
};

export function ErrorStateSourcify({
  status,
  cachedAt,
}: ErrorStateSourcifyProps): React.JSX.Element {
  return (
    <section
      role="alert"
      aria-label="Sourcify unavailable"
      data-state="error-sourcify"
      className="flex flex-col items-start gap-3 rounded-md border border-verdict-review bg-verdict-review-surf p-6"
    >
      <span className="font-mono text-xs uppercase tracking-[0.18em] text-verdict-review">
        Sourcify · {status ? status : "unavailable"}
      </span>
      <h2 className="font-display text-2xl font-semibold text-t1">
        Falling back to bytecode-only diff.
      </h2>
      <p className="max-w-prose text-sm text-t2">
        Sourcify is currently unreachable, so verified-source metadata is
        unavailable for this lookup. The verdict engine downgrades confidence
        and proceeds with bytecode-only diff.{" "}
        {cachedAt ? (
          <>
            Cached evidence from{" "}
            <span className="font-mono text-t1">{cachedAt}</span> may still be
            shown if the lookup target was previously fetched.
          </>
        ) : (
          <>The verdict will not claim Sourcify-verified status.</>
        )}
      </p>
    </section>
  );
}
