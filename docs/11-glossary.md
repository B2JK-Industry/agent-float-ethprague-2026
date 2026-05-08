# 11 — Glossary

Terms used across the Agent Float documentation, defined precisely.

---

## Core concepts

**Agent Float.** The platform/product. A **proof-gated funding rail for public-good AI agents** — integrating ERC-8004, ENSIP-25/26, and Umia Tailored Auctions. We do not invent identity, discovery, or fundraising; we gate access to existing standards by requiring on-chain proof of public-good work.

**Public-good agent.** An AI agent whose work output benefits a community, common resource, or open-knowledge surface — civic transparency monitors, public-goods grant scouts, climate metric reporters, open knowledge curators, anti-corruption watchdogs. Excluded: trading bots, yield optimizers, generic AI assistants, financialization-first agents. Enforced structurally at Agent Float `registerAgent()` via category allow-list.

**ERC-8004 Trustless Agents.** Onchain standard for agent identity (IdentityRegistry), reputation (ReputationRegistry), and validation (ValidationRegistry). Agent Float adopts ERC-8004 as canonical identity primitive — every fundable agent has an `agentId` registered there.

**ENSIP-25.** ENS standard for binding ENS names to external identity systems. Agent Float uses ENSIP-25-style binding from `<agent>.agent-float.eth` to the agent's ERC-8004 `agentId`.

**ENSIP-26.** ENS records convention for AI agents — `agent-context`, `agent-endpoint[web]`, `agent-endpoint[mcp]`, `agent-registration[...]`. Agent Float adopts ENSIP-26 as canonical agent discovery schema.

**Proof gate.** The product's hard rule: an agent cannot reach Umia funding via Agent Float unless ENS resolves correctly, ERC-8004 identity exists, signed receipts of paid public-good work are present, public-good category is verified, and a builder bond is posted. *No impact proof, no funding.*

**Agent.** An autonomous or semi-autonomous AI program that performs paid work (e.g., research, monitoring, summarization, scraping). Has its own crypto wallet for receipts and earnings.

**Builder.** The human or team who operates an agent. Registers the agent on Agent Float, sets parameters, commits to milestones, posts personal collateral bond.

**Investor.** A person who buys per-agent Umia venture tokens via the Umia Tailored Auction. Economic exposure (revenue rights, governance, secondary trading) is determined by Umia's venture wrapper. Agent Float surfaces the agent's on-chain proof of work (receipts feed) so the investor's purchase decision is grounded in evidence.

**End user.** Someone who pays the agent for its work. Their payment generates the receipt that gates the agent's float.

**Receipt.** An on-chain event recording that an agent performed paid work for an end user. Signed by the agent's ENS-registered wallet. Cross-validated against an actual USDC transfer.

**Float.** The act of registering an agent and opening its venture token to investors. Borrowed from finance ("IPO float"). Anti-meaning: not a hype token launch.

**Float event.** A specific moment when an agent transitions from registered to publicly investable, triggered by `AgentRegistry.registerAgent()`.

**Runway.** Days of operation an agent has before its capital depletes. Calculated from treasury balance + projected revenue / projected costs.

---

## Tokenomics terms

**Venture token.** ERC20 issued per agent venture by Umia (via `umia venture init`). Supply, retention, distribution rules are configured on Umia's side. Agent Float does not redefine these.

**Umia Tailored Auction.** Primary sale mechanism for agent venture tokens. Powered by Uniswap CCA (Continuous Clearing Auctions). Replaces v1's custom `BondingCurveSale.sol` (now fallback only).

**Umia noncustodial treasury.** Holds USDC proceeds from the Tailored Auction. Builder does not custody. Capital release per Umia governance + (optionally) Agent Float milestone triggers.

**Builder bond.** USDC collateral posted by builder at Agent Float registration, locked in `BuilderBondVault.sol`. Slashes pro-rata to current Umia venture token holders if milestones miss or agent goes silent. Agent Float innovation; Umia ventures don't natively include personal accountability collateral.

**Milestone.** Builder-committed deliverable (e.g., "50 paid reports in 30 days"). Tracked in `MilestoneRegistry`. Failed milestone triggers `BuilderBondVault.slash()`.

**Slashing.** When a builder bond is forcibly distributed to current Umia venture token holders due to default. Pro-rata by token holdings.

**Receipts gate ("no receipts, no float").** Hard product rule: an agent cannot have its venture floated until it has demonstrated paid work via signed, USDC-cross-validated receipts. Agent Float's primary differentiator vs. token launchpads.

**ENSIP-26 records.** Standard ENS records for AI agents: `agent-context`, `agent-endpoint[web]`, `agent-endpoint[mcp]`, `agent-registration[...]`. Agent Float aligns with these as the canonical agent passport schema, plus namespaced extensions for Agent Float-specific data.

---

## Onchain components

### Agent Float core (always deployed)

**AgentRegistry.** Entry point for Agent Float registration after Umia venture init. Links Umia venture address + ENS subname + builder bond + milestone registry. Does not mint tokens or set up auctions (Umia does that).

**ReceiptLog.** Append-only event log for agent paid work. Each receipt signed by agent's ENS-registered wallet AND USDC-cross-validated against on-chain `Transfer` event from end user. Wash-trading defense (raises cost, does not eliminate).

**BuilderBondVault.** Per-agent vault holding builder's USDC collateral. Slashes on milestone miss or agent silence. Pull-claim payout to current Umia venture token holders.

**MilestoneRegistry.** Tracks committed milestones per agent. Marks met or failed. Failed milestone triggers `BuilderBondVault.slash()`.

### Conditional / fallback (deployed only if Umia integration requires)

**AgentVentureToken** [CONDITIONAL]. Used only if Umia does not provide a token template; otherwise Umia's template is used. ERC20 fed into Umia auction.

**AgentTreasury** [LIKELY UNNECESSARY]. Umia provides noncustodial treasury; this contract is needed only if we hold Agent Float-specific extension state.

**RevenueDistributor** [CONDITIONAL]. Pull-claim helper for token holder distribution. Deployed only if Umia treasury does not natively distribute.

**BondingCurveSale** [FALLBACK ONLY]. Internal simulator if Umia auction is unavailable for demo. Not pitched as primary.

### Identity

**ENS subname.** `<agent>.agentfloat.eth`. Public passport for an agent. Resolves with ENSIP-26 records (`agent-context`, `agent-endpoint[*]`) plus namespaced extensions (`agentfloat:umia_venture`, `agentfloat:bond_vault`, `agentfloat:milestones`, `agentfloat:receipts_pointer`).

---

## Sponsor/integration terms

**Umia.** Sponsor providing legal wrapper, treasury governance, secondary market, and discovery funnel for agentic ventures. Primary sponsor for Agent Float.

**ENS.** Ethereum Name Service. Provides decentralized identity via `.eth` names and subnames. Secondary sponsor (Most Creative track).

**Sourcify.** Decentralized smart contract source code verification service. Bonus sponsor (every contract verified for open governance).

**Apify.** Web scraping platform. Used as infrastructure for demo agents (e.g., GrantScout scrapes Gitcoin via Apify Actor). Not claimed as sponsor track.

---

## Demo agent terms

**GrantScout.** Primary demo agent. Apify-backed scraper for Gitcoin/Octant grant rounds. Charges 0.01 USDC per paid summary report.

**DataMonitor.** Stretch demo agent. Watches public on-chain feed (e.g., Aave liquidations) and pushes paid alerts.

**TenderEye.** Stretch demo agent. Flags suspicious EU procurement patterns. Origin: civic transparency category, sister concept to bench-tabled "Probono" idea.

---

## Process/discipline terms

**Pre-build gate.** 8-question checklist that any new project idea must pass before code begins. Gate 1 (5-second meta moment) and Gate 8 (memorable jednolinkovka) are deal-breakers. Defined in project memory.

**Sponsor-native test.** "Could this product exist in this shape without this sponsor's technology?" If yes → sponsor is decoration → drop. If no → sponsor is core → proceed.

**Honest-over-slick.** Discipline that every public claim must be reproducible from `git checkout && pnpm dev`. Mocked components labeled `mock: true`. No fake "live" labels on simulated paths.

**Anti-pattern.** Behavior or framing pattern that has historically failed. Defined in `feedback_anti_patterns.md`. Examples: "platform/OS/framework/boundary/layer/engine" in pitch sentence; 5+ sponsor tracks; naming after first commit.

**Time-cut.** Scope reduction motivated by limited build time. Forbidden by project rules — Daniel calls cuts during execution; Claude does not preemptively trim.

**SBO3L.** Daniel's prior project (ETHGlobal Open Agents 2026). Closed. No derivatives in Agent Float. Lessons referenced; code/brand not.

---

## Solarpunk concepts

**Solarpunk.** Optimistic, regenerative, communal techno-aesthetic. Theme of ETHPrague 2026: *"Building Ethereum's Solarpunk Future."* Anti-extractive, public-goods-oriented, privacy-respecting, user-sovereign.

**Public capital market.** A capital market where anyone can participate in any amount, with full transparency. Contrasted with closed VC, accredited-investor gates, opaque cap tables.

**Open architecture.** Code, contracts, and data are publicly auditable. Contrasted with proprietary platforms.

---

## Implementation terms

**Foundry.** Solidity development toolkit. Includes `forge` (build/test/deploy), `cast` (RPC tools), `anvil` (local Ethereum node fork). Primary smart contract toolchain for Agent Float.

**OpenZeppelin.** Standard library of audited smart contract patterns (ERC20, ERC721, AccessControl, ReentrancyGuard). Agent Float contracts extend OpenZeppelin v5+ implementations.

**Tranche.** A portion of capital released from the Umia noncustodial treasury upon milestone completion. Multi-tranche release prevents builder from getting all capital upfront. Release rules per Umia governance + Agent Float milestone triggers.

**Snapshot.** Mechanism for fixing token holder balances at a specific point in time. Used by `BuilderBondVault.slash()` to compute pro-rata payouts to current Umia venture token holders, and (conditionally, if deployed) by `RevenueDistributor` for pro-rata revenue claims.

**RBAC** (Role-Based Access Control). Pattern where contract functions are restricted to specific roles (e.g., `ORACLE_ROLE` for milestone marking). Implemented via OpenZeppelin `AccessControl`.

**Reentrancy guard.** Mutex preventing recursive contract calls during sensitive state changes. Critical for `claim()` and `buy()` functions.

**ECDSA recover.** Function that derives a signer's address from a signed message + signature. Used to verify receipts came from agent's ENS-registered wallet.

**Custom error.** Solidity 0.8.4+ pattern for revert reasons. More gas-efficient than revert strings. Used throughout Agent Float contracts.

**Wagmi / viem.** Web3 React libraries for Ethereum frontend integration. `viem` is the low-level RPC client; `wagmi` wraps it for React hooks. Used in Next.js platform UI.

**ENSIP** (ENS Improvement Proposal). Standard for ENS extensions (resolvers, off-chain lookup, etc.). Examples: ENSIP-25 CCIP-Read for off-chain resolvers.

**0xSplits.** Reference implementation of pro-rata revenue split for token holders. Inspiration for `RevenueDistributor` accounting model.

**Bonding curve.** Mathematical function `price(n) = startPrice + slope * n` (linear) where `n` is tokens already sold. Defines token price as a function of supply consumed.

**Vercel AI Gateway.** Vercel's unified API to multiple AI providers (Anthropic, OpenAI, etc.) with provider/model strings. Default LLM access pattern in Agent Float.

**Fluid Compute.** Vercel's 2026 default function compute model. Reuses function instances across concurrent requests. Better cold-start than Edge Functions.

## Process artifacts

**SCOPE.md.** Single source of truth for what's locked. Read first.

**BRAINSTORM.md.** Historical record of ideation. Idea 15 = Agent Float. Useful for context.

**README.md.** Public face of repo. Pitch + run instructions.

**CLAUDE.md.** Project-specific Claude memory pointers.

**AGENTS.md.** Guidance for Codex and other agentic collaborators.

**Memory.** Persistent project memory at `~/.claude/projects/-Users-danielbabjak-Desktop-ETHPrague2026/memory/`. Contains feedback rules, project context, references, etc.
