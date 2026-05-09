"use client";

import { useState } from "react";
import type { Address } from "@upgrade-siren/shared";

export type ImplementationSide = {
  readonly address: Address | null;
  readonly verified?: boolean | null;
  readonly sourcifyUrl?: string;
  readonly deployedAtBlock?: number;
  readonly changedAt?: string;
};

export type ImplementationComparisonProps = {
  previous: ImplementationSide;
  current: ImplementationSide;
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
  verified,
  sourcifyUrl,
}: {
  verified?: boolean | null;
  sourcifyUrl?: string;
}): React.JSX.Element {
  if (verified === true) {
    if (sourcifyUrl) {
      return (
        <a
          href={sourcifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-verification="verified"
          className="text-xs underline text-[color:var(--color-safe)]"
        >
          verified on Sourcify
        </a>
      );
    }
    return (
      <span data-verification="verified" className="text-xs text-[color:var(--color-safe)]">
        verified
      </span>
    );
  }
  if (verified === false) {
    return (
      <span data-verification="unverified" className="text-xs text-[color:var(--color-siren)]">
        unverified
      </span>
    );
  }
  return (
    <span data-verification="unknown" className="text-xs text-[color:var(--color-text-muted)]">
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
  side: ImplementationSide;
  testId: string;
}): React.JSX.Element {
  if (side.address === null) {
    return (
      <article
        data-testid={testId}
        className="flex flex-col gap-2 rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-3"
      >
        <h3 className="text-sm font-bold">{heading}</h3>
        <p className="text-sm text-[color:var(--color-text-muted)]">none</p>
      </article>
    );
  }

  return (
    <article
      data-testid={testId}
      data-address={side.address}
      className="flex flex-col gap-2 rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-3"
    >
      <h3 className="text-sm font-bold">{heading}</h3>
      <div className="flex items-center gap-2">
        <code className="font-mono text-sm">{truncateAddress(side.address)}</code>
        <CopyButton value={side.address} />
      </div>
      <VerificationLabel
        verified={side.verified}
        sourcifyUrl={side.sourcifyUrl}
      />
      {side.deployedAtBlock !== undefined ? (
        <p className="text-xs text-[color:var(--color-text-muted)]">
          deployed at block {side.deployedAtBlock.toLocaleString()}
        </p>
      ) : null}
      {side.changedAt ? (
        <time
          dateTime={side.changedAt}
          className="text-xs text-[color:var(--color-text-muted)]"
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
