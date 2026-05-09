// US-135 — Sourcify source drawer for `/b/[name]`. Renders per-contract
// evidence (one row per Sourcify entry in the subject manifest) plus a
// "deep dive" link to the existing Single-Contract `/r/[name]` surface
// for each entry — that route reuses the verdict UI, EvidenceDrawer,
// and Storage diff renderer that US-068 already shipped.
//
// Anatomy compliance:
//   • v3 §C-11 Evidence Row — one row per source-claim, dot + name +
//     citation + multiplier + auxiliary chips. v3 names six canonical
//     source tags (SOURCIFY / ENS / SIG / REGISTRY / IPFS / RPC); the
//     Sourcify drawer uses SOURCIFY exclusively.
//   • v3 §C-04 Trust Pill — every row carries a × 1.00 / × 0.85 / etc.
//     pill driven by the entry's match level. INVALID for kind:'error'.
//   • v3 §C-05 Source Row spirit (dot + name + sub + pill + aux).
//
// The drawer is stateless wrt the score; its data source is
// `MultiSourceEvidence.sourcify[]` from the orchestrator.
//
// What this PR does NOT yet render (deferred):
//   • In-page embed of the /r/[name] component tree. v3 spec calls for
//     reuse, but the route's loadReport.ts is server-side and re-using
//     it inline requires re-hosting Suspense boundaries; for now the
//     drawer LINKS to /r/[name]?address=… with the entry's chainId +
//     address pre-seeded. When the embed lands, the link becomes a
//     trigger.
//   • Subject-level storage hygiene aggregator (US-119) surfacing — the
//     pure function exists in `packages/evidence/src/diff/storageHygiene.ts`
//     but the orchestrator does not yet attach a `subjectHygiene` field
//     to MultiSourceEvidence. Drawer surfaces per-entry impl history
//     when proxyResolution.implementations is present.
//
// Tokens (no hex literals): --color-src-* full set, --color-tier-*,
// --color-t1/t2/t3, --color-border, --color-border-strong, --color-bg,
// --color-surface, --color-raised, --color-accent, --font-mono,
// --font-display, --font-serif.

import type {
  SourcifyEntryEvidence,
  SourcifyEntryOk,
} from "@upgrade-siren/evidence";

import { TrustPill, type TrustPillVariant } from "../primitives/TrustPill";

export type SourcifyDrawerProps = {
  readonly entries: ReadonlyArray<SourcifyEntryEvidence>;
  readonly initialOpen?: boolean;
};

const SOURCE_TAG = "SOURCIFY"; // v3 §C-11 canonical tag

function matchVariant(
  match: "exact_match" | "match" | "not_found" | null | undefined,
): { variant: TrustPillVariant; label: string } {
  if (match === "exact_match") return { variant: "verified", label: "× 1.00" };
  if (match === "match") return { variant: "partial", label: "× 0.85" };
  if (match === "not_found")
    return { variant: "missing", label: "× 0.00" };
  return { variant: "missing", label: "× 0.00" };
}

function entryHref(entry: SourcifyEntryEvidence): string {
  // Sourcify v2 lookup URL — opens the canonical evidence page.
  return `https://sourcify.dev/#/lookup/${entry.address}`;
}

function chainLabel(chainId: number): string {
  if (chainId === 1) return "mainnet";
  if (chainId === 11155111) return "sepolia";
  return `chain ${chainId}`;
}

function ImplementationRow({
  entry,
  impl,
}: {
  readonly entry: SourcifyEntryOk;
  readonly impl: { readonly address: string; readonly name: string | null };
}): React.JSX.Element {
  return (
    <li
      data-impl-address={impl.address}
      className="grid items-center gap-3 font-mono text-t2"
      style={{
        gridTemplateColumns: "auto 1fr auto",
        padding: "6px 0",
        fontSize: "10px",
        letterSpacing: "0.04em",
        borderBottom: "1px dotted var(--color-border)",
      }}
    >
      <span data-field="impl-tag" className="text-t3 uppercase">
        IMPL
      </span>
      <span data-field="impl-address" className="text-t1" style={{ wordBreak: "break-all" }}>
        {impl.name ? <span className="text-t1">{impl.name}</span> : null}
        {impl.name ? " · " : null}
        <a
          href={`https://sourcify.dev/#/lookup/${impl.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent"
          style={{ color: "var(--color-accent)" }}
        >
          {impl.address}
        </a>
      </span>
      <span data-field="impl-chain" className="text-t3 uppercase">
        {chainLabel(entry.chainId)}
      </span>
    </li>
  );
}

function EntryRow({
  entry,
  index,
}: {
  readonly entry: SourcifyEntryEvidence;
  readonly index: number;
}): React.JSX.Element {
  if (entry.kind === "error") {
    return (
      <article
        data-entry-index={index}
        data-entry-address={entry.address}
        data-entry-state="invalid"
        style={{
          border: "1px solid var(--color-o-block)",
          background: "var(--color-surface)",
          padding: "14px 16px",
          display: "grid",
          gap: "8px",
        }}
      >
        <header className="flex items-baseline justify-between gap-2">
          <span
            data-field="entry-tag"
            className="font-mono uppercase"
            style={{
              color: "var(--color-o-block)",
              fontSize: "10px",
              letterSpacing: "0.18em",
            }}
          >
            {SOURCE_TAG}
          </span>
          <TrustPill variant="invalid" label="INVALID" />
        </header>
        <p
          data-field="entry-name"
          className="font-mono text-t1"
          style={{
            fontSize: "11px",
            letterSpacing: "0.04em",
            wordBreak: "break-all",
          }}
        >
          {entry.label} · {entry.address}
        </p>
        <p
          data-field="entry-error"
          className="font-mono text-t2"
          style={{
            fontSize: "10px",
            letterSpacing: "0.04em",
            lineHeight: 1.5,
          }}
        >
          {entry.reason}: {entry.message}
        </p>
      </article>
    );
  }

  // `entry.deep` is required on SourcifyEntryOk per the type, but
  // page-level test fixtures spread cast-through-unknown; defensively
  // fall back to "missing" so the drawer doesn't crash on synthetic
  // shapes that omit it.
  const pill = matchVariant(entry.deep?.match);
  const impls = entry.deep?.proxyResolution?.implementations ?? [];

  return (
    <article
      data-entry-index={index}
      data-entry-address={entry.address}
      data-entry-state={pill.variant}
      style={{
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        padding: "14px 16px",
        display: "grid",
        gap: "10px",
      }}
    >
      <header className="flex items-baseline justify-between gap-2">
        <span
          data-field="entry-tag"
          className="font-mono uppercase"
          style={{
            color: "var(--color-src-verified)",
            fontSize: "10px",
            letterSpacing: "0.18em",
          }}
        >
          {SOURCE_TAG}
        </span>
        <TrustPill variant={pill.variant} label={pill.label} />
      </header>

      <div
        className="grid items-baseline gap-2 font-mono"
        style={{
          gridTemplateColumns: "minmax(120px, 1fr) auto",
          fontSize: "11px",
          letterSpacing: "0.04em",
        }}
      >
        <span data-field="entry-name" className="text-t1">
          {entry.label}
        </span>
        <span data-field="entry-chain" className="text-t3 uppercase">
          {chainLabel(entry.chainId)}
        </span>
      </div>

      <a
        data-field="entry-address"
        href={entryHref(entry)}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono"
        style={{
          color: "var(--color-accent)",
          fontSize: "10px",
          letterSpacing: "0.04em",
          wordBreak: "break-all",
        }}
      >
        {entry.address}
      </a>

      {/* Compiler chip if available */}
      {entry.deep?.compilation ? (
        <span
          data-field="compiler-chip"
          className="inline-flex items-baseline gap-2 font-mono text-t3"
          style={{
            fontSize: "9px",
            letterSpacing: "0.1em",
            border: "1px solid var(--color-border-strong)",
            padding: "2px 6px",
            width: "fit-content",
            textTransform: "uppercase",
          }}
        >
          {entry.deep?.compilation.compilerVersion ?? "—"}
          {entry.deep?.compilation.evmVersion
            ? ` · ${entry.deep?.compilation.evmVersion}`
            : ""}
        </span>
      ) : null}

      {/* License chip */}
      {entry.deep?.licenses && entry.deep?.licenses.length > 0 ? (
        <span
          data-field="license-chip"
          className="inline-flex items-baseline gap-2 font-mono text-t3"
          style={{
            fontSize: "9px",
            letterSpacing: "0.1em",
            border: "1px solid var(--color-border-strong)",
            padding: "2px 6px",
            width: "fit-content",
            textTransform: "uppercase",
          }}
        >
          {entry.deep?.licenses[0]?.license ?? "—"}
        </span>
      ) : null}

      {/* Proxy implementation history (when manifest declares a proxy
          AND Sourcify resolves implementations). When US-119 wires
          subjectHygiene into MultiSourceEvidence, this section will
          gain the SAFE / SOFT / COLLISION / REMOVED classification
          per pair — for now, just the implementation list with a note
          flagging that the aggregator hasn't surfaced. */}
      {entry.deep?.proxyResolution?.isProxy === true ? (
        <section
          data-section="impl-history"
          className="mt-1"
          style={{
            borderTop: "1px dotted var(--color-border)",
            paddingTop: "8px",
          }}
        >
          <header
            className="font-mono uppercase text-t3"
            style={{
              fontSize: "9px",
              letterSpacing: "0.16em",
              marginBottom: "4px",
            }}
          >
            proxy · {entry.deep?.proxyResolution.proxyType ?? "unknown"}
            {" · "}
            {impls.length} impl{impls.length === 1 ? "" : "s"}
          </header>
          {impls.length > 0 ? (
            <ul
              className="m-0 list-none p-0"
              style={{
                borderTop: "1px dotted var(--color-border)",
              }}
            >
              {impls.map((impl) => (
                <ImplementationRow
                  key={impl.address}
                  entry={entry}
                  impl={impl}
                />
              ))}
            </ul>
          ) : null}
          <p
            data-field="hygiene-pending"
            className="text-t3"
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: "10px",
              letterSpacing: "0.04em",
              marginTop: "6px",
              lineHeight: 1.4,
            }}
          >
            Storage-layout hygiene aggregator (US-119) is not yet wired
            into MultiSourceEvidence — per-pair classification will
            surface here in a follow-up Stream B PR.
          </p>
        </section>
      ) : null}

      {/* Deep-dive link — uses the existing /r/[name] surface for the
          per-contract verdict. v3 §C-13 spec: Bench Mode embeds the
          /r/[name] component for Sourcify drawer; the inline embed is
          the larger task. For now we link out, preserving the chainId
          + address pre-seed via /lookup/<address> mode-detection. */}
      <a
        data-field="r-name-link"
        href={`/lookup/${entry.address}`}
        className="inline-flex items-baseline gap-2 font-mono"
        style={{
          color: "var(--color-accent)",
          fontSize: "10px",
          letterSpacing: "0.06em",
          textDecoration: "underline",
          textUnderlineOffset: "2px",
        }}
      >
        Open per-contract verdict →
      </a>

      {/* US-140 — Similarity cross-link. Opens /lookup/<address> in a
          new tab so judges can pivot to the per-contract verdict
          without losing the Bench surface. Distinct from the
          same-tab deep-dive above: this is the explicit "I want to
          dig into this contract's similarity neighbourhood" path,
          aligned with the Sourcify bytecode-similarity flow shipped
          in US-121.
          aria-label includes the address verbatim so screen-reader
          users hear which contract the link targets when navigating
          a list of entries. */}
      <a
        data-field="similarity-button"
        data-address={entry.address}
        href={`/lookup/${entry.address}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open similarity lookup for ${entry.address} in new tab`}
        className="inline-flex items-center"
        style={{
          color: "var(--color-accent)",
          border: "1px solid var(--color-border)",
          padding: "12px 16px",
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          letterSpacing: "0.06em",
          width: "fit-content",
        }}
      >
        Find similar contracts ↗
      </a>
    </article>
  );
}

export function SourcifyDrawer({
  entries,
  initialOpen = false,
}: SourcifyDrawerProps): React.JSX.Element {
  if (entries.length === 0) {
    return (
      <details
        data-section="sourcify-drawer"
        data-state="absent"
        open={initialOpen}
        style={{
          border: "1px dashed var(--color-border-strong)",
          background: "var(--color-raised)",
          padding: "14px 20px",
        }}
      >
        <summary
          className="font-mono uppercase text-t3"
          style={{
            fontSize: "10px",
            letterSpacing: "0.18em",
            cursor: "pointer",
          }}
        >
          Sourcify · absent
        </summary>
        <p
          className="mt-3 font-mono text-t3"
          style={{
            fontSize: "11px",
            letterSpacing: "0.04em",
            lineHeight: 1.5,
          }}
        >
          Subject manifest declares no Sourcify projects. Per EPIC §10,
          Sourcify is the only verified seniority source — without it,
          the seniority axis ceiling drops materially.
        </p>
      </details>
    );
  }

  const okCount = entries.filter((e) => e.kind === "ok").length;
  const errorCount = entries.length - okCount;

  return (
    <details
      data-section="sourcify-drawer"
      data-state="ok"
      data-entry-count={entries.length}
      open={initialOpen}
      style={{
        border: "1px solid var(--color-border)",
        background: "var(--color-raised)",
      }}
    >
      <summary
        data-block="drawer-trigger"
        className="flex flex-wrap items-baseline justify-between gap-3"
        style={{
          padding: "14px 20px",
          cursor: "pointer",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <span
          className="font-mono uppercase text-t1"
          style={{
            fontSize: "11px",
            letterSpacing: "0.18em",
          }}
        >
          Sourcify · {entries.length} entr
          {entries.length === 1 ? "y" : "ies"}
        </span>
        <span
          className="font-mono text-t3"
          style={{
            fontSize: "10px",
            letterSpacing: "0.06em",
          }}
        >
          {okCount} verified · {errorCount} failed
        </span>
      </summary>

      <div
        data-block="entry-grid"
        className="grid gap-3"
        style={{
          padding: "20px",
        }}
      >
        {entries.map((entry, i) => (
          <EntryRow key={`${entry.chainId}-${entry.address}`} entry={entry} index={i} />
        ))}
      </div>

      <p
        data-field="drawer-meta"
        className="text-t3"
        style={{
          padding: "12px 20px 16px",
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: "10px",
          letterSpacing: "0.04em",
          background: "var(--color-bg)",
        }}
      >
        Sourcify is the only verified seniority source in the v1 score —
        every signal here counts × 1.00 (EPIC §10 lock).
      </p>
    </details>
  );
}
