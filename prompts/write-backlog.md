# Prompt — write the Agent Float backlog

> Self-contained prompt for any coding agent (Codex, Claude, etc.). Paste into the agent with read access to the repo. The agent should read the listed inputs, then produce `docs/13-backlog.md` and open a PR.

---

## Role

You are producing the **complete, prioritized work backlog** for **Agent Float** — an ETHPrague 2026 hackathon submission. The project's scope is fully locked in `SCOPE.md`. You do **not** propose new features, change scope, or re-debate architecture. You translate the locked scope into actionable backlog items.

## Repository

`https://github.com/B2JK-Industry/agent-float-ethprague-2026`

## What to read first (in this order)

1. `README.md` — pitch, repo layout, how-to-read map
2. `SCOPE.md` — **single locked source of truth**. Read every section. Pay attention to:
   - §3 Sponsor lock (Umia primary, ENS secondary, Sourcify bonus)
   - §5.5 Tokenomics (Umia-native; bonding curve and overlapping contracts are conditional/fallback only)
   - §11 Work tracks A–H with dependencies
   - §12 Acceptance gates (12 gates)
   - §13 Decision log
3. `CLAUDE.md` — project rules, communication style, anti-patterns
4. `AGENTS.md` — collaboration rules, branch naming, PR workflow
5. `docs/01-vision.md` — solarpunk framing, stakeholders, failure modes
6. `docs/02-architecture.md` — system layers, ASCII diagram, ENSIP-26 records, contract groupings, data flows, SDK
7. `docs/03-tokenomics.md` — Umia-native tokenomics; bonding curve confined to Appendix A
8. `docs/04-contracts.md` — per-contract spec for 4 core contracts + conditional/fallback
9. `docs/05-demo-script.md` — 5-minute demo walkthrough + Q&A + fallback paths
10. `docs/06-acceptance-gates.md` — 12 verification gates with severity tiers and pass criteria
11. `docs/07-sponsor-fit.md` — per-sponsor depth analysis
12. `docs/09-sponsor-mentor-questions.md` — mentor sweep scripts (Umia / ENS / Sourcify)
13. `docs/10-risks.md` — 21-item risk register
14. `docs/12-sponsors-explained.md` — what Umia / ENS / Sourcify / ETHPrague organizer ARE and DO

## Hard rules (do not violate)

1. **Umia-native primary.** Bonding curve, RevenueDistributor, AgentTreasury, AgentVentureToken are **conditional or fallback only**. Backlog items for these contracts must be tagged P2 (or below) and explicitly marked `[CONDITIONAL]` / `[FALLBACK]`.
2. **No SBO3L derivatives.** Receipts as primitive is fine; "policy boundary / mandate gate / agent OS" framing is forbidden.
3. **No time-driven scope cuts.** Do not write "Day 1 / Day 2 / Day 3", "morning", "evening", or hour estimates with deadlines. Use **effort sizes** (XS / S / M / L / XL) and **dependencies** (DAG), not schedules.
4. **No preemptive MVP-izing.** Do not mark items as "post-hack" because of perceived time pressure. Daniel calls cuts during execution.
5. **Honest-over-slick.** Every P0 backlog item must map to at least one of the 12 acceptance gates in `docs/06-acceptance-gates.md`. If it cannot be verified, it cannot be P0.
6. **ENSIP-26 records first.** ENS-related items use `agent-context`, `agent-endpoint[web]`, `agent-endpoint[mcp]` plus namespaced extensions (`agentfloat:umia_venture`, `agentfloat:bond_vault`, `agentfloat:milestones`, `agentfloat:receipts_pointer`). Do not invent custom record keys for fields ENSIP-26 covers.
7. **No emoji.** Tabular structure preferred; bullet lists for ranks.
8. **Slovak primary, English technical terms** — match the rest of the docs.

## Required coverage

The backlog must include items for every workstream in `SCOPE.md §11`:

- **Track A — Identity layer (ENS)**: parent registration on mainnet `agent-float.eth` (per naming risk-acceptance in `docs/08`), Sepolia mirror, custom resolver if needed for namespaced extensions, programmatic subname issuance helpers, wagmi/viem live-resolve helpers
- **Track B — Smart contracts (Foundry)**: 4 core contracts (`AgentRegistry`, `ReceiptLog`, `BuilderBondVault`, `MilestoneRegistry`) with full spec implementation, deploy scripts, Sourcify verification pipeline. Conditional/fallback contracts (`AgentVentureToken`, `BondingCurveSale`, `AgentTreasury`, `RevenueDistributor`) listed but **P2 or P3**.
- **Track C — Demo agents**: GrantScout (primary, P0 — Apify-backed Gitcoin/Octant scout, 0.01 USDC/query, real receipts). DataMonitor and TenderEye stretch (P1 each).
- **Track D — Platform UI (Next.js 16 + Vercel)**: landing page, agent profile route, investor browse + portfolio, builder dashboard + onboarding flow, leaderboard, "Fund via Umia" CTA + redirect handling, ENS live-resolve UI, receipts feed UI, milestone progress UI, builder bond status UI
- **Track E — Umia integration**: mentor session prep, integration scaffold (live or simulator-with-`mock: true`-label fallback), per-agent venture token template integration (if Umia provides)
- **Track F — Receipt SDK**: TypeScript package (`@agentfloat/sdk`), Python package (`agentfloat`), sign/emit/verify helpers, canonical receipt schema, ENSIP-26-aligned `verifyReceipt` chain, example integration in GrantScout
- **Track G — Mentor sweeps**: Umia priority #1 (blocks Track E), ENS priority #2 (blocks Track A mainnet decision), Sourcify priority #3 (blocks Track B verify pipeline). Each sweep is a backlog item with prep + execute + log-findings sub-tasks.
- **Track H — Demo + submission**: 5-min demo script lock, dry-run with all 12 gates, recording fallback production, Devfolio submission with track selection (Umia primary, ENS secondary, Sourcify bonus, Network Economy organizer)

Plus cross-cutting items:
- **Honest-over-slick gates**: each of GATE-1 through GATE-12 (`docs/06`) gets at least one verification task in the backlog
- **Risk register monitoring**: top High-severity risks from `docs/10` (R-001 Umia integration, R-008 demo failures, R-013 wash-trading, R-014 builder default) get watch items
- **Documentation maintenance**: `docs/13-backlog.md` lifecycle (this file), CHANGELOG entries when major decisions land

## What NOT to include

- ❌ Naming work (decision risk-accepted 2026-05-08; backlog item is "monitor — pivot only if forced")
- ❌ Hardware tasks (no SpaceComputer integration in scope)
- ❌ Apify as sponsor track (used as infrastructure only; not pitched)
- ❌ Multi-chain support (Ethereum primary only)
- ❌ Mobile native app
- ❌ DAO governance tooling layer
- ❌ Trading-agent demo (anti-Solarpunk)

## Output format

Single file: `docs/13-backlog.md`. Structure:

```markdown
# 13 — Backlog

> Locked-scope work breakdown for Agent Float (ETHPrague 2026). Source of truth: SCOPE.md. This document translates locked scope into actionable items. Updates land via PR.

## Conventions

- IDs: AF-NNN (zero-padded 3 digits, e.g., AF-001)
- Types: epic / story / task
- Priority: P0 (must) / P1 (should) / P2 (nice) / P3 (deferred)
- Effort: XS (~1h) / S (~half day) / M (~1 day) / L (~2-3 days) / XL (>3 days)
- Workstream: A / B / C / D / E / F / G / H (per SCOPE.md §11)
- Sponsor: Umia / ENS / Sourcify / Network Economy / —
- Status: open / in-progress / blocked / done
- Dependencies: list of AF-NNN IDs this item is blocked by

## Index

(grouped by workstream, P0 first)

## Backlog

### Track A — Identity layer (ENS)

#### AF-001 — [epic] ENS parent registration + resolver setup
- **Type:** epic
- **Workstream:** A
- **Priority:** P0
- **Effort:** L
- **Sponsor:** ENS
- **Status:** open
- **Dependencies:** AF-NNN (mentor sweep ENS)
- **Acceptance criteria:**
  - mainnet `agent-float.eth` registered (or recorded blocker if owner unreachable)
  - Sepolia mirror registered for iteration
  - resolver supports ENSIP-26 records and namespaced extensions
  - GATE-12 verifiable (live resolution returns all required records)
- **Notes:** see docs/08 risk-acceptance; see docs/09 ENS mentor questions
- **Stories:** AF-002, AF-003, ...

(continue with stories under each epic)

### Track B — Smart contracts (Foundry)
...

### Track C — Demo agents
...

(repeat for D, E, F, G, H)

### Cross-cutting

#### AF-XYZ — [task] Honest-over-slick GATE-1 verification
...

### Conditional / fallback

#### AF-XYZ — [story] [CONDITIONAL] AgentVentureToken deployment if Umia template unavailable
- **Priority:** P2
- **Sponsor:** Umia (conditional)
- **Acceptance criteria:**
  - Activated only if mentor sweep confirms Umia does not provide token template
  - Per docs/04 spec
- ...
```

## Quality bar

- Every P0 item has acceptance criteria that map to a verifiable check (preferably one of GATE-1..12 in `docs/06`)
- Every story references at least one doc section
- Dependencies form a DAG (no cycles); validate before submitting PR
- Group items by workstream for navigability
- Total P0 count should match the work needed to pass all 12 acceptance gates and ship the demo per `docs/05`
- Conditional/fallback items live in their own section at the bottom of each workstream so they don't clutter primary items

## Deliverable

1. Create branch `feat/backlog-v1`
2. Write `docs/13-backlog.md` per the format above
3. Update `README.md` "How to read this repo" table to include the new backlog doc
4. Open PR titled `feat(backlog): initial scope-locked backlog v1`
5. PR description must list:
   - Total item counts by priority (P0/P1/P2/P3) and by workstream (A/B/C/D/E/F/G/H)
   - Top 10 P0 items by dependency depth (i.e., the items that block the most)
   - Any open questions where the locked scope is ambiguous (these become follow-up issues, not backlog items)
6. Do not merge — Daniel approves

## Brutal critique to apply during writing

- If you find yourself writing an item that contradicts SCOPE.md, stop and surface the conflict in the PR description rather than silently choosing
- If you cannot map a P0 item to an acceptance gate, demote it to P1 or remove it
- If you write "approximately Day N", delete the time reference and replace with effort size + dependency
- If you write a backlog item for a v1 architecture component (custom bonding curve as primary, custom treasury, RevenueDistributor for token holders) without `[CONDITIONAL]` or `[FALLBACK]` tag, delete and rewrite

## Honest-gap acknowledgments

- Umia integration depth is unknown until mentor sweep — backlog must accept that some Track E and Track B items are placeholder shapes that will be refined post-mentor
- ENS mainnet `agent-float.eth` availability not yet verified by Daniel — backlog includes a verification task before registration commits
- Token economic exposure language follows Umia legal model — do not write "pro-rata revenue share" claims in acceptance criteria; use "economic exposure per Umia venture wrapper" framing

## Done means

- `docs/13-backlog.md` exists, comprehensive, matches the format
- PR open, awaiting Daniel approval
- README updated
- No scope drift introduced (SCOPE.md unchanged)
- No new architectural decisions made (only translated existing locked scope)
