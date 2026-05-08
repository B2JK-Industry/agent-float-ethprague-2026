# 05 — Demo script

Full 5-minute walkthrough. Investor POV throughout. Real on-chain interactions where stated. Fallback paths included.

## Setup before demo

- Pre-deploy GrantScout agent on Sepolia with all contracts
- Pre-fund test wallets (builder, investor A, investor B)
- Pre-execute 2-3 agent paid queries to populate receipts feed
- Pre-warm Umia auction state (or fallback simulator) with 1-2 small bids (avoids zero-state demo)
- Verify all contracts on Sourcify
- Confirm ENS subname resolution from mainnet OR Sepolia
- Have backup recording ready (in case live demo fails)

## Persona

Demo presenter speaks as a first-time investor browsing Agent Float.

## Setting

In-person Prague, Devfolio judging, ~5 minutes per project.

---

## Script

### Sec 0–25 — Hook & landing — DUAL-AGENT FRAMING

**Action:**
- Browser opens `agentfloat.app` (or local dev URL)
- Landing page shows:
  - Headline: *"Public-good AI agents seeking capital"*
  - Subhead: **"No impact proof, no funding."**
  - Banner: **"Standards: ERC-8004 + ENSIP-25/26 + Umia"**
  - Two prominent agent cards side-by-side:
    - **`yield-alpha.agent-float.eth`** — labeled `REJECTED` (red badge, greyed out)
    - **`grantscout.agent-float.eth`** — labeled `FUNDABLE` (green badge, prominent)
- Stats: total fundable agents, total receipts emitted, total impact reports

**Voiceover (Slovak, English technical terms):**
*"Väčšina launchpadov financuje hype. Agent Float financuje len public-good agentov ktorí ukázali reálnu prácu. Tu vidíte dvoch agentov: jeden zarába na yield strategy — REJECTED, lebo to nie je verejné dobro. Druhý každý deň skenuje Gitcoin a Octant, sumarizuje grant opportunities, má reálne receipts — FUNDABLE."*

### Sec 20–35 — Quick contrast: REJECTED agent

**Action:**
- Click `yield-alpha.agent-float.eth` REJECTED card
- Profile shows:
  - **NO impact proof** — no public-good output category
  - ERC-8004 identity present, but reputation flag: `category=trading`
  - Receipts: present but for paid yield optimization (extractive)
  - Big banner: **"Outside Agent Float scope: financialization-first agents not eligible. Use Slopstock or generic launchpads instead."**
- Investor cannot click "Fund via Umia" — disabled

**Voiceover:**
*"Yield-alpha má všetko technicky — ERC-8004, ENS, receipts. Ale jeho output je yield optimization. To je extractive, to je out of scope. Agent Float ho nepustí ďalej. Inde si ho možno fundujte, ale tu nie."*

### Sec 35–95 — FUNDABLE agent profile (GrantScout)

**Action:**
- Back to landing → click `grantscout.agent-float.eth` FUNDABLE card → `/agent/grantscout.agent-float.eth`
- Profile loads with sections:
  - **ERC-8004 identity** — `agentId`, reputation surface, validation registry references (live read from ERC-8004 contracts)
  - **ENS passport** — resolved live; ENSIP-26 records (`agent-context`, `agent-endpoint[web]`, `agent-endpoint[mcp]`) + ENSIP-25-style binding text record pointing to ERC-8004 `agentId` + namespaced extensions (`agentfloat:umia_venture`, `agentfloat:bond_vault`, `agentfloat:milestones`, `agentfloat:receipts_pointer`)
  - **Public-good category** — `civic / public-goods scout`
  - **Receipts feed** — 3 recent receipts (signed + USDC-cross-validated) for paid grant summary reports
  - **Umia venture** — link to Umia venture address, Tailored Auction state
  - **Milestones panel** — milestone 1: 50 paid reports (8% complete)
  - **Builder bond** — 500 USDC locked, slashing trigger: 7-day silence OR milestone fail

**Voiceover:**
*"GrantScout je Apify-backed agent. Každý deň skenuje Gitcoin, Octant, Drips. Predáva summary reports za 0.01 USDC. Tu vidíte ERC-8004 identity — štandardná agent reputation, nie naša vymyslená infra. ENS resolution cez ENSIP-26 records. Umia venture pripravená. Builder bond locked. Agent je FUNDABLE lebo: 1, kategória je public-goods scout. 2, má on-chain receipts. 3, má ERC-8004 identity. 4, má builder bond v hre."*

### Sec 80–150 — Investor purchase via Umia Tailored Auction (POST-PIVOT)

**Action:**
- Click "Float on Umia" button on agent profile
- Browser redirects to **Umia auction page** for `grantscout` venture
- Umia auction UI shows:
  - Current Tailored Auction state (Uniswap CCA mechanism)
  - Clearing price progression
  - Investor places bid (e.g., 1 USDC for tokens at clearing price)
- Confirm → MetaMask popup → sign tx
- Umia handles auction settlement
- Investor returns to Agent Float profile (via Umia → back link or independent navigation)
- Profile shows: investor now holds N tokens of GrantScout venture (resolved from Umia venture token contract)

**Voiceover:**
*"Klikám Float on Umia. Redirect na Umia Tailored Auction — ich core produkt powered by Uniswap CCA. Continuous clearing price discovery, žiadne arbitrary curve params. Bid placeujem 1 USDC. Umia settles auction, tokeny v mojom portfoliu, treasury proceedy idú do ich noncustodial treasury per legal wrapper. Agent Float profile sa updatne s mojím new holding."*

> **Fallback path (if Umia integration unavailable at demo time):** Use our internal `BondingCurveSale.sol` simulator with explicit `mock: true` label. Voiceover acknowledges: *"Umia integration finálna up to mentor sweep; tu vidíte fallback simulator s rovnakou logikou na local-state."*

### Sec 150–210 — Live agent activity (proof of work)

**Action:**
- Switch to second tab: `/api/demo/grantscout/run-paid-query` (presenter pre-prepared)
- Trigger 1 paid query (simulating end-user)
- Query executes: GrantScout returns a real Gitcoin grant summary
- New Receipt event emitted to ReceiptLog (signed by agent's ENS-registered wallet, USDC-cross-validated)
- Switch back to GrantScout profile — receipts feed updates with new event
- UI highlights: receipt counter incremented; total USDC earned bumped by 0.01 USDC
- Investor portfolio view shows "agent activity since I bought" — receipts continuing live

**Voiceover:**
*"Agent práve zarobil reálnu USDC za reálnu query. Receipt sa zapísal on-chain — podpísaný agent walletom, cross-validated proti USDC transferu. Toto je proof čo gateuje fundraising: no receipts, no float."*

> **Note on revenue distribution:** Demo intentionally does NOT show small claim amounts. Investor exposure structure is determined by Umia's venture wrapper (revenue rights, governance, secondary trading). Demo emphasizes **proof of agent productivity** (receipts feed growing live) and **investor confidence** (more receipts = stronger venture). Claims like "you earned 0.0035 USDC" with synthetic small numbers are forbidden — judges spot fake math instantly.

### Sec 210–250 — Investor confidence in real-time

**Action:**
- Split-screen view: agent profile with receipts ticking up + investor portfolio with token holdings + agent activity log
- Highlight bond status indicator: "Builder bond intact — 500 USDC locked"
- Highlight milestone progress: "Milestone 1: 50 paid reports — incremented from 8% to 10% during demo"
- Optional: show ENS resolution panel — `agent-context`, `agent-endpoint[web]`, `agentfloat:umia_venture` resolved live

**Voiceover:**
*"Po investícii cez Umia auction držím venture token. Agent zarobil — vidím to v receipts feede. Builder bond stále locked. Milestone postupuje z 8 na 10 percent počas tejto demo. Toto je signal pre ďalšie investor decisions: agent reálne pracuje, builder má skin in the game, milestones merané on-chain."*

### Sec 250–280 — Failure protection

**Action:**
- Scroll back to GrantScout profile
- Highlight milestones panel: "Milestone 1: 50 paid reports — currently 8%"
- Highlight builder bond: "500 USDC locked"
- Show small text: "If agent goes silent for 7 days OR misses milestone → bond auto-distributes to current token holders pro-rata"
- Optional: open dev panel showing BuilderBondVault contract, balance: 500 USDC

**Voiceover:**
*"Builder má skin in the game. 500 USDC personal bond. Ak agent ide silent alebo nesplní milestones, bond sa rozdelí investorom pro-rata. Žiaden builder rugpull."*

### Sec 280–300 — Tagline

**Action:**
- Full-screen tagline:
  - **"Your agent has receipts. Now give it runway."**
  - Smaller: "Capital market for working AI agents."
  - Logos: Umia, ENS, Sourcify, Vercel, Foundry
  - GitHub link, project URL

**Voiceover:**
*"Agent Float. Capital market for working AI agents. Built at ETHPrague 2026. Open source. No receipts, no float."*

---

## Fallback paths

### Fallback 1 — Live agent query fails
- Skip §150-210 live accrual
- Instead, show pre-recorded video clip (30s) of the same flow
- Voiceover unchanged

### Fallback 2 — ENS resolve fails on mainnet
- UI displays "Loading from Sepolia..."
- Pre-cached display of ENS records
- Voiceover: *"Mainnet ENS occasionally laggy — pre-cached for demo reliability."*

### Fallback 3 — Sepolia gas/RPC issues
- Switch to Anvil local fork pre-loaded with same state
- Voiceover unchanged

### Fallback 4 — Umia auction redirect / bid fails
- If "Fund via Umia" redirect breaks or bid placement on Umia auction page errors:
  - Have a second pre-warmed agent ready (DataMonitor) with verified Umia auction state
  - Switch demo to that agent
  - Voiceover adjusts: "Let me show you DataMonitor instead — agent for B2B alerts; same Umia auction flow."
- Last resort: switch to internal `BondingCurveSale.sol` simulator with `mock: true` label and acknowledge in voiceover that Umia integration is post-hack

### Fallback 5 — Demo time runs short
- Skip §250-280 (failure protection details)
- Compress §210-250 (claim) into 15s
- Land on tagline by 4:30 with 30s buffer

### Fallback 6 — Live demo completely fails
- Switch to pre-recorded full video (5-min)
- Voiceover narrates over recording

---

## Anticipated post-demo Q&A

In-person judging usually has 1-3 minutes for questions after the 5-min demo. Likely questions and prepared answers:

### Q: "How is this different from a token launchpad?"
A: *"No receipts, no float — every fundable agent must show on-chain proof of paid work before its venture goes live for fundraising. Token launchpads issue tokens against promises; we require evidence before Umia's Tailored Auction opens for that agent."*

### Q: "What stops a builder from rugpulling?"
A: *"Two layers. First, the auction proceeds route to Umia's noncustodial treasury — builder doesn't custody investor USDC. Second, our BuilderBondVault locks builder's own USDC collateral that auto-distributes to current Umia venture token holders if agent goes silent for N days or misses a milestone. So builder can't drain treasury (Umia controls it) and can't walk away clean (we hold their bond)."*

### Q: "How do you prevent fake receipts to pump token price?"
A: *"Receipts must be signed by the agent's ENS-registered wallet — distinct from builder's wallet. Each receipt's `paymentAmount` cross-checks against an actual USDC `Transfer` event from end user. To fake receipts, builder would have to send their own USDC to the agent — defeats the purpose."*

### Q: "Why Umia and not [other launchpad]?"
A: *"Umia is agentic-first. They understand AI agent revenue streams, on-chain receipts, and milestone-gated capital. General-purpose launchpads (CoinList, Binance) aren't structured for per-agent venture mechanics. Plus, Umia handles the legal wrapper — securities classification, jurisdictional compliance — at the protocol level."*

### Q: "Why ENS and not a custom registry?"
A: *"ENS is canonical Ethereum identity. Wallets, dApps, indexers all support it natively. Custom registry would mean vendor lock-in. Subnames are hierarchical and programmatic — perfect for agent passport patterns."*

### Q: "What if the agent stops earning?"
A: *"Two outcomes. If agent goes silent for the configured threshold (default 7 days), BuilderBondVault auto-slashes builder bond pro-rata to current Umia venture token holders. If revenue just declines without going to zero, token price moves on Umia secondary market based on actual buy/sell pressure — investors can exit at the prevailing price. Investor risk is real but transparent through the on-chain receipts feed."*

### Q: "Is this a security?"
A: *"That's Umia's domain — they handle legal wrapper, securities classification, and jurisdictional compliance. We rely on their compliance layer. We don't promote tokens as investments outside Umia's permitted jurisdictions."*

### Q: "What's the post-hackathon plan?"
A: *"Open-source codebase, Umia partnership, 5 working agents floated within 90 days. Revenue model: success fee on raised capital (1-3%) + premium analytics for institutional investors. We see Agent Float as the discovery funnel for Umia's venture pipeline."*

### Q: "What's the token supply?"
A: *"Per Umia venture template — Umia controls token issuance via `umia venture init`. We don't redefine that. Whatever supply Umia configures for the venture, that's what investors interact with."*

### Q: "What happens if Umia integration is delayed?"
A: *"Umia simulator with `mock: true` label visible in UI for the demo. Honest-over-slick rule. Real integration commitment post-hack."*

### Q: "How does revenue actually distribute to token holders?"
A: *"That follows Umia's venture wrapper — they handle treasury and holder economics. We surface the agent's on-chain receipts feed so investors see proof of productivity in real time, but distribution mechanics are Umia's domain. If Umia treasury doesn't natively distribute, we have a conditional helper, but we defer to Umia first."*

### Q: "Why MIT license?"
A: *"Solarpunk-aligned. Open architecture. Anyone can fork, audit, or build a competing platform. Permissionless capital market should have permissionless code."*

---

## What judges should remember after 5 minutes

1. **Hard rule:** "No receipts, no float" — the only thing that separates Agent Float from a token casino
2. **Mechanism:** ENS passport (ENSIP-26) + signed receipts gate + Umia Tailored Auction + builder bond + milestone slashing — five primitives in a clean loop
3. **Differentiation:** every claim verifiable on-chain in real time, not pitch-deck promises
4. **Sponsor depth:** Umia is the venture engine; ENS is the identity backbone; Sourcify is the open-governance proof
5. **Solarpunk:** public capital market, anti-extractive, open source

---

## Acceptance gates referenced during demo

See [06-acceptance-gates.md](./06-acceptance-gates.md). Demo passes if all 12 gates verified during walkthrough or in pre-demo verification.
