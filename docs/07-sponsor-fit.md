# 07 — Sponsor fit

Per-sponsor deep dive. Each sponsor analyzed for: stated criteria, our integration depth, sponsor-native test, submission checklist, what judges will look for.

---

## Umia — $12,000 Best Agentic Venture (PRIMARY)

### Stated criteria

Per ETHPrague Hacker Manual, Umia rewards venture-shaped projects with:

- Agentic product or operations
- Clear user
- Revenue path
- Venture logic
- Strong narrative
- Credible post-hackathon continuation

### Our integration

Agent Float is **literally a launchpad for agentic ventures.** Umia is not added on top — Umia is the funding/legal/governance/secondary-market engine without which the product cannot exist in this shape.

**Concrete integration points:**
- **Funding flow:** when investor clicks "Float on Umia" or "Buy via Umia", USDC routes through Umia's primary sale infrastructure
- **Legal wrapper:** Umia handles securities classification, jurisdictional compliance, KYB for builders, KYC for investors at scale
- **Treasury governance:** Umia delegate is signer in `AgentTreasury` multi-sig, enabling milestone-based release with legal accountability
- **Secondary market:** post-primary-sale, Umia provides P2P trading UI for token holders
- **Discovery funnel:** Agent Float surfaces working agents to Umia's investor base; Umia surfaces fundable agents to its existing users

### Sponsor-native test

> *Could Agent Float exist in this shape without Umia?*

**No.** Without Umia:
- No legal wrapper → tokens are unregulated securities → product is high-risk
- No treasury governance → builder can drain agent treasury → no investor protection
- No secondary market → investors are locked → primary sale demand collapses
- No KYC/KYB → hostile actors can register fake agents

**Pass.** Umia is structurally core, not decorative.

### What judges will look for

| Criterion | Evidence we provide |
|---|---|
| Agentic product | GrantScout (and DataMonitor, TenderEye) are real working agents |
| Clear user | Investor (primary), Builder (secondary), End user (tertiary) |
| Revenue path | Bonding curve sale + per-agent revenue distribution + platform success fees post-MVP |
| Venture logic | Token-share-of-revenue model with milestone-gated capital release and builder bond |
| Strong narrative | "Capital market for working AI agents — proof first, funding second" |
| Post-hack continuation | Open-source codebase + Umia partnership + 3 demo agents = ready for Phase 2 |

### Open Agents 2026 lineage

This shape is validated by:
- **Slopstock** (finalist) — "Wall Street for AI agents"
- **Tradewise Agentlab** (KH 1st place) — agent earns USDC, sells shares, takes loans

Three of seven Open Agents finalists/winners hit similar primitives.

### Submission checklist

- [ ] Submit primary track on Devfolio
- [ ] Demo video features Umia integration prominently in §150-210 and §250-280
- [ ] README references Umia as primary sponsor
- [ ] One-line venture pitch ready: *"Agent Float turns working AI agents into investable ventures via Umia."*
- [ ] Post-hackathon plan: 5 working agents floated within 90 days; Umia partnership formalized; success fee revenue model launched
- [ ] Mentor session attended; mentor name documented for follow-up

### Risks specific to this track

- **Umia integration depth could be shallow** if their API/SDK isn't accessible during hackathon. Mitigation: Umia simulator with `mock: true` label, but explicit follow-up commitment for real integration post-hack.
- **Venture pitch could feel underdeveloped** if demo focuses too much on tech and not enough on business model. Mitigation: dedicated demo segment on revenue/runway/ROI.

---

## ENS — $4,000 ($2K AI Agents + $2K Most Creative) (SECONDARY)

### Stated criteria

ENS rewards integrations where:
- ENS is an actual identity mechanism, not cosmetic
- No hard-coded values; resolution runs live
- Integration is obvious and functional
- No secrets in public text records

### Our integration

ENS is the **agent passport.** Every agent gets `<agent>.agentfloat.eth` with a structured set of text records that drive the product.

**Text records used:**

| Record | Purpose |
|---|---|
| `wallet` | Agent's signing wallet address |
| `endpoints` | JSON list of agent's API endpoints |
| `capabilities` | Tags describing what the agent does (research, monitoring, civic, etc.) |
| `receipts_pointer` | Address of `ReceiptLog` contract for this agent |
| `treasury` | `AgentTreasury` contract address |
| `venture_token` | `AgentVentureToken` contract address |
| `bond_vault` | `BuilderBondVault` contract address |

**Why this matters:**
- An agent's ENS subname is **the canonical identifier** — UI, contracts, SDK all dereference through ENS
- Receipts are signature-bound to the wallet specified in the ENS `wallet` record
- An agent's discoverability happens via ENS lookup
- Investors can verify agent identity by checking ENS records, no need to trust Agent Float server

### Sponsor-native test

> *Could Agent Float exist in this shape without ENS?*

**No, in this shape.** Without ENS:
- Agent identity becomes a database row in our server → judges/investors must trust Agent Float
- No portable agent identity across platforms → vendor lock-in
- No verifiable canonical pointer to agent's contracts → integrity weakened

We could substitute a custom identity registry, but it would be functionally inferior and signal sponsor decoration. ENS is structurally appropriate.

**Pass.**

### Most Creative angle

We pursue the **Most Creative** track ($2K) more strongly than **Best AI Agents** ($2K), because:
- "AI Agents" track was won by ENSign in Open Agents 2026 with "ENS as wallet" — direct competition is high
- "Most Creative" rewards novel use of ENS — per-agent passport with capability records + receipts pointer + bond vault is novel

### Submission checklist

- [ ] Submit Most Creative track on Devfolio
- [ ] Mainnet `agentfloat.eth` parent registered (or Sepolia mirror with explicit note)
- [ ] At least 3 agents have programmatically issued subnames at demo time
- [ ] All ENS lookups happen live in UI (no cached display)
- [ ] No secrets in any public text records
- [ ] Demo video shows ENS resolution clearly
- [ ] Mentor session attended; ask whether Sepolia parent OK or mainnet expected

### Risks

- **Mainnet parent registration cost** is non-trivial (gas + ENS reg fee)
- **Sepolia parent vs mainnet parent** — if judges expect mainnet, Sepolia-only weakens submission. Mitigation: mainnet parent locked, Sepolia mirror for fast iteration.

---

## Sourcify — $4,000 (BONUS)

### Stated criteria

Sourcify rewards meaningful use of their verified contract dataset:

- 27M+ verified contracts
- 100+ EVM chains
- Source code, bytecode, ABI, compiler metadata, storage layouts
- Access via Parquet, BigQuery, Sourcify API, 4byte Signature API

### Our integration

We use Sourcify in **two complementary ways:**

**1. Source verification of every Agent Float contract.**

Every contract we deploy (`AgentRegistry`, `AgentVentureToken`, `BondingCurveSale`, `AgentTreasury`, `MilestoneRegistry`, `BuilderBondVault`, `RevenueDistributor`, `ReceiptLog`) is source-verified on Sourcify as part of the deployment script. This is **open governance proof** — investors can read the source of every contract they're interacting with, without trusting our team.

**2. Sourcify lookup in agent profile.**

Each agent profile includes a "Verify on Sourcify" link. Clicking opens the Sourcify explorer to that specific contract, showing source code, ABI, and compiler metadata. This is the open-architecture proof for the Solarpunk framing.

### Sponsor-native test

> *Could Agent Float exist in this shape without Sourcify?*

**Substitutable but weaker.** We could use Etherscan verification, but Sourcify is decentralized and chain-agnostic, which aligns better with our open-architecture narrative.

**Partial pass.** Sourcify is genuinely useful but not strictly irreplaceable. Bonus track, not primary.

### Submission checklist

- [ ] Submit Sourcify track on Devfolio
- [ ] All deployed contracts verified on Sourcify (full match preferred over partial)
- [ ] Verification status surfaced in agent profile UI
- [ ] Source code links from agent profile to Sourcify explorer
- [ ] Mentor session attended; confirm verification scope counts as core component
- [ ] Demo video mentions Sourcify in context of "every contract publicly verifiable"

### Risks

- **Source verification could fail** if Foundry build metadata mismatches. Mitigation: Foundry's standard `forge verify-contract` with Sourcify provider; test on Sepolia first.
- **Bonus track could be too thin** to justify allocation of attention. Mitigation: integration is small (one deploy script step + one UI link); does not detract from primary tracks.

---

## Skipped sponsors and why

### SpaceComputer ($6K)

**Why skipped:** SpaceComputer rewards hardware applications (USB Armory, Raspberry Pi) or KMS/randomness. Agent Float has no hardware path that fits naturally. KMS/randomness could be added to e.g., bonding curve fairness, but it would feel grafted on. Anti-pattern: forced sponsor integration.

### Apify ($3.7K)

**Why skipped as track:** We use Apify as **infrastructure** for demo agents (GrantScout scraping Gitcoin/Octant). However, Apify's bounty scope details are TBD; without confirmation that infrastructure use counts, we cannot claim this track.

**What we'd need:** Day 1 mentor session confirms infrastructure use is in-scope for the bounty. If yes, we can opportunistically submit. If no, Apify remains infrastructure only.

### Swarm ($2.45K)

**Why skipped:** Swarm's bounties are small ($250-$500 range) and require specific deliverables (Verified Fetch lib, Dappnode packages, Chain State). Integrating Swarm for receipt storage adds complexity without clear value over on-chain receipts. Cost/value not optimal for the build window.

---

## Multi-track strategy summary

| Sponsor | Status | Total Target |
|---|---|---|
| Umia | PRIMARY | $12K |
| ENS Most Creative | SECONDARY | $2K |
| Sourcify | BONUS | $4K |
| ETHPrague Network Economy | ORGANIZER | ~$2-3K (varies) |
| **Realistic** | | **$5-10K** |
| **Best case** | | **$14-21K** |

---

## Competitor analysis — what would beat us in each track

### Umia (Best Agentic Venture)

**What could beat Agent Float:**
- A team that already has a real Umia integration partnership (we have only mentor-level engagement)
- A project with **paying customers at demo time** (we have demo-scale receipts only)
- A project with simpler venture mechanics that judges find easier to grasp (e.g., "AI agent X earns Y via clear product, here's the token")

**Our defense:**
- Multi-agent variety (GrantScout + DataMonitor + TenderEye) showcases category breadth
- "No receipts, no float" rule is a memorable differentiator
- Builder bond mechanism is novel — most launchpads don't have it

### ENS (Most Creative)

**What could beat us:**
- A project with novel ENS use that creates a NEW user pattern (e.g., ENSign won 2026 with "ENS as wallet", which redefined account UX)
- A project with mainnet deployment + significant usage at demo time

**Our defense:**
- Per-agent passport with structured records (`wallet`, `endpoints`, `capabilities`, `receipts_pointer`, `treasury`, `venture_token`, `bond_vault`) is novel hierarchical pattern
- Passport entry-point into 8-contract ecosystem makes ENS structurally integral

### Sourcify (bonus track)

**What could beat us:**
- A project that uses Sourcify dataset itself (BigQuery, similarity search, pattern detection across 27M contracts) — depth-of-data use vs our verification-only use

**Our defense:**
- We pursue Sourcify as bonus, not primary; expectations correctly calibrated
- Open governance proof angle aligns with Solarpunk theme

### Network Economy (organizer)

**What could beat us:**
- A pure privacy-focused project (we are financially transparent, opposite of privacy-first)
- A project with deeper economic coordination (e.g., novel AMM, lending market, derivatives)

**Our defense:**
- Combination of identity + onchain coordination + user control hits 3 of 4 track criteria
- Builder bond + milestone + bonding curve = three coordination primitives in one

## Cross-track sponsor-native test

Anti-pattern #2 says max 2 sponsor tracks + 1 organizer track. We hit exactly that boundary: Umia + ENS + Sourcify (bonus) + Network Economy (organizer).

Why this is OK:
- Each sponsor passes the sponsor-native test
- Sourcify is bonus — additive, not splitting attention
- Organizer track is theme-aligned, not separate work
- No sponsor is decoration

If Umia mentor session reveals integration block, we drop Umia and pivot to a different primary (Probono or PGRoll fallbacks per BRAINSTORM bench). Sponsor lock is conditional on Umia integration being feasible.
