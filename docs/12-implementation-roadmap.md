# Implementation Roadmap

> Code remains blocked until Daniel confirms Upgrade Siren as the locked build scope.

Three parallel dev streams + two tracker owners. Aligned with `SCOPE.md §10` and the 4-agent pipeline in `prompts/`.

## Stream A — Contract Fixtures (Dev A)

Owned paths after lock:

- `contracts/`
- `scripts/deploy*`
- `test/`

Tasks:

1. Deploy proxy fixture (P0).
2. Deploy `VaultV1` (P0).
3. Deploy `VaultV2Safe` (P0).
4. Deploy `VaultV2Dangerous` (P0).
5. Deploy unverified-implementation scenario (P0; required for SIREN-on-mismatch demo).
6. Verify implementations on Sourcify (P0).
7. Document deployed addresses and ENS record values (P0).
8. Provision ENS records, including stable `upgrade-siren:*` records and atomic `upgrade-siren:upgrade_manifest` after fixture deploy (P0).
9. Generate, sign, and host Siren Report JSON for safe, dangerous, and unverified demo scenarios using `packages/shared/signReport` (P0; depends on Stream B typed-data/sign helper).
10. Add ENSIP-26 `agent-context` and `agent-endpoint[web]` records for demo subnames (P1 sponsor polish).

## Stream B — Evidence Engine (Dev B)

Owned paths after lock:

- `packages/evidence/`
- `packages/shared/`

Tasks:

1. Resolve ENS records live (P0).
2. Read EIP-1967 implementation slot (P0).
3. Fetch upgrade events (P1).
4. Fetch Sourcify verification + metadata (P0).
5. Compare ABI and risky selectors (P0).
6. Compare storage layouts where available for fixture contracts (P0).
7. Produce deterministic Siren Report JSON (P0).
8. Provide EIP-712 typed-data builder and `signReport` helper in `packages/shared/` (P0).
9. Parse `upgrade-siren:upgrade_manifest` atomically (P0).
10. Verify EIP-712 report signature against `upgrade-siren:owner` (P0).
11. Implement public-read fallback for absent Upgrade Siren records (P0).
12. Define absent-owner, malformed-manifest, and manifest-mismatch verdict paths (P0).
13. Validate `upgrade-siren:upgrade_manifest` schema version `upgrade-siren-manifest@1`; unknown versions become `REVIEW` unless a `SIREN` rule triggers (P0).
14. Read ENSIP-26 `agent-context` and `agent-endpoint[web]` records (P1 sponsor polish).
15. Validate `previousManifestHash` chain (P1 audit trail).
16. RPC retry/failover and Sourcify rate-limit/cache fallback (P1 reliability).
17. Optional 4byte signature lookup for unverified contracts (P1).
18. Upgrade-window grace policy research/implementation (P1; P0 remains conservative `SIREN` on mismatch).

## Stream C — Web UX + Optional Siren Agent (Dev C)

Owned paths after lock:

- `apps/web/`
- `apps/siren-agent/` (P2 stretch only)
- `packages/reporter/` (P2 stretch only — automated Siren Agent signing/reporting flow)

### P0 — Web UX core

1. ENS lookup page.
2. Verdict-first screen.
3. Address / normal ENS address-record input for public-read fallback.
4. Progressive loading checklist (`ENS`, `chain`, `Sourcify`, `diff`, `signature`).
5. Before/after implementation comparison.
6. Evidence drawer.
7. Sourcify link panel.
8. Demo mode with four scenarios (safe / dangerous / unverified / live public-read).
9. Governance comment generator with short, forum, and vote-reason formats.
10. Signed evidence citation embedded in governance comments.
11. Signature status badge (`signed`, `unsigned`, `signature-invalid`) in report UI.
12. Empty and error states for absent records, RPC failure, Sourcify failure, malformed manifest, and unsigned report.

### P1 — Web UX polish

13. Plain-language explanation of verdict.
14. Demo animation / presentation polish.
15. Share-verdict link with precomputed report result.
16. Mobile responsive layout check for viewport <= 768px.
17. Accessibility pass: WCAG AA color contrast and screen-reader labels for verdict/status.

### P2 — Optional Siren Agent (stretch, Umia-conditional)

18. Watchlist config.
19. Recurring evidence checks runner.
20. Siren Agent signed report automation (P0 signing primitive and report signature verification already live in Stream B core).
21. Optional Umia-style due-diligence panel.

> Siren Agent + Umia panel land **only if** Daniel decides to pursue the Umia track after mentor feedback. If time tightens, these are the first cuts.

## Tracker — Daniel

Not picked up by dev agents. Daniel owns:

- Mentor sweeps: Sourcify (priority #1), ENS (priority #2), Umia (optional)
- Final sponsor decisions
- PR merges
- Scope cuts during execution
- Operator wallet / report signer custody decision; default is dedicated deploy-time signer in local env, never committed
- Live public-read protocol target selection for the fourth demo scenario

## Tracker — Orch (Claude orchestrator)

Not picked up by dev agents. Orch owns:

- `README.md`, `SCOPE.md`, `docs/`, GitHub Wiki, `prompts/` maintenance
- Backlog status updates post-merge in `docs/13-backlog.md`
- 3-minute booth script preparation
- Devfolio description + video script
- Mentor-finding translation into backlog adjustments
- Keeping Agent Float language out of active docs
- Devfolio logo/cover asset preparation
- Booth fallback artifacts: recorded video, Anvil/local fallback, and cached fixture responses

## Devfolio Submission Checklist

Owned by Daniel + Orch. Must complete before deadline.

### Project metadata

- [ ] Project name: `Upgrade Siren`
- [ ] One-line tagline: `No source, no upgrade.`
- [ ] Long description: pitch + thesis + verdict triade + sponsor framing (~3 paragraphs from `README.md` opening)
- [ ] Logo / cover image (simple wordmark + verdict-traffic-light visual; defer to existing demo screenshot if no time)
- [ ] Tags: `Sourcify`, `ENS`, `EIP-1967`, `proxy`, `upgrade-risk`, `DAO governance`, `public-good`

### Track selection (mark these on Devfolio)

- [ ] **Primary:** Sourcify Bounty
- [ ] **Secondary:** ENS Most Creative Use
- [ ] **Organizer:** ETHPrague Future Society
- [ ] **Optional:** Umia Best Agentic Venture (only if Daniel pursues after mentor feedback; only if Siren Agent shipped)

### Required artifacts

- [ ] Live demo URL (Vercel deployment)
- [ ] Source code repo URL: `https://github.com/B2JK-Industry/Upgrade-Siren-ETHPrague2026`
- [ ] Sourcify-verified contract addresses (proxy + V1 + V2Safe + V2Dangerous + unverified scenario)
- [ ] ENS subname examples (`vault.demo.upgradesiren.eth` or chosen parent)
- [ ] Signed Siren Report URLs for safe, dangerous, and unverified demo scenarios
- [ ] Live public-read protocol target and resulting report URL
- [ ] Demo video (3-min booth script per `docs/05-demo-script.md`; recording fallback per Demo Plan)
- [ ] README link
- [ ] Acceptance gates checklist marked (per `docs/06`)

### Sponsor-specific submission notes

- **Sourcify track:** in submission body, list specific Sourcify endpoints used + concrete contract pages judges can inspect
- **ENS Most Creative track:** in submission body, list `upgrade-siren:*` records used + show that signed high-confidence mode requires ENS records
- **Future Society track:** in submission body, frame public-good safety angle for DAO voters / wallet users
- **Umia (if pursued):** Siren Agent due-diligence framing; must NOT pitch as token launchpad

### Pre-submission gate verification

Before clicking submit, verify each of these against `docs/06-acceptance-gates.md`:

- [ ] GATE-3 ENS live resolution
- [ ] GATE-5 Sourcify verification fetched live
- [ ] GATE-6 Safe + dangerous demo cases working
- [ ] GATE-13 Missing data lowers confidence (no fake claims)
- [ ] GATE-14 Mocks labeled `mock: true`
- [ ] GATE-15 Local run reproduces demo
- [ ] GATE-23 Governance comments in short, forum, and vote-reason formats
- [ ] GATE-24 Production report signed by `upgrade-siren:owner`
- [ ] Demo report URIs fetch signed JSON and hashes match `upgrade-siren:upgrade_manifest.reportHash`
- [ ] GATE-25 Public-read fallback works for live protocol target
- [ ] GATE-26 Progressive loading + error states visible
- [ ] Kill conditions all clear (no AI auditor / generic scanner pitch)

### Submission timing

- Devfolio submission must be complete by **2026-05-10 12:00 PM** Prague time
- Recommend submitting at least 60 minutes early to allow for last-minute fixes if Devfolio surfaces validation errors

### Post-submission

- Daniel posts in mentor channels (Sourcify, ENS, Future Society) confirming submission ID
- Daniel updates BRAINSTORM Decision log with submission status

## Production Deployment Prerequisites

> Confirmed by Daniel 2026-05-08: Vercel Pro available; remaining infrastructure prerequisites will be provisioned by Daniel as needed. This section is the canonical list.

### Confirmed by Daniel

- [x] Vercel Pro account (production hosting + AI Gateway access + preview deploys + analytics)
- [x] Alchemy account from prior project (Sepolia + mainnet RPC endpoints)
- [x] Operator wallet for mainnet ENS operations
- [x] GitHub repo (`B2JK-Industry/Upgrade-Siren-ETHPrague2026`) public, wiki + issues + projects + discussions enabled

### Pending pre-launch actions

- [ ] Register chosen ENS parent. Registry owner check on 2026-05-08 showed `upgradesiren.eth`, `upgrade-siren.eth`, and `upgrade-siren-demo.eth` unowned, but purchase is not complete yet.
- [ ] Mainnet ETH funded for ENS parent registration + initial subname issuance (~$50-100 estimated)
- [ ] Sepolia ETH from faucet for fixture contract deploys
- [ ] Vercel project linked to repo via Vercel CLI or dashboard
- [ ] Production env vars set in Vercel:
  - `AI_GATEWAY_API_KEY`
  - `ALCHEMY_RPC_SEPOLIA`
  - `ALCHEMY_RPC_MAINNET`
  - `SOURCIFY_API_BASE` (default `https://sourcify.dev`)
- [ ] Local deploy/provision env vars set outside git (per US-060 decision in `BRAINSTORM.md`, all three sit in `.env` which `.gitignore` excludes; `OPERATOR_PRIVATE_KEY` and `REPORT_SIGNER_PRIVATE_KEY` are the **same key** so the EIP-712 recovered signer equals the address claimed by `upgrade-siren:owner` per GATE-24):
  - `DEPLOYER_PRIVATE_KEY` — Sepolia fixture deployer wallet, separate from operator
  - `OPERATOR_PRIVATE_KEY` — ENS subname provisioning + `upgrade-siren:owner` authority
  - `REPORT_SIGNER_PRIVATE_KEY` — EIP-712 report signer; **same value as `OPERATOR_PRIVATE_KEY`**
- [ ] Optional Upstash Redis instance (cache Sourcify responses, rate-limit per IP) — via Vercel Marketplace
- [ ] Optional Neon Postgres (Siren Agent watchlist persistence, P2 stretch) — via Vercel Marketplace

### Deployment flow (post scope-lock)

1. Stream A deploys fixture contracts to Sepolia + Sourcify-verifies them
2. Operator registers ENS parent (`upgradesiren.eth` or chosen) + issues demo subnames pointing at fixtures
3. Stream B + C scaffold Next.js + packages; pnpm workspace; `vercel.ts` config
4. Vercel auto-deploys `main` to production (`*.vercel.app` or custom domain post-hack)
5. Pre-cache Sourcify + ENS responses for demo fixtures (warm cache fixture)
6. Booth-day fallbacks: Anvil local fork + recorded full-demo video

### Custom domain (optional, post-hack polish)

- Reserve options: `upgradesiren.app`, `upgrade-siren.io`, `upgradesiren.xyz`
- Vercel handles SSL automatically; DNS via Cloudflare or registrar
- Cost: $15-30/year; acceptable polish for post-hackathon expansion

## Build Priority (cross-stream)

| Priority | Must ship | Streams |
|---|---|---|
| P0 | ENS live resolution, public-read fallback, atomic upgrade manifest, absent-record verdict paths, EIP-712 signing primitive, signed demo reports, EIP-712 report signature verification, Sourcify evidence, verdict UI, progressive loading/error states, ABI risk diff, storage-layout result for fixtures, governance comments, safe/dangerous/unverified/live-public-read demo | A + B + C |
| P1 | ENSIP-26 records, manifest hash-chain validation, 4byte lookup, retry/cache/fallback polish, plain-language verdict explanation, demo animation, share link, mobile/a11y pass | A + B + C |
| P2 | Siren Agent watchlist, automated signing/reporting flow, optional Umia panel | C |
| P3 | API, wallet/explorer integrations | post-hack |

## Scope Cut Rule

If time is tight, cut in this order:

1. P3 (deferred)
2. P2 Siren Agent + Umia panel
3. P1 polish

**Never cut:** ENS live resolution for signed manifest path, public-read fallback, atomic upgrade manifest, absent-record verdict paths, EIP-712 signing primitive, signed demo reports, EIP-712 report signature verification, Sourcify evidence, ABI risk diff, storage-layout result for fixture contracts, progressive loading/error states, governance comments, verdict UI, dangerous demo, live public-read demo. These are the product core for submission.
