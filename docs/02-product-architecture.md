# Product Architecture

## Product Promise

Upgrade Siren answers:

> Can this named protocol upgrade be trusted right now?

The answer is not a long audit report first. The answer is a verdict first, with evidence behind it.

## Main Actors

| Actor | Goal |
|---|---|
| DAO voter | Decide whether to approve an upgrade |
| Delegate | Understand risk before voting |
| Wallet / explorer | Warn users before they interact |
| Protocol team | Publish transparent upgrade evidence |
| Venture reviewer | Check contract risk before funding |
| Siren Agent | Monitor named contracts and produce reports |

## User Journey

1. User enters an ENS name such as `vault.demo.upgradesiren.eth`.
2. App resolves ENS records live.
3. App reads the proxy implementation slot and recent upgrade events.
4. App fetches Sourcify evidence for old and new implementations.
5. Engine compares verification, ABI, storage layout, admin powers, and ENS consistency.
6. UI shows `SAFE`, `REVIEW`, or `SIREN`.
7. User opens evidence drawer or copies a governance-ready comment.

## Core Modules

| Module | Responsibility |
|---|---|
| ENS Contract Map | Live resolution of named proxy, versions, report, and schema |
| Proxy Detector | Reads EIP-1967 implementation slot and upgrade events |
| Sourcify Evidence Engine | Fetches verification/source/ABI/metadata/storage evidence |
| Diff Engine | Produces deterministic findings from old/new implementations |
| Report Builder | Creates JSON report and user-facing summary |
| Web UX | Presents verdict, evidence, and recommended action |
| Siren Agent | Runs recurring checks and signs reports |

## ENS Contract Map

ENS is the public identity and routing layer. Demo records:

| Record | Example | Use |
|---|---|---|
| `siren:chain_id` | `11155111` | Select RPC and Sourcify chain |
| `siren:proxy` | `0x...` | Contract to inspect |
| `siren:previous_impl` | `0x...` | Baseline implementation |
| `siren:current_impl` | `0x...` | Expected current implementation |
| `siren:report_uri` | `https://...` | Latest public report |
| `siren:report_hash` | `0x...` | Report integrity |
| `siren:schema` | `ipfs://...` or `https://...` | Record schema |

## Sourcify Evidence

Sourcify provides the proof that a contract is understandable:

- full or partial verification status
- metadata and compiler settings
- ABI
- source paths
- storage layout if published by compiler metadata
- contract links for judge inspection

## Verdict Logic

| Signal | Result |
|---|---|
| New implementation unverified | `SIREN` |
| Proxy slot disagrees with ENS current implementation | `SIREN` |
| Dangerous privileged selector added | `REVIEW` or `SIREN` |
| Storage layout incompatible | `SIREN` |
| Admin/timelock got weaker | `REVIEW` or `SIREN` |
| Both implementations verified and diff is low risk | `SAFE` |

## Siren Agent

The agent monitors a watchlist and runs the same analysis repeatedly. It can be positioned for Umia as a venture due-diligence agent:

- pre-launch readiness check
- post-launch upgrade monitoring
- signed risk report
- public watchlist of funded ventures

This is optional. The core product must still work without Umia.
