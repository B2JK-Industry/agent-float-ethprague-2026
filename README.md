# Agent Float

> *Agent Float turns working AI agents into investable ventures.*

**Tagline:** *Your agent has receipts. Now give it runway.*
**Hard rule:** **No receipts, no float.**

Agent Float is a capital market for working AI agents. Each agent has an ENS-anchored public passport, on-chain receipts as evidence of work, and a Umia-native venture token structure that lets investors fund agent runway in exchange for **economic exposure per Umia's venture wrapper**. Umia provides the funding mechanism (Tailored Auctions powered by Uniswap CCA), legal wrapper, noncustodial treasury, and secondary market. Agent Float adds the discovery, proof, and accountability layer above Umia.

Built at **ETHPrague 2026** — *"Building Ethereum's Solarpunk Future"*.

---

## Why this exists

Working AI agents are real. Many already earn revenue — they scrape, summarize, alert, monitor, transact. Their builders have a problem: the agents need API credits, compute, data, and distribution to grow, but no clean fundraising path exists. Pitching VCs takes months. Token launchpads are hype-shaped, not work-shaped. There's no way to say *"this agent already works, here's the proof, here's what better data would unlock"* and have someone fund it.

Investors have the symmetric problem. AI agent tokens are mostly hype. There's no easy way to distinguish a working agent from a landing page, no public identity, no verifiable receipts, no treasury governance.

Agent Float bridges these by enforcing one rule above all: **no receipts, no float.** Before an agent can fundraise, it must show a public ENS passport and on-chain proof of work. Investors fund real upgrades to real agents through Umia's legal/treasury/governance engine. The result is a cleaner capital market for AI agents: proof first, funding second.

---

## What we are NOT

- AI agent marketplace (no prompt store, no model registry)
- Token casino / meme launchpad (no hype tokens; receipts gate every float)
- DAO governance tooling (Aragon/Snapshot already cover this)
- Trading bot leaderboard (anti-Solarpunk; explicitly excluded)
- Agent OS / runtime / framework (anti-pattern; we are not a platform)

## What we are

A **funding layer for working AI agents.** Operative word: *working* — proof gates everything.

---

## Stakeholders

| Stakeholder | Wants | Gets |
|---|---|---|
| **Builder** | Capital to grow agent | Umia venture wrapper, Tailored Auction, treasury, investor base; Agent Float adds public profile + accountability bond |
| **Agent** | Compute, API credits, data, distribution | Runway and a credible growth plan |
| **Investor** | Early exposure to agentic ventures | Venture token via Umia Tailored Auction; economic exposure per Umia legal model |
| **User of the agent** | A useful service | A better agent after funding |
| **Umia** | Quality agentic deal flow | Discovery + onboarding funnel for agentic ventures |

> Investor exposure structure (revenue rights, governance, secondary trading) follows Umia's venture wrapper — we do not redefine token economics on top of Umia.

---

## Core loop

Agent Float is the **discovery, proof, and accountability layer above Umia ventures**. It does not replace Umia's funding mechanism; it gates access to it with on-chain proof of work and adds builder accountability primitives.

1. Builder operates an agent that already does meaningful work
2. Agent gets an ENS passport: `<agent>.agentfloat.eth` resolved via **ENSIP-26 standard records** (`agent-context`, `agent-endpoint[web]`, `agent-endpoint[mcp]`) plus namespaced Agent Float extensions (`agentfloat:umia_venture`, `agentfloat:bond_vault`, `agentfloat:milestones`, `agentfloat:receipts_pointer`)
3. Agent emits **on-chain receipts** (signed by agent's ENS-registered wallet, USDC-cross-validated). These are the proof gate — *no receipts, no float*.
4. Builder runs `umia venture init` (Umia CLI) to create the venture: legal entity wrapper, venture token issuance, Tailored Auction setup (Uniswap CCA), noncustodial treasury
5. Builder registers the agent with Agent Float — links Umia venture to ENS passport, locks personal accountability bond (`BuilderBondVault`), commits funding milestones (`MilestoneRegistry`)
6. Investors browse Agent Float, see agent profile: ENS passport + receipts feed + Umia Tailored Auction state + milestones + builder bond status
7. Investors fund via **Umia Tailored Auction** (Uniswap CCA mechanism); proceeds route to Umia noncustodial treasury per Umia governance
8. Agent earns USDC from end-user payments; receipts continue to emit on-chain; agent profile updates live
9. Token holders see receipt activity continuously; investor exposure (revenue, governance, secondary trading) handled through Umia's venture wrapper
10. If builder misses committed milestones OR agent goes silent for the configured threshold, `BuilderBondVault` slashes builder's personal collateral pro-rata to current Umia venture token holders

---

## Sponsor stack (POST-PIVOT)

| Tier | Sponsor | Use |
|---|---|---|
| **Primary** | **Umia** ($12K Best Agentic Venture) | **Tailored Auctions (Uniswap CCA)** for primary sale + legal wrapper (`umia venture init`) + noncustodial treasury + decision markets + secondary market. We integrate Umia core products natively, do not substitute them. |
| **Secondary** | **ENS** ($2K Most Creative) | Per-agent passport: `<agent>.agentfloat.eth` using **ENSIP-26 standard records** (`agent-context`, `agent-endpoint[*]`) plus namespaced extensions (`agentfloat:umia_venture`, `agentfloat:bond_vault`) |
| **Bonus** | **Sourcify** ($4K) | Verified source code for every Agent Float contract we deploy (registry, receipts, bond, milestones) — open governance proof |

**Organizer track:** Network Economy (privacy + identity + onchain economic coordination + user control). Best UX Flow as secondary if polish allows.

---

## Repository layout

```
ETHPrague2026/
├── README.md                  # This file
├── SCOPE.md                   # Single source of truth — locked scope + tokenomics
├── BRAINSTORM.md              # Historical record of ideation
├── AGENTS.md                  # Guidance for agentic collaborators (Codex, future Claude sessions)
├── CLAUDE.md                  # Project-specific Claude memory pointers
├── LICENSE                    # MIT
├── docs/
│   ├── 01-vision.md           # Solarpunk framing, value prop, anti-positioning
│   ├── 02-architecture.md     # System overview, components, data flow
│   ├── 03-tokenomics.md       # Token mechanics with worked examples
│   ├── 04-contracts.md        # Per-contract specification
│   ├── 05-demo-script.md      # 5-minute walkthrough
│   ├── 06-acceptance-gates.md # Honest-over-slick verification protocol
│   ├── 07-sponsor-fit.md      # Per-sponsor deep dive + submission checklist
│   ├── 08-naming-research.md  # Collision check template
│   ├── 09-sponsor-mentor-questions.md  # Mentor sweep scripts
│   ├── 10-risks.md            # Risk register
│   └── 11-glossary.md         # Terminology
├── apps/                      # (to scaffold)
│   ├── web/                   # Next.js 16 platform
│   └── agent-grantscout/      # Demo agent (Vercel Functions)
├── contracts/                 # (to scaffold) Foundry workspace
├── packages/                  # (to scaffold)
│   ├── shared/                # Types, ENS helpers, receipt schema
│   └── sdk/                   # @agentfloat/sdk for builders
└── scripts/                   # (to scaffold) deploy + verify scripts
```

---

## Status

**Pre-build.** No working code yet. This repo currently contains documentation and scope artifacts only.

What is locked:
- Project vision and value proposition
- Tokenomics (see [SCOPE.md §5.5](./SCOPE.md))
- Sponsor stack (Umia primary + ENS secondary + Sourcify bonus)
- Demo script ([docs/05-demo-script.md](./docs/05-demo-script.md))
- 12 acceptance gates ([docs/06-acceptance-gates.md](./docs/06-acceptance-gates.md))

What is pending:
- Naming collision check ([docs/08-naming-research.md](./docs/08-naming-research.md))
- Umia mentor sweep ([docs/09-sponsor-mentor-questions.md](./docs/09-sponsor-mentor-questions.md))
- Code scaffolding (Next.js + Foundry + pnpm workspaces)
- Smart contract implementation (4 Agent Float core contracts + up to 4 conditional/fallback — see [docs/04-contracts.md](./docs/04-contracts.md))
- Demo agent build (GrantScout)

## How to read this repo

| If you want to | Read |
|---|---|
| Understand the pitch | This README, then [docs/01-vision.md](./docs/01-vision.md) |
| See what's locked vs pending | [SCOPE.md](./SCOPE.md) |
| Understand the tokenomics | [docs/03-tokenomics.md](./docs/03-tokenomics.md) |
| Understand the architecture | [docs/02-architecture.md](./docs/02-architecture.md) |
| Understand each sponsor | [docs/12-sponsors-explained.md](./docs/12-sponsors-explained.md) |
| Understand sponsor-fit strategy | [docs/07-sponsor-fit.md](./docs/07-sponsor-fit.md) |
| See the demo plan | [docs/05-demo-script.md](./docs/05-demo-script.md) |
| Understand the contracts | [docs/04-contracts.md](./docs/04-contracts.md) |
| Verify project credibility | [docs/06-acceptance-gates.md](./docs/06-acceptance-gates.md) |
| See risks | [docs/10-risks.md](./docs/10-risks.md) |
| Look up a term | [docs/11-glossary.md](./docs/11-glossary.md) |
| See historical ideation | [BRAINSTORM.md](./BRAINSTORM.md) |
| Contribute as Codex / agent | [AGENTS.md](./AGENTS.md) |
| Continue as Claude | [CLAUDE.md](./CLAUDE.md) |
