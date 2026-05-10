"use client";

// Auto-fires the EAS attestation lookup + diff when the bench page
// receives a `?compare=<uid>` query parameter. Driven by the homepage
// `HomepageAttestationLookup` component — pasting a URL there builds a
// /b/<ens>?compare=<uid> link and the server lands the user here with
// the live verdict already loaded; this banner fills in the diff
// asynchronously without touching the rest of the page.
//
// Replaces the prior side-rail compare column. The lookup UI now lives
// only on the homepage; the bench page renders this read-only diff
// banner above the verdict. Strictly additive — no edits to publish
// widget, EAS publish flow, or report-create primitives.

import { useEffect, useState } from "react";

import type { MultiSourceEvidence, ScoreResult } from "@upgrade-siren/evidence";

import {
  diffAttestationVsCurrent,
  type AttestationDiff,
  type DiffSeverity,
} from "../../lib/eas/diffAttestation";
import type {
  FetchedAttestation,
  FetchedAttestationOk,
} from "../../lib/eas/fetchAttestation";

type State =
  | { kind: "fetching" }
  | { kind: "ok"; attestation: FetchedAttestationOk; diff: AttestationDiff }
  | { kind: "error"; message: string };

const SEVERITY_COLOR: Record<DiffSeverity, string> = {
  unchanged: "var(--color-src-verified, #2a8)",
  info: "var(--color-t2)",
  warn: "var(--color-src-partial, #c93)",
  alert: "var(--color-verdict-siren, #c33)",
};

const SEVERITY_LABEL: Record<DiffSeverity, string> = {
  unchanged: "UNCHANGED",
  info: "INFO",
  warn: "CHANGED",
  alert: "ALERT",
};

interface Props {
  readonly uid: `0x${string}`;
  readonly evidence: MultiSourceEvidence;
  readonly score: ScoreResult | null;
}

export function CompareDiffBanner({
  uid,
  evidence,
  score,
}: Props): React.JSX.Element | null {
  const [state, setState] = useState<State>({ kind: "fetching" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let res: Response;
      try {
        res = await fetch(`/api/eas/attestation/${uid}`);
      } catch (err) {
        if (cancelled) return;
        setState({
          kind: "error",
          message: `network error: ${err instanceof Error ? err.message : String(err)}`,
        });
        return;
      }
      let body: FetchedAttestation;
      try {
        body = (await res.json()) as FetchedAttestation;
      } catch {
        if (cancelled) return;
        setState({ kind: "error", message: "could not parse response JSON" });
        return;
      }
      if (cancelled) return;
      if (body.kind === "error") {
        setState({
          kind: "error",
          message: `${body.reason} — ${body.message}`,
        });
        return;
      }
      const diff = diffAttestationVsCurrent({
        previous: body,
        currentEvidence: evidence,
        currentScore: score,
      });
      setState({ kind: "ok", attestation: body, diff });
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, evidence, score]);

  if (state.kind === "fetching") {
    return (
      <section
        data-section="compare-diff-banner"
        data-state="fetching"
        aria-label="Comparing with previous attestation"
        className="flex items-center gap-3 border border-dashed border-border bg-surface px-4 py-3"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-t3">
          Comparing with previous attestation…
        </span>
        <code className="font-mono text-[10px] text-t3">{truncate(uid, 18)}</code>
      </section>
    );
  }

  if (state.kind === "error") {
    return (
      <section
        data-section="compare-diff-banner"
        data-state="error"
        aria-label="Compare error"
        className="flex flex-col gap-1 border border-dashed border-verdict-siren bg-surface px-4 py-3"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-verdict-siren">
          Compare failed · {truncate(uid, 18)}
        </span>
        <span className="font-mono text-[10px] text-t2">{state.message}</span>
      </section>
    );
  }

  const { attestation, diff } = state;
  return (
    <section
      data-section="compare-diff-banner"
      data-state="ok"
      data-overall={diff.overall}
      aria-label="Compare with previous attestation"
      className="flex flex-col gap-3 border border-border bg-surface p-4"
    >
      <header className="flex flex-wrap items-center gap-3">
        <span
          data-field="overall-badge"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            padding: "3px 8px",
            border: `1px solid ${SEVERITY_COLOR[diff.overall]}`,
            color: SEVERITY_COLOR[diff.overall],
          }}
        >
          {SEVERITY_LABEL[diff.overall]}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-t3">
          vs previous attestation
        </span>
        <a
          href={attestation.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto font-mono text-[10px] text-t2 hover:underline"
        >
          open on EAS ↗
        </a>
      </header>

      <ul
        className="m-0 list-none p-0"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          lineHeight: 1.55,
          borderTop: "1px dotted var(--color-border)",
        }}
      >
        {diff.entries.map((e, i) => (
          <li
            key={`${e.field}-${i}`}
            data-diff-field={e.field}
            data-diff-severity={e.severity}
            style={{
              padding: "5px 0",
              borderBottom: "1px dotted var(--color-border)",
              display: "grid",
              gridTemplateColumns: "minmax(80px,1fr) minmax(60px,auto)",
              gap: "6px",
              alignItems: "baseline",
            }}
          >
            <span className="text-t1">
              <code>{e.field}</code>
              {e.note ? (
                <span
                  className="ml-2 text-t3"
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                  }}
                >
                  · {e.note}
                </span>
              ) : null}
              <div className="text-t3" style={{ fontSize: "10px", marginTop: "2px" }}>
                {e.old !== null ? <span>old: <code>{truncate(e.old, 36)}</code></span> : null}
                {e.old !== null && e.current !== null ? <span> → </span> : null}
                {e.current !== null ? <span>now: <code>{truncate(e.current, 36)}</code></span> : null}
              </div>
            </span>
            <span
              style={{
                color: SEVERITY_COLOR[e.severity],
                fontSize: "9px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                textAlign: "right",
              }}
            >
              {e.severity}
            </span>
          </li>
        ))}
      </ul>

      <div
        className="text-t3"
        style={{
          fontSize: "9px",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.04em",
        }}
      >
        attester: <code>{truncate(attestation.attester, 18)}</code> · network:{" "}
        <code>{attestation.network}</code>
        {attestation.txid ? (
          <>
            {" "}
            · tx: <code>{truncate(attestation.txid, 14)}</code>
          </>
        ) : null}
      </div>
    </section>
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  if (s.startsWith("0x") && s.length > 12) {
    return `${s.slice(0, 6)}…${s.slice(-4)}`;
  }
  return `${s.slice(0, max)}…`;
}
