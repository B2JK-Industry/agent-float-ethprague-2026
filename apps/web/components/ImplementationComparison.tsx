"use client";

import { useState } from "react";
import type { Address } from "@upgrade-siren/shared";

export type ImplementationPreviousSide = {
  readonly address: Address | null;
  readonly verified?: boolean | null;
  readonly sourcifyUrl?: string;
  readonly deployedAtBlock?: number;
  readonly changedAt?: string;
};

export type ImplementationCurrentSide = {
  readonly address: Address;
  readonly verified: boolean;
  readonly sourcifyUrl?: string;
  readonly deployedAtBlock?: number;
  readonly changedAt?: string;
};

export type ImplementationSide = ImplementationPreviousSide;

export type ImplementationComparisonProps = {
  previous: ImplementationPreviousSide;
  current: ImplementationCurrentSide;
};

const SOURCIFY_LOOKUP_PREFIX = "https://sourcify.dev/#/lookup/";

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
      className="font-mono uppercase tracking-[0.16em] text-t3 hover:text-accent"
      style={{ fontSize: "9px", letterSpacing: "0.18em" }}
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
        className="inline-flex items-baseline gap-1 font-mono text-verdict-safe hover:underline"
        style={{
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.16em",
        }}
      >
        <span aria-hidden>✓</span> verified on Sourcify
      </a>
    );
  }
  if (verified === false) {
    return (
      <span
        data-verification="unverified"
        className="inline-flex items-baseline gap-1 font-mono text-verdict-siren"
        style={{
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.16em",
        }}
      >
        <span aria-hidden>×</span> unverified
      </span>
    );
  }
  return (
    <span
      data-verification="unknown"
      className="font-mono text-t3"
      style={{
        fontSize: "10px",
        textTransform: "uppercase",
        letterSpacing: "0.16em",
      }}
    >
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
        className="flex flex-col gap-3 border border-border bg-surface p-5"
      >
        <h3
          className="font-mono text-t3"
          style={{
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
          }}
        >
          {heading}
        </h3>
        <div
          aria-hidden="true"
          style={{ borderTop: "1px dotted var(--color-border)", height: 0 }}
        />
        <p
          className="font-mono text-t3"
          style={{
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.16em",
          }}
        >
          none
        </p>
      </article>
    );
  }

  return (
    <article
      data-testid={testId}
      data-address={side.address}
      className="flex flex-col gap-3 border border-border bg-surface p-5"
    >
      <h3
        className="font-mono text-t3"
        style={{
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.18em",
        }}
      >
        {heading}
      </h3>
      <div
        aria-hidden="true"
        style={{ borderTop: "1px dotted var(--color-border)", height: 0 }}
      />
      <div className="flex items-center justify-between gap-3">
        <code
          className="font-mono text-t1"
          style={{ fontSize: "13px", letterSpacing: "0.04em" }}
        >
          {truncateAddress(side.address)}
        </code>
        <CopyButton value={side.address} />
      </div>
      <VerificationLabel
        address={side.address}
        verified={side.verified}
        sourcifyUrl={side.sourcifyUrl}
      />
      {side.deployedAtBlock !== undefined ? (
        <p
          className="font-mono text-t3"
          style={{ fontSize: "10px", letterSpacing: "0.04em" }}
        >
          block <span className="text-t1">{side.deployedAtBlock.toLocaleString()}</span>
        </p>
      ) : null}
      {side.changedAt ? (
        <time
          dateTime={side.changedAt}
          className="font-mono text-t3"
          style={{ fontSize: "10px", letterSpacing: "0.04em" }}
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
      className="grid grid-cols-1 gap-4 md:grid-cols-2"
    >
      <SideColumn
        heading="Previous implementation"
        side={previous}
        testId="impl-previous"
      />
      <SideColumn
        heading="Current implementation"
        side={current}
        testId="impl-current"
      />
    </section>
  );
}