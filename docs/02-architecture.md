# 02 — Architecture

> **PIVOT NOTICE (2026-05-08):** Architecture below has been refactored post-external-review. **Umia provides** Tailored Auctions (Uniswap CCA), noncustodial treasury, legal wrapper, decision markets, secondary market. **Agent Float adds** ENS passport (ENSIP-26), receipts gate, builder bond, milestone slashing. Several previously-listed contracts (`BondingCurveSale.sol`, `AgentTreasury.sol`, possibly `AgentVentureToken.sol`) are reclassified — see `docs/04-contracts.md`.

## System overview

Agent Float sits as a **discovery, proof, and accountability layer ABOVE** Umia. Funding, token issuance, treasury, and secondary market are Umia core products. Agent Float adds ENS passport, on-chain receipts gate, builder bond, and milestone slashing.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         FUNDING CORE — UMIA                                  │
│                                                                              │
│   umia venture init   →   Tailored Auction (Uniswap CCA)                     │
│                       →   Noncustodial treasury                              │
│                       →   Decision markets (governance)                      │
│                       →   Secondary market                                   │
│                       →   Legal wrapper (securities/jurisdictional)          │
└──────────────────────────────────────────────────────────────────────────────┘
                            ▲                                ▲
                            │ funds                          │ token holdings
                            │                                │
   ┌────────────────────────┴───────────────────────┐        │
   │                                                │        │
   │   AGENT FLOAT — discovery/proof/accountability │        │
   │                                                │        │
   │   Web platform (Next.js + Vercel)              │        │
   │   ───────────────────────────────              │        │
   │   landing │ agent profile │ investor browse    │        │
   │   builder dashboard │ leaderboard              │        │
   │                                                │        │
   │            │ wagmi/viem                        │        │
   │            ▼                                   │        │
   │   Foundry contracts (Sepolia/mainnet)          │        │
   │   ───────────────────────────────              │        │
   │   AgentRegistry          (links Umia + ENS)    │        │
   │   ReceiptLog             (signed proofs)       │        │
   │   BuilderBondVault       (slashable collateral)│        │
   │   MilestoneRegistry      (commitments)         │        │
   │                                                │        │
   │   ENS subname registry (ENSIP-26 records)      │        │
   │      <agent>.agentfloat.eth                    │        │
   │                                                │        │
   │   [conditional/fallback only — see docs/04]:   │        │
   │   AgentVentureToken / BondingCurveSale /       │        │
   │   AgentTreasury / RevenueDistributor           │        │
   └────────────────────────┬───────────────────────┘        │
                            │                                │
                            │ resolves                       │
                            │                                │
   ┌────────────────────────┴───────────────────────┐        │
   │                                                │        │
   │    Builder ─────────▶ runs `umia venture init` │        │
   │                       (creates Umia venture)   │────────┘
   │                                                │
   │    Builder ─────────▶ AgentRegistry.register   │
   │                       (links Umia + ENS,       │
   │                        locks bond, commits     │
   │                        milestones)             │
   │                                                │
   │    Investor ────────▶ browses Agent Float      │
   │                ────▶ "Fund via Umia"           │────────┐
   │                       redirects to auction     │        │
   │                                                │        │
   └────────────────────────┬───────────────────────┘        │
                            │                                │
                            │                                ▼
                            │                       ┌──────────────────┐
                            │                       │ Investor wallet  │
                            │                       │ holds Umia       │
                            │                       │ venture tokens   │
                            │                       └──────────────────┘
                            │
                            ▼
   ┌────────────────────────────────────────────────┐
   │  Demo agents (Vercel Functions + AI Gateway)   │
   │  GrantScout / DataMonitor / TenderEye          │
   │      │                                         │
   │      ▼ paid query                              │
   │  End user (USDC payer)                         │
   │      │                                         │
   │      ▼ emit signed receipt                     │
   │  ReceiptLog ──────────────▶ visible in profile │
   └────────────────────────────────────────────────┘

   ┌────────────────────────┐    ┌────────────────────────┐
   │  ENS                   │    │  Sourcify              │
   │  agentfloat.eth        │    │  source verify for     │
   │  subname registry      │    │  Agent Float contracts │
   │  (ENSIP-26 records)    │    │                        │
   └────────────────────────┘    └────────────────────────┘
```

## Layered components

### Layer 1 — Identity (ERC-8004 + ENSIP-25/26)

Standards adopted (we do not reinvent any of these):

- **ERC-8004 Trustless Agents** — onchain agent identity registry, reputation registry, validation registry. Each agent has an `agentId` (uint256) tied to its onchain identity record. We read identity + reputation from ERC-8004 contracts; we do not store our own copy.
- **ENSIP-25** — binding pattern: ENS subname → ERC-8004 `agentId` (via dedicated text record), so resolution `<agent>.agent-float.eth` → ERC-8004 record is canonical and verifiable.
- **ENSIP-26** — discovery records: `agent-context` (capabilities/description), `agent-endpoint[web]` (web URL), `agent-endpoint[mcp]` (MCP endpoint). Read by clients, agents, and indexers.

Agent Float ENS layer:

- Parent ENS: `agent-float.eth` (or chosen parent per `docs/08`)
- Subnames issued programmatically: `<agent>.agent-float.eth`
- Live resolve via wagmi/viem in UI; no hard-coded addresses

**Records — standards-first hierarchy:**

ERC-8004 binding (via ENSIP-25 pattern):
- Dedicated text record (e.g., `erc8004:agentId`) — points to the agent's `agentId` in the ERC-8004 IdentityRegistry. Canonical identity link.

ENSIP-26 standard records (canonical discovery):
- `agent-context` — primary agent metadata
- `agent-endpoint[web]` — web URL endpoint
- `agent-endpoint[mcp]` — MCP endpoint
- `agent-registration[...]` — optional registration metadata

Agent Float namespaced extensions (only Agent-Float-specific data not covered by standards):
- `agentfloat:umia_venture` — Umia venture address
- `agentfloat:bond_vault` — `BuilderBondVault` contract address
- `agentfloat:milestones` — `MilestoneRegistry` contract address
- `agentfloat:receipts_pointer` — `ReceiptLog` contract address
- `agentfloat:public_good_category` — category enum hash (civic / research / climate / transparency / open-knowledge)

### Layer 2 — Onchain core (Foundry, Sepolia + selected mainnet)

Agent Float deploys a small set of contracts that act as **layer above Umia**. Funding mechanics (token issuance, primary sale, treasury, secondary market) are Umia-native and not deployed by us.

**Agent Float core contracts (we deploy and verify on Sourcify):**

| Contract | Responsibility | Cross-references |
|---|---|---|
| `AgentRegistry.sol` | `registerAgent()` entry point. Links Umia venture address + ENS subname + bond vault + milestone registry + receipt log. Does not mint tokens, set up auctions, or hold sale proceeds. | ENS resolver, BuilderBondVault, MilestoneRegistry, ReceiptLog, Umia venture (read-only) |
| `ReceiptLog.sol` | Append-only events for agent paid work. Each receipt: `(agent, timestamp, queryId, reportHash, paymentAmount, payer, signature)`. Signed by agent's ENS-registered wallet, USDC-cross-validated against actual `Transfer` event. **Wash-trading mitigation core.** | Read by UI + BuilderBondVault silence detector |
| `BuilderBondVault.sol` | Locks builder's USDC collateral at registration. Slashes pro-rata to current Umia venture token holders if milestone missed OR receipts silent for N days. Pull-claim payout. | MilestoneRegistry, ReceiptLog, Umia venture token (snapshot read) |
| `MilestoneRegistry.sol` | Builder commits milestones at registration (e.g., "50 paid reports in 30 days"). Oracle/multi-sig marks met or failed. Failed → BuilderBondVault slash trigger. | BuilderBondVault, ReceiptLog (for auto-mark logic if applicable) |

**Conditional / fallback contracts (deployed only if Umia integration requires them — see [04-contracts.md](./04-contracts.md) for status):**

| Contract | Status | Purpose if deployed |
|---|---|---|
| `AgentVentureToken.sol` | CONDITIONAL — only if Umia does not provide a token template | ERC20 fed into Umia auction as the auctioned asset |
| `BondingCurveSale.sol` | FALLBACK only — internal simulator if Umia auction unavailable for demo | Substitute primary sale path for fallback demo only |
| `AgentTreasury.sol` | LIKELY UNNECESSARY — Umia provides noncustodial treasury | If kept, light wrapper holding only Agent Float-specific extension state |
| `RevenueDistributor.sol` | CONDITIONAL — only if Umia treasury does not natively distribute to holders | Pull-claim per-holder payout |

See [04-contracts.md](./04-contracts.md) for full per-contract spec.

### Layer 3 — Demo agents (Vercel Functions + AI Gateway)

Each demo agent is a small Vercel Function workspace that:
1. Accepts a paid query (user posts USDC + query)
2. Validates payment via Sepolia tx
3. Executes work using AI Gateway (Claude Sonnet) + Apify Actor for data
4. Returns a signed report
5. Emits a `Receipt` event to `ReceiptLog`
6. USDC routes per Umia venture configuration (we don't define the routing — Umia treasury does)

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
| `/agent/[ens-name]` | Agent profile: ENS passport (ENSIP-26 records), receipts feed (signed + USDC-cross-validated), Umia Tailored Auction state, milestones, builder bond status |
| `/invest` | Browse all agents, sort by receipts count / milestone progress / category |
| `/portfolio` | Investor's Umia venture token holdings + agent activity log per holding |
| `/builder` | Builder dashboard: register agent, manage milestones, view investors |
| `/leaderboard` | Top revenue agents, top fundraises |
| `/api/agent/[ens-name]/query` | Paid query endpoint for the agent (delegated to demo agent function) |
| `/api/receipts/[ens-name]` | Receipts feed indexer (filtered Sepolia events) |

### Layer 5 — Receipt SDK (`@agentfloat/sdk`, `agentfloat` Python package)

Builders integrate their existing agents using the SDK. The SDK is the public API that makes Agent Float adoptable beyond our demo agents — any agent can become floatable by emitting compliant receipts.

#### TypeScript SDK (`@agentfloat/sdk`)

```typescript
import {
  emitReceipt,
  fetchReceipts,
  resolveAgent,
  signReceipt,
  verifyReceipt
} from '@agentfloat/sdk';

// Emit receipt after paid work completes
await emitReceipt({
  agentEns: 'mygrant.agentfloat.eth',
  queryId: '0x...',         // unique per query
  reportHash: '0x...',      // hash of the report payload
  amount: parseUnits('0.01', 6),  // USDC paid by end user
  payer: '0x...',           // end user wallet
  signer: agentWallet,      // agent's signing wallet
});

// Fetch all receipts for an agent (for UI display)
const receipts = await fetchReceipts({
  agentEns: 'mygrant.agentfloat.eth',
  fromBlock: 0n,            // optional, defaults to deployment
  toBlock: 'latest',
});

// Resolve agent's full passport from ENS
const agent = await resolveAgent('mygrant.agentfloat.eth');
// returns { agentContext, agentEndpointWeb, agentEndpointMcp, umiaVenture, bondVault, milestones, receiptsPointer }

// Verify a third-party receipt without trusting any server
const isValid = await verifyReceipt(receipt);
```

#### Python SDK (`agentfloat`)

```python
from agentfloat import (
    emit_receipt,
    fetch_receipts,
    resolve_agent,
    sign_receipt,
    verify_receipt,
)

emit_receipt(
    agent_ens='mygrant.agentfloat.eth',
    query_id='0x...',
    report_hash='0x...',
    amount=10_000,            # USDC base units (6 decimals)
    payer='0x...',
    signer=agent_wallet,
)

receipts = fetch_receipts(
    agent_ens='mygrant.agentfloat.eth',
    from_block=0,
    to_block='latest',
)

agent = resolve_agent('mygrant.agentfloat.eth')

is_valid = verify_receipt(receipt)
```

#### Receipt schema (canonical)

```json
{
  "agent": "0x...",              // agent wallet address (matches ENS resolution)
  "timestamp": 1715180400,       // unix seconds
  "queryId": "0x...",            // unique 32-byte ID
  "reportHash": "0x...",         // keccak256 of report payload
  "paymentAmount": "10000",       // USDC base units string (6 decimals)
  "payer": "0x...",              // end user wallet
  "signature": "0x..."           // ECDSA signature by agent wallet
}
```

#### Verification chain

The SDK's `verifyReceipt()` performs:

1. ECDSA recover from `signature` → must match `agent`
2. ENS resolve `agentEns` → read **ENSIP-26 `agent-context` record** which carries the agent's signing wallet (per ENSIP-26 schema) → must match `agent`
3. On-chain check: USDC `Transfer` event from `payer` → `agent` for `paymentAmount` exists in same block range
4. ReceiptLog event exists matching this receipt's hash

If all 4 pass, receipt is verified. The verifier need not trust any server, only the chain.

#### SDK distribution

- npm: `@agentfloat/sdk` (TypeScript, ESM + CJS)
- PyPI: `agentfloat` (Python 3.10+)
- Both packages source-published from monorepo `packages/sdk-ts/` and `packages/sdk-py/`
- Versioned independently of platform UI

### Layer 6 — Off-chain integrations

- **Umia API** — fund flow + secondary market + legal wrapper. Concrete integration depth pending mentor sweep.
- **Sourcify** — source code verification for every deployed contract; public link from agent profile.
- **AI Gateway (Vercel)** — LLM calls for demo agents; provider/model strings, prompt caching enabled.
- **Apify** — used as infrastructure for demo agent scraping (Gitcoin, Octant). Not claimed as sponsor track.

## Data flow — registration (two-step, Umia-first)

```
Step 1: Builder runs `umia venture init <agent-name>`
        │
        ├─▶ Umia creates legal entity wrapper
        ├─▶ Umia deploys / configures venture token (their template)
        ├─▶ Umia configures Tailored Auction (Uniswap CCA)
        ├─▶ Umia deploys noncustodial treasury
        └─▶ Returns: { ventureAddress, tokenAddress, treasuryAddress, auctionAddress }

Step 2: Builder calls Agent Float AgentRegistry.registerAgent({
          ensLabel, umiaVenture, milestones,
          builderBond, silenceThresholdSeconds, agentMetadata
        })
   │
   ├─▶ ENS subname issued: <agent>.agentfloat.eth
   │     └─▶ ENSIP-26 records (agent-context, agent-endpoint[web|mcp])
   │     └─▶ namespaced records (agentfloat:umia_venture, …:bond_vault,
   │                              …:milestones, …:receipts_pointer)
   ├─▶ BuilderBondVault locks builderBond USDC from builder
   ├─▶ MilestoneRegistry initialized with builder's milestones
   └─▶ Agent ready to receive paid queries
```

> No token mint, no curve setup, no USDC split parameters at this layer — those live entirely on Umia's side via Step 1.

## Data flow — investor purchase (Umia-native)

```
Investor browses Agent Float → opens agent profile
   │
   ├─▶ Profile shows: ENS passport, receipts feed, Umia auction state, bond, milestones
   ├─▶ Investor clicks "Fund via Umia"
   │
   └─▶ Browser redirects to Umia Tailored Auction page (Uniswap CCA mechanism)
         │
         ├─▶ Investor places bid (USDC posted)
         ├─▶ Umia auction settles clearing price
         ├─▶ Tokens credited to investor wallet via Umia
         └─▶ Proceeds route to Umia noncustodial treasury per Umia governance
```

> Investor exposure structure (revenue rights, governance, secondary trading) follows Umia's venture wrapper — Agent Float does not redefine token economics.

## Data flow — agent earns + distributes

```
End user posts paid query to demo agent
   │
   ├─▶ Demo agent validates USDC payment (Sepolia tx)
   ├─▶ Executes work (AI Gateway + Apify)
   ├─▶ Signs report (agent's ENS-registered wallet)
   ├─▶ Emits Receipt event to ReceiptLog (USDC-cross-validated)
   └─▶ USDC routes per Umia venture treasury configuration
       (NOT defined by Agent Float — Umia handles)
```

> Token holder economic exposure (revenue rights, distribution mechanism) is determined by Umia's venture wrapper. If Umia treasury exposes a holder-distribution feature, no Agent Float helper is needed. If not, conditional `RevenueDistributor.sol` may be deployed — see `docs/04-contracts.md`.

## Data flow — investor returns to profile

```
Investor returns from Umia auction
   │
   ├─▶ Profile shows: Umia venture token balance + agent activity log
   ├─▶ Receipts feed continues live (live ReceiptLog event stream)
   ├─▶ Builder bond status visible (locked + slashing trigger threshold)
   └─▶ Milestone progress queryable from MilestoneRegistry
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
    ├─▶ Snapshots current Umia venture token holders
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
