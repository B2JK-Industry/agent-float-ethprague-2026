"use client";

// Global top-bar — sticky to the top of every page. Logo / brand on
// the left, ConnectKit wallet button on the right. Subject-specific
// publish flow lives in BenchPublishWidget which the /b/[name] page
// renders below this header.

import Link from "next/link";
import { ConnectKitButton } from "connectkit";

export function GlobalHeader(): React.JSX.Element {
  return (
    <header
      data-block="global-header"
      className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-bg px-6 py-3"
    >
      <Link
        href="/"
        className="flex items-baseline gap-2 font-mono text-xs uppercase tracking-[0.18em] text-t1 hover:text-accent"
      >
        <span aria-hidden className="font-display text-base font-bold leading-none">
          U·S
        </span>
        <span className="text-t2">Upgrade Siren</span>
      </Link>
      <ConnectKitButton.Custom>
        {({ isConnected, show, truncatedAddress, ensName }) => {
          return (
            <button
              type="button"
              onClick={show}
              data-wallet-connected={isConnected ? "true" : "false"}
              className="inline-flex items-center gap-2 border border-accent bg-bg px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-accent hover:bg-accent hover:text-bg"
            >
              {isConnected ? (
                <>
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 rounded-full bg-verdict-safe"
                  />
                  <span>{ensName ?? truncatedAddress}</span>
                </>
              ) : (
                <>
                  <span aria-hidden>◇</span>
                  <span>Connect wallet</span>
                </>
              )}
            </button>
          );
        }}
      </ConnectKitButton.Custom>
    </header>
  );
}