# Upgrade Siren — Scope

> **Status:** Pivot scope prepared 2026-05-08. Code blocked until Daniel explicitly confirms this as the final build scope.
> **Hackathon:** ETHPrague 2026 in-person.
> **Submission deadline:** 2026-05-10 12:00 PM via Devfolio.

## 1. Identity

| Field | Value |
|---|---|
| Project name | **Upgrade Siren** |
| Product agent | **Siren Agent** |
| Pitch sentence | *Upgrade Siren warns DAO voters and venture investors when a named protocol upgrade changes what they are trusting.* |
| Stage tagline | **No source, no upgrade.** |
| Category | Public upgrade-risk alarm for Ethereum contracts |
| Primary sponsor target | Sourcify |
| Secondary sponsor target | ENS Most Creative Use |
| Organizer target | Future Society |
| Optional alternate sponsor | Umia, only as Siren Agent for venture due diligence |

## 2. Problem

Ethereum users, DAO voters, funds, and launch platforms often trust upgradeable contracts without seeing what changed. Proxy upgrades can introduce new privileged functions, storage-layout hazards, unsafe admin paths, unverified implementations, or treasury-control changes.

The current tooling is fragmented:

- Explorers show addresses and events, but not a user-facing upgrade verdict.
- Audit tools are developer-oriented and often pre-deployment.
- Monitoring tools alert teams, not public DAO voters.
- ENS contract naming exists, but is rarely used as a safety surface for versioned contracts.
- Sourcify exposes rich verified-contract data, but normal users do not read source metadata or storage layouts.

Upgrade Siren turns these fragments into a public alarm.

## 3. Product Rule

**No source, no upgrade.**

An upgrade that points users to an unverified implementation must be treated as unsafe until proven otherwise. Verification is not enough to prove safety, but lack of verification is enough to block trust.

## 4. Target Users

| User | Need | Upgrade Siren output |
|---|---|---|
| DAO voter | Know whether to approve a protocol upgrade | Verdict + governance-ready comment |
| Delegate | Fast technical summary before voting | Sourcify-backed evidence report |
| Fund / investor | Due diligence before funding an onchain venture | Contract transparency and upgrade-risk score |
| Umia-style launch reviewer | Screen venture contracts before launch and monitor after funding | Siren Agent report and watchlist |
| Wallet / explorer | Display upgrade warnings in user flow | API-ready risk result |
| Protocol team | Publish transparent upgrade evidence | ENS contract map and public report |

## 5. Sponsor Strategy

| Priority | Track | Fit | Submission stance |
|---|---|---|---|
| 1 | **Sourcify Bounty** | Core evidence source: verified source, ABI, metadata, storage layout, bytecode, similarity search | Submit |
| 2 | **ENS Most Creative Use** | ENS names and records become contract/version/report discovery, not cosmetic labels | Submit |
| 3 | **ETHPrague Future Society** | Public-good security for users and DAO governance | Submit |
| Optional | **Umia Best Agentic Venture** | Siren Agent as due-diligence and monitoring agent for tokenized onchain ventures | Submit only if Daniel swaps strategy after mentor feedback |

Hard cap: **2 sponsor tracks + 1 organizer track** unless Daniel explicitly overrides.

## 6. What We Are Not

- Not a generic smart contract scanner
- Not an AI auditor
- Not a replacement for audits
- Not an explorer clone
- Not an agent marketplace
- Not a launchpad
- Not an ENS profile manager
- Not Agent Float
- Not SBO3L or a policy-boundary derivative

## 7. Core Product

### ENS Contract Map

Protocol contract identity is anchored in ENS. Demo names use a controlled parent such as:

```text
demo.upgradesiren.eth
vault.demo.upgradesiren.eth
v1.vault.demo.upgradesiren.eth
v2.vault.demo.upgradesiren.eth
latest.vault.demo.upgradesiren.eth
report.vault.demo.upgradesiren.eth
```

Required live records:

| Record | Purpose |
|---|---|
| `siren:chain_id` | Chain where contracts live |
| `siren:proxy` | Proxy address |
| `siren:previous_impl` | Previous implementation address |
| `siren:current_impl` | Current implementation address |
| `siren:report_uri` | Latest report pointer |
| `siren:report_hash` | Integrity hash for latest report |
| `siren:owner` | Operator or protocol owner reference |
| `siren:schema` | JSON schema pointer for records |

ENS must be live-resolved in the app. No hardcoded demo values in the product path.

### Proxy Upgrade Detector

Must support:

- EIP-1967 implementation slot lookup
- `Upgraded(address)` event detection
- Current implementation vs ENS-declared current implementation check
- Previous implementation selection from event history or ENS record
- Admin / owner / timelock heuristics where available

### Sourcify Evidence Engine

For old and new implementations:

- Fetch verification status
- Fetch source metadata
- Fetch ABI
- Fetch compiler metadata
- Fetch storage layout if available
- Fetch bytecode metadata
- Optionally use Sourcify 4byte API and similarity search for unverified or partially-known contracts

Diff checks:

| Check | SIREN condition |
|---|---|
| Verification | New implementation unverified |
| ABI | New privileged selector added |
| Storage | Incompatible slot/type/order change |
| Admin power | New `upgradeTo`, `setOwner`, `setAdmin`, `sweep`, `withdraw`, `mint`, `pause`, arbitrary `call` |
| Timelock | Upgrade admin not timelocked or timelock disappeared |
| ENS consistency | ENS `latest` record does not match live proxy slot |
| Source risk | Dangerous low-level calls added without clear guard |

### Siren Report

Report fields:

```json
{
  "name": "vault.demo.upgradesiren.eth",
  "chainId": 11155111,
  "proxy": "0x...",
  "previousImplementation": "0x...",
  "currentImplementation": "0x...",
  "verdict": "SAFE | REVIEW | SIREN",
  "summary": "Human-readable explanation",
  "findings": [],
  "sourcify": {
    "previousVerified": true,
    "currentVerified": false,
    "links": []
  },
  "ens": {
    "recordsResolvedLive": true,
    "recordHash": "0x..."
  },
  "recommendedAction": "approve | review | reject | wait",
  "generatedAt": "ISO-8601",
  "signature": "optional EIP-712 signature"
}
```

### Siren Agent

The agentic component watches a list of ENS contract maps or venture contract sets, triggers analysis on changes, and signs reports.

For Umia framing, Siren Agent becomes:

> A due-diligence and post-launch monitoring agent for onchain ventures.

It checks whether a venture is ready to fund, needs review, or should be blocked until contract risks are resolved.

## 8. Demo Scope

Prepare three demo upgrade scenarios:

| Scenario | Description | Expected verdict |
|---|---|---|
| Safe upgrade | Verified v1 to verified v2, compatible storage, no dangerous selectors | `SAFE` |
| Dangerous upgrade | Verified v2 adds `sweep()` and incompatible storage layout | `SIREN` |
| Unverified upgrade | Proxy points to unverified implementation or ENS record mismatch | `SIREN` |

Demo UI must show:

- ENS lookup field
- Big verdict card
- Before/after implementation comparison
- Human diff
- Evidence drawer
- Sourcify links
- ENS records resolved live
- Governance comment generator
- Optional Siren Agent watchlist / Umia due-diligence panel

## 9. Acceptance Gates

1. ENS is live-resolved, not hardcoded.
2. Sourcify is the source of verification and metadata evidence.
3. Demo includes at least one safe and one dangerous upgrade.
4. Report includes deterministic findings, not only LLM text.
5. UI shows `SAFE`, `REVIEW`, or `SIREN` within five seconds.
6. Every mock path is labeled `mock: true`.
7. Pitch does not say "generic scanner", "AI auditor", "trust layer", or "agent OS".
8. Run instructions reproduce the demo locally.

## 10. Workstreams

| Track | Ownership | Scope |
|---|---|---|
| A | Contract fixtures | Demo proxy, safe implementation, dangerous implementation, deploy/verify scripts |
| B | Evidence engine | ENS resolution, EIP-1967 slot reads, event reads, Sourcify fetch, diff logic |
| C | Web UX | Next.js app, verdict UI, evidence drawer, governance comment |
| D | Siren Agent | Watchlist runner, signed report, Umia-style due-diligence panel |
| E | Docs / submission | Sponsor pitch, demo script, risk register, video script |

## 11. Product Decisions

- Sourcify and ENS are primary.
- Umia is a business integration story, not the default sponsor target.
- Swarm is not in current scope.
- SpaceComputer is skipped.
- Apify is not needed.
- No tokenomics document; this is not a token project.
- No custom marketplace or launchpad.
