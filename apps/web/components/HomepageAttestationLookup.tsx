"use client";

// Homepage dual-entry helper. Sits next to (under) EnsLookupForm in the
// hero. Lets a user paste an existing EAS attestation URL or UID to:
//   - re-open the certificate (decoded payload preview + EAS Explorer link)
//   - jump to /b/[subject]?compare=[UID] where the live verdict re-runs
//     and the diff banner pre-fires automatically
//
// Strictly additive — does NOT touch the report-create flow or any
// /b/[name] rendering primitives. Server-side fetch via existing
// /api/eas/attestation/[uid] route.

import { useState } from "react";
import { useRouter } from "next/navigation";

import { parseAttestationInput } from "../lib/eas/parseAttestationUrl";
import type { FetchedAttestation } from "../lib/eas/fetchAttestation";

type LookupState =
  | { kind: "idle" }
  | { kind: "fetching" }
  | { kind: "ok"; attestation: Extract<FetchedAttestation, { kind: "ok" }> }
  | { kind: "error"; message: string };

// reportUri is the canonical pointer back to /b/<ens>. Extract the ENS
// portion so we can build the deep link with `?compare=<uid>`.
function extractSubjectFromReportUri(uri: string | undefined | null): string | null {
  if (!uri) return null;
  // Accept both /b/<name> and /b/<name>/...
  const m = /\/b\/([^/?#]+)/.exec(uri);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1] ?? "");
  } catch {
    return m[1] ?? null;
  }
}

export function HomepageAttestationLookup(): React.JSX.Element {
  const router = useRouter();
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
    setState({ kind: "ok", attestation: body });
  }

  function handleClear(): void {
    setInput("");
    setState({ kind: "idle" });
  }

  function handleOpenLive(): void {
    if (state.kind !== "ok") return;
    const subject =
      extractSubjectFromReportUri(state.attestation.decoded?.reportUri) ??
      // Fallback: namehash isn't human-readable, so without a usable
      // reportUri there's nothing to navigate to. Surface as error.
      null;
    if (!subject) {
      setState({
        kind: "error",
        message:
          "attestation has no /b/<ens> reportUri — cannot open live verdict",
      });
      return;
    }
    router.push(
      `/b/${encodeURIComponent(subject)}?compare=${state.attestation.uid}`,
    );
  }

  return (
    <section
      data-section="homepage-attestation-lookup"
      aria-label="Open existing attestation"
      className="flex flex-col gap-3 border border-border bg-surface p-5"
    >
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-t3">
          Or — open an existing attestation
        </span>
        <h2 className="font-display text-base font-semibold text-t1">
          Already have an EAS report URL?
        </h2>
        <p className="font-mono text-[11px] leading-relaxed text-t2">
          Paste the EAS Explorer URL or 0x… UID. Preview the previous
          verdict, then open it next to the live one to spot what changed.
        </p>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="homepage-attestation-input"
          name="attestation"
          type="text"
          autoComplete="off"
          spellCheck={false}
          data-field="attestation-url-input"
          placeholder="https://sepolia.easscan.org/attestation/view/0x… or 0x…"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (state.kind === "error") setState({ kind: "idle" });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleLookup();
          }}
          className="flex-1 border border-border-strong bg-bg px-3 py-2 font-mono text-xs text-t1 placeholder:text-t3 focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          data-action="lookup-attestation"
          onClick={() => void handleLookup()}
          disabled={state.kind === "fetching" || input.trim().length === 0}
          className="border border-accent bg-bg px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-accent hover:bg-accent hover:text-bg disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state.kind === "fetching" ? "Loading…" : "Open"}
        </button>
      </div>

      {state.kind === "error" ? (
        <p
          role="alert"
          data-field="lookup-error"
          className="font-mono text-xs text-verdict-siren"
        >
          {state.message}
        </p>
      ) : null}

      {state.kind === "ok" ? (
        <AttestationPreview
          attestation={state.attestation}
          onOpenLive={handleOpenLive}
          onClear={handleClear}
        />
      ) : null}
    </section>
  );
}

function AttestationPreview({
  attestation,
  onOpenLive,
  onClear,
}: {
  attestation: Extract<FetchedAttestation, { kind: "ok" }>;
  onOpenLive: () => void;
  onClear: () => void;
}): React.JSX.Element {
  const decoded = attestation.decoded;
  const subject = extractSubjectFromReportUri(decoded?.reportUri);
  return (
    <div
      data-field="attestation-preview"
      className="flex flex-col gap-3 border border-dashed border-border bg-bg p-4"
    >
      <ul
        className="m-0 list-none p-0"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          lineHeight: 1.55,
        }}
      >
        {subject ? (
          <li>
            subject: <code className="text-t1">{subject}</code>
          </li>
        ) : null}
        {decoded ? (
          <>
            <li>
              score: <code className="text-t1">{decoded.score}</code> · tier:{" "}
              <code className="text-t1">{decoded.tier}</code>
            </li>
          </>
        ) : null}
        <li className="text-t2">
          network: <code>{attestation.network}</code> · attester:{" "}
          <code>{truncate(attestation.attester, 14)}</code>
        </li>
        {attestation.revoked ? (
          <li className="text-verdict-siren">⚠ revoked on-chain</li>
        ) : null}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onOpenLive}
          disabled={!subject}
          data-action="open-live-with-compare"
          className="inline-flex items-center gap-2 border border-accent bg-bg px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-accent hover:bg-accent hover:text-bg disabled:cursor-not-allowed disabled:opacity-50"
        >
          {subject ? `Open live verdict for ${truncate(subject, 22)} →` : "No reportUri — cannot open live"}
        </button>
        <a
          href={attestation.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-t2 hover:underline"
        >
          EAS Explorer ↗
        </a>
        <button
          type="button"
          onClick={onClear}
          className="ml-auto font-mono text-[10px] text-t3 hover:underline"
        >
          clear
        </button>
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
