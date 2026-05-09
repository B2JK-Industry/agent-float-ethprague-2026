# Upgrade Siren — Scope

> **Status:** Epic 1 LOCKED + LIVE 2026-05-09 at https://upgrade-siren.vercel.app — single-contract verdict (`/r/[name]`) shipped. Epic 2 (Bench Mode, `/b/[name]`) LOCKED 2026-05-09 — Section 21 of `EPIC_BENCH_MODE.md` resolved by Daniel; backlog stories US-111..US-146 in active build by Stream A/B/C. Both epics share one engine.
> **Hackathon:** ETHPrague 2026 in-person.
> **Submission deadline:** 2026-05-10 12:00 PM via Devfolio.

## 1. Identity

| Field | Value |
|---|---|
| Project name | **Upgrade Siren** |
| Product agent | **Siren Agent** |
| Pitch sentence | *Upgrade Siren warns DAO voters and venture investors when a named protocol upgrade changes what they are trusting — and benchmarks the seniority and relevance of any ENS-named subject across Sourcify, GitHub, on-chain, and ENS-internal data, with verifiability structurally rewarded.* |
| Front doors | Two: `/r/[name]` Single-Contract Mode (LIVE) and `/b/[name]` Bench Mode (in build) |
| Stage tagline (master) | **No source, no upgrade.** |
| Stage tagline (Bench-mode sub) | **No data, no score.** *(only on `/b/[name]`)* |
| Category | Public verification + reputation surface for Ethereum |
| Primary sponsor target | Sourcify (Bench Mode strengthens this — only verified seniority source) |
| Secondary sponsor target | ENS — track switched 2026-05-09 from Most Creative Use to **AI Agents ($2K) primary**; Most Creative as fallback |
| Organizer target | Future Society |
| Optional alternate sponsor | Umia, only as Siren Agent for venture due diligence (per-subject scoring API in Bench Mode) |

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

| Priority | Track | Fit (Epic 1 + Epic 2) | Submission stance |
|---|---|---|---|
| 1 | **Sourcify Bounty** | Core evidence source: verified source, ABI, metadata, storage layout, bytecode, similarity search. **Bench Mode deepens this** — Sourcify is the *only* verified seniority signal in the score formula (every other source is discounted via the trust-discount mechanic), plus storage-layout history aggregator across implementation chains. | Submit |
| 2 | **ENS — AI Agents ($2K) primary** *(track switched 2026-05-09 from Most Creative per Section 21 D-D lock)* | Bench Mode introduces the `agent-bench:bench_manifest` atomic record under `agent-bench:*` namespace — a universal subject registry where any ENS name (agent, project, team) declares its data sources. Single-Contract Mode's `upgrade-siren:*` records remain. ENS becomes the identity layer for both verdict and benchmark. | Submit |
| — | ENS Most Creative Use | Fallback if AI Agents track signals weak | Backup only |
| 3 | **ETHPrague Future Society** | Public-good transparency primitive — applies to per-upgrade safety (Epic 1) and per-subject verifiability (Epic 2). Score formula is open-source + deterministic; trust-discount on unverified claims is structurally visible. | Submit |
| Optional | **Umia Best Agentic Venture** | Siren Agent as due-diligence and monitoring agent for tokenized onchain ventures, now with per-subject scoring API consumable by venture launch reviewers | Submit only if Daniel swaps strategy after mentor feedback |

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

> **ENS parent name is not registered yet.** Registry owner check via public mainnet RPC on 2026-05-08 returned `0x0000000000000000000000000000000000000000` for `upgradesiren.eth`, `upgrade-siren.eth`, and `upgrade-siren-demo.eth`. Default: register `upgradesiren.eth` if still available at purchase time; fall back to `upgrade-siren.eth` or `upgrade-siren-demo.eth` if registration fails. Daniel approves final choice.

Namespace decision:

- Use `upgrade-siren:*` for project-specific records.
- Do not use the shorter `siren:*` namespace; it is too broad and collision-prone.
- ENSIP-26 remains the standards-compatible discovery layer. `upgrade-siren:*` carries Upgrade Siren-specific verdict data.

Required live records are split by update behavior. Stable identity and discovery records live directly in ENS. Upgrade-specific data is updated through one atomic manifest record so related values cannot desynchronize across multiple `setText` calls.

Stable ENS records:

| Record | Purpose |
|---|---|
| `upgrade-siren:chain_id` | Chain where contracts live |
| `upgrade-siren:proxy` | Proxy address |
| `upgrade-siren:owner` | Operator or protocol owner address authorized to sign reports |
| `upgrade-siren:schema` | JSON schema pointer for records |

Atomic upgrade manifest record:

| Record | Purpose |
|---|---|
| `upgrade-siren:upgrade_manifest` | Single JSON object for current upgrade state: previous implementation, current implementation, report URI, report hash, version, effective timestamp, and previous manifest hash |

`upgrade-siren:upgrade_manifest` shape:

```json
{
  "schema": "upgrade-siren-manifest@1",
  "chainId": 11155111,
  "proxy": "0x...",
  "previousImpl": "0x...",
  "currentImpl": "0x...",
  "reportUri": "https://...",
  "reportHash": "0x...",
  "version": 3,
  "effectiveFrom": "2026-05-09T12:00:00Z",
  "previousManifestHash": "0x..."
}
```

ENSIP-26 compatibility records:

| Record | Purpose |
|---|---|
| `agent-context` | Human-readable context, e.g. `Upgrade Siren risk report for vault.demo.upgradesiren.eth` |
| `agent-endpoint[web]` | Web report endpoint, e.g. `https://upgradesiren.app/r/vault.demo.upgradesiren.eth` |
| `agent-endpoint[mcp]` | P2 Siren Agent MCP endpoint when the agent watchlist ships |

The signed manifest path must live-resolve ENS records in the app. No hardcoded demo values in the product path.

### Public-Read Fallback

The signed ENS manifest path is the highest-confidence mode, but adoption cannot depend on every protocol publishing `upgrade-siren:*` records out of the box.

If an ENS name does not publish the Upgrade Siren records, the app must fall back to **public-read mode**:

- accept an Ethereum address or ENS name with a normal address record
- read EIP-1967 proxy state directly from chain
- fetch Sourcify evidence for the live implementation
- label the result as `public-read`, not operator-signed
- never return `SAFE`; return `REVIEW` for low-risk verified evidence or `SIREN` for unverified / dangerous evidence

Public-read mode is not a mock. It is the adoption bridge: Upgrade Siren can warn on existing protocols immediately, while protocols that publish signed manifests get higher-confidence reports.

### Proxy Upgrade Detector

Must support:

- EIP-1967 implementation slot lookup
- `Upgraded(address)` event detection
- Current implementation vs ENS manifest-declared current implementation check
- Previous implementation selection from event history or `upgrade-siren:upgrade_manifest`
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
| ENS consistency | `upgrade-siren:upgrade_manifest.currentImpl` does not match live proxy slot |
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
  "mode": "signed-manifest | public-read | mock",
  "confidence": "operator-signed | public-read | mock",
  "ens": {
    "recordsResolvedLive": true,
    "manifestHash": "0x...",
    "owner": "0x..."
  },
  "auth": {
    "status": "valid | missing | invalid | not-applicable",
    "signatureType": "EIP-712",
    "signer": "0x...",
    "signature": "0x...",
    "signedAt": "ISO-8601"
  },
  "recommendedAction": "approve | review | reject | wait",
  "generatedAt": "ISO-8601"
}
```

Production reports must be EIP-712 signed by the address in `upgrade-siren:owner`. A matching `reportHash` proves bytes did not change; the EIP-712 signature proves the report is authorized by the ENS owner. The verdict engine must refuse unsigned or invalidly signed production reports. Mock/demo reports are allowed only when visibly labeled `mock: true`.

### Siren Agent

The agentic component watches a list of ENS contract maps or venture contract sets, triggers analysis on changes, and signs reports.

For Umia framing, Siren Agent becomes:

> A due-diligence and post-launch monitoring agent for onchain ventures.

It checks whether a venture is ready to fund, needs review, or should be blocked until contract risks are resolved.

### Bench Mode (Epic 2 — `/b/[name]`, in build per US-111..US-146)

Bench Mode is a second front door on the same engine. Where Single-Contract Mode answers *"is this upgrade safe?"*, Bench Mode answers *"how senior and relevant is this subject overall?"* — for any ENS-named subject (agent, project, team).

**ENS schema** (extends Single-Contract namespace, does not replace it):

| Record | Purpose |
|---|---|
| `agent-bench:bench_manifest` | Single JSON object describing every data source for the subject (Sourcify projects, GitHub owner, on-chain primary address, ENS-internal root). Atomic update pattern, same discipline as `upgrade-siren:upgrade_manifest`. |
| `agent-bench:owner` | Address authorized to update the bench manifest. |
| `agent-bench:schema` | JSON schema version pointer (`agent-bench-manifest@1`). |

Both namespaces co-exist on the same ENS name without conflict. Existing `upgrade-siren:*` records remain owned by Single-Contract Mode.

**Score formula** (raw-discounted axis, no normalization to ceiling):

- Two axes: `seniority` (code quality, Sourcify + GitHub-derived) + `relevance` (recent activity, all four sources).
- Each axis is `Σ(weight × value × trust)`. Trust factor `0.6` on every unverified-source signal; verified sources at `1.0`.
- `score_raw = 0.5 * seniority + 0.5 * relevance`. Tier S (≥90) is intentionally unreachable in v1 because GitHub trust factor is locked at `0.6` (Section 21 D-G). **v1 P0 max is 66** (P1 GitHub signals `ciPassRate`/`bugHygiene`/`releaseCadence` are `null_p1` stubs until US-114b ships); **v1 full max is 79** after US-114b lands. Both cap at tier A.
- Trust-discount is structurally visible in the breakdown panel — every unverified component renders the `× 0.6` factor inline. Hiding the math defeats GATE-30.

**Public-read fallback for un-opted-in subjects:** when an ENS name has no `agent-bench:bench_manifest`, the resolver infers a partial manifest from `addr()` + Sourcify all-chains lookup. Banner shows `confidence: public-read`; tier ceiling A.

Full spec: `EPIC_BENCH_MODE.md` (locked 2026-05-09).

## 8. Demo Scope

Prepare three demo upgrade scenarios:

| Scenario | Description | Expected verdict |
|---|---|---|
| Safe upgrade | Verified v1 to verified v2, compatible storage, no dangerous selectors | `SAFE` |
| Dangerous upgrade | Verified v2 adds `sweep()` and incompatible storage layout | `SIREN` |
| Unverified upgrade | Proxy points to unverified implementation or ENS record mismatch | `SIREN` |

Prepare one live public-read scenario:

| Scenario | Description | Expected verdict |
|---|---|---|
| Live mainnet protocol read | Existing protocol address or ENS address record without `upgrade-siren:*` records; selected by Daniel/Orch before demo | `REVIEW` or `SIREN`, never `SAFE` |

Demo UI must show:

- ENS lookup field
- address/public-read fallback input
- Big verdict card
- progressive evidence checklist (`ENS`, `chain`, `Sourcify`, `diff`, `signature`)
- Before/after implementation comparison
- Human diff
- Evidence drawer
- Sourcify links
- ENS records resolved live
- Governance comment generator
- Optional Siren Agent watchlist / Umia due-diligence panel

## 9. Acceptance Gates (summary)

> **Full register:** [`docs/06-acceptance-gates.md`](./docs/06-acceptance-gates.md) defines the canonical 26-gate register (GATE-1..GATE-26 across Product / Technical / Sponsor / UX / Kill Conditions). The 11 points below are the in-SCOPE summary; every backlog P0 item must map to one or more `GATE-N` references from `docs/06`.

| # | Summary requirement | Maps to docs/06 |
|---|---|---|
| 1 | ENS is live-resolved, not hardcoded | GATE-3 |
| 2 | Sourcify is the source of verification and metadata evidence | GATE-5, GATE-9, GATE-16 |
| 3 | Demo includes at least one safe and one dangerous upgrade | GATE-6 |
| 4 | Report includes deterministic findings, not only LLM text | GATE-11, GATE-13 + Kill Conditions |
| 5 | UI shows `SAFE`, `REVIEW`, or `SIREN` within five seconds | GATE-1, GATE-2, GATE-20 |
| 6 | Every mock path is labeled `mock: true` | GATE-14 |
| 7 | Pitch does not say "generic scanner", "AI auditor", "trust layer", or "agent OS" | Kill Conditions |
| 8 | Production reports are EIP-712 signed by `upgrade-siren:owner` | GATE-24 |
| 9 | Public-read fallback works for protocols without Upgrade Siren records | GATE-25 |
| 10 | Progressive loading and error states are visible | GATE-26 |
| 11 | Run instructions reproduce the demo locally | GATE-15 |

## 10. Workstreams

Three parallel dev streams + two tracker categories. This matches the 4-agent pipeline in `prompts/` (Dev A + Dev B + Dev C + PR Reviewer).

| Stream | Owner | Scope | Owned paths after lock |
|---|---|---|---|
| **A** | **Dev A — Contract Fixtures** | Demo proxy, safe implementation, dangerous implementation, unverified-implementation scenario, deploy/verify/provision scripts, signed demo report generation, Sourcify verification | `contracts/`, `scripts/deploy*`, `test/` |
| **B** | **Dev B — Evidence Engine** | ENS live resolution, EIP-1967 slot reads, `Upgraded` event reads, Sourcify fetch, ABI/storage diff logic, Siren Report JSON schema, EIP-712 sign/verify primitives | `packages/evidence/`, `packages/shared/` |
| **C** | **Dev C — Web UX (+ optional Siren Agent)** | Next.js app, verdict UI, evidence drawer, Sourcify links, governance comment, demo scenario runner. **Optional P2:** Siren Agent watchlist + automated signing flow + optional Umia due-diligence panel | `apps/web/`, `apps/siren-agent/` (P2 only) |

| Tracker | Owner | Scope (not picked up by dev agents) |
|---|---|---|
| **Daniel** | Daniel | Mentor sweeps (Sourcify, ENS, optional Umia), final sponsor decisions, PR merges, scope cuts |
| **Orch** | Claude (orchestrator) | Documentation maintenance (SCOPE.md / docs / GitHub Wiki / prompts), backlog file post-merge updates, mentor-finding translation |

**Siren Agent positioning:** Owned by Stream C. Marked **P2 stretch**. Activated only if Daniel decides to pursue Umia track after mentor feedback. If time pressure, Siren Agent + Umia panel are the **first cuts** (per Build Priority in `docs/12`).

**Docs / submission work** (sponsor pitch, demo script, risk register, video script) is owned by **Daniel + Orch**, not by a dev stream. Dev agents do not edit `SCOPE.md`, `docs/01-12`, GitHub Wiki, or `prompts/`.

## 11. Product Decisions

- Sourcify and ENS are primary.
- Umia is a business integration story, not the default sponsor target.
- Swarm is not in current scope.
- SpaceComputer is skipped.
- Apify is not needed.
- No tokenomics document; this is not a token project.
- No custom marketplace or launchpad.
- Project-specific ENS records use `upgrade-siren:*`, not `siren:*`.
- Demo report signing uses a dedicated operator signing key loaded from local environment (`REPORT_SIGNER_PRIVATE_KEY`) for deploy/provision scripts. The key is never committed. Mainnet ENS parent control remains Daniel/operator wallet custody.
- **Production deployment via Vercel Pro confirmed** (Daniel 2026-05-08). Full deployment prerequisites + flow in `docs/12-implementation-roadmap.md` Production Deployment Prerequisites section.
