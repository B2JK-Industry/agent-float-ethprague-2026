# Prompt: Write the Upgrade Siren backlog

Use this only after Daniel explicitly locks Upgrade Siren as the build scope.

## Role

You are the planning agent for Upgrade Siren. Read the project source of truth and produce `docs/13-backlog.md`, designed for three parallel AI dev streams plus one reviewer.

Do not propose a new project. Do not revive Agent Float. Do not add sponsor tracks unless Daniel explicitly changes `SCOPE.md`.

## Read Order

1. `README.md`
2. `SCOPE.md`
3. `AGENTS.md`
4. `CLAUDE.md`
5. `docs/01-vision.md`
6. `docs/02-product-architecture.md`
7. `docs/04-technical-design.md`
8. `docs/05-demo-script.md`
9. `docs/06-acceptance-gates.md`
10. `docs/07-sponsor-fit.md`
11. `docs/10-risks.md`
12. `docs/12-implementation-roadmap.md`
13. GitHub Wiki (`https://github.com/B2JK-Industry/Upgrade-Siren-ETHPrague2026/wiki`). If wiki access fails, continue from local docs and add a clear backlog note that wiki could not be read.

## Execution Model

Three dev agents run in parallel **non-stop**:

| Stream | Name | Owns |
|---|---|---|
| A | Contract Fixtures | `contracts/`, `scripts/deploy*`, `test/`, Sourcify verification scripts |
| B | Evidence Engine | `packages/evidence/`, `packages/shared/`, report schema, ENS/Sourcify/onchain readers |
| C | Web UX and Siren Agent | `apps/web/`, `apps/siren-agent/`, demo UI, governance comment, optional Umia panel |

A fourth agent reviews PRs continuously (`prompts/review-prs.md`).

Tracker-only owners (not picked up by dev agents):

| Owner | Scope |
|---|---|
| Daniel | mentor sweeps, final sponsor decisions, merges, scope cuts |
| Orch | docs, GitHub Wiki, prompts, backlog maintenance |

The backlog must be deep enough that no dev stream ever runs out of work while waiting for a dependency. Each stream needs a steady supply of independent items.

## Hard Rules

1. Every executable backlog item has exactly one owner: `A`, `B`, or `C`.
2. Dependencies are explicit. **PR-open does not unblock downstream work; only `merged` to main does.**
3. P0 items must map to one or more `GATE-N` from `docs/06-acceptance-gates.md`.
4. No code item should depend on Umia unless marked optional / P2.
5. Sourcify and ENS are core. Do not cut them.
6. No generic scanner positioning.
7. No AI-auditor claims.
8. No tokenomics, launchpad, marketplace, or Agent Float content.
9. No day/hour schedule. Use priority, effort, and dependency DAG.
10. No emoji.
11. **Each stream must have at least 4 items with `Dependencies | none`** so the stream can always work while waiting on cross-stream merges.
12. Each item is small enough to be one PR (effort ≤ M for most items; XL items must be split).

## Required Backlog Coverage

Create items for at least every topic below. Stream owner shown in parentheses.

**Stream A (Contract Fixtures):**
- proxy fixture contract (EIP-1967 transparent or UUPS) (A)
- VaultV1 baseline implementation (A)
- VaultV2Safe implementation: storage-compatible, no new privileged selectors (A)
- VaultV2Dangerous implementation: adds `sweep`, changes storage layout (A)
- unverified implementation deployment scenario (A)
- Sourcify verification scripts for V1, V2Safe, V2Dangerous (A)
- Foundry tests: storage-layout assertion, dangerous-selector behavior, upgrade flow (A)
- deploy script with documented addresses, Sepolia targeted (A)
- documentation of deployed addresses + ENS record values (A)

**Stream B (Evidence Engine):**
- ENS record live resolution (siren:* records) (B)
- EIP-1967 implementation slot reader (B)
- `Upgraded(address)` event reader (B)
- Sourcify verification/status fetch (`/server/v2/contract/{chainId}/{address}?fields=all`) (B)
- Sourcify metadata fetch (source, ABI, compiler, storage layout) (B)
- ABI risky-selector diff (`sweep`, `withdraw`, `setOwner`, `setAdmin`, `mint`, `pause`, arbitrary `call`) (B)
- storage-layout compatibility diff (B)
- Siren Report JSON schema in `packages/shared/` (B)
- verdict engine: SAFE / REVIEW / SIREN rules (B)
- shared types package for cross-stream consumption (B)
- Sourcify response cache layer with TTL (B)
- ENS resolution cache layer (B)
- 4byte signature lookup for unverified contracts (B)

**Stream C (Web UX + optional Siren Agent):**
- Next.js 16 app scaffold with Tailwind 4 (C)
- ENS lookup page (input field + submit) (C)
- verdict card component (SAFE / REVIEW / SIREN) (C)
- before/after implementation comparison view (C)
- evidence drawer with Sourcify links (C)
- ABI diff renderer (C)
- storage diff renderer (C)
- ENS records resolved live panel (C)
- governance comment generator (C)
- demo mode runner with three scenarios (safe / dangerous / unverified) (C)
- mock-path visible badge component (C)
- five-second-rule performance check (C)
- **P2:** Siren Agent watchlist config (C)
- **P2:** signed report (EIP-712) helper (C)
- **P2:** Umia-style due-diligence panel (C)

**Tracker (Daniel + Orch):**
- sponsor pitch finalization (Daniel + Orch)
- Devfolio submission materials (Daniel + Orch)
- 3-minute booth script rehearsal (Daniel + Orch)
- demo video recording fallback (Daniel + Orch)

## Output Format

Write one file: `docs/13-backlog.md`.

Use the structure shown below. Reproduce all sections exactly. The worked examples at the end of this prompt show the level of detail required — match or exceed it for every backlog entry.

````markdown
# 13 - Backlog

> Locked-scope work breakdown for Upgrade Siren. Source of truth: `SCOPE.md` and `docs/06-acceptance-gates.md`.
> Dev agents work non-stop per `prompts/run-dev-stream.md`. PR Reviewer works non-stop per `prompts/review-prs.md`.

## Conventions

- IDs: US-NNN (ascending, no gaps)
- Type: epic / story / task
- Priority: P0 (must ship) / P1 (polish) / P2 (stretch) / P3 (post-hack)
- Effort: XS (<1h) / S (1-2h) / M (half-day) / L (1 day) / XL (split required)
- Owner: A / B / C / Daniel / Orch
- Status: open / pr-open / merged / blocked
- Dependencies: list of US-NNN ids that must be `merged` before this item can start. PR-open does not unblock.

## Stream Ownership Map

(Reproduce the table from `prompts/run-dev-stream.md`.)

## Index

| ID | Title | Owner | Priority | Effort | Status | Depends on |
|---|---|---|---|---|---|---|
| US-001 | ... | A | P0 | M | open | none |
| US-002 | ... | B | P0 | S | open | none |
| ... | ... | ... | ... | ... | ... | ... |

## Dependency DAG (text form)

A list, grouped by stream, showing which items each stream can start on day one (no dependencies) and which unlock later.

## Backlog Detail

(One section per US-NNN item, in the format shown in the worked examples below.)
````

### Per-item template

Every item — every single one — uses this exact template. No abbreviations.

````markdown
### US-NNN - <title>

| Field | Value |
|---|---|
| Type | task / story / epic |
| Priority | P0 / P1 / P2 / P3 |
| Owner | A / B / C / Daniel / Orch |
| Effort | XS / S / M / L / XL |
| Sponsor | Sourcify / ENS / Future Society / Umia / - |
| Dependencies | US-NNN, US-NNN (or none) |
| Acceptance gates | GATE-N, GATE-N (or - if not P0) |
| Status | open |

#### Scope

<2-5 sentences describing what is in scope and what is explicitly out of scope. Reference exact file paths the item will touch. Reference exact API endpoints or contracts where relevant.>

#### Acceptance Criteria

- [ ] <concrete, locally verifiable criterion 1>
- [ ] <concrete, locally verifiable criterion 2>
- [ ] <test or check command listed with expected output>
- [ ] mocks (if any) labeled `mock: true`
- [ ] PR body references this US-NNN

#### Files

- `path/to/file/to/create/or/edit.ext`
- ...

#### Verification commands

```bash
<exact commands the dev runs and the reviewer reproduces>
```

#### Notes

<edge cases, schema references, why this approach was chosen, anything that helps the reviewer>
````

## Worked Examples

These examples are the floor for detail, not the ceiling. Every backlog item must be at least this specific.

### Example: Stream A item

````markdown
### US-014 - Deploy VaultV2Dangerous fixture with sweep selector and incompatible storage

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | A |
| Effort | M |
| Sponsor | Sourcify |
| Dependencies | US-010, US-012 |
| Acceptance gates | GATE-6, GATE-7, GATE-9 |
| Status | open |

#### Scope

Implement `VaultV2Dangerous.sol` as the dangerous-upgrade fixture for the SIREN demo scenario. The contract must be storage-incompatible with `VaultV1` and must add a `sweep(address token, address to)` selector that any owner can call. The danger must be intentional and labeled in NatSpec. This item also adds the deploy script entry and the storage-layout assertion test that proves the incompatibility. Out of scope: Sourcify verification (US-016) and the deploy-to-Sepolia run (US-018).

#### Acceptance Criteria

- [ ] `contracts/VaultV2Dangerous.sol` exists, compiles under Solidity 0.8.24, and inherits the same proxy pattern as V1
- [ ] `sweep(address token, address to)` exists, callable by `owner`, transfers full token balance
- [ ] NatSpec on `sweep` documents the danger explicitly
- [ ] Storage layout reorders one slot relative to V1 (proven by layout assertion test)
- [ ] `forge test --match-contract VaultV2DangerousTest` passes
- [ ] `forge inspect VaultV2Dangerous storage-layout` artifact committed under `test/fixtures/storage-layouts/`
- [ ] Deploy script entry added in `scripts/deploy/02_dangerous.s.sol`
- [ ] PR body references US-014

#### Files

- `contracts/VaultV2Dangerous.sol`
- `test/VaultV2DangerousTest.t.sol`
- `test/fixtures/storage-layouts/VaultV2Dangerous.json`
- `scripts/deploy/02_dangerous.s.sol`

#### Verification commands

```bash
forge build
forge test --match-contract VaultV2DangerousTest -vv
forge inspect VaultV2Dangerous storage-layout
```

#### Notes

The danger is two-pronged: storage incompat AND new privileged selector. Both are needed because the verdict engine (Stream B) checks each independently and we want both signals firing in the demo. Pin compiler in `foundry.toml` to `0.8.24` to keep verification deterministic. Sourcify verification of this fixture is a separate item (US-016) so the dangerous-but-verified scenario is explicit.
````

### Example: Stream B item

````markdown
### US-022 - Sourcify metadata fetch with explicit error mode handling

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | B |
| Effort | M |
| Sponsor | Sourcify |
| Dependencies | US-020 |
| Acceptance gates | GATE-5, GATE-9, GATE-13, GATE-16 |
| Status | open |

#### Scope

Implement `fetchSourcifyMetadata(chainId, address)` in `packages/evidence/src/sourcify/metadata.ts`. It calls `https://sourcify.dev/server/v2/contract/{chainId}/{address}?fields=all` and parses the returned contract lookup payload, including match status, ABI, compiler metadata, and storage layout where available. It returns a typed `SourcifyMetadata` or a discriminated `SourcifyError` describing one of: `not_found`, `partial_or_nonperfect_match`, `server_error`, `malformed_metadata`, `missing_storage_layout`. No silent fallbacks. Caching is out of scope (US-024). The verdict engine (US-030) consumes the result; missing data must downgrade verdict, never produce false confidence.

#### Acceptance Criteria

- [ ] `fetchSourcifyMetadata` exported with full TypeScript types; no `any`
- [ ] Returns discriminated union `Result<SourcifyMetadata, SourcifyError>`
- [ ] Handles HTTP 404 -> `not_found`
- [ ] Handles HTTP 5xx -> `server_error` with status code
- [ ] Handles partial or non-perfect match response -> `partial_or_nonperfect_match`
- [ ] Handles missing `storageLayout` field -> `missing_storage_layout`
- [ ] Handles malformed JSON -> `malformed_metadata`
- [ ] Vitest unit tests cover all five error modes with `mock: true` fixtures
- [ ] At least one integration test against a real Sourcify-verified contract on Sepolia (V1 fixture from US-016)
- [ ] PR body references US-022

#### Files

- `packages/evidence/src/sourcify/metadata.ts`
- `packages/evidence/src/sourcify/types.ts`
- `packages/evidence/test/sourcify/metadata.test.ts`
- `packages/evidence/test/fixtures/sourcify-*.json`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/evidence typecheck
pnpm --filter @upgrade-siren/evidence test sourcify/metadata
pnpm --filter @upgrade-siren/evidence test:integration sourcify/metadata
```

#### Notes

Use Node 22 global `fetch` (undici under the hood); no axios. TTL/caching layer is US-024 - keep this function pure (no side effects beyond the fetch). Discriminated union beats throwing because the verdict engine needs to inspect the error reason. The integration test depends on US-016 being merged so a real verified contract address exists.
````

### Example: Stream C item

````markdown
### US-041 - Verdict card component with five-second visibility budget

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | C |
| Effort | M |
| Sponsor | Future Society |
| Dependencies | US-040 |
| Acceptance gates | GATE-1, GATE-2, GATE-20, GATE-21 |
| Status | open |

#### Scope

Build the verdict card component at `apps/web/components/VerdictCard.tsx`. Renders the verdict (SAFE / REVIEW / SIREN) as the largest visual element above the fold. Color and glyph are paired (color-blind safe). Includes the protocol name, proxy address (truncated), and a one-sentence summary. Page-load to verdict-visible must be measurable and under five seconds for the three demo fixtures. Out of scope: evidence drawer (US-043), governance comment (US-048).

#### Acceptance Criteria

- [ ] `VerdictCard` accepts `{verdict, name, proxy, summary, mock?}` typed props
- [ ] SAFE renders green bg + check glyph + "SAFE" label
- [ ] REVIEW renders amber bg + warning glyph + "REVIEW" label
- [ ] SIREN renders red bg + alarm glyph + "SIREN" label
- [ ] When `mock: true` prop set, badge `MOCK` renders in card corner
- [ ] Component test covers all three verdicts + mock variant
- [ ] Playwright test asserts verdict text visible within 5000ms of navigation for the three demo fixtures
- [ ] Lighthouse performance score >= 90 on the demo page
- [ ] No `text-green` or `text-red` outside verdict component (audit grep)
- [ ] PR body references US-041

#### Files

- `apps/web/components/VerdictCard.tsx`
- `apps/web/components/VerdictCard.test.tsx`
- `apps/web/e2e/verdict-card.spec.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/web typecheck
pnpm --filter @upgrade-siren/web test verdict-card
pnpm --filter @upgrade-siren/web e2e verdict-card
pnpm --filter @upgrade-siren/web lighthouse:demo
```

#### Notes

Color contrast: WCAG AA at minimum. Glyphs are required because some judges may be color-blind. The five-second rule is locked in `SCOPE.md §9 / GATE-20`; if Lighthouse says we cannot hit it for the dangerous fixture, escalate to Daniel rather than silently relaxing the budget.
````

## Dependency DAG Construction Rules

When you set dependencies:

- **A -> B:** B's evidence engine items can read against fixtures only after the fixture deploy item is merged. Sourcify verification items (A) must be merged before B's Sourcify integration tests can run against real verified contracts.
- **B -> C:** C's UX items that consume the report schema can start as soon as B's schema item is merged; they do not need every B item merged.
- **A -> C (rare):** C's demo scenario runner needs deployed addresses; this is one item only.
- **Within stream:** keep sequential dependencies short. Most A items can run in parallel after the proxy + V1 are deployed.
- **Independent items first:** the first 4 items in each stream's index must have `Dependencies | none` so all three streams can start immediately.

## Reviewer Contract

Every item must be reviewable by `prompts/review-prs.md` without hidden context. If the reviewer cannot verify the acceptance criteria locally with the listed verification commands, the item is not ready and must be rewritten before the dev pipeline starts.

## Backlog Maintenance

After Daniel merges a PR, Orch updates the index status `open` -> `merged` for that US-NNN. Dev agents do not edit the backlog. If a dev agent finds a missing item, they post a suggestion as a PR comment; Orch decides whether to add it.
