# Project Overview

## What We Are Building

Upgrade Siren is a public alarm for upgradeable Ethereum contracts. It helps DAO voters, delegates, wallets, explorers, and launch reviewers understand whether a named contract upgrade is transparent enough to trust.

The product does not claim to audit contracts fully. It answers a narrower question:

> Did this named protocol upgrade to code that is verified, expected, and not obviously dangerous?

## Why It Matters

Upgradeable proxies preserve the same user-facing address while changing implementation code. That is powerful, but risky. Users often see the same protocol name and the same address while the trust assumption has changed.

Upgrade Siren makes that change visible.

## Product Loop

1. Resolve ENS name.
2. Read proxy and implementation data.
3. Fetch Sourcify verification evidence.
4. Compare old and new implementations.
5. Produce `SAFE`, `REVIEW`, or `SIREN`.
6. Generate a public report and governance-ready comment.

## Non-Goals

- Not a generic scanner.
- Not an AI auditor.
- Not a token launchpad.
- Not a marketplace.
- Not a replacement for audits.
- Not a claim that verified source means safe code.

## Success Criteria

A judge should understand in under 10 seconds:

> The same protocol name now points to changed code, and Upgrade Siren can prove whether that code is verified and expected.
