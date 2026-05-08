# 01 — Vision

## Pitch

> *Agent Float turns working AI agents into investable ventures.*

## Tagline

> *Your agent has receipts. Now give it runway.*

## Hard product rule

> **No receipts, no float.**

This rule is not negotiable. It is the only thing that separates Agent Float from a token casino. Every agent profile carries on-chain proof of paid work before fundraising opens. The receipts feed must be live, signature-bound to the agent's ENS-registered wallet, and tied to actual user-paid USDC transactions.

## Solarpunk framing

ETHPrague 2026's theme is *"Building Ethereum's Solarpunk Future"* — optimistic, regenerative, communal technology that prioritizes public goods, privacy, transparency, and user sovereignty over extractive systems.

Agent Float fits this frame in five concrete ways:

1. **Public capital market over closed VC.** Anyone can fund a working agent in any amount. There are no accredited-investor gates, no warm intros, no closed cap tables.
2. **Proof-first over hype-first.** Every fundable agent must show on-chain receipts before fundraising opens. The token cannot exist without working evidence.
3. **Builder accountability through bond.** Builders post personal collateral that slashes pro-rata to investors if milestones are missed. This is the inverse of typical token launchpads where builders take cash and disappear.
4. **Open architecture.** The repo is open-source (MIT). Anyone can fork, audit, or build a competing platform. Treasury contracts are verified on Sourcify so investors can read the source.
5. **Network economy primitive.** Per-agent ENS passports + revenue-share tokens + on-chain receipts = transparent economic coordination at the agent level. Solarpunk doesn't reject markets; it rejects opaque, extractive ones.

## What we are NOT

| Anti-positioning | Why we exclude it |
|---|---|
| AI agent marketplace | No prompt store, no model registry. We don't list agents — we float them. |
| Token launchpad / meme casino | "No receipts, no float" rule blocks hype tokens by design. |
| DAO governance tooling | Aragon, Snapshot, Tally already cover this surface. |
| Trading bot leaderboard | Anti-Solarpunk (extractive); explicitly excluded from supported agent categories. |
| Agent OS / runtime / framework | Platform smell; we don't run agents, we fund them. |
| Generic "AI agent + wallet" wrapper | Agents already have wallets. Our value is the venture wrapper, not the wallet. |

## What we ARE

A **funding layer for working AI agents.** Operative word: *working* — proof gates every dollar.

## Target users (in order of demo priority)

### 1. Investor (primary demo POV)
- Browses Agent Float, sees a grid of working agents
- Reads a profile: receipts feed, revenue, milestones, bonding curve price, builder identity
- Buys tokens through bonding curve
- Holds tokens, watches receipts feed, claims accumulated USDC anytime
- Optionally trades on Umia secondary market

### 2. Builder (secondary demo POV)
- Operates an agent that already does paid work
- Registers the agent: assigns ENS subname, mints 2M venture tokens, locks personal bond, commits milestones, sets bonding curve
- Receives USDC tranches as milestones land
- Spends on compute, API credits, data sources, distribution
- Builds reputation through successful milestone hits

### 3. Agent (subject of the platform)
- Has an ENS passport (`<agent>.agentfloat.eth`)
- Has its own wallet that signs receipts
- Earns USDC from paid users
- Routes earnings: a portion replenishes treasury, the rest goes to RevenueDistributor for token holders

### 4. End user of the agent
- Pays for the agent's service (e.g., 0.01 USDC per GrantScout report)
- Doesn't need to know about Agent Float — pays directly to the agent's wallet
- The act of paying creates receipts that fund the venture loop

### 5. Umia
- Provides legal wrapper, treasury governance, secondary market
- Receives quality agentic deal flow
- Agent Float is their discovery and onboarding funnel

## Strategic position

Agent Float maps onto three validated winning patterns from ETHGlobal Open Agents 2026:

| Open Agents winner | What they did | What we borrow |
|---|---|---|
| **Slopstock** (finalist) | "Wall Street for AI agents": tokenized equity, inference-revenue dividends, sealed weights | Tokenized agent ventures + revenue dividends |
| **Tradewise Agentlab** (KH 1st place) | Autonomous agent earns USDC, sells shares, takes uncollateralized loans, can be merged | Economic loop: earn → distribute → fund → upgrade |
| **ENSign** (ENS 1st place) | ENS as wallet: subnames are passkey-signed smart accounts on ENSv2 | ENS as agent passport with capability records |

Three of seven Open Agents finalists/track-winners hit similar primitives. Strong directional signal.

## Failure modes we explicitly handle

| Failure | Mechanism |
|---|---|
| Builder takes USDC and disappears | USDC split forces majority into AgentTreasury (milestone-locked); BuilderBondVault slashes builder's collateral pro-rata to investors |
| Agent stops earning | Receipts feed silence triggers BuilderBondVault slashing after grace period; investors see decline before bond auto-distributes |
| Builder fakes receipts to pump token price | Receipts must be signed by agent's ENS-registered wallet AND tied to actual USDC transfers from end users; fake receipts require burning own USDC, defeating the purpose |
| Token speculation decouples from agent reality | Bonding curve enforces price-discovery against actual buy-pressure; UI prominently shows revenue-per-token-per-day so speculation is visible against fundamentals |
| Token interpreted as security | Umia legal wrapper (their core product) addresses this off-chain |

## What success looks like

- A judge watches the demo and immediately understands: *agent has receipts → tokens mint → investor buys → revenue flows → investor claims*.
- The judge can verify on Sepolia explorer that every step they saw was a real on-chain event.
- The judge thinks: *this is the cleanest agent-financialization model I've seen this hackathon.*
- Umia views Agent Float as a credible discovery funnel for their venture pipeline.
- ENS views the per-agent passport pattern as a creative, functional use of subnames.
