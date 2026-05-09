# EPIC: Upgrade Siren Bench

> **Type:** Epic / Scope Extension to Upgrade Siren
> **Status:** **LOCKED 2026-05-09** — Daniel accepted all defaults in Section 21 (D-A through D-J). Code unblocked; dev pipeline activates on next polling cycle.
> **Date drafted:** 2026-05-08
> **Hackathon submission deadline:** 2026-05-10 12:00 PM CET via Devfolio
> **Supersedes:** `EPIC_AGENT_PORTFOLIO_MODE.md` (Sourcify-only portfolio scope; replaced by multi-source benchmark)
> **Related authoritative docs:** `SCOPE.md`, `docs/04-technical-design.md`, `docs/06-acceptance-gates.md`, `docs/12-implementation-roadmap.md`, `docs/13-backlog.md`

---

## 0. Executive Summary

Upgrade Siren today resolves **one** ENS contract map (e.g. `vault.demo.upgradesiren.eth`) and produces **one** verdict (`SAFE` / `REVIEW` / `SIREN`) for the proxy at that name.

This epic adds a second front-door:

> **Upgrade Siren Bench** — the user enters any ENS name representing a **subject** (AI agent, human dev, team, or project). The product reads a manifest of public data sources from the subject's ENS records (Sourcify projects, GitHub owner, on-chain primary address, ENS-internal signals), pulls evidence from each, and produces a **0–100 benchmark score** with two visible axes (**seniority** = code quality, **relevance** = activity) plus a tier label.

The per-contract verdict engine already shipping (US-026 ABI diff, US-027 storage diff, US-029 verdict engine) is **reused unchanged** as one component inside the Sourcify data source. Bench Mode is an orchestration + aggregation layer on top, plus deeper Sourcify field usage that benefits both modes.

**What stays:**

- Sourcify primary, ENS secondary, Future Society organizer track
- Verdict tokens `SAFE` / `REVIEW` / `SIREN` per individual contract (now embedded inside Bench tile drawer)
- EIP-712 signed Siren Reports (single-contract mode)
- Public-read fallback (single-contract mode)
- Brand manual, color tokens, font stack (US-067)
- Streams A / B / C ownership map, but A's scope inside this epic is reduced (no demo-subject provisioning; Playwright tests instead)
- All existing GATE-1..GATE-26

**What is new:**

- ENS schema under `agent-bench:*` namespace with atomic manifest pattern
- Multi-source data fetch (Sourcify + GitHub + ENS-internal + on-chain) with parallel orchestration
- Two-axis benchmark formula (seniority + relevance) → single 0–100 score with breakdown panel
- Trust-discount mechanic for unverified off-chain claims
- New routes `/b/[name]` (subject benchmark) — `/a/[name]` route from prior EPIC is **scrapped**
- Sourcify field deepening (P0/P1/P2 matrix from internal field reference)
- Storage-layout hygiene aggregator across implementation history per proxy
- Playwright e2e suite as the validation surface for scenarios (replaces Stream A demo-subject provisioning)

**Risk:**

- Highest risk: storage-layout aggregator (compiler-version-dependent) + GitHub rate-limit budgeting
- Highest reward: lifts Upgrade Siren from a single-contract checker to a generic on-chain reputation primitive — maps to **Reputation primitive #4** in the winning-primitives playbook

**Section 21 LOCKED 2026-05-09.** Code unblocked. Time estimate dropped per audit M-3 finding 2026-05-09 — see `docs/13-backlog.md` for live status; per memory `feedback_no_time_cuts`, Daniel calls scope cuts, not the EPIC.

---

## 1. Strategic Context

### Where Upgrade Siren is today

Upgrade Siren resolves one ENS name as one contract map: stable `upgrade-siren:proxy`, `upgrade-siren:owner`, atomic `upgrade-siren:upgrade_manifest`. Verdict pipeline runs against that one proxy. Live demo route is `/r/[name]` (US-068 merged). 75+ user stories merged across Streams A/B/C.

### The new question being asked

> *"What if the ENS name represents a subject — agent, human, team, or project — instead of one contract? How do I evaluate that subject's overall on-chain and code-quality footprint before I trust it?"*

This is a complementary surface, not a competing one. Single-contract mode answers *"is this upgrade safe?"*. Bench Mode answers *"how senior and relevant is this subject overall?"*.

### Why this is extension, not pivot

| Dimension | Single-Contract `/r/[name]` (today) | Bench `/b/[name]` (new) |
|---|---|---|
| ENS resolves to | One proxy contract | A subject with N data sources |
| Output | `SAFE` / `REVIEW` / `SIREN` verdict | 0–100 score + tier (S/A/B/C/D/U) + breakdown |
| Sourcify usage | Per single contract | Per N contracts in parallel; storage-history aggregation |
| Other sources | None | GitHub + ENS-internal + on-chain |
| EIP-712 signing | Per Siren Report | Per per-contract Siren Report inside drawer; aggregate score is unsigned in v1 |
| Backend logic | Existing verdict engine | Reuses verdict engine; adds aggregation + GitHub fetcher + on-chain fetcher + score engine |

Two front doors, one shared engine. No part of the existing scope is invalidated.

### Sponsor-native delta (vs current `SCOPE.md` Section 5)

| Sponsor | Today | After Bench Mode |
|---|---|---|
| **Sourcify** | "evidence layer for one contract" | "**evidence layer queried in parallel across N contracts**, plus storage-layout diffing across implementation history per proxy. Sourcify's on-chain truth is the **only** non-discounted seniority source — verifiability is structurally rewarded." |
| **ENS** | "contract map for one proxy" (Most Creative) | "**universal subject registry** with atomic `agent-bench:bench_manifest` listing every data source for any kind of subject. Track switch: target **AI Agents ($2K)** primary; Most Creative remains fallback." |
| **Future Society** | "public-good safety for one upgrade" | "public-good **transparency primitive** for any subject — agent, project, team. Score is deterministic, formula is open-source." |
| **Umia (optional)** | "Siren Agent due-diligence per protocol" | "**per-subject scoring API** consumable by venture launch reviewers. Same Bench scoring engine powers the reviewer-facing API." |

The extension does not weaken any sponsor-native test. It strengthens ENS materially (universal registry shape) and strengthens Sourcify by deepening field usage and rewarding verifiability via the trust-discount mechanic.

---

## 2. Pitch

### Memorable line (Gate 8 candidate, deal-breaker)

> *"Type any ENS name. See a 0–100 benchmark of how senior and relevant the subject is — every signal sourced, every claim discounted if unverified."*

### Five-second meta moment (Gate 1 candidate, deal-breaker)

User types `someagent.eth` → page renders an immediate **score banner** ("Bench: 63 / 100 — Tier B — seniority 60, relevance 66") followed by a **source grid** (Sourcify / GitHub / On-chain / ENS) where each source tile shows its contributing signals colored by sub-score. Click any tile → drawer expands with the underlying evidence. No slides, no voiceover required.

### Master tagline + sub-tagline

| Surface | Tagline |
|---|---|
| Master (unchanged) | **"No source, no upgrade."** |
| Bench-mode sub-tagline (new) | **"No data, no score."** |

The sub-tagline is used only on `/b/[name]` routes and Bench-mode promo material. The master tagline owns the brand.

---

## 3. Primary User and Problem

| Field | Value |
|---|---|
| Primary user | Anyone evaluating a subject before committing capital, attention, or trust. Examples: a DAO voter looking at a delegate, a fund analyst screening an AI agent before funding, a hackathon judge auditing a competing team, a wallet checking before signing a transaction with a counterparty agent. |
| Job to be done | "Should I trust this subject before I act?" |
| Today they have to | Hand-walk Etherscan + Sourcify + GitHub + Twitter; no aggregate; no benchmark; trust-by-vibes. |
| Bench delivers | One ENS lookup → multi-source pulled live → 0–100 score with two axes → expanded evidence per source on demand → discount visible for unverified sources. |

This sits in the same `Future Society` public-good user category as current Upgrade Siren — expanded from per-upgrade safety to per-subject transparency.

---

## 4. Sponsor Strategy (delta from current `SCOPE.md` Section 5)

| Priority | Track | Status | Delta |
|---|---|---|---|
| 1 | **Sourcify Bounty** | Submit | Deeper field usage; storage-layout history aggregator; Sourcify is the only `verified` (non-discounted) seniority source |
| 2 | **ENS** | Submit | Track choice **changes**: target **AI Agents ($2K)** primary, keep Most Creative as fallback. ENS becomes universal subject registry via `agent-bench:bench_manifest` |
| 3 | **ETHPrague Future Society** | Submit | Unchanged framing |
| Optional | **Umia Best Agentic Venture** | Submit only on Daniel approval | Stronger narrative now: per-subject scoring API |

Hard cap of **2 sponsor tracks + 1 organizer track** is preserved.

---

## 5. 12 Winning Primitives Mapping

Existing scope used **#2 Proof** (Sourcify-backed evidence) + **#5 Identity** (ENS contract map) + partial **#12 Mandate** (atomic manifest as mandate boundary). Bench Mode adds:

| Primitive | Where it lives | Strength after this epic |
|---|---|---|
| **#5 Identity** | ENS-anchored subject root with universal registry shape | promoted from secondary to **primary core** |
| **#2 Proof** | Per-contract Sourcify match + storage-layout history + GitHub workflow run conclusion proofs | **strengthened** — now multi-source |
| **#4 Reputation** | Two-axis score, tier, source-weighted aggregation | **NEW** — derived from on-chain truth + public code-quality signals, not opinion |
| **#8 Human-in-the-loop** | Optional human/agent attestation on subject profile (P2 stretch) | bonus |

Combo `Identity + Proof + Reputation` matches winning shapes (MeritScore, ENSign, ERC-8004 family). Three primitives, not five — keeps the pitch tight.

---

## 6. Architecture

### High-level data flow

```
Browser
  ↓ enters someagent.eth at /b/[name]
Next.js 16 Server Component (apps/web)
  ↓
Subject Resolver (packages/evidence/subject-resolver) [NEW]
  • viem + ENSjs: agent-bench:bench_manifest text record (atomic JSON)
  • parses manifest → { sourcify: [...], github: {...}, onchain: {...}, ensInternal: {...}, kind }
  ↓ SubjectManifest
Multi-Source Orchestrator (packages/evidence/bench) [NEW]
  ├─ Sourcify Source Fetcher (reuses US-024, US-025, plus US-080+ deeper fields)
  │   • per-contract Sourcify report
  │   • storage-layout history aggregator
  │   • compileSuccess, deployer-integrity per project
  ├─ GitHub Source Fetcher [NEW]
  │   • REST API fetch: workflow runs, repos, contents, issues, releases
  │   • signals: ciPassRate, testPresence, bugHygiene, repoHygiene, releaseCadence
  ├─ On-Chain Source Fetcher (reuses US-022 EIP-1967, plus block-history reads) [partial NEW]
  │   • first tx block + timestamp, total tx count, recent tx count
  │   • contracts deployed count
  └─ ENS-Internal Source Fetcher [NEW]
      • registration date, subname count, text record count, last record update block
  ↓ MultiSourceEvidence
Score Engine (packages/evidence/score) [NEW]
  • applies trust-discount per source verifiability
  • applies seniority formula (6 components)
  • applies relevance formula (4 components — provisional)
  • aggregates → score 0–100 + tier
  ↓
UI (apps/web)
  • Score banner (score, axes, tier, disclaimer)
  • Source grid (4 tiles: Sourcify / GitHub / On-chain / ENS)
  • Per-source drawer (signals breakdown, evidence)
```

### Component reuse vs. new

| Component | Status | Notes |
|---|---|---|
| ENS resolver (US-017) | **Reuse + extend** | Add `agent-bench:bench_manifest` reader |
| EIP-1967 slot reader (US-022) | **Reuse** | Per Sourcify project |
| `Upgraded` event reader (US-023) | **Reuse** | Per Sourcify project |
| Sourcify fetcher (US-024, US-025) | **Reuse + extend** | Add deeper field selectors per Section 8 |
| ABI risky-selector diff (US-026) | **Reuse** | Inside Sourcify drawer |
| Storage-layout diff (US-027) | **Reuse + aggregate** | Per project; aggregate becomes hygiene metric |
| Verdict engine (US-029) | **Reuse** | Per-project SAFE/REVIEW/SIREN inside drawer |
| EIP-712 signer (US-015, US-028) | **Reuse** | For per-contract Siren Reports inside drawer |
| Sourcify cache (US-032) | **Reuse + extend** | Higher hit rate now matters more |
| Brand tokens (US-067) | **Reuse** | Verdict tokens map to Sourcify-tile sub-state colors |
| **Subject resolver** | **NEW** | `agent-bench:bench_manifest` parser |
| **Multi-source orchestrator** | **NEW** | Parallel runner with per-source failure isolation |
| **GitHub source fetcher** | **NEW** | Public REST API; PAT for rate limit |
| **On-chain source fetcher** | **NEW (extends existing RPC reads)** | First tx, tx counts, deployed contracts |
| **ENS-internal source fetcher** | **NEW (small)** | Registration date, subname count, text record count |
| **Score engine** | **NEW** | Pure function over `MultiSourceEvidence` |
| **Bench UI** | **NEW** | `/b/[name]` route + score banner + source grid + drawer |

---

## 7. ENS Records Schema (`agent-bench:*`)

### Namespace decision

- New namespace: **`agent-bench:*`** for Bench Mode records
- Existing `upgrade-siren:*` records remain owned by single-contract mode, untouched
- Both namespaces co-exist on the same ENS name without conflict

### Atomic manifest pattern (reuses Upgrade Siren atomic-manifest discipline)

Single text record holds the complete subject manifest as one JSON object, so related fields cannot desynchronize across multiple `setText` calls:

| Record | Purpose |
|---|---|
| `agent-bench:bench_manifest` | Single JSON object describing every data source for the subject |
| `agent-bench:owner` | Address authorized to update the manifest (in v1: same as ENS name owner) |
| `agent-bench:schema` | Pointer to JSON schema version (`agent-bench-manifest@1`) |

### `agent-bench:bench_manifest` shape

```json
{
  "schema": "agent-bench-manifest@1",
  "kind": "ai-agent",
  "sources": {
    "sourcify": [
      { "chainId": 1,        "address": "0xAAA", "label": "Treasury Multisig" },
      { "chainId": 11155111, "address": "0xBBB", "label": "Yield Vault" }
    ],
    "github": {
      "owner": "vbuterin",
      "verified": false,
      "verificationGist": null
    },
    "onchain": {
      "primaryAddress": "0xPRIMARYADDRESS",
      "claimedFirstTxHash": null
    },
    "ensInternal": {
      "rootName": "someagent.eth"
    }
  },
  "version": 1,
  "previousManifestHash": "0x..."
}
```

`kind` ∈ `{"ai-agent", "human-team", "project"}` — used only for UI labeling and pitch framing. Score formula does not branch on `kind` in v1.

`github.verified` is always `false` in v1 (we trust the claim per Q2=A; cross-sign verification is post-hack). The boolean is in the schema so v2 can flip it without a schema migration.

### Live-resolve rule (extends existing GATE-3)

The Bench Mode app must live-resolve `agent-bench:*` records on every request (cache TTL applies, but no hardcoded values). Mock content must be labeled `mock: true` per existing GATE-14.

### Public-read fallback for subjects without `agent-bench:*` records

When a user enters an ENS name that has no `agent-bench:bench_manifest`, Bench Mode infers a partial manifest:

- `sources.onchain.primaryAddress` ← ENS `addr()` record
- `sources.sourcify` ← `GET /v2/contract/all-chains/{primaryAddress}` matches
- `sources.github` ← absent (no claim made → no GitHub data)
- `sources.ensInternal` ← derived from ENS subgraph

Score is computed from available sources only. Banner shows `confidence: public-read`; tier ceiling is **A** (cannot reach S without an opt-in manifest). This mirrors the single-contract public-read fallback pattern and gives the product immediate utility against any ENS.

---

## 8. Data Sources

### 8.1 Sourcify (verified)

**Reuses existing fetchers (US-024, US-025) with deeper P0/P1/P2 field selection.**

P0/P1/P2 priority matrix (canonical reference for both modes):

| Tier | Field | Used for |
|---|---|---|
| P0 | `match`, `creationMatch`, `runtimeMatch` | Verdict tier; GREEN tile only when both creation+runtime are `exact_match` |
| P0 | `abi` | Risky-selector diff (US-026) |
| P0 | `signatures.function` | Pre-decoded function signatures with selector hashes (replaces external 4byte) |
| P0 | `signatures.event` | Event-level diff |
| P0 | `storageLayout` | Storage-layout diff (US-027) and history aggregator (new) |
| P0 | `compilation` | Compiler version, optimizer, evmVersion → quality signal |
| P0 | `metadata.sources[].license` | License badge per project |
| P0 | `sources` | Evidence drawer; pattern detection (Pausable, Ownable, UUPS) |
| P1 | `proxyResolution.isProxy/proxyType/implementations` | Proxy detection (Sourcify-first; EIP-1967 RPC fallback) |
| P1 | `creationBytecode.recompiledBytecode` vs `onchainBytecode` | Sanity check for forensic drawer |
| P1 | `userdoc`, `devdoc` | Human-readable contract description |
| P2 | `cborAuxdata`, `transformations`, `stdJsonInput`, `stdJsonOutput` | Forensic export bundle |

### Storage-Layout Hygiene Algorithm (CORE for Bench Mode)

For each proxy contract listed in `sources.sourcify`:

```text
1. Sourcify lookup → proxyResolution.implementations.
2. Order implementations chronologically (RPC deployment block; fallback verifiedAt asc).
3. Per consecutive pair (impl[i], impl[i+1]):
     fetch /v2/contract/{chainId}/{impl}?fields=storageLayout,signatures,abi
     compare storage[] arrays:
       same slot, same type, same label   → SAFE
       same slot, same type, diff label   → SOFT (rename)
       same slot, DIFFERENT type          → COLLISION
       slot used in i missing in i+1      → REMOVED
       new variable in slot beyond i.max  → SAFE (append)
4. Per proxy hygiene = avg over upgrade pairs of {1.0 SAFE, 0.5 SOFT, 0.0 COLLISION/REMOVED}.
5. Per subject hygiene = avg over proxies (proxy with no upgrades → 1.0).
```

Edge cases:

- Implementation pair where one side has no `storageLayout` → mark `UNKNOWN`, do not penalize, surface in drawer.
- Compiler version drift across upgrades changes type IDs → compare by `label + offset + size`, not raw type string.
- Diamond proxies → tile shows `kind: diamond, hygiene unsupported`. Documented limit.

### Bytecode Similarity Submit Flow (P1 — high demo value)

For unverified contracts in the subject's portfolio:

```text
POST /v2/verify/similarity/{chainId}/{address}
  → Sourcify scans known bytecode set
  → if match found, contract auto-verifies
  → poll /v2/verify/{verificationId} until terminal
  → re-fetch /v2/contract/{chainId}/{address} → re-evaluate score
```

Demo line: *"Subject's GitHub claim already gives 65. We submit the unverified contract to similarity. Sourcify finds a match, score climbs to 71 — verifiability dominates."*

### Cross-Chain Auto-Discovery (P1)

For each Sourcify project address, also call `GET /v2/contract/all-chains/{address}`. Discovered chains surface as chips in the drawer; they boost the breadth signal honestly.

### Sourcify trust label

**`verified`** — all Sourcify-derived signals enter the score without trust discount.

### 8.2 GitHub (unverified in v1)

**Public REST API. Optional unauthenticated PAT for rate limit (5000/hr authed, 60/hr unauthed). Server-side fetch with cache.**

Endpoint scope is split into **P0** (US-114) and **P1** (US-114b) to keep the rate-limit budget tight and the dependency surface narrow on Day 1. The score engine treats P1 signals as `value: null` until US-114b lands; breakdown renders them as `— (P1)`.

#### P0 endpoints (US-114)

Components fed at P0: `testPresence`, `repoHygiene` (README + LICENSE only), `githubRecency` (via `pushed_at`).

| Endpoint | Used for |
|---|---|
| `GET /users/{owner}` | Account creation date, public repo count, followers |
| `GET /users/{owner}/repos?per_page=100&sort=updated` | Repo list (cap top-20 most recent) |
| `GET /repos/{o}/{r}` | Per-repo metadata: created, **pushed_at** (drives `githubRecency`), archived, default_branch, license, topics |
| `GET /repos/{o}/{r}/contents/{test,tests,__tests__,spec}` (parallel) | Test directory presence → `testPresence` |
| `GET /repos/{o}/{r}/contents/README.md` | README presence + length → P0 `repoHygiene` |
| `GET /repos/{o}/{r}/contents/LICENSE` | License presence → P0 `repoHygiene` |

Per-subject P0 budget: ~6 calls per repo × 20 repos + 2 user calls = **~122 calls**. Authed 5000/hr → ~40 fresh lookups/hr.

Components NOT computed at P0 (all P1, see below): `ciPassRate`, `bugHygiene`, `releaseCadence`. **The score is well-defined without them** — just lower seniority for any subject until US-114b lands.

#### P1 endpoints (US-114b, ships after US-114 + US-118 land)

| Endpoint | Used for |
|---|---|
| `GET /repos/{o}/{r}/actions/runs?per_page=50` | Last 50 workflow runs → `ciPassRate` |
| `GET /repos/{o}/{r}/actions/workflows` | Workflow file list → enriches `testPresence` (workflow-name pattern) |
| `GET /repos/{o}/{r}/issues?labels=bug&state=all&per_page=100` | Bug-label issues → `bugHygiene` |
| `GET /repos/{o}/{r}/contents/SECURITY.md` | Security policy → enriches `repoHygiene` |
| `GET /repos/{o}/{r}/contents/.github/dependabot.yml` | Dependabot config → enriches `repoHygiene` |
| `GET /repos/{o}/{r}/branches/{default}/protection` | Branch protection (404 for non-admin tokens, treat as 0) → enriches `repoHygiene` |
| `GET /repos/{o}/{r}/releases?per_page=100` | Release count + dates → `releaseCadence` |

P1 adds ~7 calls per repo × 20 repos = ~140 calls. Combined P0+P1 ~262 calls per fresh fetch. Cache hit rate dominates in practice.

Repo cap: top 20 by recent activity. More than 20 repos → sample by recency.

### GitHub trust label

**`unverified`** — every GitHub-derived signal is multiplied by trust-discount factor `0.6` before entering aggregation. Reason: subject has not cross-signed ownership of the GitHub account; we trust the claim but discount for the unverifiability.

### Rate-limit budget

Per subject lookup with up to 20 repos:
- ~7 calls per repo × 20 repos = 140 calls
- Plus ~3 user-level calls = 143 calls per fresh fetch
- Authed budget 5000/hr → safe for ~30 fresh subject lookups per hour
- Cache TTL: 1 hour for repo metadata, 15 min for workflow runs and issues

Cache backing: extend US-032 Upstash Redis layer to a `github:{owner}:{key}` namespace.

### 8.3 On-chain activity (verified)

Reuses existing RPC infrastructure (US-022, US-023) for on-chain reads that RPC actually supports. **`eth_getLogs` cannot filter by `from`** (logs filter on contract address + topics, not tx sender). **`eth_getTransactionCount` returns nonce, not total inbound activity.** Therefore tx-history signals require an indexer API (Alchemy Transfers, Etherscan v2, or Covalent), not raw RPC.

P0 signals (raw RPC + Sourcify crosswalk only — no new external dependency):

| Signal | Source | Definition |
|---|---|---|
| `nonce` | RPC `eth_getTransactionCount(address, latest)` | Outbound tx count from this EOA. Not total activity, not inbound, not contract calls — name it accurately in UI ("outbound tx count"). |
| `firstTxBlock` + `firstTxTimestamp` | Binary search on `eth_getTransactionCount(address, blockTag)` from genesis to latest, find first block where nonce > 0. Per-chain. | Address age is the only "first activity" signal RPC can give without an indexer. |
| `contractsDeployedCount` | Sourcify deployer crosswalk: count of contracts in `sources.sourcify` whose `deployment.deployer` matches `primaryAddress`. | Reuses existing Sourcify fetch; no new RPC. |

P1 signals (require indexer API — only fire if env keys present, otherwise skip with `kind: 'unavailable'`):

| Signal | Source | Definition |
|---|---|---|
| `transferCountRecent90d` | Alchemy Transfers (`alchemy_getAssetTransfers` with `fromAddress` + block range) OR Etherscan `txlist` filtered to last 90d | Total outbound + inbound transfers in 90 days. Used by relevance `onchainRecency`. |
| `transferCountTotal` | Same APIs | Lifetime total transfer count. |

Fallback when neither indexer key is present: `relevance.onchainRecency` is computed from `nonce / cap 1000` instead of `transferCountRecent90d / cap 1000` (see Section 10.3). This degrades gracefully — recency signal becomes "lifetime outbound activity" rather than "recent activity", but the score still has a value.

Multi-chain: fetch from each chain in `sources.sourcify[].chainId`, plus mainnet + Sepolia by default. Per-chain failure isolation — one chain rate-limited does not abort the whole fetch.

### On-chain trust label

**`verified`** — RPC truth. No discount.

### 8.4 ENS-internal signals (verified)

| Signal | Source |
|---|---|
| `ensRegistrationDate` | ENS subgraph `domain.createdAt` for `rootName` |
| `subnameCount` | ENS subgraph `domain.subdomains.totalCount` |
| `textRecordCount` | ENS subgraph `domain.resolver.texts` length |
| `lastRecordUpdateBlock` | ENS subgraph events for `TextChanged` on the resolver, last entry |

ENS subgraph: Graph Network endpoint `5XqPmWe6gjyrJtFn9cLy237i4cWw2j9HcUJEXsP5qGtH` (per testing earlier — community key rate-limited; project must register own free-tier API key).

### ENS-internal trust label

**`verified`** — on-chain truth via subgraph (subgraph integrity is a known concern but treated as verified for v1).

---

## 9. Trust Model and Discount Mechanic

### Why discount unverified claims

Q2 = A (trust the claim, label it). Without a discount, any subject can fake a high score by claiming `github.owner: linus` or similar. Discount makes claimsmaking structurally weaker than verified signals.

### Discount rule

```text
For each component c in the score:
  trust_factor(c) = 1.0   if source label is "verified"
                  = 0.6   if source label is "unverified"

contribution(c) = weight(c) * value(c) * trust_factor(c)
```

In v1, only `github.*` signals are unverified. Sourcify, ENS-internal, and on-chain are all verified.

### Visible in UI

Each source tile shows a small badge:

- ✓ `verified` — green dot, no discount
- ⚠ `unverified` — amber dot, "values count for 60% — add cross-sign to lift"

This is a deliberate UX choice: judges see that the system rewards verifiability without forcing it.

### Cross-sign upgrade path (P2 / post-hack)

In v2 the manifest can include `github.verificationGist` pointing to a public GitHub Gist signed by the subject's ENS-controlled wallet. When present and signature recovers to the ENS owner, the source flips to `verified` and the discount is removed. Out of scope for v1; schema field already reserved.

---

## 10. Score Formula

### 10.1 Two-axis score, single number

```text
seniority  = sum_i (weight_i * value_i * trust_i)        # raw, discounted
relevance  = sum_j (weight_j * value_j * trust_j)        # raw, discounted
score_raw  = 0.5 * seniority + 0.5 * relevance
score_100  = round(score_raw * 100)
tier(score_100):
  S if >= 90      # v1 unreachable without verified GitHub cross-sign — see ceiling table below
  A if >= 75
  B if >= 60
  C if >= 45
  D if <  45
  U if subject has < 2 data sources with non-zero evidence (unrated)
```

Both axes range 0..1 internally. **No secondary normalization** — the discounted sum is the axis value, full stop. The 0.5/0.5 axis split is locked.

#### v1 reachable ceilings (this is structural — name it, don't hide it)

Two snapshots: **v1 P0** (everything except `ciPassRate`, `bugHygiene`, `releaseCadence`, plus partial `repoHygiene` covering only README + LICENSE — i.e. ships when US-114 lands but US-114b hasn't); **v1 full** (after US-114b extends GitHub fetcher with the remaining signals).

| Subject shape | v1 P0 max | v1 full max (US-114b shipped) | Best reachable tier |
|---|---|---|---|
| All-verified ideal (impossible in v1: GitHub trust = 0.6 always) | n/a | 1.00 | S |
| **v1 typical: claimed GitHub + everything else maxed** | **0.66** | **0.79** | A |
| Public-read inferred manifest (no opt-in) | 0.66, capped to A | 0.79, capped to A | A |
| No GitHub data at all | 0.48 | 0.48 | C |

The 0.66 figure is honest accounting: with ciPassRate / bugHygiene / releaseCadence as `null_p1` (effective value 0) and repoHygiene at ~0.4 (only README+LICENSE bits available in P0), seniority caps at 0.43 instead of 0.70. Score then maxes at `0.5 * 0.43 + 0.5 * 0.88 = 0.655 → 66`. When US-114b lands, those P1 components flip on and the same engine yields 79. **Engine signature does not change** between P0 and post-P1; only the input values change.

**v1 explicitly cannot reach S.** That is the feature — S is reserved for v2 cross-sign-verified subjects (`github.verified == true`, schema field already in place per Section 7). The UI must label this clearly: "S-tier requires verified GitHub cross-sign — coming v2." Hiding it implies S is reachable; that would mislead judges and users about what the discount actually does.

> **Demo-time honesty rule:** if US-114b has not merged by demo time, the score banner can still legitimately say "v1 max is 66 today; 79 once US-114b ships P1 GitHub signals." Do NOT advertise 79 as the live ceiling while P1 is null. Pitch + UI must match what the engine returns.

### 10.2 Seniority axis (LOCKED — Section F1 outcome)

Six components, sum of weights = 1.0:

| Component | Definition | Source | Weight | Trust |
|---|---|---|---|---|
| `compileSuccess` | (count of Sourcify projects where `creationMatch == exact_match` AND `runtimeMatch == exact_match`) / (total Sourcify projects). 0 if no projects. | Sourcify | 0.25 | verified |
| `ciPassRate` | (count of last 50 workflow runs across top-20 repos with `conclusion == success`) / (total runs). 0 if no runs. | GitHub | 0.20 | unverified |
| `testPresence` | (count of repos with `test*` workflow OR `test*/`, `tests/`, `__tests__/`, `spec/` directory) / (top-20 repos count). | GitHub | 0.15 | unverified |
| `bugHygiene` | (closed `bug`-labeled issues across top-20 repos) / (total `bug`-labeled issues). 1.0 if denom is 0. | GitHub | 0.10 | unverified |
| `repoHygiene` | mean of binary signals across top-20 repos: `README.md` length > 200 chars, `LICENSE`, `SECURITY.md`, `.github/dependabot.yml`, default-branch protection enabled (404 → 0). | GitHub | 0.15 | unverified |
| `releaseCadence` | min(releases in last 12 months, 12) / 12. | GitHub | 0.15 | unverified |

#### Seniority aggregation with trust discount

```text
seniority = 0.25 * compileSuccess
          + 0.20 * ciPassRate     * 0.6
          + 0.15 * testPresence   * 0.6
          + 0.10 * bugHygiene     * 0.6
          + 0.15 * repoHygiene    * 0.6
          + 0.15 * releaseCadence * 0.6

Effective max seniority (all unverified at 1.0, verified at 1.0) = 0.25 + 0.75 * 0.6 = 0.70.
```

Subjects without a verified GitHub cross-sign cannot exceed 0.70 on the seniority axis. **This is the feature.** Verifiability is structurally rewarded without being required.

**No secondary normalization. The discounted sum (e.g. 0.601) IS the seniority axis value (60 / 100), not a numerator over 0.70 ceiling.** UI renders `Seniority 60 (max 70 — verify GitHub to lift)`, never `0.601 / 0.700 → 0.86 → 86`. Normalizing to ceiling cancels the discount mathematically and defeats GATE-30. The ceiling label is decoration; the axis value is raw.

### 10.3 Relevance axis (PROVISIONAL — Daniel will finalize per Q3)

> Daniel deferred relevance design ("toto si potom ešte navrhneme"). Below is the v1 default that ships if no override arrives by 2026-05-09 09:00. Override at any time before US-083 is merged — formula constants live in one file.

Provisional four components, sum of weights = 1.0:

| Component | Definition | Source | Weight | Trust |
|---|---|---|---|---|
| `sourcifyRecency` | Most recent `verifiedAt` across Sourcify projects. ≤ 12 months → 1.0; ≥ 24 months → 0.0; linear between. | Sourcify | 0.30 | verified |
| `githubRecency` | (commits in default branches of top-20 repos in last 90 days) / cap 200, clipped 0..1. | GitHub | 0.30 | unverified |
| `onchainRecency` | `transferCountRecent90d` / cap 1000, clipped 0..1. **Fallback when no indexer key:** `nonce` / cap 1000 (degrades to lifetime outbound — surface in drawer). | Alchemy Transfers / Etherscan / RPC nonce fallback | 0.25 | verified |
| `ensRecency` | min(months since `lastRecordUpdateBlock`, 24) / 24, then `1 - x`. | ENS subgraph | 0.15 | verified |

#### Relevance aggregation with trust discount

```text
relevance = 0.30 * sourcifyRecency
          + 0.30 * githubRecency * 0.6
          + 0.25 * onchainRecency
          + 0.15 * ensRecency

Effective max relevance = 0.30 + 0.30*0.6 + 0.25 + 0.15 = 0.88.
```

Stronger ceiling than seniority (0.88 vs 0.70) because three of four components are verified.

**Daniel: override these weights in Section 21 D-R if you want different shape.**

### 10.4 Anti-gaming heuristics

| Attack | Defense |
|---|---|
| Empty / Hello-World contracts inflate `compileSuccess` | Minimum complexity gate: ignore Sourcify entries where `runtimeBytecode.onchainBytecode.length < 1024`. |
| Spam-create CI-passing repos | Top-20 repos by recent activity cap; very-low-star low-commit repos contribute proportionally less because they appear in samples less often (no explicit star filter — kept simple for v1). |
| Fake GitHub claim (no cross-sign) | Trust-discount 0.6 baked into every GitHub component. |
| Buy old verified contracts (transfer ownership) | `compileSuccess` uses original `deployment.deployer` only, never current owner. |
| Score inflation by adding trivial ENS subnames | `ensInternal` weight is 0.15 of relevance only; trivial subnames produce `lastRecordUpdate` events but `subnameCount` itself is not used in v1 score (kept for UI display, not score). |

### 10.5 Honest-claims rule (extends GATE-14)

UI must include the disclaimer in the score banner (not tooltip, not footnote):

> *Score measures public verifiability and code-quality signals. It does not predict intent.*

Mock data anywhere in the score path must be labeled `mock: true` per existing GATE-14.

---

## 11. UI / Routes

### Route map

| Route | Purpose | Status |
|---|---|---|
| `/` | Landing — single search bar with mode detection | extends existing |
| `/r/[name]` | Single-contract live verdict (US-068) | unchanged |
| `/b/[name]` | Bench Mode: subject benchmark | **NEW** |

The route `/a/[name]` from prior `EPIC_AGENT_PORTFOLIO_MODE.md` draft is **scrapped**. There is no agent-only path; Bench Mode is universal.

### Mode detection on landing

When user enters an ENS name on `/`:

1. Resolve ENS records.
2. If `upgrade-siren:proxy` present → route to `/r/[name]`.
3. Else if `agent-bench:bench_manifest` present → route to `/b/[name]`.
4. Else → `/b/[name]` with `confidence: public-read` (no opt-in manifest; Bench Mode infers from public sources).

Single front door for users; mode is inferred from records, not selected.

### `/b/[name]` UI breakdown

```
┌────────────────────────────────────────────────────────────────────┐
│  Header: subject ENS name, kind chip ("ai-agent" / "human-team"    │
│          / "project"), avatar                                       │
├────────────────────────────────────────────────────────────────────┤
│  Score Banner                                                       │
│  ┌─────────────┬───────────────────────────────────────────────┐   │
│  │ 63 / 100    │ Tier B                                        │   │
│  │             │ Seniority 60  ·  Relevance 66                 │   │
│  └─────────────┴───────────────────────────────────────────────┘   │
│  Disclaimer: "Score measures verifiability and code-quality        │
│  signals. It does not predict intent."                             │
├────────────────────────────────────────────────────────────────────┤
│  Source Grid (4 tiles, responsive)                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐         │
│  │ Sourcify  │  │ GitHub    │  │ On-chain  │  │ ENS       │         │
│  │ ✓verified │  │ ⚠unverif. │  │ ✓verified │  │ ✓verified │         │
│  │ contrib  │  │ contrib   │  │ contrib   │  │ contrib   │         │
│  │ +18.2     │  │ +14.4     │  │ +11.8     │  │ +5.4      │         │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘         │
│                                                                     │
├────────────────────────────────────────────────────────────────────┤
│  Score Breakdown Panel (expandable)                                 │
│  Seniority components (weight × value × trust):                    │
│    compileSuccess:    0.25 × 1.00 × 1.0 = 0.250                    │
│    ciPassRate:        0.20 × 0.92 × 0.6 = 0.110                    │
│    testPresence:      0.15 × 0.85 × 0.6 = 0.077                    │
│    bugHygiene:        0.10 × 0.78 × 0.6 = 0.047                    │
│    repoHygiene:       0.15 × 0.80 × 0.6 = 0.072                    │
│    releaseCadence:    0.15 × 0.50 × 0.6 = 0.045                    │
│    Σ = 0.601 → seniority 60 of 100                                  │
│    (max reachable v1 = 70; verify GitHub cross-sign to lift)        │
│                                                                     │
│  Relevance components (weight × value × trust):                    │
│    sourcifyRecency:   0.30 × 1.00 × 1.0 = 0.300                    │
│    githubRecency:     0.30 × 0.78 × 0.6 = 0.140                    │
│    onchainRecency:    0.25 × 0.62 × 1.0 = 0.155                    │
│    ensRecency:        0.15 × 0.45 × 1.0 = 0.068                    │
│    Σ = 0.663 → relevance 66 of 100                                  │
│    (max reachable v1 = 88; verify GitHub cross-sign to lift)        │
│                                                                     │
│  score_raw = 0.5 × 0.601 + 0.5 × 0.663 = 0.632                     │
│  Final score: 63 → Tier B                                           │
│  (max reachable v1 = 79 → A; S reserved for verified-GitHub v2)     │
└────────────────────────────────────────────────────────────────────┘
```

### Source tile expanded drawer

Click any source tile → drawer expands with raw evidence:

| Source | Drawer contents |
|---|---|
| Sourcify | Per-contract verdict (reuses `/r/[name]` UI as embedded component); storage-layout history timeline per proxy; license badges; compiler chips; bytecode-similarity submit button if any unverified |
| GitHub | Per-repo card grid (top 20): name, last push, CI badge (pass/fail rate), test presence dot, repo-hygiene score, releases count, link out |
| On-chain | First tx (date, hash), total tx, recent 90d tx, contracts-deployed count, primary address chip |
| ENS | Registration date, subname count, text record count, last update, raw `agent-bench:bench_manifest` JSON viewer |

### Reused brand tokens

All tile and verdict colors map to existing verdict tokens (US-067):

- `bg-verdict-safe` → green tile / verified badge
- `bg-verdict-review` → amber tile / unverified badge
- `bg-verdict-siren` → red tile / failed source

No new tokens introduced.

---

## 12. API Surface

### New endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/bench/[name]` | Returns full `SubjectBenchReport` JSON: manifest, sources, signals, scoreBreakdown, tier |
| `GET` | `/api/bench/[name]/score` | Returns just the score block (for programmatic consumers) |
| `POST` | `/api/bench/[name]/similarity-submit` (P1) | Triggers Sourcify similarity verification for unverified contracts; returns updated report |
| `GET` | `/api/source/sourcify/[chainId]/[address]` | Already exists indirectly; expose as caching proxy if not already |
| `GET` | `/api/source/github/[owner]` | Caching proxy for batched GitHub fetch — server holds PAT, browser never sees it |
| `GET` | `/api/source/onchain/[address]` | Caching proxy for RPC reads (first tx, counts) |
| `GET` | `/api/source/ens-internal/[name]` | Caching proxy for ENS subgraph reads |

### Reused endpoints

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/r/[name]` (US-068) | Per-contract verdict, unchanged |

### Caching extension (extends US-032)

| Cache key | TTL |
|---|---|
| `sourcify:{chainId}:{address}:fields=...` | 24h verified, 60s unverified |
| `github:{owner}:meta` | 1h |
| `github:{owner}:repos` | 1h |
| `github:{owner}:{repo}:runs` | 15min |
| `github:{owner}:{repo}:issues:bug` | 15min |
| `github:{owner}:{repo}:contents:{path}` | 1h |
| `onchain:{chain}:{address}:firstTx` | 24h (does not change) |
| `onchain:{chain}:{address}:counts` | 5min |
| `ens-internal:{name}` | 5min |
| `bench:{name}:report` | 5min |

Backing: Upstash Redis via Vercel Marketplace (existing).

---

## 13. Build Plan

> Assumes Daniel locks Section 21 decisions tonight (2026-05-08 evening). Build window: **Day 1 = Saturday 2026-05-09**, **Day 2 = Sunday 2026-05-10 morning**, submission cut-off **2026-05-10 12:00 PM**.
>
> **Agent activation contracts**: each dev stream runs an autonomous loop per its launch prompt:
> - Stream A: [`prompts/launch/dev-a-bench.md`](./prompts/launch/dev-a-bench.md)
> - Stream B: [`prompts/launch/dev-b-bench.md`](./prompts/launch/dev-b-bench.md)
> - Stream C: [`prompts/launch/dev-c-bench.md`](./prompts/launch/dev-c-bench.md)
> - Release Manager: [`prompts/launch/release-manager-bench.md`](./prompts/launch/release-manager-bench.md)

### Day 1 (Saturday 2026-05-09)

| Block | Stream | Task | Duration |
|---|---|---|---|
| 09:00–10:00 | Daniel + Orch | Confirm Section 21 decisions, finalize relevance weights (or accept provisional), naming-collision check on "Bench" sub-brand, register Graph Network API key | 1h |
| 10:00–13:00 | B | Subject resolver + GitHub fetcher skeleton (`packages/evidence/sources/github`) with PAT-backed caching layer | 3h |
| 10:00–13:00 | B (parallel) | On-chain + ENS-internal fetchers (`packages/evidence/sources/onchain`, `packages/evidence/sources/ens-internal`) | 3h parallel — split with above |
| 10:00–13:00 | C | `/b/[name]` route stub, score banner shell, source-grid layout, brand tokens wired | 3h |
| 13:00–14:00 | All | Lunch + alignment | 1h |
| 14:00–17:00 | B | Multi-source orchestrator (`packages/evidence/bench/orchestrator`) with per-source failure isolation + `MultiSourceEvidence` typed shape | 3h |
| 14:00–17:00 | B | Score engine (`packages/evidence/score`) — pure function with seniority + provisional relevance | 3h parallel |
| 14:00–17:00 | C | Source-grid tiles (4 sources) with verified/unverified badges, drawer scaffolding | 3h |
| 17:00–19:00 | B | Sourcify deep-field selector extension (`compileSuccess`, `creationMatch`, `runtimeMatch`, `signatures`, `proxyResolution`) | 2h |
| 19:00–21:00 | All | Day-1 demo: `/b/[name]` renders for at least one real existing ENS name (e.g. `vitalik.eth` in public-read mode) end-to-end | 2h |

### Day 2 (Sunday 2026-05-10)

| Block | Stream | Task | Duration |
|---|---|---|---|
| 06:00–10:00 | B | **Storage-Layout Hygiene aggregator** (highest-risk item; do this fresh and first) | 4h |
| 06:00–10:00 | C | Score breakdown panel with full per-component table; honest-claims disclaimer copy | 4h parallel |
| 06:00–10:00 | A | **Playwright e2e suite** covering scenarios: clean subject (high score), mixed subject (mid score), bench-blocked subject (no manifest = public-read), one Sourcify-only subject, one with discovered storage collision | 4h parallel |
| 10:00–11:00 | All | Integration: end-to-end demo flow; fix score-rendering mismatches | 1h |
| 11:00–11:30 | B | Bytecode-similarity submit flow (P1, only if storage hygiene closed) | 30min |
| 11:30–12:00 | All | Polish, error states, Vercel production deploy, Devfolio submission | 30min |

**Hard cuts if behind schedule:**

1. First cut: bytecode similarity submit (P1)
2. Second cut: cross-chain auto-discovery (P1)
3. Third cut: source-tile drawer richness (drop to plain tables)
4. Fourth cut: ENS-internal source tile (degrade to one signal — `ensRegistrationDate` only)
5. Never cut: storage-layout hygiene aggregator — that is the differentiator
6. Never cut: trust-discount mechanic — that is the structural defense against gaming claims

### Stream A's reduced scope this epic — with one exception

What Stream A is **not** doing:

- No batch demo-subject provisioning (no Daniel-on-site fishing through 3 unrelated public ENS names hoping their content fits).
- No new Foundry fixture contracts unless required for storage-collision Playwright scenario.

What Stream A **IS** doing this epic:

1. **Playwright e2e fixtures + MSW handlers** that lock down scenarios deterministically (US-125..US-129).
2. **One owned `kind: "ai-agent"` demo subject under `upgrade-siren-demo.eth`** (US-146, P0). Per finding from review on 2026-05-09: zero own `agent-bench:*` provisioning would weaken ENS AI Agents track positioning to "regular ENS lookup," because no judge-visible signal proves the universal-subject-registry shape exists in production. One curated subject — `siren-agent-demo.upgrade-siren-demo.eth` — is enough to demonstrate the manifest pattern live, and the fetched evidence (Sourcify projects = our existing demo proxies; GitHub owner = a real org we control or know; on-chain primary = our operator wallet `0x747E…0cfC`) is deterministic enough for the demo without further provisioning churn.

The mid-demo public-read fallback (Section 14) still uses Daniel-picked existing ENS names — that part stays unchanged. The own subject is for the sponsor-native part of the segment.

Real ENS names are used at demo time alongside the owned subject; Playwright validates that the pipeline behaves correctly across both snapshot evidence and live evidence.

---

## 14. Demo Script Extension (extends `docs/05-demo-script.md`)

### Existing 3-minute booth flow stays

The current single-contract demo (`vault.demo.upgradesiren.eth` → SAFE / dangerous → SIREN / unverified → SIREN / live public-read → REVIEW) is preserved as the opening demo.

### New 90-second Bench Mode segment (appended)

| Time | Action | Voiceover |
|---|---|---|
| 0:00 | Type a real existing ENS name (TBD on-site by Daniel from a hackathon team's agent or any well-known agent ENS) | "Same product, second front door. Any ENS name." |
| 0:10 | Score banner renders: e.g. "63 / 100 — Tier B — Seniority 60, Relevance 66" | "One number. Seniority and relevance. Disclaimer is right there: it measures verifiability, not intent." |
| 0:20 | Source grid renders four tiles, GitHub tile shows `⚠ unverified` badge | "Four sources. GitHub is unverified — values count for 60 percent until cross-signed. Sourcify, on-chain, ENS — all verified." |
| 0:35 | Click Sourcify tile → drawer opens → upgrade-history timeline → row highlights `slot 5: uint256 → address` red | "Sourcify drawer: every contract, every upgrade. Slot 5 changed type — storage collision. The score reflects it." |
| 0:55 | Back to grid, click GitHub tile → repo grid → highlight one repo with green CI badge | "GitHub drawer: top 20 repos, CI pass rate, test presence, bug hygiene, releases. All from public API." |
| 1:10 | Click on-chain tile → first tx 2018, recent 90d tx 412 | "On-chain: first transaction, total volume, recent activity." |
| 1:20 | (If P1 shipped) Click "Submit similarity" on the unverified Sourcify entry → score climbs visibly | "The unverified contract is structurally similar to a known one. Sourcify auto-verifies. Score climbs — without any on-chain action." |
| 1:30 | Sponsor close | "For Sourcify: the only verified seniority source. For ENS: universal subject registry. For Future Society: public-good transparency, not just for upgrades." |

---

## 15. Acceptance Gates (extends `docs/06-acceptance-gates.md`)

### New gates proposed

| Gate | Tier | Requirement |
|---|---|---|
| GATE-27 | P0 | `/b/[name]` resolves a real ENS name and renders within 5 seconds (cached) for at least three demo scenarios |
| GATE-28 | P0 | Score banner displays a single 0–100 number, both axis values, tier label, and the honest-claims disclaimer |
| GATE-29 | P0 | Source grid renders 4 tiles (Sourcify, GitHub, On-chain, ENS) with verified/unverified badges |
| GATE-30 | P0 | Trust-discount factor `0.6` is applied to every unverified-source signal and is reflected in the breakdown panel |
| GATE-31 | P0 | Storage-layout hygiene aggregate is shown for at least one proxy with multiple verified implementations in the Sourcify drawer |
| GATE-32 | P0 | Public-read fallback: a subject without `agent-bench:bench_manifest` produces a labeled `confidence: public-read` report with tier ceiling A |
| GATE-33 | P1 | Bytecode similarity submit produces a visible score change for at least one unverified-Sourcify scenario |
| GATE-34 | P0 | Playwright e2e suite covers at least 4 scenarios deterministically and runs green in CI |

### Existing gates that gain a second binding

| Gate | Existing binding | Bench Mode binding |
|---|---|---|
| GATE-1 | User enters ENS, gets verdict | Also: user enters subject ENS, gets benchmark score |
| GATE-3 | ENS records resolved live | Also: `agent-bench:*` records resolved live |
| GATE-5 | Sourcify fetched live | Now in parallel for N projects |
| GATE-12 | Storage-layout result shown | Now also aggregated to subject-level hygiene |
| GATE-14 | `mock: true` everywhere mocks live | Extended to GitHub/RPC/ENS-subgraph mocks in Playwright fixtures |
| GATE-16 | Sourcify central to verdict | Strengthened: parallel + storage-history; the only verified seniority source |
| GATE-17 | ENS central to identity | Promoted: ENS is the universal subject registry |
| GATE-20 | Verdict in 5 seconds | Bench score in 5 seconds for cached real subjects |

### Kill conditions extended

Existing kill conditions remain. Add:

- Score is computed by an LLM (reject — must be deterministic formula)
- Bench profile renders without any per-source live fetch (reject — sources must be live, not mocked, except inside Playwright runs explicitly labeled)
- Trust-discount is hidden or absent from the breakdown panel (reject — it is the structural defense)

---

## 16. Backlog Seed (HISTORICAL IDs only — see live backlog for current numbers)

> **HISTORICAL DRAFT IDs — DO NOT USE FOR PR TITLES, BRANCHES, OR STATUS.**
>
> The IDs `US-076..US-110` in this section reflect the original draft numbering as of 2026-05-08, before the Epic 1 build pipeline consumed `US-076..US-084` for unrelated stories. The live backlog at `docs/13-backlog.md` is the **authoritative source** and numbers Bench Mode stories as **US-111..US-145** (plus US-114b and US-146 added 2026-05-09 per review findings).
>
> ID mapping (EPIC ↔ live backlog):
>
> | EPIC US | Backlog US | Title (abbreviated) |
> |---|---|---|
> | US-076 | **US-111** | Subject ENS resolver |
> | US-077 | **US-112** | Public-read fallback resolver |
> | US-078 | **US-113** | Sourcify deep field selectors |
> | US-079 | **US-114** | GitHub source fetcher (P0 — narrowed: account + repos + README/LICENSE/test + pushed_at) |
> | — | **US-114b** | GitHub source fetcher P1 enrichment (NEW per review 2026-05-09: ciPassRate / bugHygiene / releaseCadence / SECURITY.md / dependabot / branch-protection) |
> | US-080 | **US-115** | On-chain source fetcher (RESCOPED per review 2026-05-09: P0 = nonce + first-tx-block via binary-search + Sourcify deployer crosswalk only; transfers via Alchemy/Etherscan are P1) |
> | US-081 | **US-116** | ENS-internal source fetcher |
> | US-082 | **US-117** | Multi-source orchestrator |
> | US-083 | **US-118** | Score engine (RAW-DISCOUNTED axis — no normalization, per Section 10 update 2026-05-09) |
> | US-084 | **US-119** | Storage-Layout Hygiene aggregator |
> | US-085 | US-120 | Cross-chain auto-discovery |
> | US-086 | US-121 | Bytecode similarity submit |
> | US-087 | US-122 | Cache extension |
> | US-088 | US-123 | Source-pattern detection |
> | US-089 | US-124 | License + compiler-recency extraction |
> | US-090..US-094 | US-125..US-129 | Playwright harness + 4 scenarios |
> | US-095 | US-130 | Optional Foundry storage-collision fixture |
> | — | **US-146** | Provision one owned `kind:"ai-agent"` subject under `upgrade-siren-demo.eth` (NEW per review 2026-05-09; Stream A) |
> | US-096..US-105 | US-131..US-140 | Stream C UI items |
> | US-106..US-110 | US-141..US-145 | Tracker items |
>
> **The tables below stay as a historical record of the original draft sizing/dependency analysis. For execution, read `docs/13-backlog.md` only.**

Numbering follows existing convention. All Owner column assumes existing Stream A/B/C ownership. PR Reviewer + Daniel + Orch unchanged.

### Stream B — Evidence Engine

| ID | Title | Owner | Pri | Effort | Depends on | Sponsor | Gates |
|---|---|---|---|---|---|---|---|
| US-076 | Subject ENS resolver: parse `agent-bench:bench_manifest` text record + JSON schema validator | B | P0 | M | US-017 | ENS | GATE-3, GATE-27 |
| US-077 | Public-read fallback resolver: infer partial manifest from ENS `addr()` + Sourcify all-chains lookup | B | P0 | M | US-076 | ENS, Sourcify | GATE-32 |
| US-078 | Sourcify source fetcher with deep field selectors (`compileSuccess`, `signatures`, `proxyResolution`, `creationMatch`, `runtimeMatch`) | B | P0 | M | US-024, US-025 | Sourcify | GATE-16 |
| US-079 | GitHub source fetcher: account meta, top-20 repos, workflow runs, contents probes, issues, releases (PAT-backed, cached) | B | P0 | L | US-076 | - | GATE-29 |
| US-080 | On-chain source fetcher: first tx, tx counts (latest + 90d), contracts-deployed count via Sourcify deployer crosswalk | B | P0 | M | US-022 | - | GATE-29 |
| US-081 | ENS-internal source fetcher: registration date, subname count, text record count, last update via subgraph | B | P0 | M | US-017 | ENS | GATE-29 |
| US-082 | Multi-source orchestrator: parallel runner with per-source failure isolation; emits `MultiSourceEvidence` | B | P0 | M | US-076, US-078, US-079, US-080, US-081 | - | GATE-27 |
| US-083 | Score engine: pure function with locked seniority weights + provisional relevance weights + trust-discount aggregation; emits `ScoreBreakdown` | B | P0 | M | US-082 | - | GATE-28, GATE-30 |
| US-084 | Storage-Layout Hygiene aggregator across implementation history per proxy | B | P0 | L | US-027, US-078 | Sourcify | GATE-31 |
| US-085 | Cross-chain auto-discovery via `/v2/contract/all-chains/{address}` for Sourcify entries | B | P1 | S | US-078 | Sourcify | - |
| US-086 | Bytecode similarity submit flow: POST + poll + re-evaluate score | B | P1 | M | US-078 | Sourcify | GATE-33 |
| US-087 | Cache extension for portfolio hit rate (extends US-032): GitHub/RPC/ENS-subgraph keys | B | P0 | S | US-032, US-079, US-080, US-081 | - | GATE-20 |
| US-088 | Source-pattern detection from `sources` (Pausable, Ownable, UUPS, AccessControl) for drawer badges | B | P1 | M | US-078 | Sourcify | - |
| US-089 | License + compiler-recency extraction (data path; not yet a score component but available for drawer + future relevance redesign) | B | P1 | S | US-078 | Sourcify | - |

### Stream A — Contract Fixtures + Playwright (per F3 reduced scope)

| ID | Title | Owner | Pri | Effort | Depends on | Sponsor | Gates |
|---|---|---|---|---|---|---|---|
| US-090 | Playwright e2e harness in `apps/web` with MSW (Mock Service Worker) for fixturing GitHub / Sourcify / RPC / subgraph responses | A | P0 | M | US-082 | - | GATE-34 |
| US-091 | Playwright scenario: high-score subject (verified Sourcify + verified GitHub-shaped fixtures) | A | P0 | S | US-090, US-083 | - | GATE-34 |
| US-092 | Playwright scenario: mid-score subject (mixed verification states) | A | P0 | S | US-090, US-083 | - | GATE-34 |
| US-093 | Playwright scenario: public-read fallback subject (no `agent-bench:bench_manifest` in fixtures) | A | P0 | S | US-090, US-077 | - | GATE-32, GATE-34 |
| US-094 | Playwright scenario: storage-collision-detected subject (uses fixture data shaped to trigger COLLISION in `US-084`) | A | P0 | M | US-090, US-084 | - | GATE-31, GATE-34 |
| US-095 | Optional Foundry fixture: a proxy with deliberate storage-collision upgrade if the existing `vault.demo.upgradesiren.eth` ones do not already cover this for live snapshotting (only if Day 2 morning shows lack) | A | P2 | M | US-001..US-005 | Sourcify | GATE-31 |

### Stream C — Web UX

| ID | Title | Owner | Pri | Effort | Depends on | Sponsor | Gates |
|---|---|---|---|---|---|---|---|
| US-096 | `/b/[name]` route + landing mode-detection (route to `/r` if `upgrade-siren:proxy`, else `/b`) | C | P0 | M | US-082 | - | GATE-1, GATE-27 |
| US-097 | Score banner component: 0–100, axis values, tier badge, disclaimer copy | C | P0 | M | US-083 | - | GATE-28 |
| US-098 | Source grid component: 4 tiles with verified/unverified badges and contribution numbers | C | P0 | M | US-082, US-083 | - | GATE-29, GATE-30 |
| US-099 | Score breakdown panel: full component-by-component table with weight × value × trust math visible | C | P0 | M | US-083 | - | GATE-30 |
| US-100 | Sourcify source drawer (reuses `/r/[name]` UI as embedded component, plus storage-history timeline) | C | P0 | L | US-068, US-084 | Sourcify | GATE-31 |
| US-101 | GitHub source drawer (top-20 repos card grid with CI / test / hygiene / releases) | C | P0 | M | US-079 | - | - |
| US-102 | On-chain source drawer (first tx, totals, recent activity) | C | P1 | S | US-080 | - | - |
| US-103 | ENS source drawer (registration date, subname/record counts, raw manifest JSON viewer) | C | P1 | S | US-081 | ENS | - |
| US-104 | Honest-claims disclaimer copy reviewed by Daniel/Orch | C | P0 | XS | US-097 | - | - |
| US-105 | Bytecode similarity-submit button + optimistic re-render after Sourcify confirms | C | P1 | S | US-086 | Sourcify | GATE-33 |

### Tracker

| ID | Title | Owner | Pri | Effort | Depends on |
|---|---|---|---|---|---|
| US-106 | Update demo script (`docs/05-demo-script.md`) with 90-second Bench Mode segment | Orch | P0 | S | US-097 |
| US-107 | Update sponsor pitch (`docs/07-sponsor-fit.md`) with Bench Mode delta for ENS AI-Agents track + Sourcify "only verified seniority source" framing | Orch | P0 | S | US-082 |
| US-108 | Naming-collision check for "Upgrade Siren Bench" sub-brand: existing crypto / web3 products named "Bench" or "Siren Bench"; document outcome | Daniel + Orch | P0 | XS | none |
| US-109 | Mentor sweep on Sourcify (similarity submit + storage-history use) and ENS (AI-Agents track judging criteria) | Daniel | P0 | S | US-082 |
| US-110 | Update SCOPE.md Section 1 + Section 5 with Bench Mode delta after this epic merges | Orch | P0 | S | US-082, US-097 |

---

## 17. Risk Register (extends `docs/10-risks.md`)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Storage-layout aggregator complexity blows past 4h budget | High | High | Time-boxed; fallback to single-pair diff (current vs previous only); aggregator becomes P1 polish if not closed by 10:00 Day 2 |
| GitHub rate limit during demo | Medium | High | PAT in env; aggressive 1-hour cache; demo subjects pre-warmed Day 1 evening |
| ENS subgraph rate limit | Medium | Medium | Register own Graph Network API key Day 1 09:00; web3.bio fallback for `addr()` resolution |
| `proxyResolution.implementations` ordering ambiguity | Medium | Medium | Re-order by RPC deployment block; document fallback to `verifiedAt asc` |
| Compiler version drift breaks raw-type-string comparison | Low | Medium | Compare by `label + offset + size`, not type string |
| Diamond proxies in real demo subject | Low | Low | Document as known limit; tile shows `kind: diamond, hygiene unsupported` |
| Score gameability raised by judges | High | Medium | Trust-discount mechanic is the answer; documented anti-gaming heuristics; weights favor verified signals |
| Brand confusion between `r/[name]` and `b/[name]` | Medium | Low | Single front door with mode detection; identical brand tokens; sub-tagline "No data, no score." used only on `/b/[name]` |
| Sponsor judges read this as "two products in one" | Medium | Medium | Pitch frames it as "two front doors, one engine"; demo emphasizes shared verdict pipeline reused inside Sourcify drawer |
| Real-ENS demo subject scores poorly and embarrasses subject | Medium | Low | Demo discloses publicly that score is computed live from public sources; Daniel chooses on-site which subject to demo (one with fair score) |
| Provisional relevance weights ship without Daniel review | Medium | Medium | Default weights are flagged with `// PROVISIONAL — DANIEL REVIEW PENDING` constants; entire formula sits in one file (US-083) for last-minute swap |
| `agent-bench:bench_manifest` schema clashes with future ENS standard | Low | Low | Schema versioned `agent-bench-manifest@1`; one-line bump path |
| Naming "Upgrade Siren Bench" collides with existing crypto product | Low | Medium | US-108 collision check in Daniel's first hour Day 1 |

---

## 18. Naming and Brand

**No new product brand introduced at the top level.** Bench Mode lives under the existing Upgrade Siren brand and tokens.

| Surface | Naming |
|---|---|
| Master tagline | **"No source, no upgrade."** (unchanged) |
| Bench-Mode sub-tagline | **"No data, no score."** (used only on `/b/[name]`) |
| Public title in browser tab | "Upgrade Siren Bench — `<subject ENS>`" on `/b/[name]`; existing on `/r/[name]` |
| Submission positioning | Single product (Upgrade Siren) with two surfaces: per-upgrade verdict (`/r/[name]`) and per-subject benchmark (`/b/[name]`) |
| Sub-brand internal name | "Upgrade Siren Bench" — used in pitch, README, Devfolio submission |

### Anti-pattern check (per `feedback_anti_patterns.md`)

- No new platform / OS / framework / boundary / layer / engine vocabulary in pitch ✓
- Sub-brand "Bench" is a generic English word; collision check is US-108 (P0, Effort XS, Daniel's first hour Day 1)
- No rebrand mid-stream ✓ — naming locked at this draft, before code starts
- No 5-track expansion ✓ — still 2 sponsors + 1 organizer
- Naming research file `docs/14-naming-bench.md` to be created by Orch alongside US-108 outcome

### What if "Bench" collides

Fallback names ranked: "Upgrade Siren Profile", "Upgrade Siren Score", "Upgrade Siren Stand". Daniel picks at US-108 outcome.

---

## 19. Stack Defaults (no change)

Per `feedback_reuse_stack.md` defaults:

| Layer | Default |
|---|---|
| Frontend | Next.js 16 App Router + Turbopack |
| Styling | Tailwind 4 + shadcn/ui + brand tokens (US-067) |
| LLM (only if used at all) | Vercel AI Gateway |
| Compute | Vercel Fluid Compute, Node 24, function timeout 300s |
| Config | `vercel.ts` |
| Monorepo | pnpm workspaces (existing) |
| Solidity | Foundry (existing, unchanged scope) |
| KV / cache | Upstash Redis via Marketplace (existing US-032 backing) |
| Blob | Vercel Blob (for off-chain attestations P2) |
| Cron | Vercel Crons via `vercel.ts` (none required for Bench Mode P0) |
| **Test runner (e2e)** | **Playwright** (NEW — replaces Stream A demo provisioning per F3) |
| Mock layer for e2e | MSW (Mock Service Worker) for HTTP API fixturing |

No new sponsor SDKs. No new direct dependencies beyond:

- `@octokit/rest` or raw `fetch` for GitHub API (raw `fetch` preferred — keep deps lean)
- `@playwright/test` (devDependency)
- `msw` (devDependency)

---

## 20. Submission Checklist Delta

In addition to existing `docs/12-implementation-roadmap.md` checklist:

- [ ] `/b/[name]` route renders within 5 seconds for at least 3 real existing ENS names (cached)
- [ ] Score banner displays score, axes, tier, disclaimer
- [ ] Source grid renders 4 tiles with verified/unverified badges
- [ ] Trust-discount visible in breakdown panel
- [ ] Storage-layout hygiene aggregate visible for at least one demo proxy
- [ ] Public-read fallback works for an ENS name without `agent-bench:bench_manifest`
- [ ] Playwright e2e suite green in CI for all P0 scenarios
- [ ] Demo script `docs/05` includes the new 90-second Bench Mode segment
- [ ] Sponsor pitch `docs/07` includes Bench Mode delta
- [ ] README mentions Bench Mode and links to a live `/b/[name]` example
- [ ] No mock data unlabeled (`mock: true` rule extended to Bench Mode and Playwright fixtures)
- [ ] Naming-collision check (US-108) outcome documented

---

## 21. Open Decisions (Daniel)

> **Tieto rozhodnutia musíš lock-núť pred tým ako team začne. Bez nich epic stojí.**

| # | Otázka | Default ak nelock-neš | Tvoja odpoveď |
|---|---|---|---|
| D-A | **Provisional relevance weights** v Section 10.3: 0.30 sourcifyRecency / 0.30 githubRecency / 0.25 onchainRecency / 0.15 ensRecency. Akceptuješ ako provisional ship-shape, alebo chceš inú kombináciu pred kódom? | Akceptujem provisional, override pred US-083 merge | **LOCKED 2026-05-09:** Akceptujem default. Provisional weights ship; override window stays open until US-118 (renumbered from EPIC US-083) merges. |
| D-B | **Tier ceilings**: subject bez verified GitHub cross-sign maxuje senioritu na 0.70. Subject bez `agent-bench:bench_manifest` (public-read mode) maxuje tier na A. Akceptuješ obe ceilings? | Áno |**LOCKED 2026-05-09:** Akceptujem default. Both ceilings enforced in US-118. |
| D-C | **Sub-brand "Upgrade Siren Bench"**: akceptuješ pre v1, s collision check ako US-108? Alebo iný sub-brand z fallback list ("Profile" / "Score" / "Stand") | "Bench" preferred, fallback na "Profile" ak collision |**LOCKED 2026-05-09:** Akceptujem default. "Upgrade Siren Bench" preferred; fallback "Profile" if US-143 collision check fires. |
| D-D | **ENS sponsor track**: AI Agents ($2K) primary; Most Creative ($2K) fallback. Lock? | Lock AI Agents primary |**LOCKED 2026-05-09:** Akceptujem default. AI Agents track primary. |
| D-E | **Storage-Layout Hygiene aggregator** je 4h Day 2 ráno P0 bet. Confirm priority P0? | Áno, P0 |**LOCKED 2026-05-09:** Akceptujem default. US-119 P0; never cut per Section 13. |
| D-F | **Bytecode similarity submit** P1 (must-attempt, first cut). OK? | OK P1 |**LOCKED 2026-05-09:** Akceptujem default. US-121 P1; first cut if Day 2 morning slips. |
| D-G | **Trust-discount factor**: lock 0.6 pre unverified Github? Inú hodnotu (0.5 strict, 0.7 lax)? | 0.6 |**LOCKED 2026-05-09:** Akceptujem default. `TRUST_DISCOUNT_UNVERIFIED = 0.6` exported as named constant from `packages/evidence/src/score/weights.ts`. |
| D-H | **Demo subjects**: zero provisioning (per F3). Daniel-on-site vyberie 3 existujúce ENS mená. Confirm bez fallback subjektu? | Confirm |**LOCKED 2026-05-09:** Akceptujem default. Stream A reduced scope: Playwright e2e only, no demo provisioning. |
| D-I | **Public-read fallback z neopt-in-utých subjektov**: pre demo akceptuješ že "neopt-inutý subject má tier ceiling A"? | Áno |**LOCKED 2026-05-09:** Akceptujem default. Tier ceiling A for public-read enforced in US-118. |
| D-J | **Umia track**: aktívne cieliť alebo nechať optional? | Optional, no change |**LOCKED 2026-05-09:** Akceptujem default. Umia stays optional, no proactive targeting. |

Po lock-ine D-A..D-J:

- Orch zaktualizuje `SCOPE.md` Section 1 a Section 5 s Bench Mode delta (US-110)
- Orch otvorí PR-y: `docs/06-acceptance-gates.md` (GATE-27..GATE-34), `docs/13-backlog.md` (US-076..US-110), `docs/05-demo-script.md` (Bench segment), `docs/07-sponsor-fit.md` (ENS AI Agents + Sourcify deepening delta), `docs/14-naming-bench.md` (collision check outcome)
- Stream B začne US-076; Stream C začne US-096 stub; Stream A začne US-090 Playwright harness
- Daniel Day 1 09:00 spraví naming collision check (US-108), schváli relevance weights (D-A), reschvaľuje pred US-083 merge

---

## 22. References

- `SCOPE.md` — locked Upgrade Siren scope
- `docs/04-technical-design.md` — existing architecture
- `docs/06-acceptance-gates.md` — GATE-1..26 register
- `docs/13-backlog.md` — US-001..US-075 existing
- `EPIC_AGENT_PORTFOLIO_MODE.md` — superseded by this v1
- `feedback_winning_primitives.md` (memory) — 12 primitives, combo patterns
- `feedback_sponsor_native_test.md` (memory) — discriminating test per sponsor
- `feedback_anti_patterns.md` (memory) — avoidance checklist
- `feedback_reuse_stack.md` (memory) — default tech stack
- `feedback_pre_build_gate.md` (memory) — gate 1 + gate 8 deal-breakers
- Sourcify API docs: <https://docs.sourcify.dev/docs/api/>
- Sourcify swagger: <https://sourcify.dev/server/api-docs/swagger.json>
- GitHub REST API: <https://docs.github.com/en/rest>
- Sourcify field reference (P0/P1/P2) — internal doc shared by Daniel 2026-05-08
- ENS subgraph (Graph Network): `5XqPmWe6gjyrJtFn9cLy237i4cWw2j9HcUJEXsP5qGtH`

---

**End of EPIC v1 — LOCKED 2026-05-09.** All Section 21 decisions resolved (D-A through D-J accepted as defaults). Code unblocked; dev pipeline activates on next polling cycle.
