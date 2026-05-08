# CLAUDE.md — project-specific guidance

## Project State

The repo has pivoted from **Agent Float** to **Upgrade Siren**.

Current status: **pivot pre-build**. Documentation may change. Code remains blocked until Daniel explicitly confirms final scope.

## Current Product

**Upgrade Siren** warns users, DAO voters, and venture reviewers when a named Ethereum contract upgrade changes what they are trusting.

Stage tagline:

> No source, no upgrade.

Product agent:

> **Siren Agent** watches ENS-named contracts or venture contract sets, runs Sourcify-backed upgrade analysis, and signs risk reports.

## Source of Truth

Read first:

1. `SCOPE.md`
2. `docs/01-vision.md`
3. `docs/04-technical-design.md`
4. `docs/05-demo-script.md`
5. `docs/07-sponsor-fit.md`

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

1. No code until Daniel confirms scope lock.
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
- Sepolia demo contracts
- Mandatory EIP-712 report signature verification against `siren:owner`

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
