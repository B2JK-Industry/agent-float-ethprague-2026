# 03 — Tokenomics

> **PIVOT NOTICE (2026-05-08):** Per external review + sponsor-native test analysis, primary funding mechanism shifted from custom `BondingCurveSale.sol` to **Umia Tailored Auctions** (Uniswap CCA-based). This document leads with Umia-native mechanics. Legacy bonding-curve math is retained in **Appendix A** as a fallback simulator only. Final lock pending Umia mentor sweep confirmation. See `SCOPE.md §13` Decision log.

This document expands `SCOPE.md §5.5`. The locked parameters in SCOPE.md remain the source of truth.

---

## Locked parameters (post-pivot)

| Parameter | Value | Status |
|---|---|---|
| Token supply per agent | **Per Umia venture template** | Was 2M fixed; now per Umia. May or may not match 2M depending on Umia convention. |
| Pricing model | **Umia Tailored Auction (Uniswap CCA)** | Bonding curve = fallback only, not pitched |
| Builder retention | **Per Umia venture init config** | Builder controls via Umia CLI, not our params |
| USDC routing | **Per Umia treasury config** | Umia handles; we don't define split |
| Token economic exposure | **Per Umia venture wrapper** | We do not redefine. *"Pro-rata revenue share"* and similar wording is **deferred to Umia legal model**. |
| Distribution mechanism | **Per Umia treasury features** | If Umia distributes natively, no Agent Float helper. If not, conditional `RevenueDistributor.sol`. |
| Failure mode | **Builder personal obligation via BuilderBondVault collateral** | UNCHANGED — Agent Float innovation, independent of Umia |
| Secondary market | **Umia** | UNCHANGED |
| Legal wrapper | **Umia (`umia venture init`)** | UNCHANGED |
| Governance | **Umia decision markets** | Per Umia venture governance layer |

> **Wording discipline (post-review):** Until Umia mentor confirms the exact legal/economic model, all Agent Float-side documentation **avoids** claims like "investors receive pro-rata revenue share", "X% of agent revenue goes to token holders", "claim accumulated USDC". Replace with: "investor exposure follows Umia's venture wrapper", "agent earns USDC; routing per Umia treasury", "token holders see receipts feed (proof of agent productivity)".

---

## Primary mechanism — Umia Tailored Auction

### What it is

Umia provides **Tailored Auctions powered by Uniswap CCA (Continuous Clearing Auctions)**. This is the canonical mechanism for primary token sale in their venture flow.

> **Honest gap:** Specific mechanics of Umia's Tailored Auction (curve shape, time windows, fill priority, slippage parameters) are not yet verified at our level. Mentor sweep priority #1 (`docs/09-sponsor-mentor-questions.md`) confirms.

### Expected flow (reconstructed from Umia public docs + reviewer findings)

1. Builder runs `umia venture init` (Umia CLI)
2. Umia creates legal entity wrapper for the agent venture
3. Umia deploys / configures venture token (their template OR our ERC20 imported)
4. Umia configures Tailored Auction parameters (clearing-price target, time bounds, supply allocation)
5. Auction goes live; investors bid; Uniswap CCA settles continuous clearing prices
6. Proceeds route to Umia noncustodial treasury per their config
7. Tokens credited to investor wallets via Umia mechanism

### Agent Float surfacing (our integration)

- `<agent>.agentfloat.eth` ENS passport with `agentfloat:umia_venture` namespaced text record pointing to the Umia venture address
- "Fund via Umia" CTA on agent profile redirects to Umia auction page
- Receipts feed visible from Agent Float profile (independent of Umia auction state)
- Builder bond vault status (independent of Umia)
- Milestone progress (independent of Umia)
- Post-auction: Umia venture token holdings visible on agent profile

### Why this is the right call

Sponsor-native test: without Umia auction, Umia would be decoration. Their Tailored Auctions are their **core product** (the $12K Best Agentic Venture rewards using their core, not bypassing it).

---

## Builder bond strategy (Agent Float innovation)

Builder personal collateral, locked at registration in `BuilderBondVault.sol`. Slashes pro-rata to current Umia venture token holders if milestones miss or agent goes silent.

This is **independent of Umia** — Umia's venture wrapper does not include personal accountability collateral. Agent Float adds it as the differentiating accountability primitive.

Default rec for demo agent: 500 USDC.

| Bond size | Signal to investors |
|---|---|
| 100 USDC | Token-funded experiment; weak commitment |
| 500 USDC | Reasonable demo-scale commitment |
| 5,000 USDC | Strong commitment for serious agent |
| 50,000+ USDC | Major venture; suggests builder has independent capital |

Bond size is public on agent profile.

---

## Wash-trading defense (raises cost; does not eliminate)

Builder might try to fake receipts to pump apparent revenue → token price → ROI metrics → attract more buyers.

**Defense chain:**

1. Receipts must be signed by agent's ENS-registered wallet (not builder's wallet — they're distinct keys)
2. `paymentAmount` field on each Receipt cross-checks against an actual USDC `Transfer` event from end user → agent wallet on-chain
3. ReceiptLog rejects Receipts without a corresponding USDC transfer matching `paymentAmount`
4. To fake a receipt, builder must self-fund: send their own USDC to the agent wallet, then have the agent emit a receipt referencing it

**Honest result:** This **raises the cost** of fake receipts to the value of the wash USDC moved, but **does not eliminate** wash-trading. A builder can still rationally fake activity if external hype or token-price gains exceed the wash cost. Mitigation is a deterrent, not a proof. The full defense relies on:

- ReceiptLog cross-validation (this section)
- BuilderBondVault personal collateral (raises stake further)
- Public investor scrutiny via on-chain receipts feed (judges in market)
- Umia's secondary market price discovery (post-launch reality test)

---

## Failure mode summary

| Failure | Detection | Response |
|---|---|---|
| Milestone missed | MilestoneRegistry oracle/multi-sig check | `BuilderBondVault.slash()` distributes bond pro-rata to current Umia venture token holders |
| Agent silent (no receipts for N days, default 7) | ReceiptLog event timestamp + scheduled job | Same as above |
| Builder rugpull attempt | Umia noncustodial treasury controls; Agent Float bond vault separate | Umia treasury rules block unauthorized release; bond unaffected by builder |
| Wash-trading | `ReceiptLog.emitReceipt()` reverts on missing USDC `Transfer` match | Fake receipt rejected at write-time; cost-imposed on builder for self-funded fakes (does not eliminate) |

---

## Scale economics — Umia-native framing

For meaningful agent venture math, consider mid-scale agent:

- 100 paid queries/day × 0.01 USDC = 1 USDC/day = ~$30/month gross
- USDC routing per Umia venture treasury configuration (not defined by Agent Float)
- Token holder economic exposure determined by Umia's venture wrapper

The MVP demo emphasizes **mechanism + proof**, not economics. At small scale (single agent, demo conditions), distribution numbers are micro and meaningless. At $10/query (B2B agents) or 10,000+ daily queries, the venture math becomes investor-relevant — and that's the post-hackathon trajectory, not the demo.

> Reviewer flagged: do not cite small distribution claim numbers (e.g., "0.0035 USDC accrued") in pitch or demo. Judges see fake math instantly. Demo emphasizes proof of agent productivity (receipts feed live), not micro-distribution amounts.

---

## Appendix A — Fallback bonding curve mechanics

> ⚠️ This appendix describes our internal `BondingCurveSale.sol` **fallback** path. **Not pitched as primary.** Used only if Umia auction integration is unavailable at demo time. Not a substitute for the Umia primary mechanism. Math kept for engineering reference only.

### Linear bonding curve (default if used)

```
price(n) = startPrice + slope * n
```

- `n` = number of tokens already sold from public allocation
- `startPrice` = USDC per token at first sale
- `slope` = USDC increase per token sold

Default rec params (unused in primary path): `startPrice = 0.001 USDC`, `slope = 0.000001 USDC/token`.

Total raise at full consumption (1.6M public allocation, 20% builder retention): `~2,880 USDC`.

### Optional shapes

- Exponential: `price(n) = startPrice * e^(k*n)`
- Square root: `price(n) = startPrice + slope * sqrt(n)`

Builder selects at registration if fallback path is used. If the Umia auction is the active path (default), these are irrelevant.

### Builder retention / USDC split (fallback only)

Used only if `BondingCurveSale.sol` is the active path. In Umia primary path, both are configured via `umia venture init`.

| Retention % (fallback) | Investor signal |
|---|---|
| 0% | No builder skin in revenue |
| 20% (default fallback rec) | Healthy alignment |
| 50%+ | Caution |

| Upfront USDC % (fallback) | Investor signal |
|---|---|
| 0% | All milestone-locked |
| 20% (default fallback rec) | Reasonable; majority milestone-locked |
| 100% | Defeats milestone gating |

### Revenue distribution mechanics (fallback only)

If the Umia treasury does not natively distribute to Umia venture token holders, Agent Float deploys a conditional `RevenueDistributor.sol`:

```
distribute(amount):
  totalSupply = AgentVentureToken.totalSupply()
  for each holder:
    holder.claimable += amount * balanceOf(holder) / totalSupply

claim():
  transfer holder.claimable USDC
  reset holder.claimable
```

Snapshot accounting handles transfers between distributions (similar to Drips / 0xSplits patterns).

> If Umia natively handles holder distribution, this contract is **not deployed**.

### Edge case — token transfer between distributions (fallback only)

A's claimable up to time of transfer remains with A; B's claimable starts from time of transfer. Implementation uses balance-at-distribution-time logic with reentrancy guards.

---

## Cross-references

- Locked source of truth: [`SCOPE.md §5.5`](../SCOPE.md)
- Per-contract spec: [`docs/04-contracts.md`](./04-contracts.md)
- Sponsor fit: [`docs/07-sponsor-fit.md`](./07-sponsor-fit.md)
- Sponsor explainer: [`docs/12-sponsors-explained.md`](./12-sponsors-explained.md)
