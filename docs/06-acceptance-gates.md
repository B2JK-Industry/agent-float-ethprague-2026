# Acceptance Gates

These gates define submission readiness. `P0` gates must pass before submission. `P1` gates are still planned, but if Daniel explicitly cuts them they must be called out honestly in the submission. Current scope treats ABI diff, storage-layout result, report signature verification, public-read fallback, progressive loading/error states, and governance comment generator as `P0`.

## Product Gates

| Gate | Tier | Requirement |
|---|---|---|
| GATE-1 | P0 | User can enter an ENS name and get a verdict |
| GATE-2 | P0 | Verdict is one of `SAFE`, `REVIEW`, `SIREN` |
| GATE-3 | P0 | ENS records are resolved live in the app |
| GATE-4 | P0 | Proxy implementation is read from chain state |
| GATE-5 | P0 | Sourcify verification status is fetched live |
| GATE-6 | P0 | At least one safe upgrade and one dangerous upgrade are demoable |
| GATE-7 | P0 | UI explains the verdict in plain language |
| GATE-25 | P0 | Public-read fallback returns a labeled lower-confidence verdict for an address or ENS name without `upgrade-siren:*` records |

## Technical Gates

| Gate | Tier | Requirement |
|---|---|---|
| GATE-8 | P0 | EIP-1967 implementation slot read works |
| GATE-9 | P0 | Sourcify evidence links are included in report |
| GATE-10 | P0 | ENS manifest-declared current implementation is compared to live proxy slot |
| GATE-11 | P0 | ABI risk diff runs deterministically |
| GATE-12 | P0 | Storage-layout result is shown when available for fixture contracts |
| GATE-13 | P0 | Missing data lowers confidence instead of being hidden |
| GATE-14 | P0 | Every mock is labeled `mock: true` |
| GATE-15 | P0 | Local run instructions reproduce demo |
| GATE-24 | P0 | Production Siren Report is EIP-712 signed by `upgrade-siren:owner`; verdict engine refuses unsigned or invalidly signed production reports |

## Sponsor Gates

| Gate | Tier | Requirement |
|---|---|---|
| GATE-16 | P0 | Sourcify is central to verdict evidence |
| GATE-17 | P0 | ENS is central to identity and discovery |
| GATE-18 | P0 | Future Society pitch frames public-good safety |
| GATE-19 | P2 | Optional Umia pitch is clearly Siren Agent due diligence, not token launchpad |

## UX Gates

| Gate | Tier | Requirement |
|---|---|---|
| GATE-20 | P0 | Verdict appears within five seconds for demo cases |
| GATE-21 | P0 | Evidence drawer is understandable to technical judges |
| GATE-22 | P0 | Non-technical user understands recommended action |
| GATE-23 | P0 | Governance comment generator provides short, forum, and vote-reason formats with specific findings and report link |
| GATE-26 | P0 | Progressive loading checklist and explicit empty/error states are visible for ENS, RPC, Sourcify, malformed manifest, and unsigned report failures |

## Kill Conditions

Do not submit if:

- ENS is only a label in the signed manifest path
- Sourcify is only a link
- verdict is generated only by LLM text
- no live chain read exists
- production report is unsigned or signed by an address other than `upgrade-siren:owner`
- absent Upgrade Siren records have no defined verdict path
- demo uses only synthetic fixtures and no live public-read protocol scenario
- UI looks like a generic audit dashboard
- pitch says "AI auditor" or "generic scanner"
- old Agent Float story leaks into active pitch

## Bench Mode Gates (Epic 2 — added 2026-05-09 per US-145)

> Source: `EPIC_BENCH_MODE.md` Section 15. Apply to `/b/[name]` route + Bench Mode score engine + Stream A Playwright suite.

| Gate | Tier | Requirement |
|---|---|---|
| GATE-27 | P0 | `/b/[name]` resolves a real ENS name and renders within 5 seconds (cached) for at least three demo scenarios |
| GATE-28 | P0 | Score banner displays a single 0–100 number, both axis values (seniority + relevance), tier label (S/A/B/C/D/U), and the honest-claims disclaimer in-band |
| GATE-29 | P0 | Source grid renders 4 tiles (Sourcify, GitHub, On-chain, ENS) with verified/unverified badges and per-source contribution numbers |
| GATE-30 | P0 | Trust-discount factor `0.6` is applied to every unverified-source signal AND is visibly rendered in the breakdown panel as a `× 0.6` column. Raw-discounted axis only — no normalization to ceiling. v1 max final score is 79 (tier A); S-tier reserved for verified-GitHub v2 |
| GATE-31 | P0 | Storage-layout hygiene aggregate is shown for at least one proxy with multiple verified implementations in the Sourcify drawer |
| GATE-32 | P0 | Public-read fallback: a subject without `agent-bench:bench_manifest` produces a labeled `confidence: public-read` report with tier ceiling A |
| GATE-33 | P1 | Bytecode similarity submit produces a visible score change for at least one unverified-Sourcify scenario |
| GATE-34 | P0 | Playwright e2e suite covers at least 4 scenarios deterministically (high-score / mid-score / public-read / storage-collision) and runs green in CI without live network |

## Bench Mode Kill Conditions

In addition to existing kill conditions, do not submit Bench Mode if:

- score is computed by an LLM (must be deterministic formula)
- bench profile renders without any per-source live fetch (sources must be live, not mocked, except inside Playwright runs explicitly labeled)
- trust-discount is hidden or absent from the breakdown panel
- `/b/[name]` is advertised in README/SCOPE without the route actually shipping
- score breakdown normalizes the discounted sum to a ceiling (`0.601 / 0.700 → 0.86`) — that cancels the trust discount
- S-tier badge is rendered as reachable in v1 (max v1 final score is 79; S requires verified GitHub cross-sign in v2)
