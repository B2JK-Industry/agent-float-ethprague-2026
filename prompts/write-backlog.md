# Prompt — write the Agent Float backlog (designed for 3 parallel AI dev streams)

> Self-contained prompt for any coding/planning agent (Codex, Claude, etc.). The agent reads the listed inputs and produces `docs/13-backlog.md` plus a PR. The backlog is **engineered for three AI developers running in parallel non-stop**; ownership streams, dependency DAG, and PR-conflict-avoidance are first-class concerns.

---

## Role

You are producing the **complete, prioritized, parallelization-aware work backlog** for **Agent Float** — an ETHPrague 2026 hackathon submission. The project's scope is fully locked in `SCOPE.md`. You do **not** propose new features, change scope, or re-debate architecture. You translate the locked scope into a backlog that **3 parallel AI developers can consume autonomously, non-stop, without stepping on each other**.

## Repository

`https://github.com/B2JK-Industry/agent-float-ethprague-2026`

## Four-agent execution model

The backlog will be consumed by four parallel AI agents:

- **Dev A, Dev B, Dev C** — three coding agents, each owning a non-overlapping repository surface (defined below). They run non-stop, opening PRs.
- **Reviewer** — a fourth agent that polls open PRs and reviews them against acceptance criteria, anti-patterns, stream ownership, and honest-over-slick rules. Reviewer approves or requests changes; does not merge.

Daniel handles merges and decisions that escalate beyond locked scope. Claude (orchestrator) maintains SCOPE.md / docs / prompts / wiki and translates mentor findings into backlog adjustments.

When writing the backlog, design every item so that:
- It is unambiguously assignable to one of the three dev streams (or marked as Daniel/orchestrator-owned)
- Its acceptance criteria are review-checkable by the Reviewer agent without needing additional human context
- Cross-stream coordination items are explicit, not implicit

## Three AI dev streams (ownership areas — non-overlapping)

**Hard rule:** Every **executable dev item** has exactly one stream — `A` or `B` or `C`. No compound ownership (no `A + B` items). If a single goal requires work from two streams, **split it into two items** with an explicit dependency: parent item in one stream, dependent item in the other stream blocking on parent merge.

Two non-dev tracker categories also exist for items that are not coding work:
- **`Daniel`** — items Daniel personally owns (mentor sweeps, decisions, merges, naming pivot triggers)
- **`Orch`** — orchestrator (Claude) items (SCOPE.md / docs / prompts / wiki maintenance, mentor-finding translation)

Both `Daniel` and `Orch` items are tracker-only; the dev agents do not pick them up. They appear in the backlog so dependencies can reference them.

Each dev stream owns a set of repository paths and an outcome surface. PRs from one stream do not touch another stream's paths except via explicit cross-stream coordination items (which themselves are owned by exactly one stream and provide outputs other streams consume after merge).

### Dev A — Onchain stream (Solidity / Foundry / contract deployment)
**Owns:**
- `contracts/` (Foundry workspace, all `.sol` files)
- `scripts/deploy*` (Foundry deploy scripts)
- ENS resolver contract code (if custom resolver needed)
- Sourcify verification pipeline scripts

**Implements (per `docs/04-contracts.md`):**
- `AgentRegistry.sol`, `ReceiptLog.sol`, `BuilderBondVault.sol`, `MilestoneRegistry.sol` (4 core)
- Conditional/fallback contracts as P2 (only if mentor confirms need)
- Foundry tests, fuzz tests, integration tests
- Sepolia + selected mainnet deploys
- Sourcify verification for every deployed contract

### Dev B — Frontend / SDK stream (Next.js / TypeScript / wagmi)
**Owns:**
- `apps/web/` (Next.js 16 platform; including `apps/web/vercel.ts` Vercel config)
- `packages/sdk-ts/` (`@agentfloat/sdk` TypeScript)
- `packages/shared/` (shared types, ENS helpers, receipt schema, wagmi/viem ENS resolve helpers)
- root `vercel.ts` if shared across web app deploys

**Implements (per `docs/02-architecture.md` Layer 4 + Layer 5):**
- All routes: `/`, `/agent/[ens-name]`, `/invest`, `/portfolio`, `/builder`, `/leaderboard`
- "Fund via Umia" CTA + redirect handling
- Receipts feed UI, milestone UI, builder bond status UI, Umia auction state UI
- TypeScript SDK: sign / emit / fetch / resolve / verify
- ENSIP-26 record reading helpers + namespaced extension helpers

### Dev C — Demo agents / integrations stream (Vercel Functions / Python / Apify)
**Owns:**
- `apps/agent-grantscout/` (primary demo agent, Vercel Functions; including its `apps/agent-grantscout/vercel.ts`)
- `apps/agent-datamonitor/` (stretch)
- `apps/agent-tendereye/` (stretch)
- `packages/sdk-py/` (`agentfloat` Python package)
- `packages/umia-integration/` (Umia CLI wrappers, REST client, simulator + `mock: true` fallback)
- `apps/agent-grantscout/integrations/` and equivalent paths in stretch agents (per-agent Umia/Apify hooks)
- Apify Actor configurations checked in under `packages/umia-integration/apify/` or per-agent integration paths

**Implements (per `docs/02-architecture.md` Layer 3 + Layer 6):**
- GrantScout: paid query endpoint, Apify-backed Gitcoin/Octant scraping, AI Gateway summarization, USDC payment validation, receipt signing, ReceiptLog emit
- DataMonitor + TenderEye: stretch agents
- Umia integration scaffold (live or simulator with `mock: true` label)
- Python SDK matching the TypeScript surface

### What each stream does NOT touch

- Dev A does not touch `apps/`, `packages/sdk-ts/`, `packages/sdk-py/`
- Dev B does not touch `contracts/`, demo agent code, Python SDK
- Dev C does not touch `contracts/`, `apps/web/`, TypeScript SDK
- All three may read `docs/`, `SCOPE.md`, `wiki/`, `prompts/` but **only Daniel + Claude (orchestrator) edit them**

### Cross-stream coordination items

Where streams must align (shared types, deployed contract addresses, schema), the backlog includes explicit **coordination items** with:
- single owner (one stream)
- dependents from other streams (those items wait until coordination item lands)
- PR description must list cross-stream consumers

## What to read before writing the backlog

In this order:

1. `README.md` — pitch, repo layout, how-to-read map
2. `SCOPE.md` — **single locked source of truth**. Every section. Pay extra attention to:
   - §3 Sponsor lock (Umia primary, ENS secondary, Sourcify bonus)
   - §5.5 Tokenomics (Umia-native; bonding curve and overlapping contracts are conditional/fallback only)
   - §11 Work tracks A–H with dependencies (note: 8 tracks, not 7)
   - §12 Acceptance gates (12 gates)
   - §13 Decision log (incl. risk-accepted naming)
3. `CLAUDE.md` — project rules, communication style, anti-patterns
4. `AGENTS.md` — collaboration rules, branch naming, PR workflow
5. `docs/01-vision.md` — solarpunk framing, stakeholders, failure modes
6. `docs/02-architecture.md` — system layers, ASCII diagram, ENSIP-26 records, contract groupings, data flows, SDK
7. `docs/03-tokenomics.md` — Umia-native tokenomics; bonding curve confined to Appendix A
8. `docs/04-contracts.md` — per-contract spec for 4 core + conditional/fallback
9. `docs/05-demo-script.md` — 5-minute demo walkthrough + Q&A + fallback paths
10. `docs/06-acceptance-gates.md` — 12 verification gates with severity tiers and pass criteria
11. `docs/07-sponsor-fit.md` — per-sponsor depth analysis
12. `docs/08-naming-research.md` — naming risk-acceptance status
13. `docs/09-sponsor-mentor-questions.md` — mentor sweep scripts
14. `docs/10-risks.md` — 21-item risk register
15. `docs/12-sponsors-explained.md` — sponsor explainer
16. `wiki/` (if present) — additional human-readable manual

## Hard rules (do not violate)

0. **Path B positioning lock (latest, 2026-05-08 evening).** Pitch is *"Agent Float turns working public-good AI agents into fundable Umia ventures."* Stage tagline is *"No impact proof, no funding."* The product is **public-good agents only** (civic / research / climate / transparency / open-knowledge). Trading bots, yield agents, generic AI assistants are explicitly out of scope and must REVERT at `registerAgent()`. Standards adopted: **ERC-8004 Trustless Agents** + **ENSIP-25 binding** + **ENSIP-26 discovery**. We integrate, we do not reinvent.

1. **Umia-native primary.** Bonding curve, RevenueDistributor, AgentTreasury, AgentVentureToken are **conditional or fallback only**. Backlog items for these contracts must be tagged P2 (or below) and explicitly marked `[CONDITIONAL]` or `[FALLBACK]`.
2. **No SBO3L derivatives.** Receipts as primitive is fine; "policy boundary / mandate gate / agent OS" framing is forbidden.
3. **No time-driven scope cuts.** Do not write "Day 1 / Day 2 / Day 3", "morning", "evening", or hour estimates with deadlines. Use **effort sizes** (XS / S / M / L / XL) and **dependencies** (DAG), not schedules.
4. **No preemptive MVP-izing.** Do not mark items as "post-hack" because of perceived time pressure. Daniel calls cuts during execution.
5. **Honest-over-slick.** Every P0 backlog item must map to at least one of the 12 acceptance gates in `docs/06-acceptance-gates.md`. If it cannot be verified, it cannot be P0.
6. **ENSIP-26 records first.** ENS-related items use `agent-context`, `agent-endpoint[web]`, `agent-endpoint[mcp]` plus namespaced extensions. Do not invent custom record keys for fields ENSIP-26 covers.
7. **No emoji.** Tabular structure preferred; bullet lists for ranks.
8. **Slovak primary, English technical terms** — match the rest of the docs.
9. **Stream non-overlap is mandatory.** Every backlog item has exactly one owning stream (A, B, or C). PRs from one stream do not modify files owned by another stream.

## Required coverage (every workstream from `SCOPE.md §11` is covered)

Item count target: comprehensive enough that each stream has at least 30+ unblocked items at any time. Better to over-specify than to leave gaps.

For every track (A–H per SCOPE.md), produce:
- 1 epic per major capability
- Stories under each epic
- Tasks under each story (atomic, single-stream-ownable)

Cover:
- **Track A — Identity layer (ERC-8004 + ENS)**: parent ENS registration, Sepolia mirror, ENSIP-26 records, ENSIP-25 binding to ERC-8004 `agentId`, custom resolver if needed for namespaced extensions, programmatic subname issuance helpers, wagmi/viem live-resolve helpers + ERC-8004 IdentityRegistry / ReputationRegistry read helpers. Onchain bits (resolver + ERC-8004 integration interfaces) → Dev A; UI bits → Dev B.
- **Track B — Smart contracts**: 4 core contracts with full spec including `erc8004AgentId` field on AgentRegistry struct + `publicGoodCategory` enforcement at `registerAgent()` (revert on non-allow-list category); deploy scripts; Sourcify verify pipeline; Foundry test suite. Conditional/fallback contracts as P2/P3. → Dev A.
- **Track C — Demo agents**: **GrantScout (P0, FUNDABLE — public-goods grant scout)**, **yield-alpha (P0, REJECTED-EXAMPLE — financialization-first agent for demo contrast)**, DataMonitor (P1 stretch — civic on-chain alerts), TenderEye (P1 stretch — civic procurement). The yield-alpha REJECTED demo is critical for Path B dual-agent framing in `docs/05`. → Dev C.
- **Track D — Platform UI**: every route + every UI element from `docs/02` Layer 4. → Dev B.
- **Track E — Umia integration**: mentor session prep (Daniel-owned, but with a backlog tracker item), integration scaffold, simulator fallback. Scaffold + simulator → Dev C.
- **Track F — Receipt SDK**: TS package → Dev B; Python package → Dev C; canonical receipt schema as cross-stream coordination item.
- **Track G — Mentor sweeps**: tracker items (one per mentor — Umia/ENS/Sourcify). Daniel-owned but each has a sub-task for "translate findings into backlog adjustments" which Claude orchestrator handles.
- **Track H — Demo + submission**: 5-min script lock, dry-run with all 12 gates, recording fallback, Devfolio submission. Demo script → orchestrator-owned; recording → Dev B; submission → Daniel.

Plus cross-cutting items:
- **Honest-over-slick gates**: each of GATE-1..GATE-12 gets at least one verification task; assign to whichever stream owns the surface being verified.
- **Risk register monitoring**: top High-severity risks (R-001 Umia, R-008 demo, R-013 wash-trading, R-014 builder default) get watch items.
- **Documentation maintenance**: backlog lifecycle, CHANGELOG entries when major decisions land.

## What NOT to include

- ❌ Naming work (decision risk-accepted; backlog item is "monitor only")
- ❌ Hardware tasks
- ❌ Apify as sponsor track (used as infrastructure only)
- ❌ Multi-chain support
- ❌ Mobile native app
- ❌ DAO governance tooling layer
- ❌ Trading-agent demo

## Output format

Single file: `docs/13-backlog.md`. Structure:

```markdown
# 13 — Backlog

> Locked-scope work breakdown for Agent Float. Designed for 3 parallel AI dev streams running non-stop. Source of truth: SCOPE.md.

## Conventions

- IDs: AF-NNN (zero-padded 3 digits)
- Types: epic / story / task
- Priority: P0 (must) / P1 (should) / P2 (nice) / P3 (deferred / conditional / fallback)
- Effort: XS (~1h) / S (~half day) / M (~1 day) / L (~2-3 days) / XL (>3 days)
- Stream: `A` | `B` | `C` (executable dev items) OR `Daniel` | `Orch` (tracker-only items, not picked up by dev agents)
- Workstream: A / B / C / D / E / F / G / H (per SCOPE.md §11)
- Sponsor: Umia / ENS / Sourcify / Network Economy / —
- Status: `open` (PR not yet open against main) | `pr-open` (PR opened, in review) | `merged` (merged to main; this is "done") | `blocked` (depends on external answer) — **status source is GitHub PR state + orchestrator updates after merge, NOT inline edits to docs/13-backlog.md by dev agents**
- Dependencies: list of AF-NNN IDs that must reach `status = merged` before this item is considered unblocked. **"PR open" is NOT done; only merged-to-main counts.**

## Stream ownership map

(reproduce stream definitions for AI devs to consume directly)

## Index

(grouped by stream first, then workstream)

### Stream A — Onchain (Dev A)
...

### Stream B — Frontend / SDK-TS (Dev B)
...

### Stream C — Demo agents / SDK-Py / integrations (Dev C)
...

### Cross-stream coordination items
...

### Daniel / Orchestrator items
...

## Backlog detail

(every item with full fields)

### AF-001 — [story] ENS parent registration + Sepolia mirror + on-chain resolver wiring
- **Type:** story
- **Stream:** A
- **Workstream:** A
- **Priority:** P0
- **Effort:** M
- **Sponsor:** ENS
- **Status:** open
- **Dependencies:** AF-XXX (mentor sweep ENS, owned by `Daniel`)
- **Acceptance criteria:**
  - mainnet ENS parent registered (per docs/08 risk-acceptance — `agent-float.eth` if `agentfloat.eth` confirmed taken, otherwise `agentfloat.eth`)
  - Sepolia mirror parent registered for iteration
  - on-chain resolver supports ENSIP-26 records and `agentfloat:*` namespaced extensions
  - GATE-12 verifiable for at least one test subname
- **Owning files (Stream A):** `contracts/ens/`, `scripts/deploy-ens.s.sol`
- **Outputs for downstream:** resolver contract address + parent node hash, published to `apps/web/.env.example` and `packages/shared/src/ens.ts` constants via a follow-up `Orch` item; recorded in PR description
- **Stories:** AF-NNN ...

### AF-002 — [story] wagmi/viem ENS resolve helpers consuming AF-001 resolver
- **Type:** story
- **Stream:** B
- **Workstream:** A
- **Priority:** P0
- **Effort:** S
- **Sponsor:** ENS
- **Status:** open
- **Dependencies:** AF-001 (must be `merged`)
- **Acceptance criteria:**
  - `packages/shared/src/ens.ts` exports `resolveAgent(ensName)` returning ENSIP-26 records + namespaced extensions
  - vitest unit coverage for happy path + missing-record path
  - GATE-12 supported end-to-end in a unit/integration test
- **Owning files (Stream B):** `packages/shared/src/ens.ts`, `packages/shared/test/ens.test.ts`
```

## Quality bar

- Every P0 maps to a verification gate (GATE-1..12) — explicit in acceptance criteria
- Every story references at least one doc section
- Dependencies form a DAG; verify no cycles by topological sort before submitting
- Each stream has at least 5 P0 items unblocked at backlog-publish time (so AI devs can start non-stop immediately)
- Conditional/fallback items live in their own subsection at the bottom of each stream
- Cross-stream coordination items are explicit and owned by exactly one stream
- Total P0 count should match the work needed to pass all 12 acceptance gates and ship the demo per `docs/05`

## Deliverable

1. Create branch `feat/backlog-v1`
2. Write `docs/13-backlog.md` per format above
3. Update `README.md` "How to read this repo" table to include `docs/13-backlog.md`
4. Open PR titled `feat(backlog): initial scope-locked backlog v1, 3-stream parallel`
5. PR description must include:
   - Total item counts by priority (P0/P1/P2/P3)
   - Total item counts by stream (A/B/C/coord/Daniel/Orch)
   - Total item counts by workstream (A/B/C/D/E/F/G/H per SCOPE)
   - Top 10 P0 items by dependency depth (the items that block the most)
   - Per-stream "starting items" — at least 5 unblocked P0 items each stream can pick up non-stop on Day 0
   - Open questions where SCOPE.md is ambiguous (these become follow-up issues, not silent decisions)
6. Do not merge — Daniel approves

## Brutal critique to apply during writing

- If you find an item that contradicts SCOPE.md, surface the conflict in PR description
- If you cannot map a P0 item to an acceptance gate, demote or remove
- If you write "approximately Day N", delete it; use effort + dependency
- If you write a v1-architecture item without `[CONDITIONAL]` or `[FALLBACK]` tag, delete and rewrite
- If two streams modify the same files in their respective items, the items must be merged into a single coordination item
- If a stream has fewer than 5 unblocked P0 items at start, the backlog has a gap — fix before submitting

## Done means

- `docs/13-backlog.md` exists, comprehensive
- 3 streams have non-overlapping ownership and at least 5 unblocked P0 items each at publish time
- DAG validated (no cycles)
- PR open, awaiting Daniel approval
- README updated
- No scope drift introduced (SCOPE.md unchanged)
- No new architectural decisions made
