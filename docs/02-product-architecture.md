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

1. User enters an ENS name such as `vault.demo.upgradesiren.eth`, or a protocol address / ENS address record for public-read fallback.
2. App attempts the signed manifest path by resolving `upgrade-siren:*` records live, plus ENSIP-26 records when shipped.
3. If Upgrade Siren records are absent, app enters public-read mode and labels confidence as lower.
4. App reads the proxy implementation slot and recent upgrade events.
5. App fetches Sourcify evidence for old and new implementations where available.
6. Engine compares verification, ABI, storage layout, admin powers, ENS consistency, report hash, and signature authority.
7. UI shows `SAFE`, `REVIEW`, or `SIREN`.
8. User opens evidence drawer or copies a governance-ready comment.

## Core Modules

| Module | Responsibility |
|---|---|
| ENS Contract Map | Live resolution of named proxy, versions, report, schema, and operator owner |
| Public-Read Fallback | Lower-confidence analysis for addresses or ENS names without Upgrade Siren records |
| Proxy Detector | Reads EIP-1967 implementation slot and upgrade events |
| Sourcify Evidence Engine | Fetches verification/source/ABI/metadata/storage evidence |
| Diff Engine | Produces deterministic findings from old/new implementations |
| Report Builder | Creates JSON report and user-facing summary |
| Web UX | Presents verdict, evidence, and recommended action |
| Siren Agent | Runs recurring checks and signs reports |

## ENS Contract Map

ENS is the public identity and routing layer. Stable records live directly in ENS:

| Record | Example | Use |
|---|---|---|
| `upgrade-siren:chain_id` | `11155111` | Select RPC and Sourcify chain |
| `upgrade-siren:proxy` | `0x...` | Contract to inspect |
| `upgrade-siren:owner` | `0x...` | Address authorized to sign reports |
| `upgrade-siren:schema` | `ipfs://...` or `https://...` | Record schema |

Upgrade-changing data uses one atomic record:

| Record | Example | Use |
|---|---|---|
| `upgrade-siren:upgrade_manifest` | JSON object | Previous/current implementation, report URI/hash, version, effective timestamp, previous manifest hash |

ENSIP-26-compatible records are also published as P1 sponsor polish:

| Record | Example | Use |
|---|---|---|
| `agent-context` | `Upgrade Siren risk report for vault.demo.upgradesiren.eth` | Standards-based context |
| `agent-endpoint[web]` | `https://upgradesiren.app/r/vault.demo.upgradesiren.eth` | Web report endpoint |
| `agent-endpoint[mcp]` | `https://...` | P2 Siren Agent endpoint |

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
| Proxy slot disagrees with manifest current implementation | `SIREN` |
| `upgrade-siren:upgrade_manifest` absent | Public-read mode: `REVIEW` unless a `SIREN` rule triggers; never `SAFE` |
| `upgrade-siren:owner` absent in signed-manifest path | `SIREN` because report authority cannot be verified |
| Production report missing valid EIP-712 signature from `upgrade-siren:owner` | `SIREN` |
| Manifest mismatch during real upgrade window | P0 conservative: `SIREN` with reason `manifest stale or unexpected upgrade`; P1 may add grace-policy handling if mentor feedback supports it |
| Dangerous privileged selector added | `REVIEW` or `SIREN` |
| Storage layout incompatible | `SIREN` |
| Admin/timelock got weaker | `REVIEW` or `SIREN` |
| Both implementations verified and diff is low risk | `SAFE` |
| Both implementations verified and low risk in public-read mode | `REVIEW` because no operator-signed manifest exists |

## Confidence Modes

| Mode | Meaning | Can return `SAFE`? |
|---|---|---|
| `signed-manifest` | Upgrade Siren records exist, report hash matches, and EIP-712 signature recovers to `upgrade-siren:owner` | Yes |
| `public-read` | No Upgrade Siren manifest; analysis uses public chain state and Sourcify only | No |
| `mock` | Fixture/demo-only data path | No production claims |

## Siren Agent

The agent monitors a watchlist and runs the same analysis repeatedly. It can be positioned for Umia as a venture due-diligence agent:

- pre-launch readiness check
- post-launch upgrade monitoring
- signed risk report
- public watchlist of funded ventures

This is optional. The core product must still work without Umia.
