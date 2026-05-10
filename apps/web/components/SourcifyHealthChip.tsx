"use client";

// Tiny live status pill: "Sourcify · live · 240ms" / "Sourcify · down".
// Polls /api/sourcify/health on mount, no re-fetch — judges only need
// one signal that we're hitting the real Sourcify server.

import { useEffect, useState } from "react";

type State =
  | { kind: "loading" }
  | { kind: "ok"; latencyMs: number }
  | { kind: "down"; reason: string };

export function SourcifyHealthChip(): React.JSX.Element {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/sourcify/health");
        const j = (await r.json()) as {
          ok: boolean;
          latencyMs?: number;
          reason?: string;
          message?: string;
        };
        if (cancelled) return;
        if (j.ok && typeof j.latencyMs === "number") {
          setState({ kind: "ok", latencyMs: j.latencyMs });
        } else {
          setState({
            kind: "down",
            reason: j.reason ?? "unknown",
          });
        }
      } catch {
        if (cancelled) return;
        setState({ kind: "down", reason: "network" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dotColor =
    state.kind === "ok"
      ? "var(--color-src-verified, #2a8)"
      : state.kind === "down"
        ? "var(--color-verdict-siren, #c33)"
        : "var(--color-t3)";

  const text =
    state.kind === "loading"
      ? "checking…"
      : state.kind === "ok"
        ? `live · ${state.latencyMs}ms`
        : `down · ${state.reason}`;

  return (
    <a
      href="/api/sourcify/health"
      target="_blank"
      rel="noopener noreferrer"
      data-section="sourcify-health"
      data-state={state.kind}
      className="inline-flex items-center gap-2 border border-border bg-bg px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-t2 hover:text-t1"
      title="Live Sourcify v2 server check (probes a known-verified mainnet contract). Click to view raw JSON."
    >
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: dotColor,
        }}
      />
      <span>Sourcify</span>
      <span className="text-t3">·</span>
      <span className="text-t1">{text}</span>
    </a>
  );
}
