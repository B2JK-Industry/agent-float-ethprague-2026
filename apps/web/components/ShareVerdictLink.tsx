"use client";

// US-053 — Share-verdict link with precomputed result.
//
// A DAO voter pastes "what Siren said when I voted" into a forum thread or
// vote rationale. The shared URL carries the verdict word + the timestamp
// the verdict was generated, so the rendered snapshot is *byte-identical*
// to what the voter saw — even if the live verdict has changed since.
//
// The precomputed snapshot is necessarily a `mock: true` render: we don't
// re-run the engine on the URL params, we just render the verdict word the
// voter committed to. The "Verify live now" affordance on the result page
// is the user's escape hatch to compare against the current live verdict.
//
// Cryptographic proof of the snapshot is out of scope (P3 / ZK territory).

import { useState } from "react";
import type { Verdict } from "@upgrade-siren/shared";

export type ShareVerdictLinkProps = {
  readonly name: string;
  readonly verdict: Verdict;
  /** ISO-8601 timestamp; treat as opaque. */
  readonly generatedAt: string;
};

/**
 * Build the precomputed-snapshot URL.
 *
 * - `name` is URL-encoded so ENS names with characters that need escaping
 *   round-trip cleanly.
 * - `v` carries the verdict word (SAFE / REVIEW / SIREN).
 * - `t` carries the original generation timestamp.
 *
 * If `origin` is supplied, returns an absolute URL (preferred for clipboard
 * paste); otherwise returns a path-only string (useful for tests + SSR).
 */
export function buildShareUrl(
  name: string,
  verdict: Verdict,
  generatedAt: string,
  origin?: string,
): string {
  const path = `/r/${encodeURIComponent(name)}`;
  const params = new URLSearchParams({ v: verdict, t: generatedAt });
  const tail = `?${params.toString()}`;
  if (origin && origin.length > 0) return `${origin}${path}${tail}`;
  return `${path}${tail}`;
}

export function ShareVerdictLink({
  name,
  verdict,
  generatedAt,
}: ShareVerdictLinkProps): React.JSX.Element {
  const [copied, setCopied] = useState<boolean>(false);

  async function onShare(): Promise<void> {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const url = buildShareUrl(name, verdict, generatedAt, origin);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        // clipboard unavailable; surface no error in the button itself.
      }
    }
  }

  return (
    <button
      type="button"
      onClick={onShare}
      data-action="share-verdict"
      data-verdict={verdict}
      aria-label={`Copy share URL with precomputed ${verdict} verdict for ${name} to clipboard`}
      className="rounded border border-t1 px-3 py-1 font-mono text-xs uppercase tracking-wider text-t1 hover:bg-bg"
    >
      {copied ? "Copied" : "Share verdict"}
    </button>
  );
}
