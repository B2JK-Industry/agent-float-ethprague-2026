# AGENTS.md — guidance for Claude, Codex, and other agentic collaborators

## Current phase

**Pre-build → scaffolding.** Scope locked (`SCOPE.md`). Tokenomics locked (`SCOPE.md §5.5`). Repo initialized. Documentation complete in `docs/`. Code scaffolding pending naming-collision check and Umia mentor sweep.

Working dir is the repo root. `BRAINSTORM.md` records historical ideation.

## Hard rules

1. **No code commits without scope alignment.** Read `SCOPE.md` first; if a change conflicts, raise it before coding.
2. **All non-trivial changes via PR**, not direct push to `main`. Branch naming: `feat/<scope>`, `fix/<scope>`, `docs/<scope>`, `brainstorm/<scope>`.
3. **Tag authors in collaboration markdowns:** `[Daniel]`, `[Claude]`, `[Codex]`. Brief, factual.
4. **Brutally critical.** Reject signals are good. Don't flatter generic ideas.
5. **No SBO3L derivatives.** "Policy boundary / mandate gate / agent OS" framings are anti-pattern here. (See project memory.)
6. **No time-driven scope cuts.** Time is not a constraint Claude imposes. Daniel calls cuts during execution. (See `feedback_no_time_cuts.md`.)
7. **No day/hour labels in plans.** Workstreams + dependencies only.
8. **Honest-over-slick.** Mocked components labeled `mock: true` in UI. Every claim reproducible from `git checkout && pnpm dev`.

## Hard contextual constraints

- Submission via Devfolio by 2026-05-10 12:00 PM (external fact, not scope driver).
- Theme: **Solarpunk Future** — anti-extractive, civic, regenerative, public goods, privacy.
- Sponsor lock: Umia (primary) + ENS (secondary) + Sourcify (bonus). Max 1+1+1.
- No hardware-heavy paths. No ZK circuits beyond off-shelf libs. No multi-chain in v1.

## Add new idea or component — workflow

1. `git checkout -b <type>/<scope-slug>`
2. For ideas/discussion: edit `BRAINSTORM.md`. For locked-scope changes: propose via `SCOPE.md` PR.
3. For docs additions: add to `docs/`. Cross-link from `README.md`.
4. For code: align with `SCOPE.md` workstream tracks.
5. PR with clear description. Daniel approves before merge.

## Add comment under existing idea

1. Find the section in `BRAINSTORM.md`.
2. Append `- [Author] <comment>` under the `#### Comments` heading.
3. Commit + push (via PR if not Daniel).

## Memory location (read-only context)

`~/.claude/projects/-Users-danielbabjak-Desktop-ETHPrague2026/memory/MEMORY.md` — index of all strategic decisions, learnings, sponsor info, anti-patterns, reuse stack, Open Agents 2026 finalist DNA.

## Sponsor summary

| Sponsor | Total | Status |
|---|---|---|
| Umia | $12K | Primary track (Best Agentic Venture) |
| ETHPrague organizer | $9K | Network Economy track targeted |
| SpaceComputer | $6K | Skipped (no hardware fit) |
| Sourcify | $4K | Bonus track (treasury contract verification) |
| ENS | $4K | Secondary track ($2K Most Creative) |
| Apify | $3.7K | Used as infrastructure only, NOT track |
| Swarm | $2.45K | Skipped |

## Communication

- Daniel = Slovak primary, English technical terms.
- Brutally direct, no fluff.
- No emoji.
- Tables for comparisons, bullet lists for ranks.
- "Decision needed" callouts when input required.
