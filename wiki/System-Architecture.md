# System Architecture

## High-Level Shape

Agent Float is a layer above Umia.

```text
Umia
  - venture wrapper
  - venture token
  - Tailored Auction
  - noncustodial treasury
  - governance / decision markets
  - secondary market

Agent Float
  - ENS passport
  - ReceiptLog
  - BuilderBondVault
  - MilestoneRegistry
  - agent profiles
  - receipt SDK
  - investor discovery UI
```

## Architecture Rule

Agent Float does not mint tokens, define sale pricing, custody sale proceeds, or define investor economics on the primary path. Those live on Umia.

## Layers

### Layer 1: Identity

- ENS parent: `agentfloat.eth`.
- Subnames: `<agent>.agentfloat.eth`.
- ENSIP-26 records:
  - `agent-context`,
  - `agent-endpoint[web]`,
  - `agent-endpoint[mcp]`.
- Agent Float extensions:
  - `agentfloat:umia_venture`,
  - `agentfloat:bond_vault`,
  - `agentfloat:milestones`,
  - `agentfloat:receipts_pointer`.

### Layer 2: Agent Float Contracts

Core contracts:

- `AgentRegistry`,
- `ReceiptLog`,
- `BuilderBondVault`,
- `MilestoneRegistry`.

Conditional/fallback contracts:

- `AgentVentureToken` only if Umia requires us to provide ERC20,
- `RevenueDistributor` only if Umia lacks native holder distribution,
- `AgentTreasury` likely unnecessary,
- `BondingCurveSale` fallback simulator only.

### Layer 3: Umia Integration

Builder uses Umia first:

```text
umia venture init <agent-name>
  -> legal wrapper
  -> venture token
  -> Tailored Auction
  -> noncustodial treasury
  -> venture address
```

Agent Float then links that venture:

```text
registerAgent({
  ensLabel,
  umiaVenture,
  milestones,
  builderBond,
  silenceThresholdSeconds,
  agentMetadata
})
```

### Layer 4: Application UI

Routes:

- `/` landing and discovery,
- `/agent/[ens-name]` agent profile,
- `/invest` browse and compare,
- `/portfolio` investor holdings and activity,
- `/builder` onboarding and management,
- `/api/agent/[ens-name]/query` paid query endpoint,
- `/api/receipts/[ens-name]` indexed receipt feed.

### Layer 5: SDK

Builder SDKs:

- TypeScript: `@agentfloat/sdk`,
- Python: `agentfloat`.

Core SDK tasks:

- sign receipt,
- emit receipt,
- fetch receipts,
- resolve agent,
- verify receipt.

## Data Flow: Registration

```text
Builder runs Umia venture init
  -> receives venture address

Builder calls Agent Float registerAgent
  -> ENS subname issued
  -> ENSIP-26 records set
  -> Umia venture pointer stored
  -> builder bond locked
  -> milestones registered
```

## Data Flow: Investor Purchase

```text
Investor opens Agent Float profile
  -> sees proof + Umia auction state
  -> clicks Fund via Umia
  -> bids in Umia Tailored Auction
  -> Umia credits tokens
  -> investor returns to Agent Float for ongoing proof feed
```

## Data Flow: Receipt

```text
End user pays USDC
  -> agent performs work
  -> agent signs receipt
  -> ReceiptLog emits event
  -> UI indexes receipt
  -> profile updates
```

