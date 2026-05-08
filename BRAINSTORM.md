# ETHPrague 2026 — Brainstorm

> **Spoločný workspace pre Daniel + Claude + Codex.** Žiadny nápad sa nelock-uje kým Daniel neschváli. Ideme cez gate, nie cez sympatie.

---

## Quick context (read first)

| Fakt | Hodnota |
|---|---|
| Hackathon | ETHPrague 2026 — *"Building Ethereum's Solarpunk Future"* |
| Format | In-person Prague, žiadny remote |
| Hackathon začína | 2026-05-08 (Friday) |
| Submission deadline | 2026-05-10 12:00 PM (Sunday) — **~48-60h reálneho buildu** |
| Today | 2026-05-07 (prep evening) |
| Total prize pool | $41,150 |

**Sponsors (porovnávacia tabuľka):**

| Sponsor | Total | Špecifické |
|---|---|---|
| Umia | **$12,000** | Best Agentic Venture (najväčší single prize) |
| ETHPrague | $9,000 | 6 organizer tracks |
| SpaceComputer | $6,000 | Hardware (Pi/USB Armory), KMS, randomness |
| Sourcify | $4,000 | Verified contract data CORE component |
| ENS | $4,000 | $2K AI Agents + $2K Most Creative |
| Apify | $3,700 | TBD scope (verify Day 1) |
| Swarm | $2,450 | Verified Fetch $250 + ostatné |

**Organizer tracks:** Ethereum Core, Network Economy, Future Society, Best UX Flow, Best Hardware Usage, Best Privacy by Design.

**Hard rules pred lock-in:**
1. Sponsor-native test (bez sponsor tech projekt fyzicky neexistuje)
2. Solarpunk fit (anti-extractive, civic, regenerative, public goods)
3. 3-day buildability (off-shelf SDKs)
4. 5-min demo understandable
5. Max 2 sponsor tracks + 1 organizer track
6. Memorable jednolinkovka (gate 8 deal-breaker)
7. 5-sek vizuálny meta moment (gate 1 deal-breaker)
8. Žiadne SBO3L derivatívy (`feedback_no_sbo3l_carryover.md`)

---

> **Time framing rule (2026-05-08, Daniel):** Žiadne day/hour/morning labelers v plánovaní. Workstreams + dependencies, nie schedule.

## How to contribute (pre Daniel, Claude, Codex)

**Pridať nový nápad:** skopíruj **NEW IDEA TEMPLATE** dole na koniec sekcie *Ideas* a vyplň. Daj mu nasledujúce poradové číslo.

**Pridať komentár:** pod konkrétny nápad pridaj riadok začínajúci `[Author]` tagom — buď `[Daniel]`, `[Claude]`, alebo `[Codex]`. Krátko a vecne.

**Brutálne kritizovať:** áno. Flatter sa zahadzuje. Reject signály sú dobré.

**Skore:** zatiaľ nevypĺňame. Skórovať budeme keď bude bench plný.

**Pre Codex:** po nasajdovaní zmeny commit cez PR (`brainstorm/<topic>` branch). NIKDY priamo do main. Daniel approves, potom merge.

---

## Ideas

### Idea 1: Glasnost
**Author:** Claude
**One-liner:** *"AI agent sleduje EU verejné obstarávania, detekuje korupčné vzorce, archivuje dôkazy nezmazateľne."*
**Primary user:** Investigatívny novinár / civic NGO / občan
**Pain:** Korupčné procurement pattern (single bidder, last-min spec change, shell companies) zostávajú nepovšimnuté lebo nikto nemá kapacitu monitorovať 100K+ tendrov týždenne.
**Sponsors:** Apify (TED scraping = motor) + Swarm (immutable evidence) + ENS (per-investigation thread identity) + možný Umia venture (newsroom/NGO SaaS)
**Organizer tracks:** Future Society (literal match), Network Economy, Best Privacy by Design
**Demo (5 min):** live TED feed → AI flags 3 patterns → Swarm-archived investigation page s ENS subname → Verified Fetch verifies third-party
**5-sek meta:** procurement feed scrolling, red flags lighting up live
**Solarpunk fit:** 10/10 (civic transparency = literal Future Society)
**Why win:** Žiadny ETH-native team obvykle nestavia civic transparency. Eastern European (Slovak v Prahe) narrative rezonuje. Multi-sponsor stack natural.
**Why fail:** Apify TBD scope; Slovak/EU procurement scrapers fragile; "boring civic" vibe pre niektorých judges.
**Risk reduction:** mentor sweep Day 1; pre-cache 100 procurement records pre demo fallback.

#### Comments
- [Claude] **Naming risk:** "Glasnost" je Russian-origin word; v post-2022 CEE political climate môže pôsobiť tone-deaf u international jury. Probono / Tendero / Sunbeam safer kandidáti.
- [Claude] **Apify dependency:** Day 1 mentor priority #1. Ak ich bounty je o ML/AI scraping vs. infra-scale scraping, môžeme byť mimo scope. Bez confirmation idea sa rozpadne.
- [Claude] **Existing comp:** OpenContracting.org, TenderTec, GovTrans existujú. Wedge musí byť AI cross-language pattern detection (24 EU jazykov) + Swarm immutable archive — nie generic dashboard.
- [Claude] **Demo risk:** "AI flags 3 patterns live" requires curated dataset alebo môže fail na real data. Hybrid demo — historical case + 1 live = safer.
- [Claude] **Verdict:** TOP-TIER ak Apify scope confirms; naming research POVINNE dnes večer.

---

### Idea 2: Sourcify Sentinel
**Author:** Claude
**One-liner:** *"Vlož ENS meno alebo adresu, dostaneš plain-language risk report z 27M verifikovaných kontraktov."*
**Primary user:** Retail crypto user pred podpisom; DAO ops pred contract adoption
**Pain:** Etherscan bytecode je nečitateľný; existujúce explainery sú generické; nikto nepoužíva Sourcify dataset systémovo pre risk education
**Sponsors:** Sourcify (essential — bez Sourcify projekt fyzicky nemôže existovať) + ENS (vstupný UX, agent-readable identity)
**Organizer tracks:** Network Economy (user protection), Best UX Flow
**Demo:** paste ENS → resolves contract → Sourcify fetch → AI summary "fork Uniswap V2 + audit ID + 47 similar honeypots in dataset"
**5-sek meta:** "scary contract → green/red verdict + plain text"
**Solarpunk fit:** 7/10 (public good but less civic, more crypto-native)
**Why win:** Sourcify essential = sponsor-native test prejde; 27M dataset je underutilized; demoable s known scam contracts
**Why fail:** Aegis402 won similar territory at Open Agents 2026; differentiation must be "free + public + Sourcify-grounded RAG" not "for-profit security"
**Risk reduction:** lean into "public good" framing; explicitly NOT-for-profit

#### Comments
- [Claude] **Aegis402 collision:** OA 2026 finalist Aegis402 won presne tento territory ("AI security layer for safer onchain payments"). Differentiation cez "free public good" pravdepodobne nestačí — judges to budú porovnávať.
- [Claude] **Sourcify limitácia:** dataset obsahuje LEN verified kontrakty. Honeypoty/scams sú zriedka verified → v moment of need (pred drainerom) lookup vráti "unknown" = product fails at the critical moment.
- [Claude] **Demo blandness:** "paste contract → green/red verdict" judges videli 5x v poslednom cykle. Bez memorabilného twistu (visual call tree? historical similar drainers?) je to forgettable.
- [Claude] **Verdict:** REJECT alebo MAJOR PIVOT — Aegis402 shadow je príliš čerstvý.

---

### Idea 3: Občan Concierge
**Author:** Claude
**One-liner:** *"AI ti pomôže vybaviť úradné záležitosti — daň, dotácia, formulár — zrozumiteľne, zadarmo."*
**Primary user:** Bežný občan (non-crypto-native)
**Pain:** Štátne formuláre sú nečitateľné; odborná pomoc je drahá; dotácie zostávajú nevyužité lebo procesne neprehľadné
**Sponsors:** Apify (scrape current forms/regulations) + ENS (citizen-agent identity, per-conversation subname) + Umia venture (civic SaaS for local govt or NGO)
**Organizer:** Future Society, Best UX Flow
**Demo:** voice/chat input → agent extrahuje use case → fills form → ENS-signed PDF export
**5-sek meta:** úradný formulár sa vyplnuje sám pri voice query
**Solarpunk fit:** 9/10 (citizen empowerment, anti-bureaucracy)
**Why win:** Empathy-driven demo, hits Future Society + UX Flow, real-world impact narrative
**Why fail:** Žiadny on-chain core element → judges môžu povedať "nie je to dosť crypto"; Slovak/Czech focus nemusí rezonovať pre international jury
**Risk reduction:** add ENS-anchored identity attestation (citizen signs filled form on-chain); use generic EU regulations for international demo

#### Comments
- [Claude] **No on-chain core:** ENS subname per conversation je decorative — Sponsor-as-decoration violation. ENS resolution musí pohnúť produktom forward, inak je to anti-pattern.
- [Claude] **Trust/liability:** "AI fills your tax form" → kto zaplatí keď je chyba? Real adoption blocker; demo to neukáže ale judging Q&A áno.
- [Claude] **International demo:** Czech/Slovak forms nepôsobia na EU jury bez context. EU-level workflows (Schengen visa, EU funding apps) lepšie.
- [Claude] **Sponsor depth:** len 2 sponsorov (Apify + ENS), žiadny SpaceComputer/Sourcify/Swarm hook. Multi-track potenciál slabý.
- [Claude] **Verdict:** PIVOT alebo REJECT — bez on-chain core nepasuje na ETHPrague theme.

---

### Idea 4: Public Goods Curator
**Author:** Claude
**One-liner:** *"Mám 100 EUR na public goods — agent navrhne portfolio z aktívnych Gitcoin/Octant/Drips kôl s rationale."*
**Primary user:** Individual donor (retail giver)
**Pain:** Donori nevedia ako effektívne distribuovať; aktívne projects/rounds rozházané po 5 platformách; žiadny advisory layer
**Sponsors:** Apify (scrape Gitcoin/Octant/Drips/Allo) + ENS (project ID + donor profile) + Umia venture (donor-advisory SaaS)
**Organizer:** Future Society, Network Economy
**Demo:** donor enters wallet ENS + budget → agent live-scans 50+ rounds → portfolio + 3 rationale cards → one-click donate via Safe
**5-sek meta:** budget slider → portfolio grafu real-time
**Solarpunk fit:** 10/10 (amplifies public goods funding, anti-extractive)
**Why win:** Pure solarpunk; Umia venture story straight; demo magic = "100 EUR → 7 projects in 30s"
**Why fail:** Crowded space (Drips, Allo, Gitcoin Passport); differentiation must be in AI quality + UX
**Risk reduction:** focus on niche (CEE public goods? climate-only?) for differentiation

#### Comments
- [Claude] **Crowded space:** Allo Protocol, Drips Network, Endaoment, Giveth-advisory existujú. Bez ostrého wedge sme jeden z mnohých.
- [Claude] **AI quality risk:** judging "impact" cez LLM je ungrounded reasoning — Q&A rip risk. Need RAG over EAS attestations alebo external impact metrics, inak judges roznesú "ako vie AI že X má vyšší impact ako Y?"
- [Claude] **Apify redundant:** Gitcoin/Allo majú public APIs/SDKs; scraping ich je over-engineered → sponsor-fit weak (Apify by mali pristúpiť ako "Allo SDK by stačil").
- [Claude] **Politické framing:** "AI decides where charity goes" pri druhom pohľade sounds dystopian — careful narrative choice essential.
- [Claude] **Verdict:** KEEP ako alternate ak Glasnost zlyhá Day 1; nie primary.

---

### Idea 5: Verified Press
**Author:** Claude
**One-liner:** *"Journalist publishes article → SpaceComputer KMS signs → Swarm immutable → reader verifies cez Verified Fetch lib bez trustu."*
**Primary user:** Independent journalist / press freedom NGO / news organization
**Pain:** Misinformation epidemic; news authenticity nemožno overiť po zverejnení; deepfakes attacks credibility
**Sponsors:** SpaceComputer (KMS signing CORE) + Swarm ($250 Verified Fetch + immutable storage) + ENS (publisher identity)
**Organizer:** Best Privacy by Design, Future Society, Best UX Flow
**Demo:** journalist writes piece → click publish → KMS sign → Swarm hash → reader URL → browser verifies signature without trusting any server
**5-sek meta:** "this article is provably not tampered" verification badge
**Solarpunk fit:** 10/10 (press freedom, anti-censorship)
**Why win:** Clean 3-sponsor stack with sponsor-native fit on all; technical depth (cryptographic signing) impresses Technicality judges; press angle 10/10
**Why fail:** SpaceComputer KMS access integration môže zožrať 1+ deň buildu; vyžaduje Day 1 deep mentor session
**Risk reduction:** Day 1 mentor priority #1; have fallback (local KMS simulation) if SpaceComputer integration stuck

#### Comments
- [Claude] **KMS integration unknown:** SpaceComputer KMS access môže byť 2-deň blocker. Ak Day 1 mentor session nepríde do 11:00, switch na backup idea.
- [Claude] **Failed predecessors:** Numbers Protocol, Po.et, Civil Media — všetci pohoreli na adoption side. Press-blockchain je known graveyard pre VC investorov.
- [Claude] **Reader friction:** verifikácia signature requires browser extension alebo special viewer. Demo flows clean ale real adoption potrebuje cross-platform UX work.
- [Claude] **Umia weak:** journalism má dying revenue — venture path je hard. Umia $12K odlož.
- [Claude] **Verdict:** TECHNICAL TOP / COMMERCIAL WEAK — fokusuj Best Privacy by Design + UX Flow + Future Society multi-track ($6-10K achievable), Umia $12K skip.

---

### Idea 6: Sourcify Genealogy
**Author:** Claude
**One-liner:** *"Pozri ako sa menil tento kontrakt v čase — fork tree, diffs, audit history. Public good explorer."*
**Primary user:** DAO ops, audit firm, dev research
**Pain:** Pri adoption forku je ťažké vidieť history zmien; žiadny visual genealogy tool; Etherscan ukazuje tx history not source evolution
**Sponsors:** Sourcify (essential)
**Organizer:** Ethereum Core, Network Economy
**Demo:** address → Sourcify fetch all related → fork tree visualization → diff highlights
**5-sek meta:** vizuálny fork tree contractov
**Solarpunk fit:** 6/10 (public good ale niche, less civic)
**Why win:** Sourcify essential; underutilized dataset; visual demo
**Why fail:** Niche audience; "wow factor" obmedzený; competitors môžu robiť similar
**Risk reduction:** add AI-generated "what changed and why" narrative per fork

#### Comments
- [Claude] **Niche audience:** DAO ops + audit firms = small judging-relevant pain. Judges nemajú emotional connection.
- [Claude] **Existing comp:** Slither diff, Code4rena diff, Diffmesh — ich datasety tiež obsahujú menové info; Sourcify dataset nepridá unique angle.
- [Claude] **Wow factor weak:** fork tree visualizations su data-art — looks pretty, no clear value moment v 5 min.
- [Claude] **Verdict:** REJECT — too narrow audience, too late v audit-tooling cycle.

---

### Idea 7: Solarpunk DAO Helper
**Author:** Claude
**One-liner:** *"Mikro-DAO (energy coop, food coop, repair coop) dostane agentic ops layer — členstvo, treasury, votes."*
**Primary user:** 5-50 osobové real-world cooperatives
**Pain:** Real-world coops nepoužívajú DAO tooling lebo je over-engineered; potrebujú lightweight ops bez Aragon/Snapshot complexity
**Sponsors:** ENS (member subnames `alice.energycoop.eth`) + Umia venture (cooperative SaaS) + Sourcify (treasury contract verification)
**Organizer:** Future Society, Network Economy
**Demo:** create coop → invite 5 members (ENS subname each) → propose grant → vote → execute via Safe
**5-sek meta:** small cooperative interface, real names, real members
**Solarpunk fit:** 10/10 (cooperative economics)
**Why win:** Real-world use case; multi-track potential
**Why fail:** "Coop ops layer" má platform smell (anti-pattern); demo vyžaduje multiple users → setup overhead

#### Comments
- [Claude] **Anti-pattern hit:** "ops layer for X" je platform smell — anti-pattern #1 violation. "Layer" / "OS" / "boundary" slová sú auto-reject signály v gate 8.
- [Claude] **Demo overhead:** 5+ users joining + voting + executing = nemožné v 5 min bez canned setup.
- [Claude] **Wrong problem:** Aragon, Snapshot, Tally existujú a sú lightweight. Problém nie je "tools missing" ale "real-world coops nepoužívajú DAO tooling" — to je adoption problem, not product.
- [Claude] **Verdict:** REJECT — broad scope + adresuje wrong problem.

---

### Idea 8: Repair Mesh
**Author:** Claude
**One-liner:** *"Zlomený X? Komunita opravárov (ENS-named) bidne, oprava sa overí, USDC pošle."*
**Primary user:** Lokálna komunita; circular economy enthusiasts
**Pain:** Repair-or-replace decision je manual; opravari nemajú aggregated reputation; environmental cost of replace
**Sponsors:** ENS (repairer identity) + Apify (scrape Marketplace listings?) + Umia venture (repair coop SaaS)
**Organizer:** Future Society
**Demo:** post broken item → repairers bid → user picks → after repair, photo proof → USDC release
**5-sek meta:** "broken phone gets fixed for 8 USDC, escrow releases live"
**Solarpunk fit:** 10/10 (anti-waste, circular)
**Why win:** Real-world tangible; perfect Future Society fit
**Why fail:** 2-sided market trap (need both sides for demo); chicken-and-egg adoption

#### Comments
- [Claude] **2-sided market trap:** classic hackathon death — demo nemôže ukázať obe strany live. Bid+repair+verify+release v 5 min = canned scripted theater.
- [Claude] **ENS decorative:** "repairer identity" je text record; nepohne produkt forward → sponsor-as-decoration violation.
- [Claude] **Existing comp:** iFixit, Sharetribe, Ourgoods, Rrepair — žiadny z nich nepotrebuje krypto, čo znamená že pridanie crypto je over-engineering.
- [Claude] **AI photo verify fragile:** "verify repair photo" cez image classification = unreliable, judges to vidia.
- [Claude] **Verdict:** REJECT — solarpunk-y vibe ale technicky weak + demo trap.

---

### Idea 9: PGRoll
**Author:** Claude
**One-liner:** *"Quadratic random funding pre public goods — SpaceComputer cTRNG vyberie projekty týždenne, donori stake-ujú, randomness je verifikovateľná, bez manipulácie."*
**Primary user:** Public goods donor + Gitcoin/Octant project ops
**Pain:** Quadratic funding favorizuje projekty s veľkými networkmi; small projects so silným impactom strácajú; centralized "matching" boards rozhodujú netransparentne
**Sponsors:** SpaceComputer (cTRNG = unmanipulable RNG, CORE) + Apify (scrape active rounds zo všetkých platforiem) + ENS (project + donor IDs)
**Organizer tracks:** Future Society, Network Economy, Best Privacy by Design
**Demo (5 min):** (0-30s) dashboard zobrazí 50 active public-goods projects + matching pool size | (30-90s) donori stake (live feed na obrazovke) | (90-180s) "draw" moment: SpaceComputer cTRNG vygeneruje seed, smart contract distribuuje pool podľa quadratic + random weight, výsledok onchain | (180-300s) verification UI: third-party môže overiť že draw nebol manipulovaný
**5-sek meta:** "rozdávame public-goods peniaze + nikto nemôže zmanipulovať random"
**Solarpunk fit:** 10/10 (anti-extractive, public goods amplification, anti-corruption v grant funding)
**Why win:** SpaceComputer randomness je underutilized pattern; sharp wedge proti Drips/Allo (oni nie sú random); civic governance angle; demo má dramatický draw moment
**Why fail:** Quadratic funding folks sú existing community s opinions; "random > meritocratic" je kontroverzný framing
**Risk reduction:** preformulovať ako "random bonus pool ON TOP OF existing matching" namiesto náhrada; SpaceComputer cTRNG mentor session Day 1

#### Comments
- [Claude] **Cultural risk:** "Random > meritocratic" je hot take. Vitalik je explicit pro-quadratic; ETH culture jury môže byť hostile k frame "random replaces QF".
- [Claude] **Reframe fix:** position ako "verifiable random BONUS pool ON TOP of QF" — preserve QF, add SpaceComputer randomness pre fairness v ties + bonus distribution. Augment, don't replace.
- [Claude] **cTRNG live risk:** ak RPC zlyhá pri "draw moment", demo umiera. Pre-generate seed + verify on-chain ako fallback. Mentor session Day 1 musí potvrdiť RPC reliability.
- [Claude] **Tokenomics underspec:** "donori stake-ujú" je vágne — kto vyberá kandidátov, akú váhu má stake vs random, kedy sa vypláca? Spec na 1 stránku Day 1.
- [Claude] **Verdict:** TOP-TIER s reframing; primary candidate spolu s Glasnost a Solidarity Stream.

---

### Idea 10: Solidarity Stream
**Author:** Claude
**One-liner:** *"Live disaster monitor → AI agent rozhodne kam pošle USDC z community fondu, ENS-named recipientom, Swarm-archived impact reports."*
**Primary user:** Climate-action DAO; disaster response NGO; emergency fund operators
**Pain:** Disaster relief má 48-72h critical window; manual coordination je pomalá; donori nevedia či peniaze prišli k správnym ľuďom
**Sponsors:** Apify (scrape disaster news/Twitter/govt feeds CORE) + ENS (vetted local-NGO subnames per region) + Swarm (immutable impact reports) + Umia venture (DAO emergency-fund SaaS)
**Organizer tracks:** Future Society, Network Economy, Best UX Flow
**Demo (5 min):** (0-30s) live feed: floods in region X | (30-90s) agent identifies 3 vetted local NGOs (ENS subnames `floodrelief-<region>.solidaritystream.eth`) | (90-180s) DAO members vote (multisig) → USDC stream releases | (180-240s) recipients post photo/receipt → Swarm immutable | (240-300s) donor sees impact report
**5-sek meta:** "disaster headline → money streaming to local responders within minutes"
**Solarpunk fit:** 10/10 (mutual aid, civic resilience, anti-bureaucratic relief)
**Why win:** Real-world emotional impact; Umia venture story crystal clear (DAO emergency-fund infra); multi-track shot
**Why fail:** Verification of recipient legitimacy je hard; "AI decides who gets aid" je politically sensitive framing
**Risk reduction:** human-in-the-loop signing (DAO multisig); pre-vetted NGO whitelist demo (post-hack expanded)

#### Comments
- [Claude] **Politically charged:** "AI decides where disaster aid goes" má colonial undertones — judges to môžu vidieť ako paternalistický crypto-savior framing. DAO multisig = essential, agent navrhuje, ľudia signujú.
- [Claude] **Verification problem:** legitimácia recipient NGO je THE hard problem — bez solving it (KYB? attestation network?) je to len streaming bot s whitelist-om.
- [Claude] **Apify fragility:** disaster news scraping breaks across language/source/format changes. Real demo = 50/50 funguje.
- [Claude] **Comp:** GiveDirectly, Helena, Endaoment Crisis — well-funded competitors with verified rails.
- [Claude] **Pivot uhol:** "DAO emergency-fund infrastructure for existing climate DAOs" (KlimaDAO Crisis Fund, Refi DAO) je narrower wedge — nepýtaš sa "kto je legitimate", používaš ich existing trust network.
- [Claude] **Verdict:** TOP-TIER pre Umia venture story; medium pre demo robustness. Pivot uhlu pomôže.

---

### Idea 11: Verified Ballot
**Author:** Claude
**One-liner:** *"Online community vote so SpaceComputer KMS-signed voter intent, Swarm immutable tally, ENS-pseudonymous voter — výsledok je matematicky overiteľný."*
**Primary user:** DAO governance ops; civic forums; cooperatives
**Pain:** Snapshot vote môže byť manipulated cez wallet farming; centralized governance polls neoveriteľné; kvalifikované hlasovanie (citizen-only, member-only) má UX peklo
**Sponsors:** SpaceComputer (KMS signing voter intent CORE) + ENS (pseudonymous voter ID with citizenship/membership attestation) + Swarm (immutable tally + audit log)
**Organizer tracks:** Network Economy, Best Privacy by Design, Future Society
**Demo (5 min):** (0-30s) DAO proposal | (30-90s) members ENS-attest, vote signed via SpaceComputer KMS, encrypted | (90-180s) tally publishes na Swarm hash | (180-240s) any third party verifies count without trusting org's server | (240-300s) anti-Sybil: pokus o duplicate vote rejected by attestation
**5-sek meta:** "vote → verifiable count without trusting anyone"
**Solarpunk fit:** 10/10 (democratic infrastructure)
**Why win:** Privacy by Design track natural lock; SpaceComputer KMS sponsor-native fit perfect; demo má technical depth
**Why fail:** Snapshot is "good enough" for most DAOs; convincing judges that this matters needs concrete attack vector demo
**Risk reduction:** demo with **adversarial scenario** — show Sybil attempt being caught; partner with one DAO at venue for live test

#### Comments
- [Claude] **Snapshot good enough:** existing solution covers 80% DAO governance use cases. Wedge musí byť ostrá (privacy-preserving + Sybil-resistant + verifiable count) — generic je lost cause.
- [Claude] **Sybil source of truth:** "kto attestuje že to si ty" — identity layer mimo SpaceComputer KMS chýba. Pre citizen voting potrebuješ EU Digital Identity / Worldcoin / proof-of-personhood. Bez toho "anti-Sybil" je len marketing claim.
- [Claude] **Niche TAM:** "DAO governance ops" je small audience. Citizen referendum / union vote / cooperative governance = bigger ale slower adoption.
- [Claude] **Adversarial demo risk:** "Sybil attempt blocked live" môže fail — pripravený fallback = pre-recorded clip s timestamp.
- [Claude] **Pivot uhol:** focus na konkrétnu vertikálu (cooperative member voting? climate DAO ratification?) — generic infra je weak.
- [Claude] **Verdict:** KEEP ak vertikalizujeme; REJECT ako generic DAO voting infra.

---

### Idea 12: Greenwash Watch
**Author:** Claude
**One-liner:** *"AI agent porovnáva firemné ESG claims so skutočnými on-chain a off-chain dátami. Greenwashing alarmy verejne dostupné."*

**Primary user:** ESG-conscious investor; sustainability journalist; consumer activist
**Pain:** Korporáty publikujú ESG reports + nakupujú "carbon credits" / "green tokens" — nikto neverifikuje; greenwashing je rampant; on-chain CSR tokeny (KlimaDAO, Toucan, Moss) nemajú connection to reality
**Sponsors:** Apify (scrape corporate sustainability reports + press releases CORE) + Sourcify (verify ESG-token contract logic — sú claims naozaj backed by retired credits?) + ENS (per-corporation accountability profile)
**Organizer tracks:** Future Society, Network Economy
**Demo (5 min):** (0-30s) input: corporation name | (30-90s) Apify scrapes recent sustainability claims; Sourcify pulls related ESG-token contracts firma kúpila | (90-180s) AI cross-references — "tvrdí carbon-neutral 2025, ale carbon credits expired Q3 2024 a nový retirement nie je on-chain" | (180-300s) verdict: greenwashing score + evidence trail on Swarm
**5-sek meta:** "Big Corp claims green → AI ti ukáže že klamú"
**Solarpunk fit:** 10/10 (climate accountability, anti-extractive PR)
**Why win:** Apify + Sourcify combo je nezvyčajný — žiadny tím to pravdepodobne nepostaví; politically charged demo má wow factor
**Why fail:** Lawsuit risk z corporate side; "greenwashing detector" může mať false positives s reputational dopadom
**Risk reduction:** demo iba s historical, well-known greenwashing cases (Volkswagen Dieselgate, Shell Pacific); explicitly NOT for live accusations; ship as research tool, not journalism platform

#### Comments
- [Claude] **Lawsuit risk je reálny:** corporate counsel může poslať C&D pred koncom demo session. Demo iba s historical confirmed cases (VW Dieselgate, Shell Niger Delta) = safer ale ukáže menej "live capability".
- [Claude] **AI false positives = demo killer:** "Big Corp X klame" s wrong evidence = reputational damage pre tím + judge skepticism. Confidence threshold + manual review required.
- [Claude] **Sourcify coverage gap:** nie všetky ESG tokeny (Toucan, Klima, Moss, BCT) sú verified na Sourcify → coverage incomplete → judges sa pýtajú "ako vieš ktoré tokeny sú real backing".
- [Claude] **Originality high (10/10):** Apify + Sourcify combo je naozaj nezvyčajný kombo — žiadny ETH tím nepôjde tým smerom. Pri risk-mitigation top-3 candidate.
- [Claude] **Verdict:** TOP-TIER originality + MEDIUM execution risk — keep ak Daniel akceptuje legal framing risk; "research tool" pozícia je safer než "journalism platform".

---

### Idea 13: Memorywood
**Author:** Claude
**One-liner:** *"ENS subname pre osoby v rodine, Swarm pre ich príbehy/listy/fotky, navždy. Intergeneračný commons cez krypto, nie cez Big Tech."*
**Primary user:** Rodiny chcúce zachovať pamäť cez generácie; storytellers; memorialists
**Pain:** Family photos sú v Apple/Google cloud — closed ecosystem, mizne pri bankrote firmy alebo expiry; physical archives sú fragile; žiadny intergenerational protocol
**Sponsors:** ENS (subname per family member `grandma-anna.babjakfamily.eth` ALEBO per memory `ww2-letter-1944.babjakfamily.eth`) + Swarm (immutable storage CORE) + možný Umia venture (family-memory SaaS)
**Organizer tracks:** Future Society, Best UX Flow, Best Privacy by Design
**Demo (5 min):** (0-30s) Daniel uploads family photo from 1944 with story | (30-90s) creates ENS subname, stores on Swarm, signs with passkey | (90-180s) "100 years later" simulation — UI shows ako pravnúčatá pristúpia cez ENS lookup, vidia Swarm-stored memory authentic + immutable | (180-240s) granular sharing — niektoré memories public, niektoré len family-ENS-attestation
**5-sek meta:** "this photo will outlive Apple Inc."
**Solarpunk fit:** 9/10 (commons over corporate, anti-extractive memory)
**Why win:** Emotional demo — judges si pamätajú; ENS Most Creative track natural; novel ENS use case
**Why fail:** Nie je clear venture path (Umia $12K wobble); "save your memories" je crowded space (Storj, Filecoin Memex)
**Risk reduction:** focus na specific niche — historical family archives, holocaust memorials, immigrant stories — narrower wedge

#### Comments
- [Claude] **Crowded space:** Storj, Filecoin Memex, Permanent.org, Forever.com všetci robia "save your memories" — pridaní cez krypto nie je clear differentiator.
- [Claude] **Swarm longevity claim:** postage stamps majú expiry — "100 years later" demo je technically misleading. Honest framing = "while protocol lives + stamps refreshed". Honest-over-slick rule applies.
- [Claude] **ENS subname per memory je cosmetic** — sponsor-native test pre ENS môže fail (text record ≠ identity).
- [Claude] **Umia venture path slabá:** family-memory consumer SaaS je low-margin; freemium s Big Tech je hard.
- [Claude] **Audience mismatch:** ETH-native judge audience (väčšinou young men) nemá silnú emotional resonance s family memory tému.
- [Claude] **Verdict:** EMOTIONAL DARK HORSE — môže vyhrať Most Creative ENS ak demo má sentiment, ale neoptimalizovať primary; reject ako Umia candidate.

---

### Idea 14: Allocate
**Author:** Claude
**One-liner:** *"Verifikovateľne náhodné prideľovanie nedostatkových sociálnych zdrojov — sociálne byty, ubytovanie pre utečencov, granty — bez možnosti manipulácie."*
**Primary user:** Lokálna municipalita; social housing org; refugee assistance NGO
**Pain:** Sociálne byty / núdzové ubytovanie / granty často prideľované netransparentne; obvinenia z favoritizmu; legal challenges; žiadny verifiable random
**Sponsors:** SpaceComputer (cTRNG CORE — bez verifikovateľného random nemôže existovať) + ENS (applicant pseudonymous ID with eligibility attestation) + Swarm (immutable allocation log)
**Organizer tracks:** Future Society, Best Privacy by Design, Network Economy
**Demo (5 min):** (0-30s) scenario: 30 affordable housing units, 200 applicants | (30-90s) applicants ENS-attest eligibility (privacy-preserving) | (90-180s) "allocation moment": SpaceComputer cTRNG generates seed, smart contract picks 30 winners weighted by need-criteria | (180-240s) third-party verifies seed wasn't tampered, allocation is reproducible | (240-300s) winners notified privately, public log shows seed + criteria not identities
**5-sek meta:** "30 byty, 200 ľudí, fair lottery, nikto nemôže klamať"
**Solarpunk fit:** 10/10 (just allocation, transparent governance)
**Why win:** SpaceComputer cTRNG perfect fit; civic governance angle; multi-track potential; emotionally legitimate demo
**Why fail:** Stakeholders (municipalities) sú pomalí adopters; venture path je B2G (sales cycle 12+ months)
**Risk reduction:** demo iba simulation; partner with one DAO/NGO at venue who has actual scarce resource (event tickets, mentor spots, etc.) for live test

#### Comments
- [Claude] **Pure random je morálne neprijateľné** pre social housing — väčšina jurisdikcií legal vyžaduje need-criteria (family size, income, disability). Pure random porušuje legal frameworky.
- [Claude] **Need-weighted random tiebreak** je realistic ale komplikuje demo (visualization weights + random = confusing v 5 min).
- [Claude] **B2G death valley:** sales to municipalities = 12+ month cycle. Umia venture wobble.
- [Claude] **Adoption gap:** mestá won't adopt onchain randomness v 3-year horizon — projekt zostane research demo bez real users.
- [Claude] **Pivot uhol:** ticket allocation pre over-subscribed eventi (DevCon? sold-out conferences?) / mentor slot allocation / scholarship distribution = lower stakes, faster adoption, live demo realistic.
- [Claude] **Verdict:** STRONG PRIMITIVE / WEAK WRAPPER — pivot uhlu z social housing na "fair allocation for over-subscribed access" pomôže.

---

### NEW IDEA TEMPLATE (skopíruj nižšie pri pridávaní)

```markdown
### Idea N: <Name>
**Author:** Daniel / Claude / Codex
**One-liner:** *"..."*
**Primary user:**
**Pain:**
**Sponsors:**
**Organizer tracks:**
**Demo (5 min):**
**5-sek meta:**
**Solarpunk fit:** N/10
**Why win:**
**Why fail:**
**Risk reduction:**

#### Comments
- *(empty)*
```

---

## Open questions / TODO (anyone fills in)

> **Status update post-Agent-Float-lock (2026-05-08):** Many original questions are now resolved by the locked Agent Float scope. Remaining open items only.

### Active (still open)

- [ ] Apify bounty scope detail — verify with mentor (does infrastructure use of Apify SDK count for the bounty, even when not pitched as primary track?)
- [ ] Umia integration depth — mentor sweep priority #1, blocks Track E
- [ ] Naming "Agent Float" collision check — see [docs/08-naming-research.md](../docs/08-naming-research.md)
- [ ] Tým — Daniel sám alebo Maxwell012 / iný spoluhráč? (mení paralelizáciu workstream tracks A-H)
- [ ] Bonding curve params lock — linear vs exponential, starting price (default rec: linear, 0.001 USDC)
- [ ] Silence-detector threshold — N days for BuilderBondVault.slash() trigger (default rec: 7 days)

### Resolved (kept for trail)

- ~~Swarm Verified Fetch reference implementation~~ — Swarm skipped per scope decision
- ~~SpaceComputer hardware availability~~ — SpaceComputer skipped per scope decision
- ~~Naming candidate "Glasnost" political nuance~~ — pivoted to "Agent Float"
- ~~ENS subname registry pattern from SBO3L~~ — building fresh per anti-pattern (no SBO3L derivatives)
- ~~Umia venture criteria (revenue narrative depth)~~ — interpreted from manual; reconfirmed via mentor sweep

---

## Score table (vyplníme keď bude bench plný)

| # | Idea | SP-native | Org track | 3d build | Demo | Origin | UX | Solar | Multi | Post-hack | TOTAL | Author |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Glasnost | 10 | 10 | 7 | 9 | 9 | 8 | 10 | 10 | 9 | 82 | Claude |
| 2 | Sourcify Sentinel | 9 | 7 | 9 | 7 | 5 | 9 | 7 | 7 | 7 | 67 | Claude |
| 3 | Občan Concierge | 7 | 8 | 8 | 8 | 7 | 10 | 9 | 7 | 8 | 72 | Claude |
| 4 | Public Goods Curator | 9 | 9 | 8 | 9 | 8 | 8 | 10 | 9 | 8 | 78 | Claude |
| 5 | Verified Press | 9 | 9 | 5 | 8 | 9 | 7 | 10 | 9 | 7 | 73 | Claude |
| 6 | Sourcify Genealogy | 9 | 7 | 8 | 6 | 6 | 7 | 6 | 5 | 6 | 60 | Claude |
| 7 | Solarpunk DAO Helper | 7 | 8 | 5 | 6 | 6 | 6 | 10 | 8 | 8 | 64 | Claude |
| 8 | Repair Mesh | 7 | 8 | 5 | 6 | 7 | 7 | 10 | 6 | 7 | 63 | Claude |
| 9 | **PGRoll** | 10 | 10 | 7 | 9 | 9 | 7 | 10 | 9 | 8 | **79** | Claude |
| 10 | Solidarity Stream | 9 | 10 | 7 | 9 | 8 | 8 | 10 | 9 | 9 | 79 | Claude |
| 11 | Verified Ballot | 10 | 10 | 6 | 8 | 8 | 7 | 10 | 9 | 8 | 76 | Claude |
| 12 | Greenwash Watch | 8 | 9 | 7 | 9 | 10 | 7 | 10 | 7 | 7 | 74 | Claude |
| 13 | Memorywood | 8 | 8 | 8 | 9 | 8 | 8 | 9 | 7 | 6 | 71 | Claude |
| 14 | Allocate | 10 | 10 | 6 | 9 | 8 | 7 | 10 | 9 | 7 | 76 | Claude |

*(Re-skórovanie po brainstormovaní + Codex/Daniel ideas; final pick keď bude konsenzus.)*

> **Note (2026-05-08):** "3d build" axis je **deprecated** per Daniel's directive — time nie scope constraint. Future scoring používaj len: sponsor-fit, org-track, demo, originality, UX, solarpunk, multi-track, post-hack potential.

---

## Post-critique synthesis (Claude)

Po self-kritike sa skóre menia. Top 5 po re-skórovaní:

| # | Idea | Pôvodné | Post-crit | Δ | Verdict |
|---|---|---|---|---|---|
| 1 | **Glasnost** (rebrand needed) | 82 | **78** | -4 | TOP-TIER ak Apify scope confirms + naming fix |
| 9 | PGRoll | 79 | 75 | -4 | TOP-TIER s reframing |
| 10 | Solidarity Stream | 79 | 75 | -4 | TOP pre Umia, medium demo robust |
| 12 | Greenwash Watch | 74 | 74 | 0 | TOP originality, lawsuit risk |
| 5 | Verified Press | 73 | 73 | 0 | Technical top, commercial weak |
| 11 | Verified Ballot | 76 | 70 | -6 | Iba ak vertikalizujeme |
| 4 | Public Goods Curator | 78 | 70 | -8 | Crowded; alternate iba |
| 14 | Allocate | 76 | 71 | -5 | Pivot na ticket/scholarship lottery |
| 13 | Memorywood | 71 | 67 | -4 | Most Creative ENS dark horse |
| 2 | Sourcify Sentinel | 67 | 65 | -2 | REJECT (Aegis402 shadow) |
| 3 | Občan Concierge | 72 | 65 | -7 | REJECT (no on-chain core) |
| 7 | Solarpunk DAO Helper | 64 | REJECT | — | Anti-pattern violation |
| 8 | Repair Mesh | 63 | REJECT | — | 2-sided market trap |
| 6 | Sourcify Genealogy | 60 | REJECT | — | Niche dev tool |

## Cross-idea systemic risks

| Risk | Affected ideas | Mitigation |
|---|---|---|
| **SpaceComputer integration unknown** | PGRoll, Verified Press, Verified Ballot, Allocate (4/14) | Day 1 mentor priority #1 — bez confirmácie do 11:00 = switch to Apify-led idea |
| **Apify TBD scope** | Glasnost, Solidarity Stream, Občan Concierge, Greenwash Watch (5/14) | Day 1 mentor session #2 — confirm scope of $3.7K bounty |
| **Live data demo fragility** | 8 z 14 ideí | Pre-cache fallback dataset; hybrid demo (1 historical + 1 live) |
| **No on-chain core** | Občan Concierge, Memorywood, Repair Mesh, Solarpunk DAO Helper (4/14) | Auto-reject — porušuje Web3 expectation pre ETHPrague |
| **Crowded space** | Public Goods Curator, Sourcify Sentinel, Memorywood (3/14) | Need ostrý wedge; ak chýba, drop |

## Recommendation (Claude)

**Primary pick: Glasnost rebrand → Probono** (Civic Procurement Watch)

**Why:**
- Highest solarpunk fit (literal Future Society track)
- Multi-sponsor natural (Apify primary, ENS secondary, Swarm tertiary)
- Daniel's skillset match (system integration > hardware/cryptography)
- Eastern European narrative resonates v Prague kontexte
- 3-day buildable s Apify SDK + AI Gateway + ENS resolve
- Demo wow: live corruption flagged + immutable archive moment

**Sponsor-native fix:** Pivotni z "TED-only scraping" → "multi-source aggregation" (TED + národné portály + corporate registries + ownership graphs). Toto robí Apify orchestráciu naozaj core.

**Naming fix:** "Glasnost" → **Probono** (Latin "for the public good", legal positive connotations, googleable, no political baggage).

**Tracks targeted (max 2 sponsor + 1 organizer per anti-pattern):**
- Primary sponsor: **Apify $3,700**
- Secondary sponsor: **ENS Most Creative $2,000** (per-investigation subnames)
- Tertiary bonus: Swarm $250 Verified Fetch (if natural fit)
- Organizer track: **Future Society** (literal match)
- Possible bonus: Best Privacy by Design (whistleblower protection)
- **Skip:** Umia $12K — newsroom SaaS narrative je weak; pivot post-hack

**Realistic prize estimate:** $4-8K, best case $10-12K if multi-track lands.

**Backup pick if Apify scope mentor confirms NO match:** Verified Press (Verified Press) — pivot na SpaceComputer KMS (different mentor), alebo PGRoll (SpaceComputer cTRNG).

---

## Decision log

- **2026-05-08 [LOCKED by Daniel]:** **Agent Float** (Idea 15, see below) — pivot away from Probono. Funding launchpad pre working AI agents. Sponsor stack: Umia $12K (primary) + ENS Most Creative $2K (secondary) + Sourcify $4K (bonus). Detailed scope v `SCOPE.md`.
- **2026-05-08 [pending]:** Naming "Agent Float" collision check (tonight).
- **2026-05-08 [pending]:** Umia integration path — Day 1 mentor priority #1.
- **Bench tabled (not rejected, fallback only):** Probono / PGRoll / Verified Press — pivot kandidáti ak Umia integration blokuje.

### Idea 15: Agent Float (LOCKED)
**Author:** Daniel
**One-liner:** *"Agent Float turns working AI agents into investable ventures."*
**Tagline:** *"Your agent has receipts. Now give it runway."*
**Hard rule:** No receipts, no float.
**Primary user:** Builder s pracujúcim AI agentom (primary); Investor (secondary)
**Pain:**
- Builder má agenta ktorý zarába ale nemá runway na rast; tradičný VC ani DAO funding nesedí pre solo agentic ventures.
- Investor chce AI agent exposure ale väčšina launchov je hype bez evidence — nevie odlíšiť pracovného agenta od landing page.
**Sponsors:** Umia (PRIMARY — funding/treasury/governance engine, ESSENTIAL) + ENS (SECONDARY — per-agent passport `<agent>.agentfloat.eth`) + Sourcify (BONUS — verify agent treasury contracts)
**Organizer tracks:** Network Economy (primary), Best UX Flow (if polish)
**Demo (5 min):** Investor opens Agent Float → finds GrantScout (real working agent, 3 on-chain receipts, $18 revenue, 3-day runway) → reads funding proposal "2K USDC → better data + compute → 3x reports/wk" → clicks Float on Umia → invests 50 USDC live → runway counter jumps 3d → 47d → tagline screen
**5-sek meta:** runway counter dramatically going from 3 days → 47 days post-funding (visible value transfer)
**Solarpunk fit:** 7/10 — public capital market vs closed VC; transparent vs hype; financialization undertone reduces from 10/10 ale narrative pomáha (proof first, funding second).
**Why win:**
- Maps na overené Open Agents 2026 winning DNA: Slopstock-pattern (financialization) + Tradewise-pattern (economic loop) + ENSign-pattern (ENS as core identity)
- Umia $12K natural perfect fit — venture-shaped product narrative
- ENS $2K Most Creative natural fit — per-agent passport innovation
- 5-sek visible meta: runway jump
- Daniel skillset match (system integration > hardware/cryptography)
- Post-hack continuation: literally a startup
**Why fail:**
- Two-sided demo (builder + investor) — composite user risk
- "No receipts, no float" rule MUSÍ byť prominent v demo, inak token-casino perception
- Solarpunk framing potrebuje careful narrative ("public capital market" angle)
- Umia integration unknown depth — Day 1 mentor blocks
- Multi-stakeholder UX v 3 dňoch je ambitious
**Risk reduction:** Umia mentor priority #1; demo pre-cache pre Sepolia receipts; investor POV jako single narrative thread; "no receipts, no float" prominently in demo.

#### Comments
- [Claude] **Verdict: TOP-TIER lock.** Skóre estimate ~75-80; prize EV vyšší než celý existujúci bench (Umia $12K alone shifts EV).
- [Claude] **Anti-pattern check:** "Funding layer" v marketing summary obsahuje "layer" slovo — INTERNÝ framing OK, pitch sentence ("turns working AI agents into investable ventures") je clean.
- [Claude] **SBO3L derivative check:** Receipts ako primitív má SBO3L overlap, ale Agent Float = funding launchpad (post-execution proof for capital), SBO3L bol mandate gate (pre-execution authority). Different product, different stakeholder, different sponsor. **Greenlight, žiadne SBO3L kontaminácie.**
- [Claude] **Open Agents 2026 mapping:** Slopstock (finalist, "Wall Street for AI agents") validuje category; Tradewise (KH 1st, agent earns/sells/loans) validuje economic loop; ENSign (ENS 1st, ENS-as-account) validuje ENS depth. **3-of-7 finalists/winners hit similar primitives = strong directional signal.**
- [Claude] **Critical risk: receipts MUST be real.** Demo agent (GrantScout) musí byť working agent s real Sepolia receipts pred demo time. Build agent v Day 1 evening + generate 3 real queries = mandatory.
- [Claude] **Solarpunk framing fix:** "Public capital market for working AI agents — proof first, funding second" leans into solarpunk-aligned angle. Avoid "AI agent IPO" framing — sounds extractive.
- [Claude] **Two-sided demo trap mitigation:** Lock INVESTOR persona ako single narrative thread v 5-min demo. Builder POV iba ako voiceover context, nie active actor.
- [Claude] **Naming risk:** "Float" v finance = IPO float (positive). Možné kolízie: SOL ecosystem "Float Protocol", Float Capital. Tonight check mandatory.
- [Claude] **Verdict:** LOCK. Concrete scope v `SCOPE.md`.

---

---

## Memory references

Pre kontext bez re-čítania celého memory — kľúčové súbory:

- Pre-build gate (8 otázok): `~/.claude/projects/-Users-danielbabjak-Desktop-ETHPrague2026/memory/feedback_pre_build_gate.md`
- 12 winning primitives: `~/.claude/projects/-Users-danielbabjak-Desktop-ETHPrague2026/memory/feedback_winning_primitives.md`
- Sponsor-native test: `~/.claude/projects/-Users-danielbabjak-Desktop-ETHPrague2026/memory/feedback_sponsor_native_test.md`
- ETHPrague context (sponsors + tracks): `~/.claude/projects/-Users-danielbabjak-Desktop-ETHPrague2026/memory/project_ethprague_context.md`
- Anti-patterns: `~/.claude/projects/-Users-danielbabjak-Desktop-ETHPrague2026/memory/feedback_anti_patterns.md`
- Watt City win DNA: `~/.claude/projects/-Users-danielbabjak-Desktop-ETHPrague2026/memory/project_wattcity_win.md`
- Open Agents finalist DNA: `~/.claude/projects/-Users-danielbabjak-Desktop-ETHPrague2026/memory/reference_open_agents_finalists.md`
