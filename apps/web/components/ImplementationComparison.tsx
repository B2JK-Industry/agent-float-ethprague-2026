"use client";

import { useState } from "react";
import type { Address } from "@upgrade-siren/shared";

/**
 * Previous implementation side. May be null when no upgrade has happened yet
 * (the manifest's `previousImpl` matches `currentImpl`) — matches the
 * `SirenReport.previousImplementation` shape (`Address | null`).
 */
export type ImplementationPreviousSide = {
  readonly address: Address | null;
  readonly verified?: boolean | null;
  readonly sourcifyUrl?: string;
  readonly deployedAtBlock?: number;
  readonly changedAt?: string;
};

/**
 * Current implementation side. The address is required and the verification
 * status is required as a non-null boolean — matches the canonical
 * `SirenReport.currentImplementation: Address` and
 * `SirenReport.sourcify.currentVerified: boolean`. This makes invalid
 * `current={{ address: null }}` callers a compile error rather than a
 * silent rendering of `none`/`verification unknown`.
 */
export type ImplementationCurrentSide = {
  readonly address: Address;
  readonly verified: boolean;
  readonly sourcifyUrl?: string;
  readonly deployedAtBlock?: number;
  readonly changedAt?: string;
};

/**
 * @deprecated Kept as an alias for callers that previously accepted either
 * side; new callers should pick the precise `Previous` / `Current` form.
 */
export type ImplementationSide = ImplementationPreviousSide;

export type ImplementationComparisonProps = {
  previous: ImplementationPreviousSide;
  current: ImplementationCurrentSide;
};

const SOURCIFY_LOOKUP_PREFIX = "https://sourcify.dev/#/lookup/";

/**
 * Build a Sourcify lookup URL for a verified contract that did not ship a
 * pre-baked link. The Sourcify UI accepts the address directly, so we can
 * always derive a working link rather than rendering a non-clickable
 * `verified` label and silently dropping the GATE-9 evidence requirement.
 */
function deriveSourcifyUrl(
  address: string,
  explicit: string | undefined,
): string {
  if (explicit) return explicit;
  return `${SOURCIFY_LOOKUP_PREFIX}${address}`;
}

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
        // ignore
      }
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Copy address ${value}`}
      className="text-xs underline opacity-60 hover:opacity-100"
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

function VerificationLabel({
  address,
  verified,
  sourcifyUrl,
}: {
  address: string;
  verified?: boolean | null;
  sourcifyUrl?: string;
}): React.JSX.Element {
  if (verified === true) {
    return (
      <a
        href={deriveSourcifyUrl(address, sourcifyUrl)}
        target="_blank"
        rel="noopener noreferrer"
        data-verification="verified"
        className="text-xs underline text-[color:var(--color-verdict-safe)]"
      >
        verified on Sourcify
      </a>
    );
  }
  if (verified === false) {
    return (
      <span data-verification="unverified" className="text-xs text-[color:var(--color-verdict-siren)]">
        unverified
      </span>
    );
  }
  return (
    <span data-verification="unknown" className="text-xs text-[color:var(--color-t2)]">
      verification unknown
    </span>
  );
}

function SideColumn({
  heading,
  side,
  testId,
}: {
  heading: string;
  side: ImplementationPreviousSide | ImplementationCurrentSide;
  testId: string;
}): React.JSX.Element {
  if (side.address === null) {
    return (
      <article
        data-testid={testId}
        className="flex flex-col gap-2 rounded border border-[color:var(--color-border)] bg-[color:var(--color-raised)] p-3"
      >
        <h3 className="text-sm font-bold">{heading}</h3>
        <p className="text-sm text-[color:var(--color-t2)]">none</p>
      </article>
    );
  }

  return (
    <article
      data-testid={testId}
      data-address={side.address}
      className="flex flex-col gap-2 rounded border border-[color:var(--color-border)] bg-[color:var(--color-raised)] p-3"
    >
      <h3 className="text-sm font-bold">{heading}</h3>
      <div className="flex items-center gap-2">
        <code className="font-mono text-sm">{truncateAddress(side.address)}</code>
        <CopyButton value={side.address} />
      </div>
      <VerificationLabel
        address={side.address}
        verified={side.verified}
        sourcifyUrl={side.sourcifyUrl}
      />
      {side.deployedAtBlock !== undefined ? (
        <p className="text-xs text-[color:var(--color-t2)]">
          deployed at block {side.deployedAtBlock.toLocaleString()}
        </p>
      ) : null}
      {side.changedAt ? (
        <time
          dateTime={side.changedAt}
          className="text-xs text-[color:var(--color-t2)]"
        >
          changed {new Date(side.changedAt).toISOString().slice(0, 10)}
        </time>
      ) : null}
    </article>
  );
}

export function ImplementationComparison({
  previous,
  current,
}: ImplementationComparisonProps): React.JSX.Element {
  return (
    <section
      aria-label="Implementation comparison"
      className="grid grid-cols-1 gap-3 md:grid-cols-2"
    >
      <SideColumn heading="Previous implementation" side={previous} testId="impl-previous" />
      <SideColumn heading="Current implementation" side={current} testId="impl-current" />
    </section>
  );
}
