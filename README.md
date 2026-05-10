# Siren

> **No data, no score.** · **No source, no upgrade.**

Siren is a public due-diligence engine for ENS-named agents and projects. Type any ENS name and the product reads its public evidence — Sourcify-verified contracts, GitHub activity, on-chain history, ENS-internal records — and produces a deterministic 0–100 benchmark score with a full breakdown of every contributing component.

Built at **ETHPrague 2026** for *Building Ethereum's Solarpunk Future*.

**Live:** <https://upgrade-siren.vercel.app>

## Surfaces

| Surface | Route | Status | Purpose |
|---|---|---|---|
| **Bench Mode** *(primary FE path per Daniel directive)* | `/b/[name]` | LIVE | Per-subject benchmark report — manifest + sources + score breakdown |
| **Contract Risk** *(supporting)* | `/r/[name]` | LIVE | Per-upgrade verdict (`SAFE` / `REVIEW` / `SIREN`) for any upgradeable contract; reused as the Sourcify drilldown inside Bench |
| Paste-attestation lookup | `/lookup/[name]` | LIVE | EAS attestation comparator with cross-chain identical-claim diff |
| Demo runner | `/demo` | LIVE | Four prepared scenarios |
| Health check | `/health`, `/api/sourcify/health` | LIVE | Env + dependency reachability |

`/r/[name]` remains a fully functional standalone surface; sponsor judges who want the Sourcify-anchored single-contract path can navigate by direct URL. The landing page demo tiles point at `/b/[name]` only (per `apps/web/app/demo/demo.config.ts` Daniel directive).

## Why It Exists

Two trust assumptions sit underneath everyday Ethereum interactions, and the product makes both visible:

- **An ENS-named subject can claim contracts, GitHub repos, prior deploys, audits without anyone cross-checking.** Bench reads the public evidence behind those claims, applies a structural trust-discount on unverified ones, and folds it into one number with the breakdown panel showing every contributing component.
- **An upgradeable proxy can quietly change implementation code while the address and brand stay the same.** Contract Risk turns the moment of upgrade into a public verdict.

Verdicts and scores are deterministic functions of public evidence. The score formula is open source in `packages/evidence/src/score/weights.ts`. The breakdown drawer shows every contributing component, its weight, its raw value, and its trust factor.

## Live Demo Scenarios

The four `/demo` scenarios are real, not synthetic:

| Scenario | Target | Mode | Expected tier |
|---|---|---|---|
| Curated AI agent | `siren-agent-demo.upgrade-siren-demo.eth` | signed-manifest (Sepolia) | A |
| Real human profile | `letadlo.eth` | public-read (Sepolia, `com.github` text record) | C |
| Rich ENS records | `agent-kikiriki.eth` | public-read (Sepolia, 11 text records) | C |
| Mainnet ENS demo | `vitalik.eth` | public-read (mainnet) | A *(demonstrates public-read ceiling)* |

Mainnet test subjects used by the team during build (referenced in `apps/web/app/api/ens/debug/`, `packages/evidence/src/subject/publicRead.ts`, `packages/evidence/src/bench/orchestrator.ts`):

- `sbo3lagent.eth` — agent ENS, mainnet, public-read
- `vitalik.eth` — same as above

> The wiki spec page Demo-Script.md describes a forward-looking three-agent comparison view (`/compare?names=atlas,nova,mirage`) with archetypal Atlas / Nova / Mirage demo subjects. **That route and those subjects are wiki spec, not shipped.** The current shipped demo flow uses the four scenarios above.

## Tier Ladder (Bench Mode)

LOCKED in `packages/evidence/src/score/weights.ts`. Re-calibrated 2026-05-10 to match the trust-discount math (realistic max axis ~0.55–0.65 after unverified-source discount).

| Tier | Score | Reachability |
|---|---|---|
| `S` | 65+ | Reachable only with cross-sign verified GitHub *(post-hackathon, v2)* |
| `A` | 50–64 | v1 full GitHub fetcher set max ~79 caps here |
| `B` | 35–49 | v1 P0 ship max ~66 caps within this range |
| `C` | 20–34 | Emerging subjects |
| `D` | 0–19 | Anti-scam triggers; very few signals |
| `U` | no data | Subject has no opt-in manifest and no inferable public-read sources |

**Public-read tier ceiling: A.** A subject without an opt-in `agent-bench:bench_manifest` cannot exceed tier A regardless of axis sums.

## Score Formula

LOCKED in `packages/evidence/src/score/weights.ts`. Daniel's relevance override targets that one file.

```text
score_100 = round(0.5 * seniority + 0.5 * relevance) * 100

contribution(component) = weight × value × trust_factor
trust_factor = 1.0 if source verified
             = 0.6 if source unverified  (TRUST_DISCOUNT_UNVERIFIED constant)
```

### Seniority axis (sum of weights = 1.0)

| Component | Source | Trust | Weight | v1 ship status |
|---|---|---|---:|---|
| `compileSuccess` | Sourcify | verified | 0.25 | populated |
| `ciPassRate` | GitHub | unverified | 0.20 | null until US-114b (post-hack) |
| `testPresence` | GitHub | unverified | 0.15 | populated (README + LICENSE + test-dir probe) |
| `bugHygiene` | GitHub | unverified | 0.10 | null until US-114b |
| `repoHygiene` | GitHub | unverified | 0.15 | populated |
| `releaseCadence` | GitHub | unverified | 0.15 | null until US-114b |

### Relevance axis (sum of weights = 1.0)

| Component | Source | Trust | Weight |
|---|---|---|---:|
| `sourcifyRecency` | Sourcify | verified | 0.30 |
| `githubRecency` | GitHub | unverified | 0.30 |
| `onchainRecency` | RPC | verified | 0.25 |
| `ensRecency` | ENS subgraph | verified | 0.15 |

> The wiki spec describes a **third axis (Confidence)** as future product target. **The shipped score engine has two axes.** Confidence as a derived display number — essentially the trust-discount-weighted average — is on the post-hackathon roadmap.

## What Ships in v1

Verified by `git log` + `pnpm test`. Backlog detail: [`docs/13-backlog.md`](./docs/13-backlog.md) US-001..US-146.

### Bench Mode (`/b/[name]`)

- Subject ENS schema (`agent-bench:bench_manifest` atomic JSON record under `agent-bench:*` namespace) — US-076 / US-111
- Public-read fallback for subjects without `agent-bench:bench_manifest` — US-112
- Sourcify source fetcher with deep field selectors: `creationMatch`, `runtimeMatch`, `signatures.function/event`, `proxyResolution`, full `compilation`, `metadata.sources[].license`, `userdoc/devdoc` — US-113
- GitHub source fetcher P0: `/users/{owner}`, top-20 repos, per-repo metadata, test-dir probes, README + LICENSE — US-114
- On-chain source fetcher P0: `nonce` via `eth_getTransactionCount`, first tx via binary-search on historical nonce, contracts deployed via Sourcify deployer crosswalk — US-115
- ENS-internal source fetcher: registration date, subname count, text-record count, last `TextChanged` block via subgraph — US-116
- Multi-source orchestrator: parallel runner with per-source failure isolation — US-117
- Score engine: pure function, raw-discounted axes (no normalization to ceiling per EPIC §10 update 2026-05-09), tier ceiling enforcement — US-118
- Storage-Layout Hygiene aggregator across implementation history per proxy — US-119
- Cross-chain auto-discovery via `/v2/contract/all-chains` — US-120
- Bytecode similarity-submit flow (when enabled) — US-121
- Cache extension for portfolio hit rate — US-122
- Source-pattern detection (Pausable, Ownable, UUPS, AccessControl) — US-123
- License + compiler-recency extraction (data path, available for drawer) — US-124
- Playwright e2e harness with MSW for fixtured GitHub / Sourcify / RPC / ENS-subgraph responses — US-125..US-129
- Owned `kind: ai-agent` ENS subject under `upgrade-siren-demo.eth` — US-146
- `/b/[name]` route + landing mode-detection — US-131
- Score banner, source grid (4 tiles), score breakdown panel — US-132..US-134
- Sourcify, GitHub, on-chain, ENS source drawers — US-135..US-138
- Honest-claims disclaimer integrated into score banner — US-139
- Bytecode similarity-submit button + optimistic re-render — US-140

### Contract Risk (`/r/[name]`)

- ENS contract map (stable + atomic upgrade manifest under `upgrade-siren:*` namespace) — US-010 / US-017 / US-018
- EIP-1967 implementation slot reading + `Upgraded(address)` event detection — US-022 / US-023
- Sourcify v2 evidence engine: verification, ABI, storage layout, compiler metadata, source files — US-024 / US-025
- ABI risky-selector diff — US-026
- Storage-layout compatibility diff — US-027
- Verdict engine `SAFE` / `REVIEW` / `SIREN` — US-029
- EIP-712 signed Siren Reports — US-014 / US-015 / US-028; full payload signed (US-074)
- Public-read fallback (US-019) and absent-record verdict paths (US-020)
- Public-read raw-address path (`/r/[hex]`) — US-082
- Source-file unified diff renderer with Solidity highlight — US-075 / US-076
- V1-anchored interpretation of unverified V2 bytecode — US-078 / US-079; downgrades `SIREN` → `REVIEW` only when match score ≥ 0.9 and no risky selectors. Never `SAFE` without metadata trail.
- Governance comment generator (short / forum / vote-reason) — US-049
- Demo mode runner with four scenarios — US-050
- Live `/r/[name]` orchestration with full server-side trust path — US-068 / US-069 / US-081
- Five-second performance budget enforced — US-084

### Cross-Mode Surfaces (shipped 2026-05-10)

- **Phase A visual rebrand**: "Upgrade Siren" → "Siren" across UI, governance copy, page metadata (PR #187 + fix-up PR #189). Layout title: `Siren · Public verification layer for Ethereum`.
- **Sourcify bounty enrichment** (PR #190): rich evidence panel with storage layout, live Sourcify-health chip on homepage, collapsed Etherscan-fallback rows in the drawer (PR #192).
- **Umia integration** (PRs #183, #184, #186): `UmiaValidationHookMock` deployed Sepolia, EIP-712 ServerPermit issuer at `POST /api/umia/permit`, homepage Umia banner, `packages/umia-permit` workspace package.
- **EAS cross-chain attestation diff** (PRs #182, #185, #191): paste any EAS attestation UID, compare claims against live state. Identical addresses + identical reportUri across chains classified as `UNCHANGED`. API at `GET /api/eas/attestation/[uid]`, UI at `/lookup/[name]`.
- **Tier-ladder row alignment with score banner** (PR #188).
- **Audit batch P0/P1** judge-visible bug fixes (PR #181) and EAS internals (PR #182), demoMocks alignment + report 200 + publish wiring (PR #185).

## Honest Claims (extends GATE-14)

The product surfaces public evidence and computes deterministic verdicts and scores. **It does not predict intent.** A high score does not certify good behavior; it only certifies that the available public evidence is verifiable and that the code-quality signals look strong. Score breakdown is rendered to every user, not hidden behind a tooltip.

Avoid this overclaim:

> *"We write directly into the Sourcify dataset."*

Correct wording (see wiki [Sponsor-Strategy](https://github.com/B2JK-Industry/Upgrade-Siren-ETHPrague2026/wiki/Sponsor-Strategy)):

> *"We consume Sourcify deeply, link every score to Sourcify evidence, and can request similarity verification for unverified contracts when that flow is enabled."*

Mock-labeled paths are limited to Playwright e2e fixtures (US-125..US-129), all tagged `mock: true`. Live demo paths resolve real ENS records and call live Sourcify, GitHub, RPC, and ENS subgraph endpoints. Booth-fallback artifacts (US-063) are clearly labeled when used.

## Sponsor Strategy

Per [`SCOPE.md`](./SCOPE.md) Section 5 lock and wiki [Sponsor-Strategy](https://github.com/B2JK-Industry/Upgrade-Siren-ETHPrague2026/wiki/Sponsor-Strategy).

| Priority | Track | Why |
|---|---|---|
| 1 | **Sourcify Bounty** | Sourcify is the only `verified` (non-discounted) seniority source. Storage-layout history aggregator. Bytecode similarity submit. Bounty enrichment shipped (PR #190). |
| 2 | **ENS — AI Agents ($2K) primary** *(switched 2026-05-09 from Most Creative)* | `agent-bench:bench_manifest` is the universal subject registry. `upgrade-siren:upgrade_manifest` is the contract-version map. Both atomic, both live-resolved. US-146 owns one `kind: ai-agent` ENS subject for judging. Most Creative remains as fallback. |
| 3 | **ETHPrague Future Society** | Public-good transparency primitive — applies to per-subject verifiability and per-upgrade safety. Score formula open source. Trust-discount visible in breakdown panel. |
| Active | **Umia Best Agentic Venture** | `UmiaValidationHookMock` deployed Sepolia. EIP-712 ServerPermit issuer at `POST /api/umia/permit`. Homepage Umia banner. Pitch frame: Bench API as per-subject scoring surface for venture launch reviewers. |

Hard cap: **2 sponsor tracks + 1 organizer track + 1 optional sponsor**. We do not submit Swarm, SpaceComputer, or Apify in v1.

The wiki [Sponsor-Strategy](https://github.com/B2JK-Industry/Upgrade-Siren-ETHPrague2026/wiki/Sponsor-Strategy) page lists three submission options (A: Umia + Sourcify + Future Society, B: Umia + ENS + Future Society, C: Sourcify + ENS + Future Society). Final track set is Daniel's call after mentor sweeps (US-144).

Sponsor fit detail: [`docs/07-sponsor-fit.md`](./docs/07-sponsor-fit.md).

## API Surface

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/bench/[name]` | Bench report (manifest + sources + score breakdown) |
| `GET` | `/api/sourcify/health` | Live Sourcify health for the homepage chip |
| `GET` | `/api/eas/attestation/[uid]` | EAS attestation lookup + cross-chain diff |
| `GET` | `/api/ens/debug/[name]` | ENS resolution debug (`/api/ens/debug/sbo3lagent.eth` is a real probe) |
| `POST` | `/api/umia/permit` | Umia EIP-712 ServerPermit issuer for `UmiaValidationHook` |

The `/r/[name]` route uses the evidence packages directly via `apps/web/lib/loadReport.ts` (no separate API layer). It wires US-068 (live verdict pipeline), US-069 (server-side trust path runtime), US-081 (full diffs into loadReport), and US-082 (raw-address path) together.

## Quick Start

```bash
git clone https://github.com/B2JK-Industry/Upgrade-Siren-ETHPrague2026.git
cd Upgrade-Siren-ETHPrague2026

pnpm install

cp .env.example .env.local
# fill in: SEPOLIA_RPC_URL, MAINNET_RPC_URL, GITHUB_PAT, GRAPH_API_KEY,
#         REPORT_SIGNER_PRIVATE_KEY (signing fixtures only),
#         UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN

pnpm --filter @upgrade-siren/web dev
# http://localhost:3000

pnpm --filter @upgrade-siren/web test
pnpm --filter @upgrade-siren/web test:e2e
```

## What This Is Not

- Not a generic smart contract scanner
- Not an AI auditor (verdicts and scores are deterministic, not LLM-generated)
- Not a token launchpad or agent marketplace
- Not an ENS profile page
- Not a replacement for audits
- Not a claim that verified source means safe code
- Not a claim that a high score predicts good intent — *score measures verifiability and code-quality signals only*

## Repository Layout

```
Upgrade-Siren-ETHPrague2026/
├── README.md                       this file
├── SCOPE.md                        v1 product scope (LOCKED 2026-05-09)
├── EPIC_BENCH_MODE.md              Bench Mode epic (LOCKED 2026-05-09)
├── EPIC_AGENT_PORTFOLIO_MODE.md    SUPERSEDED 2026-05-09 — historical only
├── BRAINSTORM.md
├── AGENTS.md
├── CLAUDE.md
├── apps/
│   └── web/                        Next.js 16 App Router
│       ├── app/
│       │   ├── page.tsx            Homepage (Bench-primary)
│       │   ├── b/[name]/           Bench Mode route
│       │   ├── r/[name]/           Contract Risk route
│       │   ├── lookup/[name]/      Paste-attestation lookup
│       │   ├── demo/               Demo scenario runner (4 real scenarios)
│       │   ├── health/             Env health check
│       │   └── api/                bench, eas, ens, sourcify, umia
│       └── components/             Tile, drawer, banner, lookup, brand
├── packages/
│   ├── shared/                     types, EIP-712 builders, schemas
│   ├── evidence/                   ENS, Sourcify, on-chain, GitHub, score, diff
│   └── umia-permit/                Umia EIP-712 ServerPermit issuer
├── contracts/                      Foundry: VaultV1 + V2Safe + V2Dangerous + V1Derivative + UnverifiedImpl + Proxy
├── deployments/                    on-chain addresses + ENS records snapshot
├── scripts/                        deploy, verify, provision (incl. Umia)
├── test/                           Foundry assertions
├── docs/
│   ├── 01-vision.md
│   ├── 02-product-architecture.md
│   ├── 03-business-model.md
│   ├── 04-technical-design.md
│   ├── 05-demo-script.md
│   ├── 06-acceptance-gates.md      GATE-1..GATE-34 register
│   ├── 07-sponsor-fit.md
│   ├── 08-competitive-landscape.md
│   ├── 09-mentor-questions.md
│   ├── 10-risks.md
│   ├── 11-glossary.md
│   ├── 12-implementation-roadmap.md
│   ├── 13-backlog.md               US-001..US-146
│   └── 14-naming-bench.md          sub-brand collision check (open: US-143)
├── prompts/                        dev-stream + reviewer agent prompts + launch
└── reports/                        generated Siren Report fixtures
```

Project wiki (separate git, forward product spec — not a deployment changelog): <https://github.com/B2JK-Industry/Upgrade-Siren-ETHPrague2026/wiki>

## Status (2026-05-10 submission day)

**Submission build.** Scope locked 2026-05-09. Backlog `docs/13-backlog.md` (US-001..US-146) executed across three streams plus a Release Manager.

| Stream | Owns | Status |
|---|---|---|
| A — Contract Fixtures | `contracts/`, `scripts/deploy*`, `test/`, demo subjects, Playwright scenarios | All P0 merged. US-130 (P2 storage-collision Foundry fixture) open. |
| B — Evidence Engine | `packages/evidence/`, `packages/shared/`, score engine, manifest parsers, multi-source orchestrator, Umia permit issuer | All P0 merged. |
| C — Web UX | `apps/web/`, Bench + Contract Risk routes, drawers, governance copy, paste-attestation lookup, Umia banner | All P0 merged. US-077 (P2 booth polish floating-overlay) open. |

Tracker P0 still open at submission time:

- US-143 — naming-collision check for "Siren" sub-brand. `docs/14-naming-bench.md` outcome to be documented.
- US-144 — Sourcify + ENS mentor-sweep findings.

Audit work merged 2026-05-10:

| PR | Scope |
|---|---|
| #181 | P0+P1 judge-visible bug fixes from morning review |
| #182 | EAS internals — payload, store identity, ECDSA verify |
| #183 | Umia canonical domain `umia.finance` + auto-fill `github_repositories` |
| #184 | Umia EIP-712 ServerPermit issuer for `UmiaValidationHook` |
| #185 | Audit batch 3 — demoMocks alignment, report 200, publish wiring, cross-chain diff |
| #186 | Umia one-shot Sepolia deploy + provisioning script for `UmiaValidationHookMock` |
| #187 | Phase A visual rebrand "Upgrade Siren" → "Siren" |
| #188 | Tier-ladder row alignment with score banner |
| #189 | Phase A fix-up — `/r` page + governance templates missed in initial sweep |
| #190 | Sourcify bounty enrichment — storage layout, rich evidence panel, live health |
| #191 | EAS cross-chain identical-address + identical-reportUri = `UNCHANGED` |
| #192 | Sourcify panel — collapse Etherscan-fallback noise |

Mock-labeled paths: only Playwright e2e fixtures, all tagged `mock: true` per GATE-14. Live demo subjects resolve real ENS records and call live Sourcify, GitHub, RPC, and ENS subgraph endpoints.

## Documentation Index

| Topic | Location |
|---|---|
| Product scope | [`SCOPE.md`](./SCOPE.md) |
| Acceptance gates | [`docs/06-acceptance-gates.md`](./docs/06-acceptance-gates.md) |
| Vision | [`docs/01-vision.md`](./docs/01-vision.md) |
| Technical design | [`docs/04-technical-design.md`](./docs/04-technical-design.md) |
| Demo script | [`docs/05-demo-script.md`](./docs/05-demo-script.md) |
| Sponsor fit | [`docs/07-sponsor-fit.md`](./docs/07-sponsor-fit.md) |
| Glossary | [`docs/11-glossary.md`](./docs/11-glossary.md) |
| Backlog (US-001..US-146) | [`docs/13-backlog.md`](./docs/13-backlog.md) |
| Bench Mode epic | [`EPIC_BENCH_MODE.md`](./EPIC_BENCH_MODE.md) |
| Public wiki (forward spec) | <https://github.com/B2JK-Industry/Upgrade-Siren-ETHPrague2026/wiki> |

The wiki is the **forward product specification** — the end-state target the team builds toward. The README is the **deployment changelog** — what is actually live right now. When the spec and the live state diverge, this README documents the gap explicitly (see *Tier Ladder*, *Score Formula* notes about `Confidence` and `/compare` being forward spec).

## Contributing

This is an ETHPrague 2026 hackathon submission. The repository continues post-hackathon as a public good.

Issues and PRs welcome at <https://github.com/B2JK-Industry/Upgrade-Siren-ETHPrague2026>.

## License

MIT — see [LICENSE](./LICENSE).

## Acknowledgements

- **Sourcify** for the verified-contract data layer that powers the Sourcify drawer and the Bench score's only non-discounted seniority component
- **ENS Labs** for the resolver, atomic-text-record pattern, and ENSIP-26 discovery records
- **The Graph** for the ENS subgraph that powers ENS-internal seniority signals
- **Umia** for the venture-validation hook surface that gave Bench its first programmatic consumer
- **ETHPrague organizers** for the Future Society track framing
- **Open Agents 2026 finalists** whose primitive analysis informed the Bench design
