# Siren — ETHPrague 2026 Win Postmortem

**Result:** Two first-place finishes at ETHPrague 2026 (deadline 2026-05-10).

| Track | Placement |
|---|---|
| **Umia** (sponsor track) | 🥇 1st place |
| **ENS — Best ENS Integration for AI Agents** (categorical) | 🥇 1st place |

Live: https://upgrade-siren.vercel.app · Repo: https://github.com/B2JK-Industry/Upgrade-Siren-ETHPrague2026

---

## What Siren is (one paragraph)

Siren is a public verification layer for Ethereum-native actors, contracts, and agents. It turns any ENS-named subject into a 0–100 trust benchmark across four data sources (Sourcify, GitHub, on-chain activity, ENS-internal records) with a tier ladder S → U, mints the verdict as an EIP-712-signed EAS attestation on-chain, and lets anyone diff a previous attestation against the live verdict to surface score regressions, identity rotations, and revocations.

---

## What won, broken down per track

### Umia (1st)

**Sponsor-native angle:** EIP-712 ServerPermit signer that gates Umia's `UmiaValidationHook` on Bench tier. Founders avoid running their own gating server; bidders embed Siren's hookData blob in their bid; no new key custody. First verifier-as-a-service for Umia.

**Technical surface that mattered:**

- `packages/umia-permit` — standalone EIP-712 typed-data + signer + hookData encoder + verifier
- `apps/web/app/api/umia/permit/route.ts` — live HTTP endpoint, controller check (wallet must control the subject's primary address), tier threshold gate, falls back to mock signature when `REPORT_SIGNER_PRIVATE_KEY` env is absent
- `apps/web/components/umia/UmiaVentureApplySection.tsx` — schema-validated `umia venture apply` JSON export, prefilled from ENS records, locked when sourced from public evidence, JSON-download-only (no real CLI shell-out)
- Canonical Umia Community Track schema (`apps/web/lib/umia/umia-venture-apply.schema.json`) + Ajv runtime validation

**Why this beat alternatives:** other Umia submissions probably treated Umia as "we have an integration" rather than "we built a primitive Umia genuinely needs." Sponsor-native discriminator test (could-not-exist-without-this-tech) was passed.

### ENS — Best ENS Integration for AI Agents (1st, categorical)

**Categorical, not bounty.** This is "best in class" not "we used it" — heavier signal than any single bounty.

**ENS surface that mattered:**

- ENS-anchored subject resolution (mainnet + Sepolia, smart name-suffix routing — `*.upgrade-siren-demo.eth` → Sepolia, everything else → mainnet)
- 12 ENS text records read in parallel (com.github, description, url, com.twitter / X, com.discord, org.telegram, com.linkedin, xyz.farcaster, org.lens, avatar, **case-insensitive Sourcify pin** keys)
- Primary-name fallback (when subject ENS has sparse records, follow `addr → reverse → primary name` and merge richer records)
- ENSIP-7 contentHash decoding to gateway URL
- Pinned ENS contract promotion: when subject pins a verified contract address under `org.sourcify` (or any case variant), orchestrator auto-fetches Sourcify deep metadata for that pin and renders storage layout + OZ patterns + compiler version inline
- ENS-internal subgraph signal as a full-trust score component (registration age, subname structure, text record richness)
- EAS attestation embeds `ensNamehash` in the signed payload — full-payload EIP-712 binding rejects on any field mismatch
- Compare-with-previous-attestation diff banner detects ENS record changes between attestations

**Why this beat alternatives:** "AI Agent identity" framing was the unlock — ENS isn't just a name, it's the **trust anchor** under which agent reputation accumulates and gets attested to. Other ENS submissions probably did naming or subnames; Siren built reputation infrastructure on top of ENS.

---

## What made the difference (applicable to next hackathons)

### 1. Dual-sponsor coherent story > maximizing bounty count

We submitted to two sponsor categories with **one project, one narrative, one demo flow**. ENS was the trust anchor, Umia was the consumer. The same `/b/<ens>` page served both judging panels.

Counter-example: shipping 5 separate single-bounty pitches splits attention across 5 demos none of which can carry a complete story. One coherent dual-track product wins both.

### 2. Sponsor-native discriminator test (Daniel's rule)

Every sponsor angle had to pass: **"could this exist without this specific sponsor's tech?"**

- Umia ServerPermit issuer → no, it directly signs into UmiaValidationHook ABI shape
- ENS-anchored attestation → no, the namehash binding to score makes ENS the load-bearing primitive
- Sourcify pin promotion → no, Sourcify is the only source that proves bytecode-source correspondence

What didn't pass the test was cut. Skip features that "use" a sponsor; ship features that "depend on" a sponsor.

### 3. Audit before deadline > shipping more features

The day-of audit caught **four live bugs** (EAS payload format mismatch, ECDSA verifier never recovering signer, store identity loss, tier ladder math contradiction visible to judges). Each was 5–30 min to fix; each would have been a deal-breaker in demo.

Schedule the audit. Don't ship until it's green.

### 4. Honest framing > slick framing

"Tier S reserved for v2 (verified GitHub cross-sign)" — telling judges what the system can't do builds more trust than pretending it can. Same with the GitHub ×0.6 trust discount and the Etherscan ×0.5 fallback weight. Judges read self-awareness as confidence.

### 5. Re-derivable evidence > black box

`/api/bench/<ens>` returns the raw evidence behind every score. Judges can recompute themselves. We never had to defend a number; the math defended itself.

### 6. Live demo flow that actually works end-to-end

Type ENS → see verdict → publish EAS → paste attestation URL back → diff banner. **Every step worked in the demo.** Nothing was "imagine if" or "in v2 we will." Demos with broken cells lose to demos with rough but complete loops.

### 7. Pivot fast when scope is wrong (2026-05-08)

Project pivoted from "Agent Float" to "Upgrade Siren" two days before deadline because the original framing didn't satisfy the dual-sponsor coherence test. Two days of code we'd already shipped got reframed (not rewritten) under the new pitch. Pivoting cost 4 hours of strategy work; not pivoting would have cost the win.

---

## What didn't matter (lessons for next time)

- **Pretty UI animations** — banned-motion v2 §5C says no animations; judges never noticed.
- **Comprehensive test coverage** — 1144 unit tests passed but judges didn't run them. Tests caught regressions during the deadline rush, that's their value.
- **Long-form documentation** — 200+ files in `docs/`; nobody read them. Judges read the homepage hero, the bench page, and at most one drawer.
- **Backend complexity** — orchestrator has per-source timeout budgets, retry logic, cache layers, fallbacks. Most judges don't see this. The score they see is the score they remember.

---

## Stack that won

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 App Router | Vercel deploy, server components, fast iteration |
| Language | TypeScript (strict + `exactOptionalPropertyTypes`) | Refactor confidence at hackathon pace |
| Monorepo | pnpm workspaces (`@upgrade-siren/{web,evidence,shared,umia-permit}`) | Per-package typecheck + test, clear boundaries |
| Web3 | viem + wagmi + ConnectKit | Modern, typed, no ethers-v5 baggage |
| Verification | Sourcify v2 (4 endpoints, 10 deep fields) | Bytecode-vs-source proof; only source at full trust |
| Identity | ENS (Ethereum Name Service) | Human-readable trust anchor |
| Attestation | EAS (Ethereum Attestation Service) | Full-payload EIP-712, mainnet + Sepolia schemas |
| Persistence | Turso (libSQL) | EAS bundle storage, idempotent ALTER TABLE for schema drift |
| Cron / scripts | Foundry (deploy + verify) | One-line `forge verify-contract --verifier sourcify` |
| Hosting | Vercel Pro | Production deploys + alias to clean domain |
| Validation | Ajv 8 + ajv-formats | Umia payload schema validation |
| Testing | Vitest + happy-dom + Playwright | Fast unit + browser e2e |

---

## Numbers

- **1144** unit tests passing (64 shared + 722 evidence + 10 umia-permit + 348 web)
- **~190** PRs through the project
- **~14 days** from greenfield to dual-win
- **2 days** from "Agent Float" pivot to "Upgrade Siren / Siren" final brand
- **4 score components** at full trust (Sourcify, ENS-internal, on-chain) + 1 trust-discounted (GitHub ×0.6) + 1 half-weight fallback (Etherscan ×0.5)

---

## Files / surfaces a future audit should read first

If you want to understand HOW Siren works in 30 minutes:

1. `apps/web/app/b/[name]/page.tsx` — the bench page composition
2. `packages/evidence/src/bench/orchestrator.ts` — multi-source fan-out
3. `packages/evidence/src/score/weights.ts` — the score math
4. `packages/evidence/src/eas/offchain.ts` — full-payload EIP-712 + ECDSA verify
5. `apps/web/components/bench/SourcifyEvidencePanel.tsx` — Sourcify-specific evidence rendering
6. `packages/umia-permit/src/sign.ts` — EIP-712 ServerPermit signer
7. `apps/web/app/api/umia/permit/route.ts` — live ServerPermit endpoint with controller + tier gate
8. `apps/web/components/compare/CompareDiffBanner.tsx` — diff-vs-previous-attestation surface

---

## What ships in v2 (deferred from hackathon)

- **Verified GitHub cross-sign** — unlocks Tier S; lifts the 0.6 trust discount
- **Sourcify metadata diff** — when contract is re-verified between two Siren reports, surface bytecode hash + ABI changes inline in the diff banner
- **Real Umia CLI bridge** — when `umia venture apply` ships publicly, replace JSON download with API submit (the schema is already validated)
- **ENS records snapshot in EAS** — currently we hash the inferredTexts into reportHash; v2 stores them as a separate field for direct diff
- **Storage layout diff** — when a proxy upgrades, render slot-by-slot diff between old + new layouts
