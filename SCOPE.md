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
| **Secondary** | **ENS** | $2K Most Creative | Per-agent passport: `<agent>.agentfloat.eth` subname pattern; text records pre capabilities/wallet/endpoints/receipts pointer | ✅ ENS subnames su live identity backbone — bez ENS nie je passport |
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

### Onchain stack
| Component | Detail |
|---|---|
| **AgentRegistry.sol** | Maps ENS subname → agent metadata + owner EOA + venture token + treasury + bond vault. Jedna registration tx mintuje 2M venture tokens, locks builder bond, sets up bonding curve, deploys per-agent treasury. |
| **AgentVentureToken.sol** (ERC20, fixed 2M supply per agent — Q1) | Standard ERC20; total supply 2,000,000; minted at registration; transferable; per-holder balance tracked pre revenue distribution. |
| **BondingCurveSale.sol** (Q2 — bonding curve primary sale) | Investor posts USDC → mints/transfers tokens at curve price. Builder retention (Q3) pre-allocated. Curve params builder-set at registration. |
| **AgentTreasury.sol** | Holds USDC od token sale + agent revenue. Capital release governed by MilestoneRegistry. Multi-sig signer set: builder + Umia delegate + investor delegate. |
| **MilestoneRegistry.sol** | Builder commits milestones pri registrácii. Oracle/multi-sig uvoľňuje tranches keď splnené. Triggers BuilderBondVault slashing keď missed. |
| **BuilderBondVault.sol** (Q7a — builder personal obligation) | Locks builder's collateral pri registrácii. Slashes pro-rata investorom ak milestone missed ALEBO agent ide silent N+ dní (žiadne receipts). |
| **RevenueDistributor.sol** (Q5 — pull-claim) | Receives agent USDC revenue. Tracks per-holder claimable balance based na token holdings pri distribution snapshot. Investor calls `claim()` na withdraw accumulated USDC. |
| **ReceiptLog.sol** | Append-only events `(agent, timestamp, queryId, reportHash, paymentAmount, signer)`. Signature-bound na agent's ENS-registered wallet. |
| **ENS subname registry** | Mainnet parent `agentfloat.eth`; programmatic subname `<agent>.agentfloat.eth` s text records: `wallet`, `endpoints`, `capabilities`, `receipts_pointer`, `treasury`, `venture_token`, `bond_vault`. |

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

## 5.5 Tokenomics (LOCKED)

| Parameter | Value | Q | Notes |
|---|---|---|---|
| Token supply per agent | **2,000,000 fixed** | Q1 | Žiadne dilution v MVP; post-hack môže pribudnúť re-issuance mechanism |
| Pricing model | **Bonding curve** | Q2 | Transparentný price discovery; curve params builder-set pri registrácii (default linear/exponential) |
| Builder token retention | **Builder určí pri registrácii** | Q3 | Napr. 20% builderovi, 80% pre primary sale. Volí builder pri registerAgent() call. |
| USDC split z token sale | **Builder určí pri registrácii (split %: upfront vs treasury)** | Q4 | Napr. 20% upfront builder wallet, 80% AgentTreasury. Treasury holds milestone-locked. |
| Token utility | **Revenue share only** | Q6 | Žiadne governance v MVP. Token = právo na pro-rata podiel z agent revenue. |
| Revenue distribution | **Pull (claim)** | Q5 | RevenueDistributor.sol drží USDC + tracks per-holder claimable; investor klikne `claim()`. UI ukáže akumulovaný balance. |
| Failure mode | **Builder personal obligation (collateral)** | Q7a | BuilderBondVault.sol drží builder's USDC collateral; slashes pro-rata investorom ak milestone missed alebo agent silent N dní. |
| Secondary market | **Umia poskytuje secondary market UI** | Q8 | Umia handles P2P trading; my sa fokus-ujeme na primary + revenue distribution. |
| Securities/legal wrapper | **Umia zodpovednosť** | Q9 | Mimo nášho code scope. |

### Builder commits pri registrácii (single registerAgent() tx)
```solidity
registerAgent({
    ensName: string,                    // e.g., "grantscout.agentfloat.eth"
    builderRetention: uint16,           // % out of 2M tokens (Q3)
    bondingCurveParams: { ... },        // initial price + slope (Q2)
    usdcSplit: { upfront: uint16, treasury: uint16 },  // % split (Q4)
    milestones: Milestone[],            // commitments (Q7a trigger)
    builderBond: uint256,               // USDC collateral (Q7a)
    metadata: AgentMetadata             // capabilities, endpoints, etc.
})
```

### Investor flow
```
1. Browse agents → vidí token price na bonding curve
2. Buy X tokens → posts USDC, gets tokens
3. USDC routes per Q4 split (upfront builder, treasury rest)
4. Hold tokens → daily revenue accrual visible v UI (ale nie on-chain transfer)
5. Click "Claim" anytime → RevenueDistributor.claim() → USDC v investor wallet
6. Optional: secondary trade na Umia UI (Q8)
```

### Revenue cycle
```
Agent earns USDC (via paid queries → ReceiptLog event)
USDC routes:
  - X% → AgentTreasury (replenish runway)
  - (100-X)% → RevenueDistributor (for token holders)
RevenueDistributor accumulates per-holder claimable
Investor claims when desired
```

### Default failure trigger logic (Q7a slashing)
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
| 25–80 | Klik na GrantScout → profile: ENS passport (`grantscout.agentfloat.eth` resolved live) + receipts feed (3 real Sepolia events) + revenue $18 USDC + 2,000,000 tokens minted + bonding curve price chart + builder retention 20% + milestones list | *"GrantScout: real Apify-backed grant scout. 3 paid reports, 18 USDC earned. 2 millió tokenov mintnutých pri registrácii. Aktuálna bonding curve price 0.001 USDC za token."* |
| 80–150 | Investor klikne "Buy 1,000 tokens" → bonding curve quote "1.20 USDC" → confirm tx → on-chain split: 20% (0.24 USDC) upfront builder wallet, 80% (0.96 USDC) AgentTreasury | *"Kupujem 1,000 tokenov za 1.20 USDC. Bonding curve transparent. USDC sa splittuje per builder's setup — 20% upfront builderovi pre okamžitý prep, 80% do AgentTreasury, milestone-locked."* |
| 150–210 | Investor portfolio view: 1,000 GrantScout tokens = 0.05% supply. Live demo trigger: agent vykoná 1 paid query → ReceiptLog emit → $0.01 revenue → RevenueDistributor accrues → investor claimable balance updates from $0.00 → $0.000005 | *"Agent práve zarobil 0.01 USDC. RevenueDistributor automaticky pripísal moju 0.05% share. Vidíte to live v claimable balance."* |
| 210–250 | Investor klikne "Claim" → tx → USDC arrives v wallet | *"Claim anytime. Pull-based, gas-efficient. Žiadny daily push."* |
| 250–280 | Pohľad na milestones panel: "Milestone 1: 50 paid reports — 6% complete. Builder bond locked: 500 USDC. Slashing trigger: 7 days silence ALEBO milestone fail." | *"Builder má 500 USDC personal collateral. Ak agent ide silent alebo nesplní milestones, bond sa rozdelí investorom pro-rata."* |
| 280–300 | Tagline screen: **"Your agent has receipts. Now give it runway."** + Umia / ENS / Sourcify logos + GitHub link | *"Agent Float. Capital market for working AI agents. Postavené na ETHPrague 2026."* |

**5-sek meta moment:** Live agent paid query → claimable balance updates → investor claims → USDC arrives. Visible end-to-end value transfer cez tokenomiku.

**Backup wow moment** (ak primary nedôjde): bonding curve price chart pri ďalšom buy ide hore — "next token costs more, current holders' tokens worth more".

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

**Smart contracts (Foundry, Sepolia):**
- `AgentRegistry.sol` — `register(ensNode, ownerEoa)` + metadata pointer
- `ReceiptLog.sol` — `logReceipt(agentEns, queryHash, reportHash, amount)` event-only append
- `AgentTreasury.sol` — Safe-lite multi-sig per agent; deposit USDC, release on milestone

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

## 9. Risks + mitigations

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
| **Bonding curve price volatility v demo** | 25% | Medium | Pre-warm curve s 2-3 small buys before demo, aby live buy nehit nezvyklú price. Linear curve s tight slope pre demo. |
| **RevenueDistributor accounting bugs** | 15% | High | Foundry tests pre per-holder claimable math; reuse battle-tested 0xSplits accounting model. |
| **Live ENS resolve fails on stage** | 20% | High | Pre-resolve + cache; fallback display "loading from cache" if RPC blip. |
| **Sepolia gas/RPC issues** | 15% | High | Pre-fund wallets; have Anvil local fork as deep fallback. |

---

## 10. Pre-event prep checklist (parallel-able)

- [ ] **Naming research "Agent Float"** + alternates:
  - GitHub: `B2JK-Industry/agent-float`
  - npm: `@agentfloat/*`
  - ENS: `agentfloat.eth` mainnet (Alchemy key z memory)
  - X handle: `@agentfloat`
  - Domains: `agentfloat.app` / `.io` / `.xyz`
  - Backup names: AgentRunway, AgentPier, AgentDrydock, AgentBerth
- [ ] **GitHub repo init** `B2JK-Industry/agent-float` (private)
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
- ENS Resolver supporting custom text records (`wallet`, `endpoints`, `capabilities`, `receipts_pointer`, `treasury`, `venture_token`)
- Programmatic subname registration helpers
- Wagmi/viem live resolve helpers pre UI
- **Blocks:** Track C, Track D
- **Blocked by:** Mentor sweep #2 (ENS — confirms mainnet vs Sepolia approach)

### Track B — Smart contracts (Foundry, Sepolia + selected mainnet)
- `AgentRegistry.sol` — registerAgent() entry point (mints tokens + locks bond + sets curve)
- `AgentVentureToken.sol` — ERC20 fixed 2M supply per agent
- `BondingCurveSale.sol` — primary sale curve mechanism
- `AgentTreasury.sol` — Safe-style multi-sig per agent (USDC reservoir)
- `MilestoneRegistry.sol` — phased capital release + slashing trigger
- `BuilderBondVault.sol` — builder collateral; slashes pro-rata na investorov pri default
- `RevenueDistributor.sol` — accumulates revenue + per-holder claimable + claim() function
- `ReceiptLog.sol` — append-only signed receipt events
- Deploy scripts + Sourcify verification pipeline (každý kontrakt verified pre bonus track)
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
- [ ] GATE-7: Token mint executes on registration (2M tokens) — verifiable on Sepolia explorer
- [ ] GATE-8: Bonding curve quote returned correctly for given token amount (math reproducible)
- [ ] GATE-9: USDC split happens correctly on token purchase (% upfront vs treasury verifiable v tx)
- [ ] GATE-10: RevenueDistributor accepts USDC + updates per-holder claimable (snapshot logic)
- [ ] GATE-11: claim() function transfers correct USDC pro-rata to investor wallet
- [ ] GATE-12: BuilderBondVault locks collateral pri registrácii + slashable per ObligationRegistry trigger

---

## 13. Decision log

- **[LOCKED by Daniel]:** Agent Float ako primary direction pre ETHPrague 2026. Umia + ENS sponsor lock. Network Economy organizer track primary.
- **[LOCKED — Tokenomics]:** 2M tokens fixed per agent (Q1) + bonding curve primary sale (Q2) + builder-set retention% (Q3) + builder-set USDC split upfront/treasury (Q4) + pull-claim revenue distribution (Q5) + revenue-only utility (Q6) + builder personal obligation via BuilderBondVault collateral (Q7a) + Umia secondary market (Q8) + Umia legal wrapper (Q9).
- **[pending]:** Naming "Agent Float" collision check.
- **[pending]:** Umia integration path — mentor sweep priority #1.
- **[pending]:** Bonding curve params (linear vs exponential, starting price) — fix at scaffold time.
- **[pending]:** Silence-detector N days threshold pre BuilderBondVault slashing trigger (default rec: 7 days).
- **Backup pivot:** ak Umia mentor session reveals integration block, fallback: Probono (civic procurement) alebo PGRoll (SpaceComputer cTRNG public goods).
