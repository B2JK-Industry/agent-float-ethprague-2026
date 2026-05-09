# CLAUDE.md — project-specific guidance

## Project State

The repo has pivoted from **Agent Float** to **Upgrade Siren**.

Current status: **Epic 1 LOCKED + LIVE 2026-05-09**, **Epic 2 (Bench Mode) LOCKED 2026-05-09 — IN BUILD**. Code is unblocked for both epics. Epic 1 (single-contract verdict at `/r/[name]`) shipped 67+ stories and is live at https://upgrade-siren.vercel.app. Epic 2 (subject benchmark at `/b/[name]`) source-of-truth is `EPIC_BENCH_MODE.md`; backlog stories US-111..US-145 (plus US-114b, US-115b, US-146 added per review 2026-05-09) are in active build by Stream A/B/C dev pipeline.

## Current Product

**Upgrade Siren** is a public verification-and-reputation surface for Ethereum, anchored in ENS and powered by Sourcify, with two front doors:

1. **Single-Contract Mode** (`/r/[name]`) — turns a protocol's ENS name into a verdict (`SAFE` / `REVIEW` / `SIREN`) for any proxy upgrade. **Live now.**
2. **Bench Mode** (`/b/[name]`) — turns any ENS name (agent, project, team) into a 0–100 benchmark score across four data sources (Sourcify + GitHub + on-chain + ENS-internal), with trust-discount on unverified claims structurally rewarded. **In build, US-111..US-146.**

Stage taglines:

> No source, no upgrade. (master)
> No data, no score. (Bench-mode sub-tagline, only on `/b/[name]`)

Product agent:

> **Siren Agent** watches ENS-named contracts or venture contract sets, runs Sourcify-backed upgrade analysis, and signs risk reports.

## Source of Truth

Read first (Epic 1, single-contract):

1. `SCOPE.md`
2. `docs/01-vision.md`
3. `docs/04-technical-design.md`
4. `docs/05-demo-script.md`
5. `docs/07-sponsor-fit.md`

Read first (Epic 2, Bench Mode):

1. `EPIC_BENCH_MODE.md` — locked 2026-05-09, Section 21 D-A..D-J resolved.
2. `docs/13-backlog.md` Bench Mode index (search "Bench Mode") — US-111..US-146.
3. `prompts/launch/{dev-a,dev-b,dev-c,release-manager}-bench.md` — agent activation contracts.
4. `EPIC_AGENT_PORTFOLIO_MODE.md` is **SUPERSEDED** by `EPIC_BENCH_MODE.md`; do not implement.

`BRAINSTORM.md` records the pivot decision and rejected alternatives.

## Sponsor Strategy

| Priority | Target |
|---|---|
| Primary | Sourcify Bounty |
| Secondary | ENS Most Creative Use |
| Organizer | ETHPrague Future Society |
| Optional alternate | Umia Best Agentic Venture, only if framed as Siren Agent due diligence |

Do not claim Swarm, Apify, or SpaceComputer unless Daniel explicitly changes the target.

## Standing Rules

1. Both epics are locked (Epic 1 LIVE 2026-05-09; Epic 2 Bench Mode LOCKED 2026-05-09). Code is unblocked. Do not reintroduce "scope-locked, code-blocked" framing.
2. No SBO3L derivative framing.
3. No Agent Float resurrection.
4. No "generic scanner" pitch.
5. No "AI auditor" pitch.
6. No day/hour labels in plans.
7. Mocked paths labeled `mock: true`.
8. Slovak primary, English technical terms.
9. No emoji.

## Winning Shape

The product must feel like a smoke alarm, not a developer dashboard.

Five-second moment:

> ENS name resolves, proxy implementation changes, Sourcify evidence loads, screen turns red: SIREN.

## Tech Defaults Once Scope Is Locked

- Next.js 16 App Router
- Tailwind 4
- wagmi + viem
- Foundry
- Sourcify API
- ENS live resolution (Alchemy RPC — Sepolia + mainnet)
- `upgrade-siren:*` text records for project-specific ENS metadata
- Public-read fallback for protocols without Upgrade Siren records
- Sepolia demo contracts
- Mandatory EIP-712 report signature verification against `upgrade-siren:owner`

## Production Deployment

Daniel confirmed 2026-05-08:
- **Vercel Pro** account available
- **Alchemy** RPC keys (Sepolia + mainnet) ready
- **Operator wallet** for ENS operations ready

Pre-launch blocker: register chosen ENS parent. Mainnet registry owner check on 2026-05-08 showed `upgradesiren.eth`, `upgrade-siren.eth`, and `upgrade-siren-demo.eth` unowned, but purchase is not complete yet.

Full deployment prereqs + flow: `docs/12-implementation-roadmap.md` Production Deployment Prerequisites section.

## Past Project Memory

Strategic memory lives at:

`~/.claude/projects/-Users-danielbabjak-Desktop-ETHPrague2026/memory/MEMORY.md`

Use it for lessons, not for copying old architecture.
