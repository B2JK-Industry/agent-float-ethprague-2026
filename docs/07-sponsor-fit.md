# 07 — Sponsor fit

Per-sponsor deep dive. Each sponsor analyzed for: stated criteria, our integration depth, sponsor-native test, submission checklist, what judges will look for.

---

## Umia — $12,000 Best Agentic Venture (PRIMARY) — POST-PIVOT

### Stated criteria

Per ETHPrague Hacker Manual, Umia rewards venture-shaped projects with:

- Agentic product or operations
- Clear user
- Revenue path
- Venture logic
- Strong narrative
- Credible post-hackathon continuation

### Our integration (POST-PIVOT — Umia core products native)

Agent Float is **a discovery + reputation + accountability layer ON TOP OF Umia ventures.** Per sponsor-native test, we use Umia's actual products as the funding/treasury primitives, not our own substitutes.

**Concrete integration points (Umia core products):**

| Umia primitive | How Agent Float uses it |
|---|---|
| **`umia venture init` CLI** | Triggered as part of agent registration flow; creates legal entity wrapper |
| **Tailored Auctions (Uniswap CCA)** | Primary sale mechanism per agent venture; investor bids on Umia auction page |
| **Noncustodial treasury** | Auction proceeds destination; replaces our previously-planned `AgentTreasury.sol` |
| **Decision markets** | Governance layer for venture decisions (post-MVP feature; explored if time) |
| **Secondary market** | Post-auction P2P token trading — Umia handles UI |
| **Legal wrapper** | Umia handles securities classification, jurisdictional compliance, KYB/KYC at the protocol level |

**Agent Float adds (above and beyond Umia):**
- ENS passport pattern (`<agent>.agentfloat.eth` with ENSIP-26 records)
- ReceiptLog (signed, USDC-cross-validated agent receipts) — **proof gates fundraising**
- BuilderBondVault (personal collateral that slashes on default) — **accountability primitive Umia doesn't have**
- MilestoneRegistry (oracle-checked commitments triggering bond slashing)
- Multi-agent variety, leaderboard, profile pages
- "No receipts, no float" rule

### Sponsor-native test (POST-PIVOT — fortified)

> *Could Agent Float exist in this shape without Umia?*

**No, decisively.** Without Umia:
- No Tailored Auction → no transparent CCA-based primary sale
- No legal wrapper → tokens are unregulated securities → product is high-risk
- No noncustodial treasury → builder can drain agent treasury → no investor protection
- No secondary market → investors are locked → primary sale demand collapses
- No KYC/KYB → hostile actors can register fake agents
- No decision markets → no governance layer

**Pass — strongly.** Umia provides 5+ core products (auction + legal + treasury + secondary + decision markets); Agent Float is a layer on top, not a substitute.

**Pre-pivot version of this test had only "Pass" with weaker reasoning** — we were planning to substitute custom curve + custom treasury + custom revenue distribution. Reviewer correctly flagged: *"obchádzate náš core produkt"*. Pivot fixes this.

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
- [ ] Demo video features Umia auction prominently — investor flow goes through Umia, not our shadow contracts
- [ ] README references Umia as primary sponsor; core loop describes Umia-native flow
- [ ] One-line venture pitch ready: *"Agent Float is the discovery and accountability layer for Umia ventures — no receipts, no float."*
- [ ] Post-hackathon plan: 5 working agents floated within 90 days through Umia ventures; Umia partnership formalized; success fee revenue model launched
- [ ] Mentor session attended; mentor name documented for follow-up
- [ ] All Agent Float contracts that overlap with Umia (BondingCurveSale, AgentTreasury, RevenueDistributor) clearly marked as fallback/conditional in docs

### Risks specific to this track

- **Umia integration depth could be shallow** if their API/SDK isn't accessible during hackathon. Mitigation: Umia simulator with `mock: true` label, but explicit follow-up commitment for real integration post-hack.
- **Perception of competing with Umia** if our docs over-emphasize Agent Float-side contracts that overlap (token, treasury, sale). Mitigation: aggressive demotion of overlap contracts to fallback/conditional appendix; primary docs lead with Umia integration.
- **Venture pitch could feel underdeveloped** if demo focuses too much on tech and not enough on business model. Mitigation: dedicated demo segment on agent productivity (receipts) + builder accountability (bond + milestones), not micro-revenue math.

---

## ENS — $4,000 ($2K AI Agents + $2K Most Creative) (SECONDARY) — POST-PIVOT

### Stated criteria

ENS rewards integrations where:
- ENS is an actual identity mechanism, not cosmetic
- No hard-coded values; resolution runs live
- Integration is obvious and functional
- No secrets in public text records

### Our integration (ENSIP-26 standards-aligned)

ENS is the **agent passport.** Every agent gets `<agent>.agentfloat.eth`. We align with **ENSIP-26 standardized agent records** (rather than inventing custom keys), with namespaced extensions where ENSIP-26 doesn't cover Agent Float-specific data.

**ENSIP-26 standard records (use these per ENS forum guidance):**

| Record | Purpose |
|---|---|
| `agent-context` | Primary agent metadata (capabilities, model info, description) |
| `agent-endpoint[web]` | Agent's web URL endpoint |
| `agent-endpoint[mcp]` | Agent's MCP (Model Context Protocol) endpoint |
| `agent-registration[...]` | Optional registration metadata per ENSIP-25 / 26 |

**Agent Float namespaced extensions (only where ENSIP-26 doesn't cover):**

| Record | Purpose |
|---|---|
| `agentfloat:umia_venture` | Umia venture address (POST-PIVOT — points to Umia, not our token) |
| `agentfloat:receipts_pointer` | Address of `ReceiptLog` contract for this agent |
| `agentfloat:bond_vault` | `BuilderBondVault` contract address |
| `agentfloat:milestones` | `MilestoneRegistry` contract address |

**Pre-pivot version invented custom records** (`wallet`, `endpoints`, `capabilities`, `treasury`, `venture_token`). Reviewer correctly flagged: *"Treba použiť ENSIP-26 agent-context + agent-endpoint[...], nie len custom"*. Updated.

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
