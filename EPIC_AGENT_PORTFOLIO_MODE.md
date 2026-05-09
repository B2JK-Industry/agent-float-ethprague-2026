# EPIC: Agent Portfolio Mode

> **STATUS: SUPERSEDED 2026-05-09 by `EPIC_BENCH_MODE.md`.**
>
> **Do not implement this document.** Sourcify-only portfolio scope was replaced by the multi-source Bench Mode benchmark on 2026-05-09. The route `/a/[name]` proposed here is **scrapped**; the live route is `/b/[name]` per `EPIC_BENCH_MODE.md` Section 11. The locked backlog stories live in `docs/13-backlog.md` as US-111..US-146 (Bench Mode section).
>
> This file is retained as a historical record of the rejected single-source design — useful for understanding why Bench's multi-source orchestrator + trust-discount mechanic exist. Do not pull stories, schemas, or routes from below.
>
> ---
>
> **Type:** Epic / Scope Extension to Upgrade Siren *(historical)*
> **Status:** DRAFT v0 — superseded before lock-in
> **Date drafted:** 2026-05-08
> **Superseded:** 2026-05-09 by `EPIC_BENCH_MODE.md`
> **Hackathon submission deadline:** 2026-05-10 12:00 PM CET via Devfolio
> **Related authoritative docs:** `EPIC_BENCH_MODE.md`, `SCOPE.md`, `docs/04-technical-design.md`, `docs/06-acceptance-gates.md`, `docs/12-implementation-roadmap.md`, `docs/13-backlog.md`

---

## 0. Executive Summary

Upgrade Siren today resolves **one** ENS contract map (e.g. `vault.demo.upgradesiren.eth`) and produces **one** verdict (`SAFE` / `REVIEW` / `SIREN`) for the proxy at that name. This epic extends the product to a second front-door:

> **Agent Portfolio Mode** — the user enters an ENS name that represents an **agent or organization** (e.g. `someagent.eth`) and receives an **aggregate verdict** across **all of that agent's contracts**, plus a per-agent **score (0–100)** with a tier label.

The per-contract verdict engine already shipping (US-026 ABI diff, US-027 storage diff, US-029 verdict engine) is **reused unchanged**. Agent Mode is an orchestration + aggregation layer on top, plus deeper Sourcify field usage that benefits both modes.

**What stays:**

- Sourcify primary, ENS secondary, Future Society organizer track
- Verdict tokens `SAFE` / `REVIEW` / `SIREN` per individual contract
- EIP-712 signed Siren Reports
- Public-read fallback
- Brand manual, color tokens, font stack (US-067)
- Streams A / B / C ownership map
- All existing GATE-1..GATE-26 acceptance criteria

**What is new:**

- Agent ENS schema: subnames or `upgrade-siren:projects` text record listing portfolio contracts
- Multi-contract orchestrator (parallel verdict pipeline)
- Per-agent score formula with tier mapping
- Storage-hygiene aggregate (proxy upgrade safety across the portfolio)
- New routes `/a/[agent]` (agent profile) and optional `/compare/[a]/[b]`
- Deeper Sourcify field usage per the P0/P1/P2 reference (Section 8) — benefits single-contract mode too
- Optional: bytecode similarity submit, cross-chain auto-discovery

**Cost / risk:**

- Estimated 14–20 dev-hours across all streams
- Highest risk: storage-layout diffing across implementation history (compiler-version-dependent JSON shape)
- Highest reward: turns Upgrade Siren from a one-shot tool into a benchmark-ish primitive (Reputation primitive #4)

**Daniel decision required (Section 18) before any code is written.**

---

## 1. Strategic Context

### Where Upgrade Siren is today

Upgrade Siren resolves one ENS name as one contract map: stable `upgrade-siren:proxy`, `upgrade-siren:owner`, atomic `upgrade-siren:upgrade_manifest`. Verdict pipeline runs against that one proxy. Live demo route is `/r/[name]` (US-068 merged).

### The new question being asked

> *"What if the ENS name represents an agent or organization rather than a single contract? How do I evaluate the agent's overall on-chain footprint before I trust it?"*

This is a complementary surface, not a competing one. Single-contract mode answers *"is this upgrade safe?"*. Agent Portfolio Mode answers *"is this agent safe overall?"*.

### Why this is extension, not pivot

| Dimension | Single-Contract (today) | Agent Portfolio (new) |
|---|---|---|
| ENS resolves to | One proxy contract | An agent / org with N contracts |
| Verdict scope | Per upgrade event | Aggregate of N per-contract verdicts |
| Sourcify usage | Per single contract | Per N contracts in parallel |
| EIP-712 signing | Per Siren Report | Same per report; agent index optionally signed by `upgrade-siren:owner` of agent root |
| Backend logic | Existing verdict engine | **Reuses** verdict engine; adds aggregation |

Two demo flows, one shared engine. No part of the existing scope is invalidated.

### Sponsor-native delta

| Sponsor | Today | After Agent Mode |
|---|---|---|
| Sourcify | "evidence layer for one contract" | "**evidence layer queried in parallel for portfolios**, plus storage-layout diffing across implementation history per proxy" — strictly stronger |
| ENS | "contract map for one proxy" (Most Creative) | "**agent identity registry** with subnames-as-projects" — exact shape sponsor explicitly cites for AI Agents track |
| Future Society | "public-good safety for one upgrade" | "public-good safety for **agent due-diligence**" — same primitive, broader |
| Umia (optional) | "Siren Agent due-diligence per protocol" | "**per-agent scoring API** consumable by venture launch reviewers" — clearer revenue narrative |

The extension does not weaken any sponsor-native test. It strengthens ENS in particular, moving from "Most Creative" framing to also targeting "AI Agents" track.

---

## 2. Pitch

### Memorable line (Gate 8 candidate, deal-breaker)

> *"Type any agent's ENS name. See every contract they ship, source-verified or not, with one score."*

### Five-second meta moment (Gate 1 candidate, deal-breaker)

User types `someagent.eth` → page renders an immediate **tile grid** of that agent's contracts, each tile color-coded by per-contract verdict (`SAFE` green / `REVIEW` amber / `SIREN` red). A score banner at the top reads *"Agent Score: 67 / 100 — Tier B — 4 of 5 contracts verified, 1 storage-collision warning."* No slides, no voiceover required.

### Tagline candidates

| Candidate | Tone |
|---|---|
| **No source, no agent.** | Extension of existing "No source, no upgrade" |
| **Every contract, every upgrade, with proof.** | Brand-coherent expansion |
| **See what an agent really shipped.** | Plainer |

Recommendation: keep **"No source, no upgrade."** as the master tagline; introduce **"No source, no agent."** as the agent-mode-specific sub-tagline used only on `/a/[agent]` routes.

---

## 3. Primary User and Problem

| Field | Value |
|---|---|
| Primary user | Someone evaluating an agent before delegating capital, voting, or transacting (DAO voter, fund analyst, wallet user, another agent) |
| Job to be done | "Should I trust this agent's contracts before I act?" |
| Today they have to | Hand-walk Etherscan + Sourcify per contract; no aggregate view; no benchmark; no diff history |
| Agent Portfolio Mode delivers | One ENS lookup → portfolio → per-contract verdict + aggregate score → expanded evidence on demand |

This is the same `Future Society` public-good user category that current Upgrade Siren targets, just expanded from per-upgrade to per-agent.

---

## 4. Sponsor Strategy (delta from current SCOPE Section 5)

| Priority | Track | Status | Delta |
|---|---|---|---|
| 1 | **Sourcify Bounty** | Submit | Deeper API surface; storage-layout aggregate; optional similarity submit |
| 2 | **ENS** | Submit | Track choice **changes**: instead of "Most Creative", target **AI Agents ($2K)** as primary, keep Most Creative as fallback. ENS subnames or text records become agent registry |
| 3 | **ETHPrague Future Society** | Submit | Unchanged |
| Optional | **Umia Best Agentic Venture** | Submit only on Daniel approval | Stronger narrative now: "agent reputation API" has revenue path |

Hard cap of **2 sponsor tracks + 1 organizer track** is preserved.

---

## 5. 12 Winning Primitives Mapping (delta)

Existing scope used **#2 Proof** (Sourcify-backed evidence) + **#5 Identity** (ENS contract map) + partial **#12 Mandate** (atomic manifest as mandate boundary). Agent Mode adds:

| Primitive | Where it lives | Strength |
|---|---|---|
| **#5 Identity** | ENS-anchored agent root | promoted from secondary to **primary core** |
| **#2 Proof** | Per-contract Sourcify match + storage-layout history | **strengthened** — now multi-contract |
| **#4 Reputation** | Aggregate score, tier, storage hygiene | **NEW** — derived from on-chain truth, not opinion |
| **#8 Human-in-the-loop** | Optional human/agent attestation on agent profile | bonus, P2 stretch |

Combo `Identity + Proof + Reputation` matches winning shapes (MeritScore, ENSign, ERC-8004 family). Three primitives, not five — keeps the pitch tight.

---

## 6. Architecture

### High-level data flow

```
Browser
  ↓ enters agent.eth at /a/[agent]
Next.js 16 Server Component (apps/web)
  ↓
Agent Resolver (packages/evidence/agent-resolver)
  • viem + ENSjs: agent owner address, subnames, text records
  • parses upgrade-siren:projects manifest if present
  • returns: Project[] = [{chainId, address, label, source}]
  ↓ Project[]
Multi-Contract Orchestrator (packages/evidence/portfolio)
  • Promise.all over Project[] → existing per-contract verdict engine (US-029)
  • each result: SirenReport (existing schema)
  ↓ SirenReport[]
Aggregate Score Engine (packages/evidence/score)
  • applies formula (Section 9)
  • returns: AgentReport {agent, projects, scoreBreakdown, tier, hygiene}
  ↓
UI: tile grid + score banner + per-tile drawer
```

### Component reuse vs. new

| Component | Status | Notes |
|---|---|---|
| ENS resolver (US-017) | **Reuse** | Already reads stable + manifest text records; extend reader to enumerate subnames and read `upgrade-siren:projects` array |
| EIP-1967 slot reader (US-022) | **Reuse** | Per project as today |
| `Upgraded` event reader (US-023) | **Reuse** | Per project |
| Sourcify fetcher (US-024, US-025) | **Reuse + extend** | Add deeper field selection (Section 8) |
| ABI risky-selector diff (US-026) | **Reuse** | Per project |
| Storage-layout diff (US-027) | **Reuse + aggregate** | Per project; aggregate becomes hygiene metric |
| Verdict engine (US-029) | **Reuse** | Per-project SAFE/REVIEW/SIREN unchanged |
| EIP-712 signer (US-015, US-028) | **Reuse** | Optional aggregate-report signing later |
| Sourcify cache (US-032) | **Reuse + extend** | Higher hit rate now matters more |
| Brand tokens (US-067) | **Reuse** | Verdict tokens already match tile colors |
| **Agent resolver** | **NEW** | Subname enumeration + projects-text-record parser |
| **Portfolio orchestrator** | **NEW** | Parallel runner with per-project failure isolation |
| **Score engine** | **NEW** | Pure function over `SirenReport[]` |
| **Compare engine** | **NEW (P2)** | Pairwise score diff |

---

## 7. ENS Schema for Agent

Three schemas considered. Lock one before code.

### Variant A: ENS subnames (per-project)

```text
agent.eth                                ← root, points to agent owner address
├── treasury.agent.eth                   ← subname per project
│   • addr           → 0xAAA...           (contract)
│   • upgrade-siren:chain_id  → "1"
│   • upgrade-siren:label     → "Treasury Multisig"
├── vault.agent.eth
│   • addr           → 0xBBB...
│   • upgrade-siren:chain_id  → "1"
│   • upgrade-siren:label     → "Yield Vault"
└── ...
```

- **Pros:** Each project is a first-class ENS node; reuses existing per-contract `upgrade-siren:*` records; sponsor-native AI-Agents-track shape; subnames can have their own owners (delegatable).
- **Cons:** Subname registration cost per project; UX of subname provisioning is heavier; demo seed time is higher.

### Variant B: Single `upgrade-siren:projects` text record on agent root

```text
agent.eth
  • addr                       → agent owner address
  • upgrade-siren:projects     → JSON manifest (see below)
  • upgrade-siren:owner        → 0xOWNER (signs aggregate report)
```

```json
{
  "schema": "upgrade-siren-projects@1",
  "projects": [
    { "chainId": 1,        "address": "0xAAA", "label": "Treasury", "kind": "multisig" },
    { "chainId": 1,        "address": "0xBBB", "label": "Vault",    "kind": "proxy"     },
    { "chainId": 11155111, "address": "0xCCC", "label": "Strategy", "kind": "vanilla"   }
  ],
  "version": 2,
  "previousManifestHash": "0x..."
}
```

- **Pros:** One transaction to update entire portfolio; cheap; mirrors existing atomic-manifest pattern; deterministic hash chaining.
- **Cons:** Slightly weaker "ENS-as-registry" framing for sponsor judging.

### Variant C: Hybrid (recommended)

- Agent root publishes `upgrade-siren:projects` as the **canonical machine-readable index** (Variant B).
- Subnames are **optional** for agents that want delegation per project (Variant A).
- Resolver reads B first; if absent, falls back to enumerating subnames for known parents.

**Recommendation: Variant C.** Demo seed uses Variant B for speed (one tx for the full portfolio); we still demonstrate Variant A on at least one demo agent (`flagship.demo.upgradesiren.eth`) to satisfy "ENS subnames as registry" for the AI-Agents track.

---

## 8. Sourcify Deep Field Usage (P0/P1/P2 matrix)

This matrix is the canonical priority for `GET /v2/contract/{chainId}/{address}?fields=...` consumption. It applies to **both** single-contract and Agent Portfolio modes — Agent Mode just calls it N times in parallel.

### P0 (must use for verdict)

| Sourcify field | Used for | New in this epic? |
|---|---|---|
| `match` | Top-level verification verdict | Existing |
| `creationMatch` | Strengthens GREEN tile rule (both must be `exact_match`) | **NEW** — UI rule update |
| `runtimeMatch` | Most relevant for live behavior | Existing partial |
| `abi` | Risky-selector diff (US-026) | Existing |
| `signatures.function` | Pre-decoded function signatures with selector hashes | **NEW** — replaces 4byte external dependency |
| `signatures.event` | Event-level diff (P1 for now) | **NEW** |
| `storageLayout` | Storage-layout diff (US-027); now aggregated to hygiene metric | Existing engine, new aggregation |
| `compilation` (full) | Compiler version, optimizer, evmVersion → quality signal in score | **NEW** for score |
| `metadata.sources[].license` | License badge per project | **NEW** |
| `sources` | Evidence drawer; pattern detection (Pausable, Ownable, UUPS) | Existing partial |

### P1 (use if implementation time allows)

| Sourcify field | Used for | New? |
|---|---|---|
| `proxyResolution.isProxy` | Proxy detection (Sourcify-first; EIP-1967 RPC fallback) | **NEW** primary path |
| `proxyResolution.proxyType` | Render proxy kind chip (`UUPS`, `Transparent`, `Beacon`, `Diamond`) | **NEW** |
| `proxyResolution.implementations` | Implementation history for storage diff aggregation | **NEW** core for hygiene |
| `creationBytecode.recompiledBytecode` vs `onchainBytecode` | Sanity check for forensic drawer | **NEW** P1 |
| `runtimeBytecode.recompiledBytecode` vs `onchainBytecode` | Sanity check | **NEW** P1 |
| `userdoc`, `devdoc` | Human-readable contract description in tile drawer | **NEW** |

### P2 (post-hack or stretch)

| Sourcify field | Used for |
|---|---|
| `creationBytecode.cborAuxdata` | Metadata trailer rendering for forensic export |
| `creationBytecode.transformations` / `transformationValues` | Constructor-arg / library / immutable diff for forensic export |
| `stdJsonInput`, `stdJsonOutput` | Downloadable forensic bundle button |
| `storageLayout.types` | Full type expansion in evidence drawer |

### Storage-Layout Hygiene Algorithm (CORE for Agent Mode)

For each proxy contract in the agent's portfolio:

```text
1. Load Sourcify result for the proxy itself (sanity).
2. proxyResolution.implementations → list of impls (current + historical).
3. For each impl in chronological order:
     fetch /v2/contract/{chainId}/{impl}?fields=storageLayout,signatures,abi
4. For each consecutive pair (impl[i], impl[i+1]):
     compare storage[] arrays:
       same slot, same type, same label   → SAFE entry
       same slot, same type, different label → SOFT (rename)
       same slot, DIFFERENT type           → COLLISION (red)
       slot used in i not in i+1           → REMOVED (red — leftover bytes)
       new variable in slot beyond i.max   → SAFE (append)
5. Per proxy: hygiene = avg over upgrade pairs of {1.0 SAFE, 0.5 SOFT, 0.0 COLLISION/REMOVED}.
6. Per agent: portfolio hygiene = avg over proxies (proxies with no upgrade → 1.0).
```

Edge cases to handle explicitly:

- Sourcify returns implementations unordered → re-order by deployment block (RPC) or by Sourcify `verifiedAt` ascending (fallback).
- Implementation pair where one side has no `storageLayout` → mark the pair `UNKNOWN`, do not penalize hygiene; surface in drawer.
- Compiler version drift across upgrades changes type IDs (`t_uint256` etc.) → compare by `label + offset + size`, not raw type string.
- Diamond proxies (multi-facet) → out of P0 scope; tile shows `kind: diamond, hygiene unsupported`. Document as known limit.

### Bytecode Similarity Submit Flow (P1 — high demo value)

For each project in the agent's portfolio whose verdict is `SIREN` due to **unverified implementation**:

```text
POST /v2/verify/similarity/{chainId}/{address}
  → Sourcify scans known bytecode set for matches
  → if match found, contract auto-verifies
  → poll /v2/verify/{verificationId} until terminal
  → re-fetch /v2/contract/{chainId}/{address} → re-evaluate verdict
```

Demo line: *"Agent had 4 of 5 verified. We submitted the 5th to similarity. Now it's 5 of 5 — without any on-chain change."* This is the moment that converts judges on Sourcify-as-CORE-component framing.

### Cross-Chain Auto-Discovery (P1 — cheap win)

For each project address, also call `GET /v2/contract/all-chains/{address}`. Any chain matches not present in the agent's declared `projects` are surfaced in the UI as `discovered on Optimism via Sourcify` chips. This boosts the score's `crossChainCoverage` component honestly.

---

## 9. Per-Agent Score and Tiers

### Formula

```text
score = 0.30 * verifiedRatio
      + 0.25 * deployerIntegrity
      + 0.20 * upgradeHygiene
      + 0.10 * attestationStrength
      + 0.10 * compilerRecency
      + 0.05 * crossChainCoverage

→ scaled to 0–100, rounded to integer
→ tier:
   S  if score >= 90
   A  if score >= 75
   B  if score >= 60
   C  if score >= 45
   D  if score <  45
   U  if portfolio has < 2 contracts (unrated)
```

### Component definitions

| Component | Definition | Source |
|---|---|---|
| `verifiedRatio` | (count where `creationMatch == exact_match` AND `runtimeMatch == exact_match`) / total | Sourcify |
| `deployerIntegrity` | (count where `deployment.deployer ∈ {agentOwner, knownMultisigsControlledByAgent}`) / total | Sourcify + ENS owner |
| `upgradeHygiene` | Storage-Layout Hygiene aggregate from Section 8 | Sourcify |
| `attestationStrength` | `log(1 + signedAttestations) / log(20)`, clipped to [0,1] | Off-chain Vercel Blob (P2) |
| `compilerRecency` | Avg over projects of `1 - (yearsSinceCompilerRelease / 5)`, clipped | Sourcify `compilation.compilerVersion` |
| `crossChainCoverage` | `log(1 + distinctChains) / log(6)`, clipped | Sourcify cross-chain |

### Anti-gaming heuristics (judges WILL ask)

| Attack | Defense |
|---|---|
| Empty / Hello-World contracts inflate `verifiedRatio` | Minimum complexity gate: ignore contracts with `runtimeBytecode.onchainBytecode.length < 1024` and zero outgoing transactions |
| Anonymous spam attestations | Stake-weighted: attestor must have ≥ 0.01 ETH locked for 30 days in the attestation contract; mock for hackathon, real for post-hack |
| Reciprocal attestations (A↔B) | A→B + B→A counted as 1 |
| Buy old verified contracts (transfer ownership) | `deployerIntegrity` uses original `deployment.deployer` only, never current owner |
| Score gaming via `compilerRecency` (re-deploy with new solc) | Weight is only 10%; cannot dominate |

### Honest-claims rule (extends GATE-14)

UI must include the disclaimer:
> *Score measures verifiability and structural hygiene. It does not predict intent.*

This must be visible in the score banner, not hidden in a tooltip.

---

## 10. UI / Routes

### New routes

| Route | Purpose |
|---|---|
| `/a/[agent]` | Agent Portfolio Mode — tile grid, score banner, per-tile drawer |
| `/compare/[a]/[b]` (P2) | Side-by-side comparison of two agents |

### Existing routes preserved

| Route | Purpose |
|---|---|
| `/r/[name]` | Single-contract live verdict (US-068, shipping) |
| `/` | Landing — extended with one extra search bar (or unified mode-detection) |

### Mode detection on landing

When user enters an ENS name on `/`:

1. Resolve ENS owner / records.
2. If `upgrade-siren:proxy` present → route to `/r/[name]` (single-contract mode, existing).
3. Else if `upgrade-siren:projects` present OR subnames found → route to `/a/[name]` (Agent Mode).
4. Else fall back to public-read mode against the resolved address — single-contract path with `confidence: public-read`.

This keeps **one front door** for users; mode is inferred from records, not chosen by the user.

### `/a/[agent]` UI breakdown

```
┌────────────────────────────────────────────────────────────────────┐
│  Header: agent ENS name, owner address (truncated), avatar         │
│  Score Banner: 67 / 100 — Tier B                                   │
│  Sub-banner: 4/5 verified · 1 storage collision · 3 chains · ...   │
│  Disclaimer: "Score measures verifiability, not intent."           │
├────────────────────────────────────────────────────────────────────┤
│  Tile Grid (responsive, 2-3 cols)                                  │
│  ┌────────┐  ┌────────┐  ┌────────┐                                │
│  │ vault  │  │treasury│  │strategy│                                │
│  │ GREEN  │  │ AMBER  │  │  RED   │                                │
│  │ proxy  │  │ multi  │  │ vanil. │                                │
│  │ chain1 │  │ chain1 │  │chain453│                                │
│  └────────┘  └────────┘  └────────┘                                │
├────────────────────────────────────────────────────────────────────┤
│  Score Breakdown Panel (expandable)                                │
│  • Verified Ratio:        80%   (weight 30%)                       │
│  • Deployer Integrity:    100%  (weight 25%)                       │
│  • Upgrade Hygiene:       50%   (weight 20%)  ← 1 collision        │
│  • Attestation Strength:  20%   (weight 10%)                       │
│  • Compiler Recency:      85%   (weight 10%)                       │
│  • Cross-Chain Coverage:  60%   (weight 5%)                        │
└────────────────────────────────────────────────────────────────────┘
```

**Tile expanded drawer** (click tile):

- Per-contract verdict (existing UI from `/r/[name]` reused as embedded component)
- Storage-layout history timeline (per proxy)
- Sourcify links per impl
- Source pattern badges (Ownable, Pausable, UUPS, etc.)
- Bytecode similarity-submit button if unverified
- License badge from metadata

### Reused brand tokens

All tile colors map to existing verdict tokens (US-067):

- `bg-verdict-safe` → GREEN tile
- `bg-verdict-review` → AMBER tile
- `bg-verdict-siren` → RED tile

No new tokens introduced. Score banner uses `verdict-*-on-light` and `verdict-*-surf` background variants per brand manual.

---

## 11. API Surface

### New endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/agent/[ens]` | Returns full `AgentReport` JSON: agent meta, projects with embedded SirenReports, scoreBreakdown, tier |
| `GET` | `/api/agent/[ens]/score` | Returns just the score block (for external programmatic consumption) |
| `POST` | `/api/agent/[ens]/similarity-submit` (P1) | Triggers Sourcify similarity verification for unverified projects in the portfolio; returns updated AgentReport |
| `POST` | `/api/attest` (P2) | Off-chain signed attestation on agent profile, stored in Vercel Blob |
| `GET` | `/api/compare/[a]/[b]` (P2) | Side-by-side score diff |

### Reused endpoints

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/r/[name]` (existing US-068) | Per-contract verdict; called internally by orchestrator for each project |

### Cache extension (extends US-032)

| Key shape | TTL |
|---|---|
| `sourcify:{chainId}:{address}:fields=...` | 24h verified, 60s unverified |
| `agent:{ens}:resolution` | 5 min (records can change) |
| `agent:{ens}:report` | 5 min (uses cached sourcify under the hood) |
| `sourcify-chains:list` | 1 week |

Backed by Upstash Redis via Vercel Marketplace per existing reuse-stack defaults.

---

## 12. Build Plan

> Assumes Daniel locks Section 18 decisions tonight (2026-05-08 evening). Build window: **Day 1 = Saturday 2026-05-09**, **Day 2 = Sunday 2026-05-10 morning**, submission cut-off **2026-05-10 12:00 PM**.

### Day 1 (Saturday 2026-05-09)

| Block | Stream | Task | Duration |
|---|---|---|---|
| 09:00–10:00 | Daniel + Orch | Confirm Section 18 decisions, write `docs/14-agent-mode-naming.md`, lock score weights, lock ENS schema variant | 1h |
| 10:00–13:00 | B | Implement `agent-resolver` (subname enum + projects-text-record parser) | 3h |
| 10:00–13:00 | A | Provision demo agent ENS records (variant chosen) for at least 3 demo agents (clean / mixed / siren-warning) | 3h parallel |
| 10:00–13:00 | C | Stub `/a/[agent]` page, integrate brand tokens, scaffold tile component | 3h parallel |
| 13:00–14:00 | All | Lunch + alignment | 1h |
| 14:00–17:00 | B | Implement `portfolio orchestrator` (parallel verdict runner with per-project failure isolation) | 3h |
| 14:00–17:00 | A | Deploy a deliberate storage-collision scenario in Foundry fixtures for at least one demo agent | 3h parallel |
| 14:00–17:00 | C | Build tile grid, expanded drawer, score banner shell | 3h parallel |
| 17:00–19:00 | B | Extend Sourcify client for P0 fields: `signatures`, `creationMatch`, `proxyResolution`, full `compilation` | 2h |
| 19:00–21:00 | All | Day-1 demo: agent profile renders for at least one demo agent end-to-end (no score yet, just tile grid + per-tile verdicts) | 2h |

### Day 2 (Sunday 2026-05-10)

| Block | Stream | Task | Duration |
|---|---|---|---|
| 06:00–10:00 | B | **Storage-Layout Hygiene aggregator** (highest-risk item; do this fresh and first) | 4h |
| 06:00–10:00 | C | Score banner with breakdown panel, disclaimer copy | 4h parallel |
| 06:00–10:00 | A | Final demo agent content + 3 scenarios + screenshots for submission | 4h parallel |
| 10:00–11:00 | All | Integration: score formula wired, tier rendering, end-to-end | 1h |
| 11:00–11:30 | B | Bytecode-similarity submit flow (P1, only if storage hygiene closed) | 30min |
| 11:30–12:00 | All | Polish, error states, Vercel deploy, Devfolio submission | 30min |

**Hard cuts if behind schedule:**

1. First cut: bytecode similarity submit (P1)
2. Second cut: cross-chain auto-discovery (P1)
3. Third cut: subname Variant-A demo agent (keep Variant B only)
4. Last cut: compare view (P2)
5. Never cut: storage-layout hygiene aggregator — that is the differentiator

---

## 13. Demo Script Extension (extends `docs/05-demo-script.md`)

### Existing 3-minute booth flow stays

The current single-contract demo (`vault.demo.upgradesiren.eth` → SAFE / dangerous → SIREN / unverified → SIREN / live public-read → REVIEW) is preserved as the opening demo.

### New 90-second Agent Mode segment (appended)

| Time | Action | Voiceover |
|---|---|---|
| 0:00 | Type `flagship.demo.upgradesiren.eth` | "Same product, second front door. This time the ENS name is an agent." |
| 0:10 | Tile grid renders, mostly green, one amber, one red | "All this agent's contracts in one place. Verdict per contract from Sourcify evidence." |
| 0:25 | Score banner: "78 / 100 — Tier A" | "Aggregate score, externally verifiable. No opinions." |
| 0:35 | Click amber tile → expand drawer → upgrade history timeline → row highlights `slot 5: uint256 → address` red | "This proxy upgraded three times. On the second upgrade, slot 5 changed type. Storage collision risk. The score reflects it." |
| 0:55 | Back to grid, click red tile → "Submit similarity" button (if P1 shipped) | "This contract isn't verified. Sourcify can check if it matches a known one." |
| 1:05 | Re-render, red tile turns green, score banner updates 78 → 84 | "It does. Verified, score climbs. The dataset gets better, no on-chain action required." |
| 1:20 | Score breakdown panel | "Verified ratio. Deployer integrity. Upgrade hygiene. All on-chain truth." |
| 1:30 | Sponsor close | "For Sourcify: data is the core, queried in parallel, written back via similarity. For ENS: subnames are the agent registry. For Future Society: public-good safety per agent, not per upgrade." |

---

## 14. Acceptance Gates (extends `docs/06-acceptance-gates.md`)

### New gates proposed

| Gate | Tier | Requirement |
|---|---|---|
| GATE-27 | P0 | `/a/[agent]` resolves a real agent ENS and renders at least 3 contract tiles with live Sourcify-backed per-tile verdict |
| GATE-28 | P0 | Aggregate score is rendered with a visible breakdown panel showing all 6 components and their weights |
| GATE-29 | P0 | Storage-layout hygiene aggregate is shown for at least one proxy with multiple verified implementations (demo seed must include this) |
| GATE-30 | P0 | Honest-claims disclaimer is visible in the score banner (not tooltip) |
| GATE-31 | P1 | Bytecode similarity submit produces a verdict change in demo (verified → re-rendered) |
| GATE-32 | P2 | Compare view at `/compare/[a]/[b]` renders side-by-side score diff |

### Existing gates that gain a second binding

| Gate | Existing binding | Agent Mode binding |
|---|---|---|
| GATE-1 | User enters ENS, gets verdict | Also: user enters agent ENS, gets aggregate verdict + score |
| GATE-3 | ENS records resolved live | Also: agent records (`projects`, subnames) resolved live |
| GATE-5 | Sourcify fetched live | Now in parallel for N projects |
| GATE-12 | Storage-layout result shown | Now also aggregated to portfolio hygiene |
| GATE-16 | Sourcify central to verdict | Strengthened: parallel + storage-history + similarity submit |
| GATE-17 | ENS central to identity | Promoted: ENS is the agent registry |
| GATE-20 | Verdict in 5 seconds | Aggregate verdict in 5 seconds for demo agents (cached) |

### Kill conditions extended

Existing kill conditions remain. Add:

- Score is computed by an LLM (reject — must be deterministic formula)
- Agent profile renders without any per-project Sourcify call (reject — Sourcify must be live, not mocked, except for `mock: true`-labeled cases)

---

## 15. Backlog Seed (proposed US-076..US-095)

Numbering follows existing convention. All Owner column assumes existing Stream A/B/C ownership. PR Reviewer + Daniel + Orch unchanged.

### Stream B — Evidence Engine

| ID | Title | Owner | Pri | Effort | Depends on | Sponsor | Gates |
|---|---|---|---|---|---|---|---|
| US-076 | Agent ENS resolver: parse `upgrade-siren:projects` text record | B | P0 | M | US-017 | ENS | GATE-3, GATE-27 |
| US-077 | Agent ENS resolver: enumerate subnames as projects (Variant A path) | B | P0 | M | US-017, US-076 | ENS | GATE-3, GATE-27 |
| US-078 | Hybrid agent resolver: Variant B then Variant A fallback | B | P0 | S | US-076, US-077 | ENS | GATE-27 |
| US-079 | Portfolio orchestrator: parallel runner over Project[] with per-project failure isolation | B | P0 | M | US-029, US-076 | Sourcify, ENS | GATE-27 |
| US-080 | Sourcify client extension: `creationMatch`, `runtimeMatch`, `signatures`, `proxyResolution` field selectors | B | P0 | M | US-024, US-025 | Sourcify | GATE-16 |
| US-081 | Source-pattern detection from `sources`: Pausable, Ownable, UUPS, AccessControl badges | B | P1 | M | US-080 | Sourcify | - |
| US-082 | Storage-Layout Hygiene aggregator across implementation history per proxy | B | P0 | L | US-027, US-080 | Sourcify | GATE-29 |
| US-083 | Score engine: pure function over `SirenReport[]` returning scoreBreakdown + tier | B | P0 | M | US-079, US-082 | - | GATE-28 |
| US-084 | Cross-chain auto-discovery via `/v2/contract/all-chains/{address}` | B | P1 | S | US-080 | Sourcify | - |
| US-085 | Bytecode similarity submit flow: POST + poll + re-evaluate | B | P1 | M | US-080 | Sourcify | GATE-31 |
| US-086 | Sourcify cache extension for portfolio hit rate (extend US-032) | B | P0 | S | US-032, US-080 | Sourcify | GATE-20 |
| US-087 | License + compiler-recency extraction for score components | B | P0 | S | US-080 | Sourcify | GATE-28 |

### Stream A — Contract Fixtures

| ID | Title | Owner | Pri | Effort | Depends on | Sponsor | Gates |
|---|---|---|---|---|---|---|---|
| US-088 | Provision agent demo ENS roots (`flagship.demo.upgradesiren.eth`, `mixed.demo.upgradesiren.eth`, `risk.demo.upgradesiren.eth`) with `upgrade-siren:projects` records | A | P0 | M | US-010 | ENS | GATE-27 |
| US-089 | Deploy a proxy with deliberate storage-collision upgrade for the storage-hygiene demo | A | P0 | M | US-001..US-005 | Sourcify | GATE-29 |
| US-090 | Provision one Variant-A subname-based agent profile to satisfy ENS AI-Agents track shape | A | P1 | M | US-088 | ENS | GATE-17 |
| US-091 | Documentation of all agent demo data: ENS records, addresses, expected verdicts, expected score | A | P0 | S | US-088, US-089 | - | GATE-15 |

### Stream C — Web UX

| ID | Title | Owner | Pri | Effort | Depends on | Sponsor | Gates |
|---|---|---|---|---|---|---|---|
| US-092 | `/a/[agent]` route with mode detection from landing | C | P0 | M | US-079 | - | GATE-1, GATE-27 |
| US-093 | Tile component (verdict-tokenized) and tile grid layout | C | P0 | M | US-067, US-079 | - | GATE-27 |
| US-094 | Score banner with breakdown panel and disclaimer copy | C | P0 | M | US-083 | - | GATE-28, GATE-30 |
| US-095 | Tile expanded drawer (reuse `/r/[name]` UI as embedded component, plus storage-history timeline) | C | P0 | L | US-082, US-068 | Sourcify | GATE-29, GATE-21 |
| US-096 | Bytecode similarity-submit button + optimistic re-render | C | P1 | S | US-085 | Sourcify | GATE-31 |
| US-097 | `/compare/[a]/[b]` view (stretch) | C | P2 | M | US-094 | - | GATE-32 |
| US-098 | Honest-claims disclaimer copy reviewed by Daniel/Orch | C | P0 | XS | US-094 | - | GATE-30 |

### Tracker

| ID | Title | Owner | Pri | Effort | Depends on |
|---|---|---|---|---|---|
| US-099 | Update demo script (`docs/05-demo-script.md`) with 90-second Agent Mode segment | Orch | P0 | S | US-094 |
| US-100 | Update sponsor pitch (`docs/07-sponsor-fit.md`) with Agent Mode delta for ENS AI-Agents track | Orch | P0 | S | US-088 |
| US-101 | Naming research for Agent Mode terminology if any new public surface name is introduced | Daniel + Orch | P0 | XS | none |
| US-102 | Mentor sweep for Sourcify (similarity submit usage) and ENS (subname AI-Agents track judging criteria) | Daniel | P0 | S | US-088 |

---

## 16. Risk Register (extends `docs/10-risks.md`)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Storage-layout aggregator complexity blows past 4h budget | High | High | Time-boxed; if not closed by 10:00 Day 2, ship with single-pair diff (current vs previous only); aggregator becomes P1 polish |
| Sourcify rate limits during demo | Medium | High | Aggressive cache (US-086), pre-warmed for demo agents night before |
| ENS subgraph rate limit on subname enumeration | Medium | Medium | Variant B (text record) primary; subname enum is P1 fallback |
| Demo agent ENS provisioning takes longer than expected | Medium | Medium | Pre-provision Friday evening before Day 1; have at least one agent live before scope-lock confirmation |
| `proxyResolution.implementations` ordering ambiguity | Medium | Medium | Re-order by RPC deployment block; document fallback to `verifiedAt` |
| Compiler version drift breaks raw-type-string comparison | Low | Medium | Compare by `label + offset + size`, not type string; documented in algorithm spec |
| Diamond proxies in real demo agent | Low | Low | Document as known limit; tile shows `kind: diamond, hygiene unsupported` |
| Score gameability raised by judges | High | Medium | Honest-claims disclaimer; documented anti-gaming heuristics; weights favor non-fakeable signals |
| Brand confusion between `r/[name]` and `a/[agent]` | Medium | Low | Single front door with mode detection; identical brand tokens; sub-tagline "No source, no agent." used only inside Agent Mode |
| Sponsor judges read this as "two products in one" | Medium | Medium | Pitch frames it as "two front doors, one engine"; demo emphasizes shared verdict pipeline |

---

## 17. Naming and Branding

**No new product brand introduced.** Agent Mode lives under the existing Upgrade Siren brand and tokens.

| Surface | Naming |
|---|---|
| Master tagline | **"No source, no upgrade."** (unchanged) |
| Agent-Mode sub-tagline | **"No source, no agent."** (used only on `/a/[agent]` and Agent Mode promo material) |
| Public title in browser tab | "Upgrade Siren — `<agent ENS>`" |
| Submission positioning | Single product (Upgrade Siren) with two surfaces: per-upgrade verdict and per-agent profile |

**Anti-pattern check (per `feedback_anti_patterns.md`):**

- No new platform / OS / framework / boundary / layer / engine vocabulary in pitch ✓
- Naming research not required for new product name (none introduced); US-101 covers any new public surface name if Daniel adds one
- No rebrand mid-stream ✓
- No 5-track expansion ✓ (still 2 sponsors + 1 organizer)

---

## 18. Open Decisions (Daniel)

> **Tieto rozhodnutia musíš lock-núť pred tým ako team začne. Bez nich epic stojí.**

| # | Otázka | Odporúčanie | Tvoja odpoveď |
|---|---|---|---|
| D1 | **Pivot, extension, alebo stack-up?** Extension znamená rovnaký brand, dva surfaces; pivot znamená Agent Mode nahradí single-contract; stack-up znamená oba surfaces samostatne živé. | **Extension** (B) — minimálny risk, maximálny reuse | |
| D2 | **ENS schéma**: Variant A (subnames), B (text record JSON), C (hybrid)? | **Variant C hybrid** — B primary pre rýchlosť, A pre jeden demo agent kvôli AI-Agents track shape | |
| D3 | **ENS sponsor track**: cieliť AI Agents ($2K) primary alebo Most Creative ($2K) primary? | **AI Agents primary**, Most Creative ako fallback ak mentor sweep ukáže lepší fit | |
| D4 | **Score weights** lock: `0.30 / 0.25 / 0.20 / 0.10 / 0.10 / 0.05`? | **Lock as-is.** Ladenie weights mid-build je SBO3L anti-pattern. | |
| D5 | **Storage-Layout Hygiene aggregator** je 4h bet Day 2 ráno. Confirm priority P0 alebo downgrade na P1 a posunúť do polish? | **P0** — bez neho stratíme killer demo moment a Sourcify-native test sa oslabí | |
| D6 | **Bytecode similarity submit**: P1 (must-attempt, first cut if behind)? | **P1** — high demo value, low complexity, OK ak sa cut-uje | |
| D7 | **Compare view** `/compare/[a]/[b]`: P2 stretch alebo cut? | **P2 stretch** — nice-to-have, neničí ak chýba | |
| D8 | **Sub-tagline "No source, no agent."** OK alebo iný? | **Lock as-is** — coherentné s master tagline | |
| D9 | **Demo agent ENS roots**: registrujeme `flagship.demo.upgradesiren.eth` atď. dnes večer (parent `upgradesiren.eth`)? | **Áno** — provisioning môže blocknúť Day 1 ak sa odloží | |
| D10 | **Umia track**: aktívne cieliť alebo nechať optional bez zmeny? | **Bez zmeny** — Agent Mode posilňuje narrative ale stále optional |  |

Po lock-ine D1–D10:

- Orch zaktualizuje `SCOPE.md` Section 1 a Section 5 s extension delta
- Orch otvorí PR-y: `docs/06-acceptance-gates.md` (GATE-27..GATE-32), `docs/13-backlog.md` (US-076..US-102), `docs/05-demo-script.md` (Agent Mode segment), `docs/07-sponsor-fit.md` (ENS AI Agents track delta)
- Stream B začne US-076; Stream A začne US-088; Stream C čaká na US-079 stub
- Daniel Friday evening pre-provision US-088 demo agents

---

## 19. Stack Defaults (no change)

Per `feedback_reuse_stack.md` defaults, applied without discussion:

| Layer | Default |
|---|---|
| Frontend | Next.js 16 App Router + Turbopack |
| Styling | Tailwind 4 + shadcn/ui + brand tokens (US-067) |
| LLM (only if used at all) | Vercel AI Gateway |
| Compute | Vercel Fluid Compute, Node 24, function timeout 300s |
| Config | `vercel.ts` |
| Monorepo | pnpm workspaces (existing) |
| Solidity | Foundry (existing) |
| KV / cache | Upstash Redis via Marketplace (existing US-032 backing) |
| Blob | Vercel Blob (for off-chain attestations P2) |
| Cron | Vercel Crons via `vercel.ts` (none required for Agent Mode P0) |

No new dependencies introduced beyond what existing US already pull in. No new sponsor SDKs.

---

## 20. Submission Checklist Delta

In addition to existing `docs/12-implementation-roadmap.md` checklist:

- [ ] At least one agent ENS lives on Sepolia / mainnet with valid `upgrade-siren:projects` record
- [ ] `/a/[agent]` renders within 5 seconds for all demo agents
- [ ] Score banner is visible and shows all 6 weighted components
- [ ] Storage-layout hygiene aggregate is rendered for at least one proxy with multiple verified implementations
- [ ] Honest-claims disclaimer is visible
- [ ] Demo script `docs/05` includes the new 90-second Agent Mode segment
- [ ] Sponsor pitch `docs/07` includes ENS AI-Agents track framing
- [ ] README mentions Agent Mode and links to a live agent profile
- [ ] No mock data unlabeled (`mock: true` rule extended to Agent Mode)
- [ ] Sourcify is queried live for each project in the portfolio (not pre-baked)

---

## 21. References

- `SCOPE.md` — locked Upgrade Siren scope
- `docs/04-technical-design.md` — existing architecture
- `docs/06-acceptance-gates.md` — GATE-1..26 register
- `docs/13-backlog.md` — US-001..US-075 existing
- `feedback_winning_primitives.md` (memory) — 12 primitives, combo patterns
- `feedback_sponsor_native_test.md` (memory) — discriminating test per sponsor
- `feedback_anti_patterns.md` (memory) — avoidance checklist
- `feedback_reuse_stack.md` (memory) — default tech stack
- Sourcify API docs: <https://docs.sourcify.dev/docs/api/>
- Sourcify swagger: <https://sourcify.dev/server/api-docs/swagger.json>
- ENS subname registration UX: <https://app.ens.domains/>
- Field reference (P0/P1/P2) — internal doc shared by Daniel 2026-05-08

---

**End of EPIC v0 DRAFT.** Awaiting Daniel decisions on Section 18.
