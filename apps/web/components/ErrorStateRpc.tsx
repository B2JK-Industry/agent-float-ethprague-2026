"use client";

import Link from "next/link";

export type ErrorStateRpcProps = {
  /** Optional callback for the retry button; falls back to `location.reload()`. */
  onRetry?: () => void;
  /** Optional name of the RPC provider that failed (e.g. "Alchemy"). */
  provider?: string;
  /** Optional cached-verdict timestamp displayed in the body when available. */
  cachedAt?: string;
};

export function ErrorStateRpc({
  onRetry,
  provider,
  cachedAt,
}: ErrorStateRpcProps): React.JSX.Element {
  function handleRetry(): void {
    if (onRetry) {
      onRetry();
      return;
    }
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }

  return (
    <section
      role="alert"
      aria-label="RPC provider unreachable"
      data-state="error-rpc"
      className="flex flex-col items-start gap-3 rounded-md border border-verdict-review bg-verdict-review-surf p-6"
    >
      <span className="font-mono text-xs uppercase tracking-[0.18em] text-verdict-review">
        Chain · provider unreachable{provider ? ` (${provider})` : ""}
      </span>
      <h2 className="font-display text-2xl font-semibold text-t1">
        We can&apos;t read chain state right now.
      </h2>
      <p className="max-w-prose text-sm text-t2">
        No verdict can be issued without a live chain read.{" "}
        {cachedAt ? (
          <>
            Showing cached verdict from{" "}
            <span className="font-mono text-t1">{cachedAt}</span>. Retry, or
            check the RPC configuration.
          </>
        ) : (
          <>Retry, or check the RPC configuration.</>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleRetry}
          data-action="retry"
          className="rounded border border-t1 bg-t1 px-3 py-2 font-mono text-sm uppercase tracking-wider text-ink hover:opacity-90"
        >
          Retry
        </button>
        <Link
          href="/health"
          data-action="health-check"
          className="rounded border border-t1 px-3 py-2 font-mono text-sm uppercase tracking-wider text-t1 hover:bg-bg"
        >
          Check /health
        </Link>
      </div>
    </section>
  );
}
