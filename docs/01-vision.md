# 01 — Vision

## Pitch (sponsor-facing)

> *Agent Float turns working public-good AI agents into fundable Umia ventures.*

## Stage tagline (5-sec hook)

> *No impact proof, no funding.*

## Hard product rules

> **No receipts, no float.**
> **Public-good agents only.**
> **Standards-based — we adopt ERC-8004 + ENSIP-25/26 + Umia, we do not reinvent them.**

These three rules are non-negotiable. Together they separate Agent Float from token casinos (rule 1), generic agent infrastructure (rule 2), and "yet another vanity protocol" projects (rule 3). Every agent profile carries on-chain proof of paid public-good work before fundraising opens.

## Solarpunk framing

ETHPrague 2026's theme is *"Building Ethereum's Solarpunk Future"* — optimistic, regenerative, communal technology that prioritizes public goods, privacy, transparency, and user sovereignty over extractive systems.

Agent Float fits this frame in five concrete ways:

1. **Public-good agents only.** We deliberately exclude trading bots, yield optimizers, generic AI assistants, and financialization-first agents. Eligible agent categories: civic transparency monitors, public-goods grant scouts, climate metric reporters, open knowledge curators, anti-corruption watchdogs. The funding rail amplifies regenerative capacity, not extractive activity.
2. **Proof-first over hype-first.** Every fundable agent must show on-chain receipts of paid public-good work before fundraising opens. A venture cannot float through Agent Float without working evidence.
3. **Builder accountability through bond.** Builders post personal collateral that slashes pro-rata to investors if milestones are missed. The inverse of typical token launchpads where builders take cash and disappear.
4. **Standards-based, not vanity infra.** We adopt ERC-8004 (Trustless Agents), ENSIP-25 (binding), ENSIP-26 (discovery). We do not reinvent identity or reputation. Lower trust requirement on us as a project; lower implementation risk; better composability with the rest of the ecosystem.
5. **Open architecture.** Repo is open-source (MIT). Anyone can fork, audit, or build a competing platform. Every Agent Float contract is verified on Sourcify so investors and reviewers can read the source.

## What we are NOT (explicit anti-positioning vs known competitors)

| Anti-positioning | Competitor / pattern | Why we exclude it |
|---|---|---|
| Agent stock market | Slopstock | We don't financialize generic agents; only public-good agents pass the gate |
| Agent commerce / job marketplace | Obolos, A2A | We don't run job posts, RFPs, or escrow-based commerce |
| Generic agent passport / trust dashboard | AgentPass, AgentMandate, AgentVault | We are not a passport; passport ≠ funding |
| Policy boundary as primary pitch | SBO3L | Policy logic only as accountability layer; not the headline |
| Token launchpad / meme casino | various | "No receipts, no float" + public-good restriction blocks hype |
| DAO governance tooling | Aragon, Snapshot | Out of category |
| Agent OS / runtime / framework | various | Platform smell; we fund agents, we don't run them |
| Trading / yield / financial agents | Tradewise, generic DeFi bots | Anti-Solarpunk (extractive); explicitly excluded by scope rule |
| Generic AI agent assistant | many | Out of public-good scope unless agent specifically serves civic/public utility |

## What we ARE

A **proof-gated funding rail for public-good AI agents**, integrating ERC-8004 + ENSIP-25/26 + Umia.

Operative phrases:
- **Public-good** — only agents that produce verifiable civic/research/climate/transparency/open-knowledge value
- **Proof-gated** — receipts of paid public-good work required before any fundraising
- **Funding rail** — connection to Umia Tailored Auction; we do not custody capital
- **Standards-based** — ERC-8004 identity, ENSIP-25 binding, ENSIP-26 discovery, EIP-712 signed receipts; no reinvention

## Target users (in order of demo priority)

### 1. Investor (primary demo POV)
- Browses Agent Float, sees a grid of working agents
- Reads a profile: receipts feed (signed + USDC-cross-validated), milestones, Umia auction state, builder bond, builder identity
- Buys tokens through Umia Tailored Auction (Uniswap CCA)
- Holds tokens, watches receipts feed (live proof of agent productivity)
- Economic exposure (revenue rights, governance, distribution mechanics) follows Umia's venture wrapper — not redefined by Agent Float
- Optionally trades on Umia secondary market

### 2. Builder (secondary demo POV)
- Operates an agent that already does paid work
- Runs `umia venture init` to create Umia venture (legal wrapper, token, auction, treasury)
- Registers the agent with Agent Float: links Umia venture to ENS subname (ENSIP-26 records), locks personal bond, commits milestones
- Receives USDC tranches as milestones land
- Spends on compute, API credits, data sources, distribution
- Builds reputation through successful milestone hits

### 3. Agent (subject of the platform)
- Has an ENS passport (`<agent>.agentfloat.eth`) with ENSIP-26 records + namespaced extensions
- Has its own wallet that signs receipts
- Earns USDC from paid users
- USDC routes per Umia venture treasury configuration; Agent Float surfaces receipts feed but does not redefine token-holder economics

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
| Builder takes USDC and disappears | Auction proceeds route to Umia noncustodial treasury (builder doesn't custody investor USDC); BuilderBondVault separately holds builder's personal collateral that slashes pro-rata to current Umia venture token holders on default |
| Agent stops earning | Receipts feed silence triggers BuilderBondVault slashing after grace period; investors see decline before bond auto-distributes |
| Builder fakes receipts to pump token price | Receipts must be signed by agent's ENS-registered wallet AND tied to actual USDC transfers from end users; fake receipts require burning own USDC, defeating the purpose |
| Token speculation decouples from agent reality | Umia secondary market provides price discovery against real buy/sell pressure; UI surfaces live receipts feed so speculation is visible against agent productivity fundamentals |
| Token interpreted as security | Umia legal wrapper (their core product) addresses this off-chain |

## What success looks like

- A judge watches the demo and immediately understands: *agent has receipts → builder runs `umia venture init` + Agent Float register (bond + milestones locked) → investor funds via Umia Tailored Auction → agent keeps emitting receipts → bond slashes pro-rata to token holders if builder defaults*.
- The judge can verify on Sepolia explorer that every step they saw was a real on-chain event.
- The judge thinks: *this is the cleanest agent-financialization model I've seen this hackathon.*
- Umia views Agent Float as a credible discovery funnel for their venture pipeline.
- ENS views the per-agent passport pattern as a creative, functional use of subnames.
