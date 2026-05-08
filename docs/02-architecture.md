# 02 — Architecture

## System overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          AGENT FLOAT                                    │
└─────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐         ┌────────────────────────┐         ┌──────────┐
  │   Builder    │         │   Web Platform         │         │ Investor │
  │              │  ─────▶ │   (Next.js + Vercel)   │ ◀─────  │          │
  │   wallet     │  reg    │                        │  buy    │  wallet  │
  └──────────────┘         │   landing              │         └──────────┘
                           │   agent profile        │              │
                           │   investor browse      │              │
                           │   builder dashboard    │              │
                           │   leaderboard          │              │
                           │   float interface      │              │
                           └───────────┬────────────┘              │
                                       │                           │
                                       │ wagmi/viem                │
                                       ▼                           │
                           ┌────────────────────────┐              │
                           │   Sepolia / Mainnet    │              │
                           │   (Foundry contracts)  │              │
                           │                        │              │
                           │   AgentRegistry        │              │
                           │   AgentVentureToken    │              │
                           │   BondingCurveSale ◀───┼──────────────┘
                           │   AgentTreasury        │
                           │   MilestoneRegistry    │
                           │   BuilderBondVault     │
                           │   RevenueDistributor ──┼──────────┐
                           │   ReceiptLog ◀─────────┼──┐       │ claim()
                           └────────────────────────┘  │       │
                                                        │       ▼
                           ┌────────────────────────┐  │  ┌──────────┐
                           │   ENS                  │  │  │ Investor │
                           │   agentfloat.eth       │  │  │  USDC    │
                           │   subname registry     │  │  │          │
                           └────────────────────────┘  │  └──────────┘
                                                        │
                           ┌────────────────────────┐  │
                           │   Demo Agents          │  │
                           │   (Vercel Functions)   │  │
                           │                        │  │
                           │   GrantScout ──────────┼──┘ emit receipt
                           │   DataMonitor          │
                           │   TenderEye            │
                           └───────────┬────────────┘
                                       │
                                       ▼ paid query
                           ┌────────────────────────┐
                           │   End User             │
                           │   (USDC payer)         │
                           └────────────────────────┘

                           ┌────────────────────────┐
                           │   Umia                 │
                           │   - legal wrapper      │
                           │   - secondary market   │
                           │   - treasury delegate  │
                           └────────────────────────┘

                           ┌────────────────────────┐
                           │   Sourcify             │
                           │   - source verify      │
                           │   - public audit       │
                           └────────────────────────┘
```

## Layered components

### Layer 1 — Identity (ENS)

- Parent ENS: `agentfloat.eth` (mainnet primary, Sepolia mirror for iteration)
- Custom resolver supports text records: `wallet`, `endpoints`, `capabilities`, `receipts_pointer`, `treasury`, `venture_token`, `bond_vault`
- Subnames issued programmatically: `<agent>.agentfloat.eth`
- Live resolve via wagmi/viem in UI; no hard-coded addresses

### Layer 2 — Onchain core (Foundry, Sepolia + selected mainnet)

The contract suite is intentionally modular — each contract has a single responsibility.

| Contract | Responsibility | Cross-references |
|---|---|---|
| `AgentRegistry.sol` | Single entry point for `registerAgent()`. Orchestrates token mint, bond lock, curve setup, treasury deploy, milestone registration. | All other contracts |
| `AgentVentureToken.sol` | ERC20, fixed 2M supply. Minted at registration. Standard transfer semantics. | RevenueDistributor reads balance |
| `BondingCurveSale.sol` | Primary sale via bonding curve. Buyer posts USDC, gets tokens at curve price. | AgentVentureToken, AgentTreasury, builder wallet |
| `AgentTreasury.sol` | Holds USDC (from sale + revenue). Multi-sig signers: builder + Umia delegate + investor delegate. Releases tranches per MilestoneRegistry. | MilestoneRegistry, RevenueDistributor |
| `MilestoneRegistry.sol` | Builder commits milestones at registration. Oracle/multi-sig releases tranches when met. Triggers BuilderBondVault slashing if missed. | AgentTreasury, BuilderBondVault |
| `BuilderBondVault.sol` | Locks builder's USDC collateral. Slashes pro-rata to investors if milestones missed OR receipts silent for N days. | AgentVentureToken (snapshot), MilestoneRegistry, ReceiptLog |
| `RevenueDistributor.sol` | Receives agent USDC revenue. Tracks per-holder claimable balance based on token holdings at distribution snapshot. `claim()` for investor withdrawal. | AgentVentureToken (balance), AgentTreasury |
| `ReceiptLog.sol` | Append-only events for agent activity. Each receipt: `(agent, timestamp, queryId, reportHash, paymentAmount, signer)`. | Read by RevenueDistributor + UI |

See [04-contracts.md](./04-contracts.md) for per-contract API.

### Layer 3 — Demo agents (Vercel Functions + AI Gateway)

Each demo agent is a small Vercel Function workspace that:
1. Accepts a paid query (user posts USDC + query)
2. Validates payment via Sepolia tx
3. Executes work using AI Gateway (Claude Sonnet) + Apify Actor for data
4. Returns a signed report
5. Emits a `Receipt` event to `ReceiptLog`
6. Routes USDC: portion to AgentTreasury (replenish), rest to RevenueDistributor (distribute to token holders)

**Primary demo agent: GrantScout**
- Apify Actor scrapes Gitcoin / Octant / Drips active rounds
- AI summarizes each grant + scores impact
- Charges 0.01 USDC per paid report
- Signs receipt with agent ENS-registered wallet

**Stretch agents (variety strengthens venture pitch):**
- **DataMonitor** — watches a public on-chain event feed (e.g., Aave liquidations), pushes paid alerts
- **TenderEye** — flags suspicious EU procurement patterns; charges per investigation report

### Layer 4 — Web platform (Next.js 16 + Vercel)

| Route | Purpose |
|---|---|
| `/` | Landing page with featured agents, "no receipts, no float" prominent |
| `/agent/[ens-name]` | Agent profile: ENS passport, receipts feed, revenue chart, runway, bonding curve, milestones, builder bond status |
| `/invest` | Browse all agents, sort by revenue/runway/category |
| `/portfolio` | Investor's token holdings + claimable balances |
| `/builder` | Builder dashboard: register agent, manage milestones, view investors |
| `/leaderboard` | Top revenue agents, top fundraises |
| `/api/agent/[ens-name]/query` | Paid query endpoint for the agent (delegated to demo agent function) |
| `/api/receipts/[ens-name]` | Receipts feed indexer (filtered Sepolia events) |

### Layer 5 — Receipt SDK (`@agentfloat/sdk`, `agentfloat` Python package)

Builders integrate their existing agents using the SDK:

```typescript
import { emitReceipt, fetchReceipts } from '@agentfloat/sdk';

await emitReceipt({
  agentEns: 'mygrant.agentfloat.eth',
  queryId: '0x...',
  reportHash: '0x...',
  amount: parseUnits('0.01', 6),  // USDC
  signer: agentWallet,
});
```

```python
from agentfloat import emit_receipt, fetch_receipts

emit_receipt(
    agent_ens='mygrant.agentfloat.eth',
    query_id='0x...',
    report_hash='0x...',
    amount=10_000,  # USDC base units
    signer=agent_wallet,
)
```

### Layer 6 — Off-chain integrations

- **Umia API** — fund flow + secondary market + legal wrapper. Concrete integration depth pending mentor sweep.
- **Sourcify** — source code verification for every deployed contract; public link from agent profile.
- **AI Gateway (Vercel)** — LLM calls for demo agents; provider/model strings, prompt caching enabled.
- **Apify** — used as infrastructure for demo agent scraping (Gitcoin, Octant). Not claimed as sponsor track.

## Data flow — registration

```
Builder calls AgentRegistry.registerAgent({
  ensName, builderRetention%, bondingCurveParams,
  usdcSplit{upfront, treasury}, milestones, builderBond, metadata
})
   │
   ├─▶ ENS subname registered: <agent>.agentfloat.eth
   ├─▶ AgentVentureToken deployed (2M supply minted)
   │     └─▶ builderRetention% goes to builder wallet
   │     └─▶ rest reserved for BondingCurveSale
   ├─▶ BondingCurveSale deployed with curve params
   ├─▶ AgentTreasury deployed (multi-sig)
   ├─▶ MilestoneRegistry initialized with builder's milestones
   ├─▶ BuilderBondVault locks builderBond USDC from builder
   └─▶ Agent ready to receive paid queries
```

## Data flow — investor purchase

```
Investor calls BondingCurveSale.buy(amount)
   │
   ├─▶ Curve calculates USDC required for `amount` tokens
   ├─▶ Investor pays USDC
   │     └─▶ usdcSplit.upfront% → builder wallet
   │     └─▶ usdcSplit.treasury% → AgentTreasury
   ├─▶ Tokens transferred to investor (out of reserved pool)
   └─▶ Investor now eligible for revenue distribution
```

## Data flow — agent earns + distributes

```
End user posts paid query to demo agent
   │
   ├─▶ Demo agent validates USDC payment (Sepolia tx)
   ├─▶ Executes work (AI Gateway + Apify)
   ├─▶ Signs report
   ├─▶ Emits Receipt event to ReceiptLog
   ├─▶ Routes USDC:
   │     ├─▶ X% → AgentTreasury (replenish runway)
   │     └─▶ (100-X)% → RevenueDistributor
   └─▶ RevenueDistributor accumulates per-holder claimable
       (snapshot based on AgentVentureToken balanceOf at distribution time)
```

## Data flow — investor claim

```
Investor calls RevenueDistributor.claim()
   │
   ├─▶ Read accumulated claimable for msg.sender
   ├─▶ Transfer USDC to msg.sender
   └─▶ Reset claimable balance
```

## Data flow — slashing trigger

```
EITHER:
  MilestoneRegistry.checkMilestone(milestoneId) returns FAILED
    AND grace period expired
OR:
  ReceiptLog has no events for agent in N consecutive days
THEN:
  BuilderBondVault.slash() triggered
    │
    ├─▶ Snapshots current AgentVentureToken holders
    ├─▶ Distributes locked bond pro-rata
    └─▶ Marks agent as defaulted (UI shows badge)
```

## Tech stack rationale

| Choice | Why |
|---|---|
| Next.js 16 App Router | Mature React framework; Vercel-native; aligns with reuse stack |
| Vercel Functions (Fluid Compute) | Default 2026; better cold-start than Edge; Node.js full compat |
| Vercel AI Gateway | Provider-agnostic LLM; prompt caching; observability; aligns with 2026 best practice |
| Foundry | Fast solidity iteration; battle-tested; supports forge tests + scripts |
| pnpm workspaces | Monorepo for apps/contracts/packages without Nx/Turbo overhead |
| `vercel.ts` config | TypeScript over JSON; dynamic logic; 2026 default |
| ENS mainnet for parent | Stronger Most Creative submission than Sepolia-only |
| Sepolia for iteration | Cheap gas, fast confirmations, reliable RPCs (Alchemy) |
| MIT license | Permissive; aligns with Solarpunk open-architecture framing |
