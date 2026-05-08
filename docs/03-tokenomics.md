# 03 — Tokenomics

This document expands `SCOPE.md §5.5` with worked examples, mathematical models, and edge-case behavior. The locked parameters in SCOPE.md remain the source of truth.

## Locked parameters (recap)

| Parameter | Value |
|---|---|
| Token supply per agent | **2,000,000 fixed** |
| Pricing model | **Bonding curve** (params builder-set) |
| Builder retention | **Builder picks at registration** |
| USDC split | **Builder picks at registration (upfront vs treasury)** |
| Token utility | **Revenue share only** |
| Distribution | **Pull (claim() function)** |
| Failure mode | **Builder personal obligation via BuilderBondVault collateral** |
| Secondary market | **Umia** |
| Legal wrapper | **Umia** |

## Bonding curve

### Default shape

A linear bonding curve. Price as function of tokens already sold:

```
price(n) = startPrice + slope * n
```

Where:
- `n` = number of tokens already sold from the public allocation (excludes builder retention)
- `startPrice` = USDC per token at first sale
- `slope` = USDC increase per token sold

### Default parameters (subject to lock)

| Param | Default rec | Rationale |
|---|---|---|
| `startPrice` | 0.001 USDC | Low entry barrier; total token cap (1.6M public if 20% retention) at start ≈ 1,600 USDC |
| `slope` | 0.000001 USDC per token | Linear growth; final token in 1.6M public allocation costs ~ 0.001 + 0.000001 × 1,600,000 = 0.0026 USDC |

**Total public sale value at full bonding curve consumption** (with default 20% retention, 1.6M public):
```
totalUSDC = ∫₀^1.6M (0.001 + 0.000001 * n) dn
          = 0.001 * 1,600,000 + 0.000001 * (1,600,000^2) / 2
          = 1,600 + 1,280
          = 2,880 USDC raised
```

### Alternative shapes (post-MVP consideration)

- **Exponential:** `price(n) = startPrice * e^(k*n)` — more aggressive price escalation; rewards early buyers more
- **Square root:** `price(n) = startPrice + slope * sqrt(n)` — diminishing escalation; smoother for late buyers

Builder selects at registration. MVP defaults to linear.

## Worked examples

### Example 1 — Small agent (GrantScout demo)

**Builder setup at registration:**
- Token retention: 20% (400,000 tokens to builder)
- Public allocation: 1,600,000 tokens via bonding curve
- USDC split: 20% upfront / 80% treasury
- Milestones: 50 paid reports / 100 paid reports / 250 paid reports
- Builder bond: 500 USDC

**Investor A buys 1,000 tokens at curve start:**
- Price quote: avg of price(0) and price(1000) ≈ 0.0010005 USDC/token
- Total cost: 1.0005 USDC
- Routing: 0.20 USDC → builder wallet (upfront), 0.80 USDC → AgentTreasury

**Investor A's holdings:**
- 1,000 tokens of GrantScout
- 0.0625% of total supply (1,000 / 1,600,000 of public, but accounting against full 2M for revenue distribution: 1,000 / 2,000,000 = 0.05%)

**After agent earns 10 USDC in revenue:**
- 30% goes to AgentTreasury (replenish runway: 3 USDC)
- 70% goes to RevenueDistributor (distribute to holders: 7 USDC)
- Investor A's claimable: 7 × 0.05% = 0.0035 USDC

**Investor A claims after 100 paid reports (10 USDC × 100 = 1,000 USDC revenue):**
- Cumulative distributed: 700 USDC across all holders
- Investor A's claimable: 700 × 0.05% = 0.35 USDC

> **Note:** at small scale, the unit economics are tiny. The demo emphasizes the *mechanism* and *transparency*; real venture economics emerge at scale (1000+ paid queries × $0.01 = $10/day per agent → $300/month, distributed to <100 holders, gives meaningful returns).

### Example 2 — Successful milestone hit

GrantScout reaches 50 paid reports. MilestoneRegistry verifies. AgentTreasury releases first tranche to builder (e.g., 200 USDC of the locked treasury) for compute upgrade.

### Example 3 — Failed milestone / silence

GrantScout stops emitting receipts for 7 consecutive days. Silence detector triggers. BuilderBondVault.slash() executes:
- Snapshots current token holders
- 500 USDC bond distributes pro-rata
- Investor A (1000 tokens, 0.05%) receives 0.25 USDC slashing payout
- Agent profile shows "DEFAULTED" badge
- Builder reputation marked

## Revenue distribution mechanics

### Snapshot model

When agent posts revenue to RevenueDistributor:

```
1. RevenueDistributor receives X USDC
2. Reads current AgentVentureToken.totalSupply (always 2M)
3. For each holder:
   - holderShare = balanceOf(holder) / 2,000,000
   - holder.claimable += X * holderShare
4. RevenueDistributor balance increases by X
```

### Claim model

Investor calls `claim()`:

```
1. Read holder.claimable
2. Transfer claimable USDC to holder
3. Reset claimable = 0
```

### Edge case — token transfer between snapshots

If investor A sells 500 tokens to investor B between distribution events:
- A's claimable up to time of transfer remains with A (already accumulated)
- B's claimable starts from time of transfer onward
- This requires snapshot-on-distribution accounting (similar to Drips / 0xSplits design)

In v1 simplification: distribution events happen at fixed cadence (e.g., on every receipt event); transfer between events is handled by balance-at-distribution-time logic. Re-entrancy and accounting safety prioritized.

## Builder retention strategy

Builder picks retention % at registration. Trade-offs:

| Retention | Effect on builder | Effect on investors |
|---|---|---|
| 0% | All tokens public; builder has no skin in revenue | Investors get full upside but no signal of builder commitment |
| 10% | Modest builder stake | Healthy alignment |
| 20% (default rec) | Builder retains meaningful share; aligned with investors | Investors get 80% of supply on bonding curve |
| 50% | Builder controls majority; might dump | Investors should be cautious |
| 90%+ | Suspect — why fundraise? | Red flag |

UI displays retention prominently on agent profile. Tooltip explains alignment implications.

## USDC split strategy

Builder picks split at registration. Trade-offs:

| Upfront % | Effect on builder | Effect on investors |
|---|---|---|
| 0% | All USDC milestone-locked | Maximal investor protection; builder cash-starved at start |
| 20% (default rec) | Immediate prep money for compute/setup | Reasonable; majority milestone-locked |
| 50% | Builder gets half right away | Riskier for investors |
| 100% | Builder gets all funds upfront | Equivalent to traditional VC; defeats milestone gating |

UI shows split prominently. Investors see "X% of your contribution goes upfront to builder, (100-X)% locks in agent treasury, releases on milestones."

## Builder bond strategy

Builder personal collateral, locked at registration. Slashes if milestones missed or agent goes silent.

Default rec for demo agent: 500 USDC.

| Bond size | Signal to investors |
|---|---|
| 100 USDC | Token-funded experiment; weak commitment |
| 500 USDC | Reasonable demo-scale commitment |
| 5,000 USDC | Strong commitment for serious agent |
| 50,000+ USDC | Major venture; suggests builder has independent capital |

Bond size is public on agent profile.

## Wash-trading mitigation

Builder might try to fake receipts to pump apparent revenue → token price → ROI metrics → attract more buyers.

**Mitigation chain:**

1. Receipts must be signed by agent's ENS-registered wallet (not builder's wallet — they're distinct keys)
2. `paymentAmount` field on each Receipt cross-checks against an actual USDC `Transfer` event from end user → agent wallet on-chain
3. ReceiptLog cannot accept a Receipt without a corresponding USDC transfer matching `paymentAmount`
4. To fake a receipt, builder would need to send their own USDC to the agent → which means burning their own USDC for fake revenue → defeats the purpose

**Result:** wash-trading is mathematically un-profitable. Builder can fake receipts only by losing real money. The bonding curve reward of pumping doesn't compensate for the burn cost at any reasonable parameter choice.

## Failure mode summary

| Failure | Detection | Response |
|---|---|---|
| Milestone missed (e.g., agent doesn't hit 50 reports in 30 days) | MilestoneRegistry oracle/multi-sig check | BuilderBondVault.slash() distributes bond pro-rata to current token holders |
| Agent silent (no receipts for N days, default 7) | ReceiptLog event timestamp + scheduled job | Same as above |
| Builder rugpull attempt (drain agent wallet) | AgentTreasury multi-sig requires Umia delegate signature for non-milestone releases | Multi-sig blocks unauthorized release |
| Wash-trading | ReceiptLog.checkUSDCMatch() function rejects unbacked receipts | Receipt rejected at write-time |

## Scale economics (post-MVP projection)

For meaningful agent venture math, consider mid-scale agent:

- 100 paid queries/day × 0.01 USDC = 1 USDC/day = $30/month gross
- Split: $9 to treasury (replenish), $21 to RevenueDistributor
- 100 token holders, average holding 16,000 tokens (0.8% supply)
- Per-holder daily distribution: $0.21 × 0.8% = $0.0017/day = $0.05/month
- Annual: $0.60 per holder per agent

Real venture math becomes meaningful at 1,000+ queries/day. The MVP demo emphasizes mechanism, not economics — at $10/query (B2B agents) or 10,000+ daily queries, distribution math becomes investor-relevant.
