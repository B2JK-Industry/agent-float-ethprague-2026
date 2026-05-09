"use client";

import { useState, useEffect, useRef } from "react";
import type { SirenReport } from "@upgrade-siren/shared";

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

export function EvidenceDrawer({
  report,
  abiSummary,
  storageSummary,
  reportUrl,
  initialOpen = false,
}: EvidenceDrawerProps): React.JSX.Element {
  const [open, setOpen] = useState<boolean>(initialOpen);
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="evidence-drawer"
        className="rounded border border-[color:var(--color-t1)] px-3 py-1 text-sm"
      >
        Evidence
      </button>
      {open ? (
        <aside
          id="evidence-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Evidence drawer"
          className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto bg-[color:var(--color-raised)] p-6 shadow-xl"
        >
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close evidence drawer"
            className="absolute right-4 top-4 rounded text-2xl leading-none"
          >
            ×
          </button>

          <h2 className="mb-4 text-lg font-bold">Evidence</h2>

          <section aria-label="Sourcify links" className="mb-4">
            <h3 className="mb-2 text-sm font-bold">Sourcify</h3>
            <ul className="flex flex-col gap-1 text-sm">
              {report.sourcify.links.length === 0 ? (
                <li className="text-[color:var(--color-t2)]">
                  unverified
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

          <section aria-label="ABI summary" className="mb-4">
            <h3 className="mb-2 text-sm font-bold">ABI</h3>
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

          <section aria-label="Storage layout" className="mb-4">
            <h3 className="mb-2 text-sm font-bold">Storage layout</h3>
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
              className="inline-block rounded border border-[color:var(--color-t1)] px-3 py-1 text-sm"
            >
              Download report JSON
            </a>
          ) : null}
        </aside>
      ) : null}
    </>
  );
}
