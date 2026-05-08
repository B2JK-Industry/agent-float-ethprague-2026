# 10 — Risk register

Comprehensive risk catalog with owners and mitigations. Updated as risks materialize or close.

Risk levels: **Critical** (blocks submission), **High** (degrades quality significantly), **Medium** (acceptable with mitigation), **Low** (monitored, not addressed).

---

## Build/integration risks

### R-001 — Umia Tailored Auction integration unknown (POST-PIVOT 2026-05-08)

- **Level:** Critical (elevated post-pivot)
- **Probability:** 40% (slightly lowered after pivot to Umia core products gives clearer mentor conversation)
- **Owner:** Daniel (mentor sweep) → Claude (implementation)
- **Description:** Per external review, primary funding mechanism shifted to Umia **Tailored Auctions (Uniswap CCA)**. Integration depth depends on what Umia exposes: CLI flags, contract addresses, event signatures, frontend widgets. If Tailored Auctions are not accessible during the hackathon (mainnet-only requiring real KYC, or unfinished public API, or restricted access), demo cannot use real Umia primary sale path.
- **Mitigation:** Mentor sweep priority #1 with specific Tailored Auctions questions (`docs/09-sponsor-mentor-questions.md` Q1-11). Fallback paths in priority order:
  1. **Best:** Sepolia Tailored Auction supported → use real Umia integration
  2. **Acceptable:** Demo-only Umia simulator (their own mock environment if provided)
  3. **Last resort:** Our `BondingCurveSale.sol` fallback with explicit `mock: true` label + voiceover acknowledging Umia integration is post-hack
- **Trigger to escalate:** Mentor reveals Tailored Auctions are mainnet-only and demo-impractical → use fallback path 3 with explicit honest framing in demo.

### R-002 — Naming "Agent Float" collision

- **Level:** High
- **Probability:** 30%
- **Owner:** Claude (collision check)
- **Description:** Existing project, token, or company called "Float" or "Agent Float" could cause investor confusion or trademark issues.
- **Mitigation:** Run full collision check across GitHub, npm, ENS, X, domains, web search. Backup names pre-approved (AgentRunway, AgentPier, AgentDrydock, AgentBerth).
- **Trigger to escalate:** Active competitor or active token contract → pivot to backup name.

### R-003 — SpaceComputer KMS/cTRNG dependency

- **Level:** N/A — not in scope
- **Probability:** 0%
- **Description:** We've intentionally excluded SpaceComputer; no risk exposure.

### R-004 — ENS mainnet vs Sepolia decision

- **Level:** Medium
- **Probability:** 40%
- **Owner:** Daniel (mentor sweep)
- **Description:** If ENS Most Creative track expects mainnet parent registration, Sepolia-only weakens submission.
- **Mitigation:** Register `agentfloat.eth` on mainnet (or backup name's equivalent). Mainnet gas + reg fee budgeted. Sepolia mirror for fast iteration during build.

### R-005 — Sourcify verification fails on deploy

- **Level:** Medium
- **Probability:** 20%
- **Owner:** Claude (deploy script author)
- **Description:** Foundry build metadata may mismatch when uploaded to Sourcify, blocking verification.
- **Mitigation:** Test verification on Sepolia first with single contract. Use `forge verify-contract` with Sourcify provider. Have manual verify-via-API fallback.

### R-006 — RevenueDistributor accounting bugs

- **Level:** High
- **Probability:** 15%
- **Owner:** Claude (contract author)
- **Description:** Pro-rata math bugs could send wrong USDC amounts. Token transfers between distributions are an edge case.
- **Mitigation:** Foundry fuzz tests on math invariants. Reuse battle-tested 0xSplits accounting model. Property: sum of per-holder claimable ≤ total distributed.

### R-007 — Bonding curve quote mismatch

- **Level:** Medium
- **Probability:** 10%
- **Owner:** Claude (contract author)
- **Description:** UI quote and on-chain quote could diverge due to integer math precision.
- **Mitigation:** Always quote on-chain at buy time. UI shows estimated quote with disclaimer "actual price computed at tx time". Slippage protection in `buy()` function.

---

## Demo risks

### R-008 — Live agent paid query fails on stage

- **Level:** High
- **Probability:** 30%
- **Owner:** Daniel (presenter) + Claude (pre-flight check)
- **Description:** Live demo requires real Sepolia tx + Apify scraper + AI Gateway + ReceiptLog emit + Umia auction state surfacing — many moving parts.
- **Mitigation:** Pre-record fallback video of the same flow. Pre-warm Umia auction state (or fallback simulator). Have backup demo agent ready. Fast Sepolia RPC (Alchemy paid tier).

### R-009 — ENS resolution delays during demo

- **Level:** Medium
- **Probability:** 20%
- **Owner:** Claude (caching layer)
- **Description:** Mainnet ENS occasionally takes 2-5 seconds to resolve. Demo time is precious.
- **Mitigation:** Pre-resolve and cache for demo. UI shows "Loading from Sepolia..." if timeout. Voiceover handles delay gracefully.

### R-010 — Sepolia RPC rate-limit during demo

- **Level:** Medium
- **Probability:** 15%
- **Owner:** Claude (RPC config)
- **Description:** Public Sepolia RPCs can throttle during high-traffic events.
- **Mitigation:** Use Alchemy paid Sepolia endpoint. Have Anvil local fork as deep fallback with same state.

### R-011 — Token-casino perception by judges

- **Level:** High
- **Probability:** 35%
- **Owner:** Daniel (narrative) + Claude (UI)
- **Description:** Even with "no receipts, no float" rule, judges may pattern-match Agent Float to meme launchpads or hype-token platforms.
- **Mitigation:** "No receipts, no float" prominently displayed in UI banner. Demo opens by explicitly contrasting with hype tokens. Voiceover emphasizes "proof first, funding second".

### R-012 — Two-sided demo confusion

- **Level:** Medium
- **Probability:** 50% if not mitigated
- **Owner:** Daniel (presenter)
- **Description:** Showing both builder and investor flows in 5 minutes risks viewer confusion.
- **Mitigation:** Lock investor POV as single narrative thread. Builder POV mentioned in voiceover only, not shown actively. Demo script enforces this.

---

## Product/economic risks

### R-013 — Wash-trading by builder

- **Level:** High (if not mitigated; designed-out at protocol level)
- **Probability:** 30% (without mitigation), <5% (with mitigation)
- **Owner:** Claude (contract author)
- **Description:** Builder might fake receipts to pump apparent revenue → token price → ROI.
- **Mitigation:** Receipts must be signed by agent's ENS-registered wallet (separate from builder's). `paymentAmount` cross-checked against actual USDC `Transfer` events from end users. To fake receipts requires builder to send their own USDC, defeating purpose.

### R-014 — Builder rugpull

- **Level:** High (if not mitigated; designed-out at protocol level)
- **Probability:** 20% (without mitigation), <5% (with mitigation)
- **Owner:** Claude (contract author)
- **Description:** Builder takes USDC from token sale and disappears.
- **Mitigation:** Auction proceeds route to Umia noncustodial treasury (builder doesn't custody investor USDC). BuilderBondVault separately locks builder's personal collateral that slashes pro-rata to current Umia venture token holders if agent goes silent or milestone missed. Two-layer protection: Umia treasury controls + Agent Float bond accountability.

### R-015 — Token speculation decouples from agent reality

- **Level:** Medium
- **Probability:** 50%
- **Owner:** Claude (UI)
- **Description:** Token price could pump on hype, decoupling from actual agent revenue. Buyers later may regret.
- **Mitigation:** Umia secondary market provides actual price discovery against real buy/sell pressure (not arbitrary curve params). UI surfaces the live receipts feed so speculation is visible against agent productivity fundamentals. Honest UI + real on-chain proof of work are the cure.

### R-016 — Token classified as security in unfriendly jurisdiction

- **Level:** High (legal exposure)
- **Probability:** Variable by jurisdiction
- **Owner:** Umia (legal wrapper)
- **Description:** Per-agent venture tokens could be classified as securities under SEC, MiCA, or other frameworks.
- **Mitigation:** Umia's core business is the legal wrapper. We rely on their compliance. We do not promote tokens as investments outside Umia's permitted jurisdictions.

### R-017 — Failure mode triggers incorrectly

- **Level:** Medium
- **Probability:** 10%
- **Owner:** Claude (contract author)
- **Description:** Silence detector or milestone checker could fire when it shouldn't, slashing builder bond unfairly.
- **Mitigation:** Generous grace periods. Multi-sig confirmation required for non-automatic releases. Clear triggers documented in contract.

---

## Repository/process risks

### R-018 — Honest-over-slick discipline broken in demo

- **Level:** Critical (project credibility)
- **Probability:** 20%
- **Owner:** Daniel + Claude
- **Description:** Mocked component shipped without `mock: true` label could undermine "no receipts, no float" narrative.
- **Mitigation:** Acceptance gates GATE-5 catches this. Pre-demo dry-run includes explicit "is this real?" check on every visible component.

### R-019 — SBO3L derivative drift

- **Level:** Medium
- **Probability:** 10%
- **Owner:** Claude
- **Description:** Receipts primitive overlaps with SBO3L; under fatigue, framing could drift toward "policy boundary" / "mandate gate" territory.
- **Mitigation:** Memory rule `feedback_no_sbo3l_carryover.md` enforced. Watch for slipped vocabulary in docs/PRs.

### R-020 — Time pressure causes scope cuts that violate "no time cuts" rule

- **Level:** Medium
- **Probability:** 30%
- **Owner:** Daniel (cuts decision) + Claude (no preemptive cuts)
- **Description:** Late in build, real bottlenecks may force cuts. Risk: Claude preemptively cuts before Daniel decides.
- **Mitigation:** Memory rule `feedback_no_time_cuts.md`. Cuts only by Daniel.

---

## Open Agents 2026 directional risks

### R-021 — Pattern collision with Slopstock or Tradewise

- **Level:** Medium
- **Probability:** 30%
- **Owner:** Daniel (positioning)
- **Description:** Slopstock and Tradewise won by hitting similar primitives. Agent Float could be perceived as "another financialization play".
- **Mitigation:** Differentiate by sponsor depth (Umia native vs. their KH primary), by explicit "no receipts, no float" rule (they didn't have this), and by builder bond mechanism (slashing for default).

---

## Risk acceptance criteria

Not every risk warrants mitigation. Some can be accepted (lived with) if:

1. **Probability is low (<10%)** AND impact is medium or lower
2. **Mitigation cost exceeds expected loss** (rare in pre-build phase)
3. **External dependency makes mitigation infeasible** (e.g., R-001 if Umia integration genuinely doesn't exist)

For each accepted risk, document: who accepted, when, why mitigation rejected, what the team will do if it materializes.

In pre-build phase, no risks are formally accepted. All are OPEN with mitigation paths defined.

## Risk closure log

(updated as risks resolve)

| Risk ID | Status | Resolution |
|---|---|---|
| R-001 to R-021 | OPEN | Pre-build phase |
