# Agent Float

> *Agent Float turns working AI agents into investable ventures.*

**Tagline:** *Your agent has receipts. Now give it runway.*
**Hard rule:** **No receipts, no float.**

Agent Float is a capital market for working AI agents. Each agent has an ENS-anchored public passport, on-chain receipts as evidence of work, and a tokenized share structure that lets investors fund agent runway in exchange for pro-rata revenue rights. Umia provides the legal wrapper, treasury governance, and secondary market.

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
| **Builder** | Capital to grow agent | Public fundraising page, Umia launch, treasury, investor base |
| **Agent** | Compute, API credits, data, distribution | Runway and a credible growth plan |
| **Investor** | Early exposure to agentic ventures | Pro-rata revenue share via per-agent venture token |
| **User of the agent** | A useful service | A better agent after funding |
| **Umia** | Quality agentic deal flow | Discovery + onboarding funnel for agentic ventures |

---

## Core loop

1. Builder operates an agent that already does meaningful work
2. Agent gets an ENS passport: identity, wallet, capability records, receipts pointer
3. Builder registers the agent on Agent Float — a single transaction:
   - Mints 2,000,000 venture tokens (ERC20, fixed supply)
   - Sets a bonding curve for primary sale
   - Locks builder collateral (personal obligation bond)
   - Commits funding milestones
   - Opens a per-agent treasury and revenue distributor
4. Investors browse, see receipts feed + bonding curve price + milestones, and buy tokens
5. USDC from token sale splits per builder's setup: a share goes upfront to builder, the remainder is locked in agent treasury, milestone-released
6. Agent earns USDC. Revenue routes to a Revenue Distributor. Token holders accrue per-token claimable balance
7. Investors `claim()` accumulated USDC anytime
8. If milestones miss or the agent goes silent, the builder bond slashes pro-rata to current token holders

---

## Sponsor stack

| Tier | Sponsor | Use |
|---|---|---|
| **Primary** | **Umia** ($12K Best Agentic Venture) | Funding / legal wrapper / treasury governance / secondary market |
| **Secondary** | **ENS** ($2K Most Creative) | Per-agent passport: `<agent>.agentfloat.eth` subname pattern with text records for wallet, endpoints, capabilities, receipts pointer, treasury, venture token |
| **Bonus** | **Sourcify** ($4K) | Verified source code for every agent treasury contract — open governance proof |

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

Pre-build. Scope locked. Tokenomics locked. Repo initialized. Documentation complete. Code scaffolding pending naming-collision check and Umia mentor sweep.

See [SCOPE.md](./SCOPE.md) for the locked source of truth and `[pending]` items in §13.
