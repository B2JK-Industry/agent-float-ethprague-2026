# 12 — Sponsori vysvetlení (čo robia, prečo ich cielime)

Tento dokument je referenčný — vysvetľuje **čo jednotliví sponzori sú a čo robia**, mimo špecifickej fit-analýzy v `docs/07-sponsor-fit.md`. Účelom je aby každý člen tímu (a Codex, a budúce Claude sessiony) chápal sponzorský kontext bez google-ovania uprostred buildu.

Cielime 4 výherné kategórie:

1. **Umia** — $12K Best Agentic Venture (primary)
2. **ENS** — $2K Most Creative (secondary)
3. **Sourcify** — $4K Sourcify Bounty (bonus)
4. **ETHPrague organizer** — Network Economy track (z $9K pool)

---

## Umia — $12,000 Best Agentic Venture (PRIMARY)

### Čo Umia JE

Umia je **launch / venture infrastructure pre AI agentov**. Kombinuje fundraising mechanizmus, legal wrapper, treasury governance a sekundárny trh do jedného produktu špecificky pre agentic startupy.

> ⚠️ **Honest gap (updated 2026-05-08):** Po external review máme overené 5 core produktov (CLI, Tailored Auctions, treasury, decision markets, secondary market). Konkrétny **integration path** (CLI flags, contract addresses, event signatures, sequencing s naším AgentRegistry) lock-neme cez mentor sweep priority #1 (`docs/09-sponsor-mentor-questions.md`).

### Čo Umia robí (per public docs + reviewer research 2026-05-08)

Štandardný launch workflow pre VC-backed startupy je drahý a uzavretý: registrácia firmy v offshore jurisdikcii, právnik-y, accredited investor checks, cap table cez Carta, secondary v ďalekej budúcnosti. Pre AI agent venture je to overkill a často nesedí (agent nie je human-led startup).

Umia tento workflow **kompresuje a tokenizuje** cez 5 core produktov:

1. **`umia venture init` (CLI)** — bootstrap command pre vytvorenie agent venture: legal entity, token issuance setup, treasury config
2. **Tailored Auctions (Uniswap CCA)** — primary sale mechanism powered by Uniswap Continuous Clearing Auctions. Transparentný price discovery cez clearing-price progression namiesto fixed-price alebo arbitrary curves.
3. **Noncustodial treasury** — auction proceedy idú do treasury ktorú Umia nedrží (decentralized custody); builder + token holders majú access per Umia governance config
4. **Decision markets** — governance layer pre venture decisions; token holders vplyvajú na key decisions cez prediction-market-style mechanism
5. **Secondary market** — post-auction P2P token trading

**Sources (per reviewer):**
- Umia About page
- Umia Venture CLI docs
- Umia Tailored Auctions docs

**Implications pre Agent Float:**

Agent Float je **discovery + proof + accountability layer NAD Umia**, nie substitúcia Umia features. Náš deployment scope sa zúžil na 4 core contracts (po pivote):

**Agent Float core (čo deployujeme my):**
- `AgentRegistry.sol` — links Umia venture + ENS + bond + milestones
- `ReceiptLog.sol` — signed receipts, USDC-cross-validated (proof gate)
- `BuilderBondVault.sol` — personal collateral, slashable on default
- `MilestoneRegistry.sol` — commitments, slash trigger

**Conditional / fallback (deployujeme len ak Umia integration vyžaduje):**
- `AgentVentureToken.sol` — len ak Umia neposkytne template
- `AgentTreasury.sol` — pravdepodobne nepotrebujeme (Umia ma noncustodial treasury)
- `RevenueDistributor.sol` — len ak Umia treasury netreba external distribution helper
- `BondingCurveSale.sol` — fallback only, internal simulator pre demo continuity

**Skipped from old plan (presunuté do fallback):**
- ❌ Custom bonding curve as primary sale (was main mechanism, now fallback only)
- ❌ Custom multi-sig treasury (Umia provides)
- ❌ Custom 2M token mint with builder retention/USDC split parameters (Umia handles via venture init)

Pri pitchovaní pre Umia mentor vždy hovorme "Agent Float = layer na Umia ventures" — nikdy "Agent Float = substitut alebo competing launchpad".

### Pozícia v Web3 ekosystéme

Umia sa pozícionuje na priesečníku:
- AI agent ekonomiky (Slopstock-pattern, Tradewise-pattern)
- Tokenized RWA / equity (Securitize, Polymath)
- Crypto-native launchpadov (Binance Launchpad, CoinList)

Diferenciátor: **agentic-first**. Iné launchpady sú general purpose; Umia je špecificky pre AI agentov, čo znamená že rozumejú špecifikám: agent revenue streams, reproduktivnej proof-of-work, on-chain receipts ako evidence.

### Bounty: Best Agentic Venture ($12K)

**Stated criteria** (z Hacker manualu):
- Agentic product alebo operations
- Clear user
- Revenue path
- Venture logic
- Strong narrative
- Credible post-hackathon continuation

**Interpretácia:** Umia nehľadá technické demo — hľadá **venture-shaped projekt**. Niečo čo môže pokračovať v živote **po** hackathone ako reálny biznis, nie len GitHub repo.

### Prečo cielime Umia ako primary

| Faktor | Detail |
|---|---|
| **Najväčší single prize** | $12K = 29% z $41,150 total ETHPrague pool |
| **Sponsor-native fit pre Agent Float** | Bez Umia legal/treasury/secondary nie je fundraising layer; product fyzicky neexistuje v rovnakom tvare |
| **Open Agents 2026 lineage** | Slopstock (finalist) + Tradewise (KH 1st) hit similar primitives — pattern validovaný judges |
| **Post-hack continuation natural** | Agent Float = literálne discovery funnel pre Umia venture pipeline → partnership existing-fit |

### Známe nezodpovedané otázky pre mentor

Tieto sú v `docs/09-sponsor-mentor-questions.md` — opakujem tu pre kontext:
1. Konkrétny integration path: SDK / REST API / smart contract template?
2. Per-agent venture token templates: máme ich použiť alebo deploy our own?
3. Sepolia vs mainnet pre demo venture flow?
4. Legal wrapper — protocol-level alebo platform integrator zodpovedá?
5. Secondary market UX — redirect na Umia dashboard alebo embed?

---

## ENS — $4,000 ($2K AI Agents + $2K Most Creative) (SECONDARY)

### Čo ENS JE

**Ethereum Name Service.** Decentralizovaný naming systém pre Ethereum — `.eth` domény ako analógia DNS, ale on-chain a censorship-resistant.

Spustený 2017, governuje ENS DAO. Najznámejší Web3 protokol pre human-readable identifikátory.

### Čo ENS robí

ENS mapuje:
- **`.eth` mená → Ethereum adresy** (`vitalik.eth → 0xd8dA6BF...`)
- **Subnames** (`alice.cool.eth → 0xabc...`) — hierarchické, programmatic-issuable
- **Text records** — arbitrary key-value strings (`twitter`, `email`, `website`, `description`, `avatar`, custom keys)
- **Content hashes** — IPFS / Swarm pointers pre dApps, decentralized websites
- **Reverse records** — adresa → primary `.eth` meno (pre UX "kto si")

Ďalšie capabilities:
- **ENSIPs** — Ethereum Name Service Improvement Proposals; štandardizujú nové features
  - **ENSIP-25** — CCIP-Read pre off-chain resolvers
  - **ENSIP-26** — Agent records standardization (`agent-context`, `agent-endpoint[*]`, `agent-registration[...]`); kľúčové pre Agent Float ENS schema
- **Off-chain resolvers** — môžeš servovať ENS data zo svojho serveru s cryptographic proofs (Durin, custom resolvers)
- **L2 podpora** — recently rozšírené na Base, Optimism, atď. (no, primary still mainnet)
- **ENSv2** — vývoj novej verzie s lepším subname management, namedTransfer, atď.

### Pozícia v Web3 ekosystéme

ENS je **canonical naming infrastructure** pre Ethereum. Konkurencia existuje (Unstoppable Domains, Lens handles), ale ENS má najväčšiu adoption — väčšina wallets, dApps, explorers podporuje ENS resolution natívne.

Pre AI agent identity je ENS **silnejšia voľba** než custom registry, lebo:
- Existing infrastructure (resolvers, indexers, wallets)
- Open protocol — nikto sa nemôže "vypnúť" z ENS
- Subname pattern je idiomatic pre hierarchické identity (organization.eth → user.organization.eth → device.user.organization.eth)

### Bounty štruktúra

**$2K Best ENS Integration for AI Agents:**
- ENS musí byť centrálne v agent identity / discovery / reputation flow
- Strong appeal: programmatic subname registry pre agent fleets
- Strong appeal: text records pre capabilities, model info, endpoints
- Strong appeal: agent-to-agent discovery cez ENS lookup
- Strong appeal: delegation pattern (agent acts for human principal)

**$2K Most Creative Use of ENS:**
- Novel use case ktorý ide nad rámec text records
- Vyhrali ENSign 2026 s "ENS as wallet" konceptom (subnames sú passkey-signed smart accounts)
- Bar je vysoká pre creativity — judges vidia veľa "store metadata in text records" submissions

### ENS hard rules pre sponsorship (z manualu)

- Integration **musí byť obvious a functional**
- **Žiadne hard-coded values** — resolution musí bežať live
- **Žiadne secrets v public text records**

### Prečo cielime Most Creative ($2K) namiesto AI Agents ($2K)

Obe sú $2K. Most Creative má širší interpretation — judges hľadajú "wow" moment v ENS use, nie checklist compliance.

Náš **per-agent passport pattern** (subname per agent + ENSIP-26 standard records `agent-context`/`agent-endpoint[*]` + namespaced extensions pre Umia venture / bond vault / milestones / receipts pointer) je novel:
- Nikto nepoužíva ENS subname ako "venture passport" pre AI agent
- Štruktúrovaná set-of-records (nie len `wallet`) je richer than typical
- Subname je entry point do **8-contract ekosystému** per agent

AI Agents track má pravdepodobne 5+ submissions s ENS subnames pre agentov; náš creative angle je hierarchická passport architecture.

### Otázky pre ENS mentor

V `docs/09-sponsor-mentor-questions.md`. TL;DR:
1. Mainnet vs Sepolia parent expected pre Most Creative?
2. Custom resolver alebo PublicResolver?
3. Aké ENSIPs aplikovateľné pre náš use case?

---

## Sourcify — $4,000 Sourcify Bounty (BONUS)

### Čo Sourcify JE

**Decentralized smart contract source code verification service.** Beží pod záštitou Ethereum Foundation. Spustený 2020-ish.

Cieľ: ku každému deploynutému smart contractu ktorý poznáš adresu, **verifikovať že source code matchuje deployed bytecode** — bez nutnosti dôverovať centralizovanej službe.

### Čo Sourcify robí

Štandardný flow:
1. Developer deployne contract na mainnet/L2
2. Developer pošle source code + compiler metadata na Sourcify
3. Sourcify rebuildne bytecode zo source codu
4. Ak rebuilt bytecode = deployed bytecode → "full match" (perfect)
5. Ak iba metadata-hash matchuje → "partial match" (acceptable but weaker)

Verified contracts sú **trvalo dostupné** cez:
- **Sourcify API** — REST GET pre source/ABI/metadata
- **Parquet export** — bulk dataset stiahnuť
- **BigQuery dataset** — query against 27M+ contracts cez SQL
- **4byte Signature API** — function selector → human-readable signature lookup

### Pozícia v Web3 ekosystéme

**Alternatíva k Etherscan verification.** Etherscan je centralizovaný, paid (pre niektoré features), tied to single chain explorer. Sourcify je:
- Decentralizovaný (run by Ethereum Foundation, ale nie pod jednou firmou)
- Free (no API key)
- Multi-chain (100+ EVM chains)
- Chain-agnostic (rovnaký lookup flow pre Ethereum, Base, Polygon, Arbitrum, atď.)

Many indexers a explorers consume Sourcify dataset (Blockscout, Etherscan-alternatives).

### Bounty: Sourcify Bounty ($4K)

**Stated criteria:**
- Sourcify data **CORE component**, nie ozdoba
- Open source
- Working demo / prototype

**Project shapes ktoré sponsor naznačil:**
- AI-powered contract explainer
- Smart contract analytics platform
- Security pattern detector
- Decompiler enhancement
- Contract similarity search
- AI-assisted Solidity development

### Prečo cielime Sourcify ako bonus

Naša integrácia je **dvojvrstvová**:

**1. Source verification každého Agent Float kontraktu.**
Všetkých 8 contractov (`AgentRegistry`, `AgentVentureToken`, `BondingCurveSale`, `AgentTreasury`, `MilestoneRegistry`, `BuilderBondVault`, `RevenueDistributor`, `ReceiptLog`) je deploy-time verified na Sourcify. Investor môže prečítať source pre KAŽDÝ contract s ktorým interaguje.

**2. Sourcify lookup linky v agent profile UI.**
Každý agent profile má "Verify on Sourcify" link do Sourcify exploreru. Pridáva open-architecture proof pre Solarpunk framing.

### Sponsor-native test status

**Partial pass.** Sourcify je *substitutable* (Etherscan verification by tiež fungoval), ale my si vyberáme Sourcify lebo:
- Decentralizácia matchuje Solarpunk theme
- Multi-chain (ak rozšírime na L2 post-MVP)
- Free + reliable

Toto je dôvod prečo Sourcify ide ako **bonus track**, nie primary.

### Otázky pre Sourcify mentor

V `docs/09-sponsor-mentor-questions.md`. TL;DR:
1. Multi-contract breadth alebo single-contract depth — čo viac counts?
2. Verification + UI surfacing stačí, alebo aj dataset-side use (BigQuery, similarity search)?
3. Foundry tooling recommendations?

---

## ETHPrague Organizer — Network Economy track ($9K pool, ~$2-3K per track typical)

### Čo ETHPrague JE

**ETHPrague** je in-person Ethereum-focused hackathon v Prahe. Organizovaný Ethereum Prague community, sponzorovaný širším ekosystémom (Vitalik attended past editions, ENS, Aztec, Privacy & Scaling Explorations regular).

Theme 2026: *"Building Ethereum's Solarpunk Future"* — optimistic, regenerative, public-goods, privacy-respecting techno-aesthetic.

Format: in-person ~3-day hackathon, Devfolio submission, in-person presentations, multiple track wins allowed.

### Organizer track štruktúra ($9K total)

6 organizer tracks, každý ~$1.5K (rough estimate based on equal split):

| Track | Description | Náš fit |
|---|---|---|
| **Ethereum Core** | Foundational Ethereum infrastructure, scalability, security, usability | Slabý (nie sme infra) |
| **Network Economy** ⭐ | Privacy, identity, onchain economic coordination, user control | **Primary cieľ** |
| **Future Society** | Sustainable, ethical, inclusive social impact, transparent community resource management | Možný (transparent capital allocation framing) |
| **Best UX Flow** | Outstanding user experience that makes complex crypto interactions intuitive | Secondary cieľ ak polish |
| **Best Hardware Usage** | Meaningful use of hardware in blockchain applications | Skipped (no hardware) |
| **Best Privacy by Design** | Privacy is core, not bolted on | Skipped (financial transparency je opak privacy) |

### Network Economy fit pre Agent Float

**Network Economy** je presne pre projekty čo riešia:
- **Privacy** — agent identity je pseudonymous (ENS subname); investor identity neviazaná na real ID
- **Identity** — per-agent ENS passport je primárny identity primitív
- **Onchain economic coordination** — Umia Tailored Auctions (primary sale) + signed receipts gating fundraising + milestone slashing of builder bond + Umia noncustodial treasury — všetko on-chain ekonomika
- **User control** — investori držia tokens samostatne; builder má personal liability cez bond; nikto centrálne nedrží váhy

Zo 6 trackov je Network Economy najpresnejší match.

### Best UX Flow ako secondary cieľ

Ak demo je leštený a UX flow (browse → buy → claim) je čistý, môžeme submit aj na Best UX Flow. Riziko: UX bar je vysoká (judges porovnávajú so spotrebiteľskými apps). Iba ak polish odôvodní.

### Stated criteria (organizer-wide)

Z manualu:
- **Technicality** — implementácia, vlastný kód, sophistication
- **Originality** — novosť, neexistuje to už
- **Practicality** — reálny use case
- **Aesthetics / UI / UX** — design quality
- **Wow Factor** — moment ktorý si judges pamätajú

5-min demo, žiadne dlhé slidy, in-person Q&A.

### Multi-track win mechanism

Manual hovorí: *"Projects can win in multiple categories."* Submission na Devfolio umožňuje pickovanie viacerých trackov. To znamená:

- Agent Float môže výhrať Umia + ENS Most Creative + Sourcify + Network Economy súčasne
- Realistic estimate: $4-10K (1-2 z 4 cielených)
- Best case: $14-21K (3-4 z 4)

---

## Prehľadová tabuľka

| Sponsor | Track | Prize | Status | Sponsor-native test |
|---|---|---|---|---|
| **Umia** | Best Agentic Venture | $12K | PRIMARY | ✅ Bez Umia funding/legal/governance Agent Float fyzicky neexistuje |
| **ENS** | Most Creative | $2K | SECONDARY | ✅ ENS subnames sú agent passport backbone |
| **Sourcify** | Sourcify Bounty | $4K | BONUS | ⚠️ Substitutable (Etherscan), ale Solarpunk-aligned |
| **ETHPrague** | Network Economy | ~$1.5-3K | ORGANIZER | N/A (organizer tracks sú theme-aligned, nie sponsor-tech-tied) |
| | **Total max** | **~$21K** | | |

## Prehľad sponsorov ktorých vedome SKIPUJEME

| Sponsor | Prize | Prečo skip |
|---|---|---|
| SpaceComputer | $6K | Hardware requirement (USB Armory, Pi); Agent Float nepasuje |
| Apify | $3.7K | Používame ako infrastructure (GrantScout scraping) ale nepasuje ako track scope (TBD verify mentor) |
| Swarm | $2.45K | Bounties small ($250-500); cost/value nie optimálny pre 8-contract platform |

---

## Akcie pre tím

1. **Pred mentor sweepom:** každý člen tímu (Daniel, Claude, Codex) by mal prejsť tento doc, aby chápal kontext
2. **Mentor sweep:** používať `docs/09-sponsor-mentor-questions.md` skripty
3. **Po mentor sweepe:** updatnúť tento doc s nálezmi (najmä Umia detail)
4. **Pred submission:** verify multi-track checkboxy na Devfolio (Umia + ENS + Sourcify + Network Economy)

## Cross-references

- **Per-sponsor fit a integration plan:** `docs/07-sponsor-fit.md`
- **Mentor sweep skripty:** `docs/09-sponsor-mentor-questions.md`
- **Akceptačné gates per sponsor:** `docs/06-acceptance-gates.md`
- **Risk register vrátane sponsor-related rizík:** `docs/10-risks.md`
