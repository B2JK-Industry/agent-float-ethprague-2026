# Upgrade Siren

> **No source, no upgrade.**

Upgrade Siren is a public upgrade-risk alarm for named Ethereum contracts. It resolves a protocol's ENS contract map, detects proxy implementation changes, compares old and new implementations with Sourcify data, and turns the result into a clear verdict for DAO voters, investors, wallets, and venture launch reviewers.

Built at **ETHPrague 2026** for *Building Ethereum's Solarpunk Future*.

## Why This Exists

Upgradeable contracts are one of Ethereum's quietest trust assumptions. A protocol can look stable, audited, and widely used, while the implementation behind its proxy changes underneath users. Most people do not read storage layouts, ABI diffs, admin rights, proxy slots, timelocks, or unverified bytecode before voting for an upgrade or funding an onchain venture.

Upgrade Siren makes that moment visible.

The product answers one question:

> Should this named protocol upgrade be trusted, reviewed, or rejected?

It is not a generic audit tool. It is not an AI scanner. It is an alarm for the exact moment when an implementation changes.

## Core Verdicts

| Verdict | Meaning |
|---|---|
| `SAFE` | New implementation is verified, upgrade path is expected, no high-risk structural changes detected |
| `REVIEW` | Upgrade may be legitimate, but contains changes that require human review |
| `SIREN` | Do not approve or fund until the risk is resolved |

## What We Are Building

1. **ENS Contract Map**
   - Resolve protocol-owned names such as `vault.demo.upgradesiren.eth`
   - Read live records for proxy, previous implementation, current implementation, report pointer, owner, and version labels
   - ENS is the identity and version surface, not decoration

2. **Proxy Upgrade Detector**
   - Read EIP-1967 implementation slots
   - Detect `Upgraded(address)` events
   - Compare current implementation against ENS-declared `latest`
   - Surface owner/admin/timelock status when available

3. **Sourcify Evidence Engine**
   - Fetch verification status, source metadata, ABI, compiler metadata, and storage layout
   - Compare old vs. new implementations
   - Flag unverified implementations, added privileged selectors, removed safety functions, storage-layout hazards, and risky delegatecall/external-call patterns

4. **Siren Report**
   - Human verdict first
   - Evidence drawer for technical judges
   - Governance-ready comment generator
   - Optional signed report for Umia-style venture due diligence

5. **Siren Agent**
   - A monitoring agent that watches a contract or venture watchlist
   - Runs analysis when implementation, ENS records, or verification state changes
   - Produces signed risk reports for DAO voters, wallets, investors, and venture launch reviewers

## Sponsor Strategy

| Priority | Target | Why |
|---|---|---|
| 1 | **Sourcify Bounty** | Sourcify data is the core evidence source: verified source, ABI, compiler metadata, storage layouts, bytecode, similarity search |
| 2 | **ENS Most Creative Use** | ENS provides contract identity, version naming, report discovery, and live resolution |
| 3 | **ETHPrague Future Society** | Public-good safety tooling for users, DAO voters, and onchain communities |
| Optional | **Umia Best Agentic Venture** | Only if framed as Siren Agent: a due-diligence and post-launch monitoring agent for tokenized onchain ventures |

We do **not** submit Swarm, SpaceComputer, or Apify unless Daniel explicitly swaps the strategy. Swarm can be a future report-storage integration, but it is not core to the current product.

## What This Is Not

- Not Agent Float
- Not a generic smart contract scanner
- Not an AI auditor
- Not a token launchpad
- Not an agent marketplace
- Not an ENS profile page
- Not a replacement for audits
- Not a claim that verified equals safe

## Demo Flow

The five-minute demo has three prepared upgrades:

1. **Safe upgrade**
   - Both implementations verified
   - Storage layout compatible
   - No new privileged selectors
   - Verdict: `SAFE`

2. **Dangerous upgrade**
   - New implementation verified
   - Adds `sweep(address token, address to)` and changes storage layout
   - Verdict: `SIREN`

3. **Unverified upgrade**
   - Proxy points to implementation not verified on Sourcify
   - ENS `latest` pointer and live slot disagree
   - Verdict: `SIREN`

Five-second moment:

> A protocol name resolves through ENS, a proxy implementation changes, and the screen turns from green to red: **No source, no upgrade.**

## Repository Layout

```
ETHPrague2026/
├── README.md
├── SCOPE.md
├── BRAINSTORM.md
├── AGENTS.md
├── CLAUDE.md
├── docs/
│   ├── 01-vision.md
│   ├── 02-product-architecture.md
│   ├── 03-business-model.md
│   ├── 04-technical-design.md
│   ├── 05-demo-script.md
│   ├── 06-acceptance-gates.md
│   ├── 07-sponsor-fit.md
│   ├── 08-competitive-landscape.md
│   ├── 09-mentor-questions.md
│   ├── 10-risks.md
│   ├── 11-glossary.md
│   └── 12-implementation-roadmap.md
├── wiki/
│   ├── Home.md
│   ├── Project-Overview.md
│   ├── Product-Architecture.md
│   ├── Business-Architecture.md
│   ├── Sponsor-Strategy.md
│   ├── Demo-Script.md
│   └── Risk-Register.md
└── prompts/
    ├── write-backlog.md
    ├── run-dev-stream.md
    └── review-prs.md
```

## Current Status

Documentation pivot complete in this branch. Code remains blocked until Daniel confirms this as the build scope.

Read order:

1. [SCOPE.md](./SCOPE.md)
2. [docs/01-vision.md](./docs/01-vision.md)
3. [docs/04-technical-design.md](./docs/04-technical-design.md)
4. [docs/05-demo-script.md](./docs/05-demo-script.md)
5. [docs/07-sponsor-fit.md](./docs/07-sponsor-fit.md)
