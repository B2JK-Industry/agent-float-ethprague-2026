# CLAUDE.md — project-specific guidance

This file orients Claude (any session) when working in this repo.

## Project state

Agent Float — capital market for working AI agents. Built for ETHPrague 2026 (in-person, *"Building Ethereum's Solarpunk Future"*).

**Submission deadline:** 2026-05-10 12:00 PM via Devfolio (external fact, not scope driver).

## Source of truth

**`SCOPE.md`** is the single locked source of truth for what we're building. Read first. Always.

`BRAINSTORM.md` is historical ideation record (Idea 15 = Agent Float). Useful for context, not for current decisions.

`docs/` contains deep dives — architecture, tokenomics, contract specs, demo script, sponsor fit, risks, glossary.

## Standing rules (memory-locked)

These are project-specific reinforcements. Project memory is at `~/.claude/projects/-Users-danielbabjak-Desktop-ETHPrague2026/memory/`.

1. **Time is not a scope driver.** No day labels, no hour labels, no morning/evening, no `Day 1/2/3`. Workstreams + dependencies, not schedule. (Per `feedback_no_time_cuts.md`.)
2. **No SBO3L derivatives.** Receipts overlap is acceptable; "policy boundary / mandate gate / agent OS" framing is not. (Per `feedback_no_sbo3l_carryover.md`.)
3. **Pre-build gate.** 5-sek meta + memorable jednolinkovka are deal-breakers. Auto-reject "platform / OS / framework / boundary / layer / engine" in pitch sentence. (Per `feedback_pre_build_gate.md`.)
4. **Sponsor-native test.** Every sponsor track must pass *"could not exist without this technology"*. Decoration → drop. (Per `feedback_sponsor_native_test.md`.)
5. **Honest-over-slick.** Every claim reproducible from `git checkout && pnpm dev`. Mocked components labeled `mock: true` visibly in UI.
6. **No emoji.** Daniel hasn't used them; don't introduce.
7. **Slovak primary, English technical terms.** Brutally direct, tabular, no fluff, no motivational frasing.
8. **Full permissions.** Don't ask "shall I" — execute. Daniel reverses if needed.
9. **Robustné > quick-fix.** No green-test hacks. If something is broken, fix root cause.

## Tech stack defaults

- Next.js 16 App Router + Vercel + Tailwind 4 + shadcn/ui
- Vercel AI Gateway for LLM calls (provider/model strings, not provider-specific SDKs)
- Vercel Functions (Fluid Compute) for backend
- Foundry for Solidity
- pnpm workspaces monorepo
- `vercel.ts` for project config (not vercel.json)
- Single-branch (`main`) workflow with PR review
- Sepolia for fast iteration; mainnet ENS where it strengthens ENS Most Creative submission

## Sponsor stack (locked)

- Primary: Umia $12K (Best Agentic Venture)
- Secondary: ENS $2K (Most Creative — `<agent>.agentfloat.eth` passport pattern)
- Bonus: Sourcify $4K (treasury contract verification)
- Skip: SpaceComputer (no hardware), Apify (infrastructure only, not track), Swarm (cost not optimal)

## Tokenomics (locked, see SCOPE.md §5.5)

- Token supply: 2,000,000 fixed per agent
- Pricing: bonding curve (params builder-set)
- Builder retention: builder picks at registration
- USDC split: builder picks (upfront vs treasury)
- Token utility: revenue share only
- Distribution: pull (claim() function)
- Failure mode: builder personal obligation via BuilderBondVault collateral
- Secondary market: Umia
- Legal wrapper: Umia

## Demo agent

**GrantScout** — Apify-backed Gitcoin/Octant grant summarizer. Charges 0.01 USDC per paid report. Real receipts. Stretch agents: DataMonitor, TenderEye.

## Workstreams

See `SCOPE.md §11` — Track A through Track H, parallel-able where dependencies allow.

## What NOT to do

- Don't propose schedules with day labels, hours, morning/evening
- Don't preemptively MVP-ize or mark features "post-hack"
- Don't add SBO3L derivative framings
- Don't suggest hardware-heavy paths (no SpaceComputer)
- Don't mix infrastructure use (Apify for scraping) with sponsor track claims
- Don't use emoji, don't write motivational fluff
- Don't ask "shall I"; execute and report

## Past project memory

For cross-reference patterns from Watt City win, SBO3L lessons, Open Agents 2026 finalists/winners — see `~/.claude/projects/-Users-danielbabjak-Desktop-ETHPrague2026/memory/MEMORY.md`.
