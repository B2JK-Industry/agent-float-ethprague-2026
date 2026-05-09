"use client";

import { useState, useEffect, useRef, type RefObject } from "react";
import type { SirenReport } from "@upgrade-siren/shared";

import {
  BytecodeHypothesis,
  type BytecodeMatchResult,
} from "./BytecodeHypothesis";
import { SourceDiffRenderer, type SourceDiff } from "./SourceDiffRenderer";

export type EvidenceDrawerAbiSummary = {
  readonly selectorCount: number;
  readonly riskyAddedCount: number;
};

export type EvidenceDrawerStorageSummary = {
  readonly tag: "compatible" | "incompatible" | "unknown";
  readonly label?: string;
};

export type EvidenceDrawerProps = {
  report: SirenReport;
  abiSummary?: EvidenceDrawerAbiSummary;
  storageSummary?: EvidenceDrawerStorageSummary;
  /**
   * Source-level diff between previous and current implementations.
   * Optional — only present when the verdict pipeline produced one
   * (Stream B US-075). When absent, the drawer renders a "no source
   * diff available" stub instead of hiding the section, so the layout
   * is stable.
   */
  sourceDiff?: SourceDiff;
  /**
   * V1-anchored bytecode-match hypothesis (US-078 + US-079). Optional —
   * only present when the verdict pipeline produced one. When absent,
   * the hypothesis section is hidden (no stub layout pretending the
   * matcher ran).
   */
  bytecodeMatch?: BytecodeMatchResult;
  reportUrl?: string;
  initialOpen?: boolean;
};

const STORAGE_TAG_COLOR_VAR: Record<
  EvidenceDrawerStorageSummary["tag"],
  string
> = {
  compatible: "var(--color-verdict-safe)",
  incompatible: "var(--color-verdict-siren)",
  unknown: "var(--color-verdict-review)",
};

function previousVerifiedLabel(value: boolean | null): string {
  if (value === null) return "n/a";
  return value ? "verified" : "unverified";
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key !== "Tab") return;
      const node = containerRef.current;
      if (!node) return;
      const focusable = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || !node.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !node.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, containerRef]);
}

export function EvidenceDrawer({
  report,
  abiSummary,
  storageSummary,
  sourceDiff,
  bytecodeMatch,
  reportUrl,
  initialOpen = false,
}: EvidenceDrawerProps): React.JSX.Element {
  const [open, setOpen] = useState<boolean>(initialOpen);
  const [showSourceDiff, setShowSourceDiff] = useState<boolean>(false);
  const drawerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent): void {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [open]);

  useFocusTrap(drawerRef, open);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="evidence-drawer"
        // min-h/-w 44px enforces the iOS HIG / WCAG 2.5.5 minimum tap-target
        // size on touch viewports — asserted by the US-054 mobile e2e spec.
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 border border-accent bg-bg px-5 py-3 font-mono text-sm uppercase tracking-[0.18em] text-accent hover:bg-accent hover:text-bg"
      >
        Open evidence
        <span aria-hidden>→</span>
      </button>
      {open ? (
        <aside
          id="evidence-drawer"
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Evidence drawer"
          className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l border-border-strong bg-raised p-6"
        >
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close evidence drawer"
            className="absolute right-4 top-4 font-mono text-xl leading-none text-t2 hover:text-accent"
          >
            ×
          </button>

          <span
            className="font-mono text-t3"
            style={{
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
            }}
          >
            Verdict pipeline · open ledger
          </span>
          <h2 className="mb-4 mt-1 font-display text-2xl font-semibold text-t1">
            Evidence
          </h2>
          <div
            aria-hidden="true"
            className="mb-4"
            style={{ borderTop: "1px dotted var(--color-border)", height: 0 }}
          />

          <section aria-label="Sourcify links" className="mb-5">
            <h3
              className="mb-2 font-mono text-t3"
              style={{
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
              }}
            >
              Sourcify
            </h3>
            <ul className="flex flex-col gap-1 text-sm">
              {report.sourcify.links.length === 0 &&
              report.sourcify.currentVerified === false &&
              report.sourcify.previousVerified !== true ? (
                <li className="text-[color:var(--color-t2)]">
                  unverified
                </li>
              ) : null}
              {report.sourcify.links.length === 0 &&
              (report.sourcify.currentVerified ||
                report.sourcify.previousVerified === true) ? (
                <li className="text-xs text-[color:var(--color-t2)]">
                  no Sourcify URLs supplied; verification status reported
                  separately below
                </li>
              ) : null}
              {report.sourcify.links.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li className="text-xs text-[color:var(--color-t2)]">
                previous: {previousVerifiedLabel(report.sourcify.previousVerified)}
                {" / current: "}
                {report.sourcify.currentVerified ? "verified" : "unverified"}
              </li>
            </ul>
          </section>

          {bytecodeMatch ? (
            <div className="mb-4">
              <BytecodeHypothesis result={bytecodeMatch} />
            </div>
          ) : null}

          <section aria-label="ABI summary" className="mb-5">
            <h3
              className="mb-2 font-mono text-t3"
              style={{
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
              }}
            >
              ABI
            </h3>
            {abiSummary ? (
              <p className="text-sm">
                {abiSummary.selectorCount} selectors,{" "}
                <span
                  className={
                    abiSummary.riskyAddedCount > 0
                      ? "text-[color:var(--color-verdict-siren)] font-bold"
                      : ""
                  }
                >
                  {abiSummary.riskyAddedCount} risky added
                </span>
              </p>
            ) : (
              <p className="text-sm text-[color:var(--color-t2)]">
                no diff available
              </p>
            )}
          </section>

          <section
            aria-label="Source diff"
            data-section="source-diff"
            className="mb-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <h3
                className="font-mono text-t3"
                style={{
                  fontSize: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                }}
              >
                Source diff
              </h3>
              {sourceDiff && sourceDiff.files.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowSourceDiff((v) => !v)}
                  aria-expanded={showSourceDiff}
                  aria-controls="source-diff-panel"
                  data-action="toggle-source-diff"
                  className="border border-[color:var(--color-t1)] px-2 py-0.5 font-mono text-xs uppercase tracking-wider"
                >
                  {showSourceDiff ? "Hide diff" : "Show diff"}
                </button>
              ) : null}
            </div>
            {sourceDiff && sourceDiff.files.length > 0 ? (
              showSourceDiff ? (
                <div id="source-diff-panel">
                  <SourceDiffRenderer diff={sourceDiff} />
                </div>
              ) : (
                <p
                  id="source-diff-panel"
                  className="text-xs text-[color:var(--color-t2)]"
                >
                  {sourceDiff.files.length} file
                  {sourceDiff.files.length === 1 ? "" : "s"} changed.
                  Click <span className="font-mono">Show diff</span> to inspect
                  hunks.
                </p>
              )
            ) : (
              <p className="text-xs text-[color:var(--color-t2)]">
                no source diff available
              </p>
            )}
          </section>

          <section aria-label="Storage layout" className="mb-5">
            <h3
              className="mb-2 font-mono text-t3"
              style={{
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
              }}
            >
              Storage layout
            </h3>
            {storageSummary ? (
              <span
                data-storage-tag={storageSummary.tag}
                style={{ color: STORAGE_TAG_COLOR_VAR[storageSummary.tag] }}
                className="text-sm font-bold"
              >
                {storageSummary.label ?? storageSummary.tag}
              </span>
            ) : (
              <p className="text-sm text-[color:var(--color-t2)]">
                storage layout not published
              </p>
            )}
          </section>

          {reportUrl ? (
            <a
              href={reportUrl}
              download
              className="inline-flex items-center gap-2 border border-accent bg-bg px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-accent hover:bg-accent hover:text-bg"
            >
              Download report JSON
              <span aria-hidden>↓</span>
            </a>
          ) : null}
        </aside>
      ) : null}
    </>
  );
}
