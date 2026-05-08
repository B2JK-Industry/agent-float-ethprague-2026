# Agent Float

> *Agent Float turns working public-good AI agents into fundable Umia ventures.*

**Stage tagline:** *No impact proof, no funding.*
**Hard rule:** **No receipts, no float.**

Agent Float is a **proof-gated funding rail for public-good AI agents**. We do not invent identity, discovery, or fundraising — we integrate established standards (ERC-8004 + ENSIP-25/26 + Umia Tailored Auctions) and add a sharp gate: an agent cannot reach Umia funding unless its ENS identity, ERC-8004 registration, signed receipts, and milestone commitments check out. The agent must demonstrate **public-good impact**, not just activity.

Built at **ETHPrague 2026** — *"Building Ethereum's Solarpunk Future"*.

---

## Why this exists

Working AI agents are real. Many already earn revenue — they scrape, summarize, alert, monitor, transact. Their builders have a problem: the agents need API credits, compute, data, and distribution to grow, but no clean fundraising path exists. Pitching VCs takes months. Token launchpads are hype-shaped, not work-shaped. There's no way to say *"this agent already works, here's the proof, here's what better data would unlock"* and have someone fund it.

Investors have the symmetric problem. AI agent tokens are mostly hype. There's no easy way to distinguish a working agent from a landing page, no public identity, no verifiable receipts, no treasury governance.

Agent Float bridges these by enforcing one rule above all: **no receipts, no float.** Before an agent can fundraise, it must show a public ENS passport and on-chain proof of work. Investors fund real upgrades to real agents through Umia's legal/treasury/governance engine. The result is a cleaner capital market for AI agents: proof first, funding second.

---

## What we are NOT

- ❌ NOT Slopstock (we do not financialize generic agents into a stock market)
- ❌ NOT Obolos (we do not run agent-to-agent commerce or job marketplaces)
- ❌ NOT AgentPass / AgentMandate / AgentVault (we do not build a generic trust passport)
- ❌ NOT SBO3L (we do not pitch a generic policy boundary)
- ❌ NOT a token casino / meme launchpad
- ❌ NOT an agent OS / runtime / framework
- ❌ NOT a generic AI agent marketplace

## What we ARE

A **proof-gated funding rail for public-good AI agents.** Operative phrases:

- **Public-good** — civic, research, climate, transparency, open knowledge agents only. Not yield bots, not trading agents, not generic AI assistants.
- **Proof-gated** — agent must show on-chain receipts of paid public-good work before its venture can float.
- **Standards-based** — ERC-8004 for agent identity/reputation, ENSIP-25/26 for discovery, Umia for venture funding. We integrate, we do not reinvent.

Tagline for stage: *No impact proof, no funding.*

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

Agent Float is the **proof-gated funding rail above Umia ventures, restricted to public-good AI agents**. We do not replace Umia's funding mechanism; we gate access to it.

1. Builder operates an agent doing real **public-good work** (grant scouting, civic monitoring, climate metrics, transparency reporting, open knowledge curation)
2. Agent registers under the **ERC-8004 Trustless Agents standard** — gets an `agentId` with onchain identity + reputation surface
3. Agent gets an ENS passport: `<agent>.agent-float.eth` (or chosen parent) — uses **ENSIP-26** standard records (`agent-context`, `agent-endpoint[web]`, `agent-endpoint[mcp]`) and **ENSIP-25**-style binding to the ERC-8004 `agentId`. Plus namespaced extensions (`agentfloat:umia_venture`, `agentfloat:bond_vault`, `agentfloat:milestones`, `agentfloat:receipts_pointer`).
4. Agent emits **on-chain receipts** for paid public-good work — signed by agent's ENS-registered wallet, USDC-cross-validated. Receipts are the proof gate.
5. Builder runs `umia venture init` to create the Umia venture (legal wrapper, venture token, Tailored Auction, noncustodial treasury)
6. Builder registers the agent with Agent Float — links Umia venture + ENS + ERC-8004 agentId + builder bond + milestones in one tx
7. Investors browse Agent Float and see only **fundable** agents (those passing the proof gate). Each profile shows: ERC-8004 identity + ENS records + receipts feed + Umia auction state + builder bond + milestones
8. Investors fund via **Umia Tailored Auction**; proceeds to Umia noncustodial treasury
9. Agent keeps emitting receipts; ERC-8004 reputation accumulates; profile updates live
10. If builder misses milestones OR agent goes silent, `BuilderBondVault` slashes builder collateral pro-rata to current Umia venture token holders. Failed agent loses fundable status.

---

## Sponsor stack (Path-B sharpened, ERC-8004 integrated)

| Tier | Sponsor | Use |
|---|---|---|
| **Primary** | **Umia** ($12K Best Agentic Venture) | Tailored Auctions (Uniswap CCA) + legal wrapper (`umia venture init`) + noncustodial treasury + decision markets + secondary market — Umia is the funding mechanism Agent Float gates access to |
| **Secondary** | **ENS** ($2K Most Creative) | Per-agent passport using **ENSIP-26** standard records (`agent-context`, `agent-endpoint[web|mcp]`) + **ENSIP-25**-style binding to ERC-8004 `agentId` + namespaced extensions (`agentfloat:umia_venture`, `agentfloat:bond_vault`, `agentfloat:milestones`, `agentfloat:receipts_pointer`) |
| **Bonus** | **Sourcify** ($4K) | Verified source code for every Agent Float contract — open governance proof |
| **Standards used (not direct sponsor)** | **ERC-8004** Trustless Agents | Agent identity + reputation registry — we adopt, not reinvent |

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
