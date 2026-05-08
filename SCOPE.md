# Agent Float — SCOPE (locked 2026-05-08)

> **Status:** LOCKED by Daniel 2026-05-08. Naming "Agent Float" provisional, collision check tonight.
> **Hackathon:** ETHPrague 2026 in-person.
> **Submission:** 2026-05-10 12:00 PM via Devfolio.

---

## 1. Identity

| Field | Value |
|---|---|
| Project name | **Agent Float** (provisional) |
| Pitch sentence | *"Agent Float turns working AI agents into investable ventures."* |
| Marketing tagline | *"Your agent has receipts. Now give it runway."* |
| Alternative | *"From local agent to funded venture."* |
| Hard product rule | **No receipts, no float.** |
| Category | Capital market for working AI agents |

**What we are NOT:**
- AI agent marketplace
- Token launchpad / meme casino
- DAO tooling
- Trading bot leaderboard
- Agent OS

**What we are:**
- Funding layer for **working** AI agents (operative word: working — proof first)

---

## 2. Stakeholders + product loop

| Stakeholder | Wants | Gets |
|---|---|---|
| **Builder** | Capital pre rozvoj agenta | Fundraising page, Umia launch, treasury, investor base |
| **Agent** | Compute, API credits, data, distribúcia | Runway + jasný growth plan |
| **Investor** | Early exposure na agentic business | Token / venture exposure cez Umia |
| **User agenta** | Užitočná služba | Lepší agent po financovaní |
| **Umia** | Quality agentic deal flow | Discovery + onboarding funnel |

**Loop (one cycle):**

1. Builder má agenta ktorý už niečo robí
2. Agent dostane ENS passport: identity + wallet + endpoints + receipts
3. Profil ukáže: čo robí + kto prevádzkuje + kolkо zarobil + náklady + funding goal
4. Builder vytvorí funding proposal (e.g., "2,000 USDC → better data sources + compute → 3x paid reports/wk")
5. Investori financujú cez Umia
6. Money → agent venture treasury
7. Agent upgrade → nové receipts ukážu impact
8. Lepší agent → viac users → viac revenue → ďalší funding cycle možný

---

## 3. Sponsor lock (1 primary + 1 secondary + 1 bonus, per anti-pattern #2)

| Tier | Sponsor | Bounty | Use | Sponsor-native test |
|---|---|---|---|---|
| **Primary** | **Umia** | $12K Best Agentic Venture | Funding / legal wrapper / treasury / governance engine | ✅ ABSOLUTE — bez Umia nie je funding mechanism, nie je čo float-ovať |
| **Secondary** | **ENS** | $2K Most Creative | Per-agent passport: `<agent>.agentfloat.eth` using **ENSIP-26 standard records** (`agent-context`, `agent-endpoint[web]`, `agent-endpoint[mcp]`) plus namespaced extensions (`agentfloat:umia_venture`, `agentfloat:bond_vault`, `agentfloat:milestones`, `agentfloat:receipts_pointer`) | ✅ ENS subnames sú live identity backbone — bez ENS nie je passport |
| **Tertiary bonus** | Sourcify | $4K (if shipped) | Verify agent treasury contract sources publicly (open governance proof) | ⚠️ Iba ak treasury contracts deployed + verified; nie deal-breaker pre primary scope |

**Skip explicit:**
- ❌ SpaceComputer — no hardware in scope
- ❌ Apify — use ako infrastructure pre demo agent (GrantScout) ale **NIE ako sponsor track** (anti-pattern: nemiešaj infra a track)
- ❌ Swarm — cost/value pre receipts storage nie je optimálny v 3-day window

**Total target:** $14K (Umia + ENS) baseline; $18K best-case s Sourcify bonus.
**Realistic estimate:** $4-10K (Umia 1st place je stretch goal; Most Creative ENS achievable).

---

## 4. Organizer tracks

| Track | Fit | Action |
|---|---|---|
| **Network Economy** | ✅ PRIMARY (privacy + identity + onchain economic coordination + user control) | Submit |
| **Best UX Flow** | ⚠️ Secondary ak polish dosiahneme | Submit ak demo je čistý |
| Future Society | ⚠️ Possible (transparent capital allocation) ale slabší fit než Glasnost-shape | Submit ak narrative angle leans into "public capital market vs closed VC" |
| Best Privacy by Design | ❌ Skip — financial transparency je opak privacy |
| Ethereum Core | ❌ Skip |
| Best Hardware Usage | ❌ Skip |

---

## 5. Scope (target shipping list)

> **Time is not a constraint** (per Daniel's 2026-05-08 directive). Build the full target. Schedule = pacing reference, NOT scope driver.

### Onchain stack (POST-PIVOT)

**Umia-provided (we integrate, not deploy):**
- Umia venture legal entity wrapper (per `umia venture init`)
- Umia venture token (template or our ERC20 fed into Umia)
- Umia Tailored Auction (Uniswap CCA-based primary sale)
- Umia noncustodial treasury (proceeds destination)
- Umia decision markets (governance layer)
- Umia secondary market

**Agent Float-provided (our value-add layer):**

| Component | Detail |
|---|---|
| **AgentRegistry.sol** | Maps ENS subname → Umia venture address + our extensions (bond vault, milestones, receipt log). Registration is **two-step**: (1) Umia venture init via their CLI, (2) Agent Float register via our contract that anchors to the Umia venture. |
| **ReceiptLog.sol** | Append-only events `(agent, timestamp, queryId, reportHash, paymentAmount, signer)`. Signature-bound to agent's ENS-registered wallet. USDC-Transfer cross-validation. **Our innovation** — Umia doesn't gate fundraising on receipts. |
| **BuilderBondVault.sol** (Q7a — builder personal obligation) | Locks builder's USDC collateral at registration. Slashes pro-rata to current Umia venture token holders if milestone missed OR agent silent N+ days. **Our innovation** — Umia doesn't have personal accountability bond. |
| **MilestoneRegistry.sol** | Builder commits milestones at registration. Oracle/multi-sig marks met or failed. Triggers `BuilderBondVault.slash()` on miss. **Our innovation**. |
| **BondingCurveSale.sol** [FALLBACK ONLY] | Optional internal simulator. Used **only** if Umia auction integration unavailable during demo. Not the primary pitch. May be deployed for testing without affecting headline architecture. |
| **RevenueDistributor.sol** [CONDITIONAL] | If Umia treasury supports native revenue distribution → skip ours. If not → ours wraps Umia treasury as USDC source and tracks per-holder claimable from Umia venture token holdings. |
| **ENS subname registry** | Mainnet parent `agentfloat.eth`; programmatic subname `<agent>.agentfloat.eth` with **ENSIP-26 standard records**: `agent-context`, `agent-endpoint[web]`, `agent-endpoint[mcp]`. Plus namespaced extensions: `agentfloat:umia_venture`, `agentfloat:treasury`, `agentfloat:venture_token`, `agentfloat:bond_vault`, `agentfloat:receipts_pointer`. |

**Skipped from previous plan:**
- ❌ AgentVentureToken.sol as primary (Umia issues; ours conditional fallback)
- ❌ AgentTreasury.sol custom multi-sig (Umia provides noncustodial treasury)
- ❌ Custom bonding curve as primary sale path

### Demo agents (variety strengthens venture pitch)
| Agent | Category | What it does |
|---|---|---|
| **GrantScout** | Research / public-goods scout | Apify-backed Gitcoin / Octant / Drips active-round summarizer; charges 0.01 USDC per paid report; emits real receipts |
| **DataMonitor** | B2B ops | Watches public on-chain feed (e.g., specific protocol events), pushes paid alerts to subscribers; recurring revenue |
| **TenderEye** | Civic transparency | Flags suspicious EU procurement patterns; charges per investigation report |

(Prvotne shippneme aspoň 1 a stretch ku 3 — variety ukazuje category diversity pre Umia venture story.)

### Platform UI
| View | Detail |
|---|---|
| **Landing** | "Discover working AI agents seeking capital." + featured agent grid + "no receipts, no float" rule prominently |
| **Agent profile** `/agent/[ens-name]` | ENS passport (live resolved) + receipts feed (real on-chain events) + revenue chart + cost chart + runway counter + funding proposal + builder identity + treasury status + venture token (if shipped) |
| **Investor view** | Browse agents, sort by revenue / runway / category; portfolio view tracks investor's holdings |
| **Builder dashboard** | Onboarding (register agent + ENS + deploy treasury + set up receipt emission); manage milestones; view investors |
| **Float interface** | "Float Agent" button → Umia flow → real on-chain settlement → runway counter updates live |
| **Public agent leaderboard** | Top revenue agents, top runway agents, top fundraises |

### Builder onboarding (real flow, not hardcoded)
- Connect wallet (Privy embedded)
- Register agent — assign ENS subname, deploy treasury contract, generate receipt-emission credentials
- Configure agent metadata — capabilities, endpoints, pricing
- Optional: deploy venture token (per Umia template if available)
- Set first funding milestone

### Receipt emission SDK (for builders to integrate own agents)
- TypeScript SDK + Python SDK
- `emitReceipt({queryId, reportHash, amount, signer})` → signs + posts to ReceiptLog contract
- Verification helper: `fetchReceipts(agentEns)` → returns chain-of-evidence

### Open-source positioning
- Repo public po naming + scaffold lock (NIE time-driven)
- License Apache 2.0 alebo MIT
- README ako pitch + architecture + run instructions

---

## 5.5 Tokenomics (LOCKED — POST-PIVOT 2026-05-08)

> **PIVOT:** Po review (`docs/12-sponsors-explained.md` Umia gap + external research) sa primary funding mechanism mení z našej `BondingCurveSale.sol` na **Umia Tailored Auctions powered by Uniswap CCA** (Continuous Clearing Auctions). Reason: sponsor-native test. Bez Umia auction je Umia sponsor decoration; s ich auction je core. **PENDING UMIA MENTOR CONFIRMATION** — ak mentor potvrdí že sa dá použiť aj custom curve, môžeme revertnúť, ale default je teraz Umia auction.

| Parameter | Value | Q | Notes |
|---|---|---|---|
| Token supply per agent | **2,000,000 fixed** | Q1 | Pending Umia template — ak Umia poskytuje vlastný token contract (s ich vlastnou supply convention), prispôsobíme. Inak deploy our own ERC20 + feed do Umia auction. |
| Pricing model | **Umia Tailored Auction (Uniswap CCA-based)** | Q2 PIVOT | Bola: bonding curve. Teraz: Umia auction primary. Naša `BondingCurveSale.sol` zostáva ako **internal fallback simulator** ak Umia integration nedôjde / ako pre-demo state populator. |
| Builder token retention | **Builder určí pri Umia venture init** | Q3 | Stále builder volí, ale interface je Umia CLI / dashboard, nie naše params |
| USDC split z token sale | **Per Umia treasury rules** | Q4 PIVOT | Bolo: builder určí upfront vs treasury. Teraz: proceeds idú do Umia noncustodial treasury per ich rules. Builder upfront access = subject to Umia treasury config. |
| Token utility | **Economic exposure per Umia venture wrapper (PENDING UMIA LEGAL CONFIRMATION)** | Q6 | We do not redefine token economics. Specific structure (revenue rights vs governance vs other) deferred to Umia legal model. "Pro-rata revenue share" wording avoided in pitch + demo until mentor confirms. |
| Revenue distribution | **Pull (claim) — pending Umia treasury integration** | Q5 | Ak Umia treasury podporuje native revenue distribution → použijeme ich. Ak nie → naša `RevenueDistributor.sol` ostáva ale sa napája na Umia treasury ako USDC source. |
| Failure mode | **Builder personal obligation (collateral) — naša innovation NAD Umia** | Q7a | `BuilderBondVault.sol` stays as Agent Float's value-add layer. Slashing trigger nezávisí od Umia. |
| Secondary market | **Umia secondary market** | Q8 | Beze zmeny |
| Governance | **Umia decision markets** (PENDING) | Q6 | Umia použiva decision markets pre venture governance. Token holders môžu mať governance rights cez ich layer, nie cez náš token utility. |
| Securities/legal wrapper | **Umia legal entity wrapper** | Q9 | Per `umia venture init` — Umia vytvára legal entity per agent venture. |

### Architecture shift summary

**Predtým (naša custom mechanika):**
```
Builder calls our AgentRegistry.registerAgent()
→ deploys AgentVentureToken (2M ERC20)
→ deploys our BondingCurveSale
→ Investor buys via OUR curve → USDC routes per OUR split
```

**Teraz (Umia-native):**
```
Builder runs `umia venture init` (Umia CLI)
→ Umia creates legal entity wrapper
→ Umia issues venture token (their template alebo ours feed-into-theirs)
→ Umia sets up Tailored Auction
→ Umia deploys noncustodial treasury

Agent Float layer (our value-add ON TOP):
→ AgentRegistry maps ENS subname → Umia venture address
→ ReceiptLog (our innovation, signed receipts)
→ BuilderBondVault (our innovation, personal collateral slashing)
→ MilestoneRegistry (our innovation, milestone tracking + slashing trigger)
→ Optional: BondingCurveSale (FALLBACK ONLY — internal simulator, not pitched)

Investor flow:
→ Browses Agent Float, sees agent profile (ENS passport + receipts + bond + milestones)
→ Clicks "Float on Umia" → redirected to Umia auction page
→ Buys via Umia Tailored Auction (CCA mechanism)
→ Tokens credited via Umia
→ Returns to Agent Float profile to track receipts + claim revenue
```

**Naša diferenciácia (čo Umia sám nemá):**
- ENS passport pattern (per-agent identity layer)
- "No receipts, no float" rule (proof-first gate)
- ReceiptLog with USDC cross-validation (wash-trading mitigation)
- BuilderBondVault personal collateral (accountability primitive)
- MilestoneRegistry slashing trigger
- Multi-agent variety + reputation layer + leaderboard

### Builder onboarding (two-step, Umia-first)

**Step 1 — Umia venture init (handled entirely by Umia):**
```
$ umia venture init <agent-name>
→ Umia creates legal entity wrapper
→ Umia issues venture token (their template)
→ Umia configures Tailored Auction (Uniswap CCA)
→ Umia deploys noncustodial treasury
→ returns: ventureAddress, tokenAddress, treasuryAddress, auctionAddress
```

**Step 2 — Agent Float registerAgent (our value-add layer):**
```solidity
agentRegistry.registerAgent({
    ensLabel: string,                       // e.g., "grantscout"
    umiaVenture: address,                   // from `umia venture init` output
    milestones: Milestone[],                // commitments (slashing triggers)
    builderBond: uint256,                   // USDC collateral, locked in BuilderBondVault
    silenceThresholdSeconds: uint256,       // bond slash trigger window
    agentMetadata: AgentMetadata            // ENSIP-26 record payload
})
```

This single Agent Float tx:
- Issues `<ensLabel>.agentfloat.eth` subname with ENSIP-26 records + namespaced extensions
- Locks builder's USDC collateral in `BuilderBondVault`
- Registers committed milestones in `MilestoneRegistry`
- Maps the Umia venture address into our registry for cross-referencing

**No token mint, no bonding curve setup, no USDC split parameters** — those live on Umia's side.

### Investor flow (Umia-native)
```
1. Browse Agent Float → sees agent grid with ENS passport, receipts feed, milestones, bond status
2. Click agent profile → sees Umia Tailored Auction state (live or post-auction) embedded/linked
3. Click "Fund via Umia" → redirected to Umia auction page for that venture
4. Bid in Tailored Auction (Uniswap CCA settles clearing prices)
5. Tokens credited to investor via Umia
6. Returns to Agent Float profile — sees token holdings, agent receipts continuing live
7. Secondary trading via Umia UI when desired
8. Investor exposure (revenue, governance) handled per Umia venture wrapper
```

### Revenue / exposure cycle
```
Agent earns USDC (via paid queries → ReceiptLog event on Agent Float side)
USDC flows to addresses configured at Umia venture init time
Token holder economic exposure is determined by Umia's venture model
  (NOT by Agent Float-level RevenueDistributor unless Umia treasury
   does not natively support holder distribution)
```

> [PENDING UMIA MENTOR] Whether Agent Float deploys an auxiliary `RevenueDistributor.sol` is conditional on what Umia's noncustodial treasury exposes. Default assumption: Umia handles holder economics; we do not.

### Default failure trigger logic (Q7a slashing — Agent Float's accountability layer)
```
EITHER:
  - MilestoneRegistry.checkMilestone(milestoneId) returns FAILED
    AND grace period expired
OR:
  - ReceiptLog has no events for agent in N consecutive days (silence detector)
THEN:
  BuilderBondVault.slash() → distributes bond pro-rata to current token holders
```

---

## 6. Non-goals (product-scope decisions, NOT time-cuts)

Toto sú vyradené veci z produktových dôvodov, nie kvôli času. Time-cut decisions Daniel call-uje v exekúcii.

- ❌ **Trading agents category** — anti-Solarpunk; extractive vibe; Daniel explicit exclude. Produkt-decision.
- ❌ **Token launchpad / hype tokens** — porušuje "no receipts, no float" rule. Produkt-decision.
- ❌ **Featured launches paid feature** — paid features dilute trust signal v capital market. Produkt-decision.
- ❌ **Agent OS / runtime / framework tooling** — anti-pattern #1; scope creep do platformy. Produkt-decision.
- ❌ **Mobile native app** — web-first, web is responsive. Produkt-decision.
- ❌ **DAO governance tooling layer** — out of category; Aragon/Snapshot už pokrývajú. Produkt-decision.
- ❌ **Token casino mechanics** (random drops, gamified exposure) — anti-trust signal. Produkt-decision.
- ❌ **Wash-trading agent revenue protection** — open question; punted to post-hack design.
- ❌ **Multi-chain v Day 1** — Ethereum primary; ostatné chains zámerne mimo focus pre clarity, NIE pre čas. Produkt-decision.

## 6.5 Full target (ambicious — žiadne self-imposed time cuts)

Items ktoré v skoršej drafte boli markované ako "post-hack" alebo "MVP cuts" — všetky späť in-scope:

- ✅ **Multiple demo agents** (3 categories: research / B2B ops / civic) — variety silnejší venture pitch + showcases category diversity
- ✅ **Real builder onboarding flow** — investor vidí end-to-end builder journey, nie len pre-loaded demos
- ✅ **Funding milestones** — phased capital release, nie single-shot raise
- ✅ **Per-agent venture token** (ERC20) — reflektuje Umia "token / venture exposure" mechanic
- ✅ **Investor portfolio view** — track multiple investments
- ✅ **Public agent leaderboard** — discovery + social proof
- ✅ **Mainnet ENS** parent + subnames (kde sa dá; Sepolia ako iteration sandbox) — silnejší ENS Most Creative submission
- ✅ **Full receipt schema** — payload + signature + IPFS metadata + attestation chain
- ✅ **Builder dashboard** — agent settings, propose milestones, view investor list, claim funded amounts
- ✅ **Open-source SDK** pre builderov (TS + Python) na receipt emission
- ✅ **Live Umia funding flow s real on-chain settlement** (nie simulator pokiaľ Umia umožňuje real flow)
- ✅ **Sourcify-verified treasury contracts** (bonus track $4K) — open governance proof
- ✅ **Polish + UX** — agent profile design ako Stripe Atlas pre AI agents

---

## 7. Demo script (5-min, post-tokenomics lock)

**Persona:** Investor browsing Agent Float pre prvý-krát.

| Sec | Action | Voiceover |
|---|---|---|
| 0–25 | Landing page → "Discover working AI agents seeking capital" + 3 agents grid + prominent **"No receipts, no float"** rule banner | *"Väčšina AI agent tokens je hype. Agent Float je iný — každý agent tu má on-chain receipts."* |
| 25–80 | Klik na GrantScout → profile: ENS passport (`grantscout.agentfloat.eth` resolved live, ENSIP-26 records visible) + receipts feed (3 real Sepolia events, signed + USDC-cross-validated) + Umia Tailored Auction state + builder bond locked + milestones list | *"GrantScout: real Apify-backed grant scout. 3 paid reports, podpísané agent walletom, USDC cross-validated. ENS resolution live cez ENSIP-26 records. Umia Tailored Auction in progress."* |
| 80–150 | Investor klikne "Fund via Umia" → redirect na Umia auction page → Tailored Auction (Uniswap CCA) UI → bid placeuje 1 USDC → settle → tokens v investor wallete | *"Klikám Fund via Umia. Umia Tailored Auction — Uniswap CCA. Continuous clearing price discovery. Bid placeujem 1 USDC. Umia settles, tokeny v mojom portfoliu, treasury proceedy idú do ich noncustodial treasury per legal wrapper."* |
| 150–210 | Investor sa vráti na Agent Float profile → vidí svoje token holdings + agent activity log → live demo: agent vykoná 1 paid query → ReceiptLog emit → receipts feed updates s novým eventom | *"Späť na Agent Float profile. Držím tokeny od Umia. Agent práve zarobil reálnu USDC za reálnu query. Receipt podpísaný + USDC cross-validated. Toto je proof čo gateuje fundraising."* |
| 210–250 | Split-screen: agent receipts ticking + investor portfolio + builder bond status (500 USDC locked) + milestone progress (8% → 10% počas demo) | *"Po investícii vidím agent productivity rastie. Builder bond intact. Milestone postupuje on-chain. Toto je investor confidence postavená na proof, nie na sľuboch."* |
| 250–280 | Pohľad na milestones panel: "Milestone 1: 50 paid reports — 10% complete. Builder bond locked: 500 USDC. Slashing trigger: 7 days silence ALEBO milestone fail." | *"Builder má 500 USDC personal collateral. Ak agent ide silent alebo nesplní milestones, bond sa rozdelí Umia venture token holderom pro-rata. Toto je accountability layer ktorý čisté token launchpadi nemajú."* |
| 280–300 | Tagline screen: **"Your agent has receipts. Now give it runway."** + Umia / ENS / Sourcify logos + GitHub link | *"Agent Float. Discovery + accountability layer pre Umia ventures. Postavené na ETHPrague 2026."* |

**5-sek meta moment:** Receipt feed grows live during demo + bond visible + milestone progressing. Investor confidence built on on-chain proof.

**Backup wow moment** (ak primary nedôjde): adversarial fail-trigger — show silence detector firing on test agent → bond auto-distribution preview.

---

## 8. Architecture (locked stack)

**Frontend:**
- Next.js 16 App Router + Vercel
- Tailwind 4 + shadcn/ui
- ENS resolve via wagmi
- Vercel AI Gateway pre LLM (claude-sonnet-4-6 with prompt caching)

**Backend:**
- Vercel Functions (Fluid Compute)
- Receipts ingestion endpoint pre demo agent
- Umia integration (TBD Day 1 mentor)
- Optional Apify Actor pre GrantScout

**Smart contracts (Foundry, Sepolia + selected mainnet):**

Core (always deployed):
- `AgentRegistry.sol` — links Umia venture address + ENS subname + bond + milestones
- `ReceiptLog.sol` — append-only signed receipt events with USDC cross-validation
- `BuilderBondVault.sol` — locks builder collateral; slashes pro-rata to current Umia venture token holders on default
- `MilestoneRegistry.sol` — milestone tracking + slashing trigger

Conditional / fallback only (deployed only if Umia integration requires; otherwise omitted):
- `AgentVentureToken.sol`, `AgentTreasury.sol`, `RevenueDistributor.sol`, `BondingCurveSale.sol`

**Identity:**
- Parent ENS: `agentfloat.eth` (Sepolia) — registrácia tonight
- Subnames: programmatic via ENS Resolver

**Demo agent (GrantScout):**
- Apify Actor scraping Gitcoin/Octant API → JSON
- Vercel Function: `/api/agent/grantscout/query` → AI Gateway summarize → 0.01 USDC paywall (Sepolia)
- Receipt emit po každom paid query

**Repo structure:**
```
ETHPrague2026/
├── apps/web/                # Next.js platforma
├── apps/agent-grantscout/   # demo agent (Vercel Function set)
├── contracts/               # Foundry contracts + deploy scripts
├── packages/shared/         # types, ENS helpers, receipt schema
├── docs/
│   ├── naming-research.md
│   ├── demo-acceptance.md
│   └── sponsor-mentor-questions.md
└── SCOPE.md (this file)
```

---

## 9. Risks + mitigations (summary)

> **Full register:** [docs/10-risks.md](./docs/10-risks.md) (21 catalogued risks with owners, levels, probabilities, and mitigation paths). This section is the in-SCOPE summary of the highest-impact items.

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **Umia API/SDK unclear** | 50% | High | Mentor sweep priority #1. Fallback: Umia simulator s explicit `mock: true` label per honest-over-slick rule. |
| **Naming "Agent Float" collision** | 30% | Medium | Tonight check: GitHub org, npm, `agentfloat.eth` mainnet, X handle, .com/.app domain. Backup names: AgentRunway, AgentPier, AgentDrydock, AgentBerth. |
| **GrantScout demo agent stuck** | 40% | High | Use Apify pre-built Gitcoin scraper if available; fallback minimal Cheerio script. Pre-cache 3 receipts pre safe demo. |
| **Multi-stakeholder demo confusion** | 50% | Medium | Lock investor POV ako primary thread; builder POV iba in voiceover. ONE narrative, ONE persona during 5 min. |
| **Solarpunk fit weakness (financialization undertone)** | 40% | Medium | Lean into "public capital market vs closed VC" + "transparent vs hype" framing v voiceover; emphasize "no receipts, no float" rule prominently. |
| **Token-casino perception** | 35% | High | Demo MUSI prominently zobraziť "no receipts, no float" rule; explicitly contrast against meme launchpads v opening. |
| **Wash-trading by builder** (fakuje receipts → pump token price) | 30% | High | Receipts musia byť signed by agent's ENS-registered wallet AND tied to actual user-paid USDC tx (paymentAmount field cross-checks against on-chain transfer). Cannot fake receipt without burning own USDC. |
| **Builder default / rugpull** | 20% | High | BuilderBondVault.sol locks personal collateral; auto-slashes ak agent ide silent OR milestone missed. Q7a personal obligation enforced on-chain. |
| **Umia auction state stale during demo** | 25% | Medium | Pre-warm via 1-2 mock bids on Umia testnet auction (or Sepolia simulator if Umia auction is mainnet-only). Verify state propagates to agent profile in <2s. |
| **Conditional `RevenueDistributor` accounting bugs (only if deployed)** | 15% | High | Only relevant if Umia treasury does not natively distribute. If we must deploy, Foundry fuzz tests for invariants; reuse 0xSplits accounting model. |
| **Live ENS resolve fails on stage** | 20% | High | Pre-resolve + cache; fallback display "loading from cache" if RPC blip. |
| **Sepolia gas/RPC issues** | 15% | High | Pre-fund wallets; have Anvil local fork as deep fallback. |

---

## 10. Pre-event prep checklist (parallel-able)

- [ ] **Naming research "Agent Float"** + alternates:
  - GitHub: `B2JK-Industry/agent-float-ethprague-2026` (live, public)
  - npm: `@agentfloat/*`
  - ENS: `agentfloat.eth` mainnet (Alchemy key z memory)
  - X handle: `@agentfloat`
  - Domains: `agentfloat.app` / `.io` / `.xyz`
  - Backup names: AgentRunway, AgentPier, AgentDrydock, AgentBerth
- [x] **GitHub repo init** `B2JK-Industry/agent-float-ethprague-2026` (public, wiki + discussions + issues enabled)
- [ ] **Vercel project link** + AI Gateway env (`AI_GATEWAY_API_KEY`)
- [ ] **Sepolia wallet status check** — funded (Alchemy memory pointer)
- [ ] **Umia documentation deep-read** — find any publicly available API/SDK info pred mentor session
- [ ] **`docs/naming-research.md`** — log collision checks
- [ ] **`docs/demo-acceptance.md`** — demo script + acceptance gates (§7 + §12)
- [ ] **`docs/sponsor-mentor-questions.md`** — mentor sweep scripts:
  - **Umia (priority):** *"What's the actual integration path? SDK? REST API? Token contract template? Per-agent venture token templates? Mainnet expected pre venture flow alebo Sepolia OK?"*
  - **ENS:** *"Programmatic subname issuance under our `agentfloat.eth` parent — acceptable for Most Creative track? Mainnet expected alebo Sepolia OK?"*
  - **Sourcify:** *"Verifying multiple treasury contracts (per-agent) on Sourcify — counts as core component? Breadth (multi-contract) vs depth?"*

---

## 11. Work tracks (parallel-able where dependencies allow)

> Žiadny time-based ordering. Tracks majú dependencies (čo blokuje čo), nie schedule. Daniel pace-uje priebeh; Claude nepredpisuje sequencing.

### Track A — Identity layer (ENS)
- Register `agentfloat.eth` parent (mainnet primary; Sepolia ako iteration sandbox)
- ENS Resolver supporting **ENSIP-26 standard records** (`agent-context`, `agent-endpoint[web]`, `agent-endpoint[mcp]`) plus namespaced extensions (`agentfloat:umia_venture`, `agentfloat:bond_vault`, `agentfloat:milestones`, `agentfloat:receipts_pointer`)
- Programmatic subname registration helpers
- Wagmi/viem live resolve helpers pre UI
- **Blocks:** Track C, Track D
- **Blocked by:** Mentor sweep #2 (ENS — confirms mainnet vs Sepolia approach)

### Track B — Smart contracts (Foundry, Sepolia + selected mainnet)

**Agent Float core (always deployed):**
- `AgentRegistry.sol` — registerAgent() entry point; links Umia venture address + ENS subname + bond + milestones (does NOT mint tokens or set up auction; Umia handles)
- `ReceiptLog.sol` — append-only signed receipt events with USDC cross-validation
- `BuilderBondVault.sol` — builder collateral; slashes pro-rata to current Umia venture token holders on default
- `MilestoneRegistry.sol` — milestone tracking + slashing trigger

**Conditional / fallback (deployed only if needed):**
- `AgentVentureToken.sol` [CONDITIONAL] — only if Umia does not provide a token template
- `AgentTreasury.sol` [LIKELY UNNECESSARY] — Umia provides noncustodial treasury
- `RevenueDistributor.sol` [CONDITIONAL] — only if Umia treasury does not natively distribute to holders
- `BondingCurveSale.sol` [FALLBACK ONLY] — internal simulator if Umia auction unavailable for demo

**Deploy + Sourcify verification pipeline** for every deployed contract (Sourcify bonus track requirement).
- **Blocks:** Track C, Track D, Track E
- **Blocked by:** Mentor sweep #1 (Umia — confirms venture token shape) + #3 (Sourcify — confirms verification path)

### Track C — Demo agents
- **GrantScout** (research / public-goods scout) — Apify-backed Gitcoin/Octant summarizer; 0.01 USDC/query; emits real receipts
- **DataMonitor** (B2B ops alerts) — stretch
- **TenderEye** (civic procurement) — stretch
- Real receipts emission for each (žiadne mock)
- **Blocks:** Demo + submission
- **Blocked by:** Track A, Track B

### Track D — Platform UI (Next.js 16 + shadcn + Vercel)
- Landing page
- Agent profile `/agent/[ens-name]`
- Investor browse + portfolio view
- Builder dashboard + onboarding flow
- Public agent leaderboard
- "Float Agent" funding interface
- **Blocks:** Demo + submission
- **Blocked by:** Track A, Track B (read-only); Track E (for live funding)

### Track E — Umia integration
- Live integration if mentor confirms; Umia simulator s `mock: true` label ako fallback iba ak Umia explicit nepustí real flow
- Per-agent venture token templates (if Umia provides)
- **Blocks:** "Float" interface, Demo
- **Blocked by:** Mentor sweep #1 (Umia — priority #1 conversation)

### Track F — Receipt SDK
- TypeScript package (`@agentfloat/sdk`)
- Python package (`agentfloat`)
- Sign + emit + verify helpers
- Example integration v GrantScout
- **Blocks:** Builder onboarding adoption story

### Track G — Mentor sweeps (priority order, NOT time order)
- **Priority #1 — Umia** (blocks Track E + venture token shape v Track B)
- **Priority #2 — ENS** (blocks Track A mainnet vs Sepolia decision)
- **Priority #3 — Sourcify** (blocks Track B Sourcify verification pipeline)

### Track H — Demo + submission
- 5-min demo script lock (per §7)
- Recording fallback (in case live demo fails)
- Devfolio submission s tracks selected: Umia primary, ENS secondary, Sourcify bonus, Network Economy organizer
- Acceptance gates §12 verified before submit
- **Blocks:** nothing (final track)
- **Blocked by:** Track A-F

---

## 12. Honest-over-slick acceptance gates

Demo passes ONLY ak:

- [ ] GATE-1: GrantScout makes 1 real Sepolia tx during demo (paid query, not pre-recorded)
- [ ] GATE-2: ENS subname resolves live during demo (no cached display)
- [ ] GATE-3: Receipts feed shows REAL on-chain events (filtered from Sepolia)
- [ ] GATE-4: Funding proposal text reflects what builder ACTUALLY needs (not Lorem ipsum)
- [ ] GATE-5: Any mocked component labeled `mock: true` visibly v UI (e.g., Umia simulator badge)
- [ ] GATE-6: Demo doesn't make claims that aren't reproducible from `git checkout && pnpm dev`
- [ ] GATE-7: Umia venture address linked from `<agent>.agentfloat.eth` ENS record (`agentfloat:umia_venture`); on-chain registry agrees
- [ ] GATE-8: Umia Tailored Auction state visible from agent profile (live or post-auction); "Fund via Umia" CTA resolves to a real Umia auction
- [ ] GATE-9: ReceiptLog events signed by agent's ENS-resolved wallet AND USDC `Transfer` cross-validation present for each receipt
- [ ] GATE-10: BuilderBondVault holds builder's USDC collateral at correct amount immediately after registration
- [ ] GATE-11: MilestoneRegistry milestones queryable from agent profile; status (pending/met/failed) tracked; failed → slash trigger fires
- [ ] GATE-12: ENS subname resolves with both ENSIP-26 standard records (`agent-context`, `agent-endpoint[*]`) and namespaced extensions (`agentfloat:umia_venture`, `agentfloat:bond_vault`, `agentfloat:milestones`, `agentfloat:receipts_pointer`)

> Detailed gate spec with verification protocol: [docs/06-acceptance-gates.md](./docs/06-acceptance-gates.md). All v1-shaped gates (token mint, bonding curve quote, USDC split, RevenueDistributor claim) explicitly removed post-pivot.

---

## 13. Decision log

- **[LOCKED by Daniel]:** Agent Float ako primary direction pre ETHPrague 2026. Umia + ENS sponsor lock. Network Economy organizer track primary.
- **[LOCKED — Tokenomics v1]:** 2M tokens fixed per agent (Q1) + bonding curve primary sale (Q2) + builder-set retention% (Q3) + builder-set USDC split upfront/treasury (Q4) + pull-claim revenue distribution (Q5) + revenue-only utility (Q6) + builder personal obligation via BuilderBondVault collateral (Q7a) + Umia secondary market (Q8) + Umia legal wrapper (Q9).
- **[PIVOTED — Tokenomics v2 — 2026-05-08]:** Primary sale changes from custom `BondingCurveSale.sol` to **Umia Tailored Auctions** (Uniswap CCA). Token issuance, treasury, secondary all delegated to Umia. Naše inovácie (ReceiptLog, BuilderBondVault, MilestoneRegistry, ENS passport) zostávajú ako Agent Float value-add layer NAD Umia ventures. **PENDING UMIA MENTOR CONFIRMATION** — pivot je default direction. Mentor potvrdí buď (a) Tailored Auction integration path = pivot finalizuje sa, alebo (b) custom curve OK = revert na v1. Reviewer flagged that bypassing Umia core product is sponsor-fit risk for $12K Best Agentic Venture.
- **[pending]:** Naming "Agent Float" collision check.
- **[pending]:** Umia integration path — mentor sweep priority #1.
- **[pending]:** Silence-detector N days threshold pre BuilderBondVault slashing trigger (default rec: 7 days).
- **[obsolete post-pivot]:** ~~Bonding curve params (linear vs exponential, starting price)~~ — only relevant if fallback path activates; not a v2 primary decision.
- **Backup pivot:** ak Umia mentor session reveals integration block, fallback: Probono (civic procurement) alebo PGRoll (SpaceComputer cTRNG public goods).
