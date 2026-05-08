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
12. `wiki/`

## Execution Model

Three dev agents run in parallel:

| Stream | Name | Owns |
|---|---|---|
| A | Contract Fixtures | `contracts/`, `scripts/deploy*`, `test/`, Sourcify verification scripts |
| B | Evidence Engine | `packages/evidence/`, `packages/shared/`, report schema, ENS/Sourcify/onchain readers |
| C | Web UX and Siren Agent | `apps/web/`, `apps/siren-agent/`, demo UI, governance comment, optional Umia panel |

Tracker-only owners:

| Owner | Scope |
|---|---|
| Daniel | mentor sweeps, final sponsor decisions, merges, scope cuts |
| Orch | docs, wiki, prompts, backlog maintenance |

## Hard Rules

1. Every executable backlog item has exactly one owner: `A`, `B`, or `C`.
2. Dependencies are explicit. PR-open does not unblock downstream work; only merged-to-main does.
3. P0 items must map to gates in `docs/06-acceptance-gates.md`.
4. No code item should depend on Umia unless marked optional.
5. Sourcify and ENS are core. Do not cut them.
6. No generic scanner positioning.
7. No AI-auditor claims.
8. No tokenomics, launchpad, marketplace, or Agent Float content.
9. No day/hour schedule. Use priority, effort, and dependency DAG.
10. No emoji.

## Required Backlog Coverage

Create items for:

- ENS contract map records and live resolution
- proxy fixture contracts: safe, dangerous, unverified/mismatch paths
- EIP-1967 implementation slot read
- `Upgraded(address)` event read
- Sourcify verification/metadata/ABI/storage-layout fetch
- ABI risky selector diff
- storage-layout compatibility diff
- Siren Report JSON schema
- verdict engine: `SAFE`, `REVIEW`, `SIREN`
- web lookup flow
- evidence drawer
- Sourcify links
- governance comment generator
- demo scenarios
- optional Siren Agent watchlist and signed report
- optional Umia venture due-diligence panel
- sponsor pitch and Devfolio materials

## Output Format

Write one file: `docs/13-backlog.md`.

Use this structure:

```markdown
# 13 - Backlog

> Locked-scope work breakdown for Upgrade Siren. Source of truth: SCOPE.md.

## Conventions

- IDs: US-NNN
- Type: epic / story / task
- Priority: P0 / P1 / P2 / P3
- Effort: XS / S / M / L / XL
- Owner: A / B / C / Daniel / Orch
- Status: open / pr-open / merged / blocked
- Dependencies: US-NNN list

## Stream Ownership Map

...

## Index

...

## Backlog Detail

### US-001 - <title>

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | B |
| Sponsor | ENS / Sourcify / Future Society / Umia / - |
| Dependencies | none |
| Acceptance gates | GATE-3, GATE-5 |

#### Scope
...

#### Acceptance Criteria
- ...

#### Files
- ...
```

## Reviewer Contract

Every item must be reviewable by `prompts/review-prs.md` without hidden context. If the reviewer cannot verify it, the item is not ready.
