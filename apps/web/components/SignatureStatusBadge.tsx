"use client";

import { useState } from "react";
import type { SirenReport } from "@upgrade-siren/shared";

export type SignatureStatusBadgeProps = {
  auth: SirenReport["auth"];
};

function truncateAddress(address: string): string {
  return address.length >= 10
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address;
}

function CopyButton({ value }: { value: string }): React.JSX.Element {
  const [copied, setCopied] = useState<boolean>(false);

  async function onClick(): Promise<void> {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        // clipboard unavailable; surface no error in the badge itself.
      }
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Copy signer address ${value}`}
      // No `opacity-60` here: at 60% alpha the green/amber/red foreground
      // blends with the surf background to ~3.8:1 contrast, below the
      // WCAG 2.1 AA 4.5:1 floor for ≤ 14px text. Underline-on-hover gives
      // the affordance signal instead.
      className="ml-1 text-current underline-offset-2 hover:underline"
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

export function SignatureStatusBadge({
  auth,
}: SignatureStatusBadgeProps): React.JSX.Element {
  if (auth.status === "valid") {
    const signer = auth.signer ?? "0x";
    return (
      <span
        role="status"
        data-status="signed"
        aria-label={`Signed by ${signer}`}
        className="inline-flex items-center gap-1 border border-[color:var(--color-verdict-safe)] px-2 py-0.5 text-xs text-[color:var(--color-verdict-safe)]"
      >
        <span aria-hidden>✓</span>
        <span>
          Signed by{" "}
          <span className="font-mono">{truncateAddress(signer)}</span>
        </span>
        <CopyButton value={signer} />
      </span>
    );
  }

  if (auth.status === "unsigned") {
    return (
      <span
        role="status"
        data-status="unsigned"
        aria-label="No operator signature"
        className="inline-flex items-center gap-1 border border-[color:var(--color-verdict-review)] px-2 py-0.5 text-xs text-[color:var(--color-verdict-review)]"
      >
        <span aria-hidden>!</span>
        <span>No operator signature</span>
      </span>
    );
  }

  return (
    <span
      role="status"
      data-status="signature-invalid"
      aria-label="Signature mismatch"
      className="inline-flex items-center gap-1 border border-[color:var(--color-verdict-siren)] px-2 py-0.5 text-xs text-[color:var(--color-verdict-siren)]"
    >
      <span aria-hidden>×</span>
      <span>Signature mismatch</span>
    </span>
  );
}
