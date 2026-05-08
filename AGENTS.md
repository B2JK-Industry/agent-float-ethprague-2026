# AGENTS.md — guidance for Claude, Codex, and other agentic collaborators

## Current Phase

**Pivot pre-build.** Documentation has moved from Agent Float to **Upgrade Siren**. Code remains blocked until Daniel explicitly confirms this scope as final.

Workspace root: `/Users/danielbabjak/Desktop/ETHPrague2026`

## Hard Rules

1. **No code until scope lock.** Documentation edits are allowed; contracts/apps/dependencies are blocked until Daniel confirms Upgrade Siren as final build scope.
2. **All non-trivial changes via branch + PR**, not direct push to `main`. Branch naming: `brainstorm/<scope>`, `docs/<scope>`, `feat/<scope>`.
3. **Tag authors in collaboration markdowns:** `[Daniel]`, `[Claude]`, `[Codex]`.
4. **Brutally critical.** Reject signals are useful.
5. **No SBO3L derivatives.** Do not pitch "policy boundary", "mandate gate", "agent OS", or similar.
6. **Do not resurrect Agent Float unless Daniel asks.** Old funding/tokenization docs are archived by git history.
7. **No time-driven scope cuts.** Daniel calls scope cuts during execution.
8. **No day/hour labels in plans.** Use workstreams and dependencies.
9. **Honest-over-slick.** Mocked data must be visibly labeled `mock: true`.
10. **No emoji.**

## Current Product

**Upgrade Siren** is a public alarm for risky smart contract upgrades.

Stage tagline:

> No source, no upgrade.

Sponsor strategy:

| Priority | Target |
|---|---|
| Primary sponsor | Sourcify |
| Secondary sponsor | ENS Most Creative Use |
| Organizer track | ETHPrague Future Society |
| Optional alternate | Umia, only as Siren Agent due-diligence venture |

## What Must Stay True

- ENS must do real work: contract identity, version naming, report discovery, live records.
- Sourcify must do real work: verification, ABI, source metadata, storage layout, bytecode evidence.
- The product must not become a generic scanner.
- The user-facing output is an alarm: `SAFE`, `REVIEW`, `SIREN`.
- The demo must show at least one safe and one dangerous upgrade.

## Memory Location

`~/.claude/projects/-Users-danielbabjak-Desktop-ETHPrague2026/memory/MEMORY.md`

Use memory for strategic learnings, but do not copy old Agent Float scope forward.

## Communication

- Daniel = Slovak primary, English technical terms.
- Brutally direct, no fluff.
- Tables for comparisons, bullets for rankings.
- If a decision is needed, say **Decision needed** and name the tradeoff.
