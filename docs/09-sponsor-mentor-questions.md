# 09 — Sponsor mentor questions

Scripts for sponsor mentor sweeps. Priority order. Each script is ~5-7 minutes of conversation.

## Priority order

1. **Umia** — blocks Track E (funding integration) and Track B (venture token shape). Highest priority.
2. **ENS** — blocks Track A (mainnet vs Sepolia decision).
3. **Sourcify** — confirms bonus track scope.

After all three sweeps complete, scope updates locked in SCOPE.md and execution proceeds.

---

## Umia mentor — Priority #1

### Pitch first (60s)

> Hi, we're building **Agent Float** — a launchpad for working AI agents. Builders register agents that already do paid work — agents have ENS passports and on-chain receipts as proof. Investors fund agent runway via per-agent venture tokens with bonding curves and milestone-gated capital release. We see Umia as the legal/treasury/governance/secondary-market engine. We're targeting your Best Agentic Venture track.

### Critical questions

| # | Question | Why we ask |
|---|---|---|
| 1 | What's the actual integration path? Is there an SDK, REST API, or smart-contract template we should use? | Determines Track E implementation effort |
| 2 | Per-agent venture tokens — does Umia provide a token contract template (ERC20 with revenue distribution baked in), or do we deploy our own and integrate Umia separately? | Determines `AgentVentureToken.sol` architecture |
| 3 | For the demo, can we float a Sepolia-deployed agent treasury, or is mainnet expected for the venture flow? | Determines deployment target |
| 4 | Does Umia handle the legal wrapper (securities classification, jurisdictional compliance, KYC for investors) at the protocol level, or is this on the platform integrator? | Determines whether we need additional legal layer |
| 5 | What does the secondary market UI flow look like? Do you redirect to your dashboard from our agent profile, or do we embed your widget? | Determines Track D investor portfolio view |
| 6 | Is there a Umia mentor available for the build duration if we hit integration blockers? | Determines fallback path |
| 7 | What's the bar for "Best Agentic Venture" — what makes a submission stand out vs. mere "we used Umia"? | Determines pitch positioning |

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

> Hi, we're building **Agent Float** — a capital market for working AI agents. Each agent gets an ENS passport — `<agent>.agentfloat.eth` — with structured text records: `wallet`, `endpoints`, `capabilities`, `receipts_pointer`, `treasury`, `venture_token`, `bond_vault`. Receipts are signature-bound to the wallet ENS resolves. We're targeting Most Creative Use of ENS.

### Critical questions

| # | Question | Why we ask |
|---|---|---|
| 1 | We plan to register `agentfloat.eth` on mainnet as parent and issue subnames programmatically. Is mainnet parent expected for Most Creative track, or is Sepolia mirror acceptable? | Determines deployment cost + Track A approach |
| 2 | For programmatic subname issuance with custom text records, what's the recommended resolver? Is the official `PublicResolver` sufficient, or should we deploy a custom resolver? | Determines Track A implementation |
| 3 | Are there ENS-native standards we should follow for our text record schema (`wallet`, `endpoints`, etc.)? Any ENSIPs we should align with? | Avoid reinventing standards; align with ENS conventions |
| 4 | For the "Most Creative" submission, what makes the difference between top 3 and honorable mention? | Pitch positioning |
| 5 | Does ENS expect mainnet subnames for the demo, or does Sepolia + clear documentation of mainnet plan work? | Defensive question on demo deployment |

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

> Hi, we're building **Agent Float**. We deploy 8+ contracts per agent (registry, token, bonding curve, treasury, milestones, bond vault, revenue distributor, receipt log). Every contract is source-verified on Sourcify — investors can audit before they buy. Agent profiles surface verification status. We're targeting your bonus track.

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

**Question:** *Our project is Agent Float — capital market for working AI agents. We have per-agent ENS identity, on-chain economic coordination via bonding-curve token sales and milestone-gated capital release, and user control via builder bonds and pull-claim revenue. Does this fit Network Economy track, or would Best UX Flow be a better fit?*

Submit to whichever track the mentor recommends.

---

## After mentor sweeps complete

1. Update `SCOPE.md §13` Decision log with answers
2. Update `docs/02-architecture.md` with any tooling recommendations
3. Update `docs/04-contracts.md` with any contract pattern adjustments
4. Lock the workstream tracks in `SCOPE.md §11` based on confirmed integration paths
5. Begin Track A (ENS) and Track B (contracts) execution
