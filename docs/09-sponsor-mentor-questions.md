# 09 — Sponsor mentor questions

Scripts for sponsor mentor sweeps. Priority order. Each script is ~5-7 minutes of conversation.

## Priority order

1. **Umia** — blocks Track E (funding integration) and Track B (venture token shape). Highest priority.
2. **ENS** — blocks Track A (mainnet vs Sepolia decision).
3. **Sourcify** — confirms bonus track scope.

After all three sweeps complete, scope updates locked in SCOPE.md and execution proceeds.

---

## Umia mentor — Priority #1

### Pitch first (60s) — POST-PIVOT

> Hi, we're building **Agent Float** — a discovery and accountability layer ON TOP OF Umia ventures. Builders run `umia venture init` to create the venture, then register their agent with Agent Float — we add ENS passport, on-chain receipts feed (proof gate before fundraising), and a personal builder collateral bond that slashes on default. Investors buy via your Tailored Auctions; we surface working agents to them. We're targeting Best Agentic Venture track.

### Critical questions (POST-PIVOT — Umia core integration focus)

| # | Question | Why we ask |
|---|---|---|
| 1 | We want to use **Tailored Auctions (Uniswap CCA)** as the primary funding mechanism. Confirm this is the right path vs. alternatives. What's the integration surface — CLI, REST API, smart contract addresses, frontend widgets? | Track E primary architecture |
| 2 | Does `umia venture init` deploy a venture token automatically, or do we provide the ERC20 contract address? Does Umia have a venture token template we should use? | Determines whether to build `AgentVentureToken.sol` or skip it |
| 3 | For our agent registration flow: builder runs `umia venture init` first, then we register the venture with Agent Float (ENS subname + bond vault + milestone registry). Is this the right sequencing? Do you have post-init hooks? | Track A + B sequencing |
| 4 | Noncustodial treasury — how does it expose USDC balance and revenue events to external indexers (us)? Are there event signatures we should listen to? | Track D agent profile data surfacing |
| 5 | Does Umia treasury support **revenue distribution to token holders** natively, or do we wrap with our own `RevenueDistributor.sol`? | Determines whether RevenueDistributor stays in scope |
| 6 | Decision markets — applicable to per-agent venture governance, or organization-level only? | Future feature scope |
| 7 | For the demo, can we run a Tailored Auction on Sepolia, or is mainnet required? | Deployment target |
| 8 | Legal wrapper coverage — does `umia venture init` automatically handle securities/compliance, or do we need additional steps? | Risk register R-016 |
| 9 | Is there a Umia mentor available throughout the build window if we hit integration blockers? | Fallback planning |
| 10 | What's the bar for "Best Agentic Venture" — what makes a submission stand out vs. mere "we used Umia"? | Pitch positioning |
| 11 | Is our value-add layer (proof-gated fundraising via receipts, builder bond, milestone slashing) something you'd see as complementary to Umia, or potential conflict with your governance model? | Strategic alignment |

### Listen for

- Hard "no" on Sepolia → we pivot to mainnet for venture flow
- Specific SDK references → integrate immediately
- Mention of "venture token template" → adopt their template if compatible
- Bar for the bounty — extract specific examples of what wins vs. what doesn't

### Follow-up

- Get mentor's contact (Discord handle, email)
- Get specific docs/SDK URLs
- Confirm they will see our submission

---

## ENS mentor — Priority #2

### Pitch first (60s)

> Hi, we're building **Agent Float** — discovery + accountability layer above Umia ventures for working AI agents. Each agent gets an ENS passport — `<agent>.agentfloat.eth` — using **ENSIP-26 standard records** (`agent-context`, `agent-endpoint[web]`, `agent-endpoint[mcp]`) plus namespaced extensions (`agentfloat:umia_venture`, `agentfloat:bond_vault`, `agentfloat:milestones`, `agentfloat:receipts_pointer`). Receipts are signature-bound to the wallet ENS resolves. We're targeting Most Creative Use of ENS.

### Critical questions (POST-PIVOT — ENSIP-26 alignment focus)

| # | Question | Why we ask |
|---|---|---|
| 1 | We plan to use **ENSIP-26 standard records** (`agent-context`, `agent-endpoint[web]`, `agent-endpoint[mcp]`) plus namespaced extensions (`agentfloat:umia_venture`, `agentfloat:bond_vault`, etc.). Is this the right interpretation of ENSIP-26 conventions? | Avoid reinventing schema |
| 2 | We register `agentfloat.eth` on mainnet as parent and issue subnames programmatically. Is mainnet parent expected for Most Creative track, or is Sepolia mirror acceptable? | Determines deployment cost + Track A approach |
| 3 | For programmatic subname issuance with ENSIP-26 records, what's the recommended resolver? Is `PublicResolver` sufficient, or should we deploy a custom resolver supporting our namespaced records? | Determines Track A implementation |
| 4 | ENSIP-25 (CCIP-Read) — applicable to our agent registry use case for off-chain resolved data, or is on-chain enough? | Off-chain resolution decision |
| 5 | For the "Most Creative" submission, what makes the difference between top 3 and honorable mention? Especially given ENSign won 2026 with "ENS as wallet" — what creative angle stands out beyond identity-as-account? | Pitch positioning |
| 6 | Does ENS expect mainnet subnames for the demo, or does Sepolia + clear documentation of mainnet plan work? | Defensive question on demo deployment |

### Listen for

- ENSIP references — check and align
- Recommended resolver patterns
- Whether subname-as-product is novel enough or has been done before
- Specific examples of past ENS Most Creative winners

### Follow-up

- Get mentor's contact
- Get any specific ENSIP references
- Note any creative pattern hints they share

---

## Sourcify mentor — Priority #3

### Pitch first (60s)

> Hi, we're building **Agent Float** — a discovery and accountability layer above Umia ventures. We deploy 4 core contracts (`AgentRegistry`, `ReceiptLog`, `BuilderBondVault`, `MilestoneRegistry`) and verify them on Sourcify. Every contract investors interact with is publicly auditable. Agent profiles surface verification status. We're targeting your bonus track.

### Critical questions

| # | Question | Why we ask |
|---|---|---|
| 1 | We verify multiple contracts per agent on Sepolia + selected mainnet. Does the breadth (multi-contract per agent) or depth (one contract used heavily) matter more for the bounty? | Determines whether we should focus depth on one contract or breadth across all |
| 2 | We use Sourcify for verification + UI surfacing of source links. Is there value in also using your data API (4byte signature lookup, BigQuery) for additional features? | Determines whether to add e.g., similar-contract detection |
| 3 | For the bonus track, what's the bar? Is verification sufficient, or do we need to do something with the verified data set beyond our own contracts? | Pitch positioning |
| 4 | Any specific Foundry plugins or scripts you recommend for clean Sourcify integration? | Avoid reinventing toolchain |

### Listen for

- Whether multi-contract verification is sufficient, or whether they expect dataset use
- Specific Foundry tooling recommendations
- Examples of past Sourcify bounty winners

### Follow-up

- Get mentor's contact
- Save tooling recommendations to `docs/02-architecture.md`

---

## Apify mentor — opportunistic (not priority)

If we have time and Apify mentor is available, we ask whether using Apify SDK as agent infrastructure (GrantScout scrapes Gitcoin/Octant via Apify) qualifies for their bounty even though we're not pitching it as primary track.

**Question:** *We use Apify SDK as agent infrastructure for our demo agents. We're not pitching Apify as our primary track, but we want to be honest about Apify's role. Does infrastructure use qualify for any consideration in your bounty?*

If yes → submit opportunistically.
If no → leave Apify out of submission, mention as infrastructure in README.

---

## ETHPrague organizer — Network Economy track

We submit to Network Economy (privacy + identity + onchain economic coordination + user control).

If a track-specific mentor is available:

**Question:** *Our project is Agent Float — discovery and accountability layer above Umia ventures for working AI agents. Per-agent ENS identity (ENSIP-26 records), on-chain economic coordination via Umia Tailored Auctions + signed receipts gate before fundraising, and user control via builder bonds (slashable on milestone miss or agent silence). Does this fit Network Economy track, or would Best UX Flow be a better fit?*

Submit to whichever track the mentor recommends.

---

## After mentor sweeps complete

1. Update `SCOPE.md §13` Decision log with answers
2. Update `docs/02-architecture.md` with any tooling recommendations
3. Update `docs/04-contracts.md` with any contract pattern adjustments
4. Lock the workstream tracks in `SCOPE.md §11` based on confirmed integration paths
5. Begin Track A (ENS) and Track B (contracts) execution
