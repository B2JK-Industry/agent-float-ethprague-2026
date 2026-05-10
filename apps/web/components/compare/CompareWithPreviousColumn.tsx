"use client";

// Side column on /b/[name] that lets a user paste an existing EAS
// attestation URL (or raw UID) and:
//   - re-open the certificate in EAS Explorer
//   - diff its decoded payload against the live evidence + score the
//     page just computed
//
// Strictly additive — does NOT modify the report-create / EAS-publish
// flow. Lives next to BenchPublishWidget in the page header.

import { useState } from "react";

import type { MultiSourceEvidence, ScoreResult } from "@upgrade-siren/evidence";

import {
  parseAttestationInput,
  type EasNetwork,
} from "../../lib/eas/parseAttestationUrl";
import {
  diffAttestationVsCurrent,
  type AttestationDiff,
  type DiffSeverity,
} from "../../lib/eas/diffAttestation";
import type {
  FetchedAttestation,
  FetchedAttestationOk,
} from "../../lib/eas/fetchAttestation";

type LookupState =
  | { kind: "idle" }
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
  readonly evidence: MultiSourceEvidence;
  readonly score: ScoreResult | null;
}

export function CompareWithPreviousColumn({
  evidence,
  score,
}: Props): React.JSX.Element {
  const [input, setInput] = useState("");
  const [state, setState] = useState<LookupState>({ kind: "idle" });

  async function handleLookup(): Promise<void> {
    const parsed = parseAttestationInput(input);
    if (parsed.kind === "error") {
      setState({ kind: "error", message: parsed.message });
      return;
    }
    setState({ kind: "fetching" });
    const qs = parsed.network ? `?network=${parsed.network}` : "";
    let res: Response;
    try {
      res = await fetch(`/api/eas/attestation/${parsed.uid}${qs}`);
    } catch (err) {
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
      setState({ kind: "error", message: "could not parse response JSON" });
      return;
    }
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
  }

  function handleClear(): void {
    setInput("");
    setState({ kind: "idle" });
  }

  return (
    <section
      data-section="compare-with-previous"
      aria-label="Compare with a previous attestation"
      className="border border-border bg-surface"
      style={{
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        minWidth: "280px",
        maxWidth: "420px",
      }}
    >
      <header className="flex flex-col gap-1">
        <span
          className="font-mono uppercase text-t3"
          style={{ fontSize: "10px", letterSpacing: "0.18em" }}
        >
          Compare with previous attestation
        </span>
        <p
          className="text-t3"
          style={{
            fontSize: "10px",
            fontStyle: "italic",
            fontFamily: "var(--font-serif)",
          }}
        >
          Paste an EAS attestation URL or UID to re-open the certificate
          and diff it against this live verdict.
        </p>
      </header>

      <div style={{ display: "flex", gap: "6px" }}>
        <input
          type="text"
          data-field="attestation-url-input"
          placeholder="https://sepolia.easscan.org/attestation/view/0x… or 0x…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleLookup();
          }}
          style={{
            flex: 1,
            padding: "6px 8px",
            border: "1px solid var(--color-border)",
            background: "var(--color-bg)",
            color: "var(--color-t1)",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
          }}
        />
        <button
          type="button"
          data-action="lookup-attestation"
          onClick={() => void handleLookup()}
          disabled={state.kind === "fetching" || input.trim().length === 0}
          className="border border-t1 px-3"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            background: "var(--color-bg)",
            color: "var(--color-t1)",
            cursor:
              state.kind === "fetching" || input.trim().length === 0
                ? "not-allowed"
                : "pointer",
          }}
        >
          {state.kind === "fetching" ? "..." : "Compare"}
        </button>
      </div>

      {state.kind === "error" ? (
        <p
          data-field="lookup-error"
          className="text-t1"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "var(--color-verdict-siren, #c33)",
          }}
        >
          {state.message}
        </p>
      ) : null}

      {state.kind === "ok" ? (
        <CompareResult
          attestation={state.attestation}
          diff={state.diff}
          onClear={handleClear}
        />
      ) : null}
    </section>
  );
}

function CompareResult({
  attestation,
  diff,
  onClear,
}: {
  attestation: FetchedAttestationOk;
  diff: AttestationDiff;
  onClear: () => void;
}): React.JSX.Element {
  return (
    <div
      data-field="compare-result"
      data-overall={diff.overall}
      style={{ display: "flex", flexDirection: "column", gap: "8px" }}
    >
      <div className="flex items-center justify-between gap-2">
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
        <a
          href={attestation.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-field="explorer-link"
          className="font-mono text-t2 hover:underline"
          style={{ fontSize: "10px" }}
        >
          open on EAS ↗
        </a>
        <button
          type="button"
          onClick={onClear}
          className="font-mono text-t3 hover:underline"
          style={{ fontSize: "10px" }}
        >
          clear
        </button>
      </div>

      <ul
        className="m-0 list-none p-0"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          lineHeight: 1.5,
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
                {e.old !== null ? <span>old: <code>{truncate(e.old, 32)}</code></span> : null}
                {e.old !== null && e.current !== null ? <span> → </span> : null}
                {e.current !== null ? <span>now: <code>{truncate(e.current, 32)}</code></span> : null}
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
          paddingTop: "4px",
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
    </div>
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  if (s.startsWith("0x") && s.length > 12) {
    return `${s.slice(0, 6)}…${s.slice(-4)}`;
  }
  return `${s.slice(0, max)}…`;
}
