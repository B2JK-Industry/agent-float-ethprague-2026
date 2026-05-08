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

## Stream B — Evidence Engine (Dev B)

Owned paths after lock:

- `packages/evidence/`
- `packages/shared/`

Tasks:

1. Resolve ENS records live (P0).
2. Read EIP-1967 implementation slot (P0).
3. Fetch upgrade events (P1).
4. Fetch Sourcify verification + metadata (P0).
5. Compare ABI and risky selectors (P1).
6. Compare storage layouts where available (P1).
7. Produce deterministic Siren Report JSON (P0).

## Stream C — Web UX + Optional Siren Agent (Dev C)

Owned paths after lock:

- `apps/web/`
- `apps/siren-agent/` (P2 stretch only)
- `packages/reporter/` (P2 stretch only — signed report helper)

### P0 — Web UX core

1. ENS lookup page.
2. Verdict-first screen.
3. Before/after implementation comparison.
4. Evidence drawer.
5. Sourcify link panel.
6. Demo mode with three scenarios (safe / dangerous / unverified).

### P1 — Web UX polish

7. Governance comment generator.
8. Plain-language explanation of verdict.

### P2 — Optional Siren Agent (stretch, Umia-conditional)

9. Watchlist config.
10. Recurring evidence checks runner.
11. Signed report (EIP-712).
12. Optional Umia-style due-diligence panel.

> Siren Agent + Umia panel land **only if** Daniel decides to pursue the Umia track after mentor feedback. If time tightens, these are the first cuts.

## Tracker — Daniel

Not picked up by dev agents. Daniel owns:

- Mentor sweeps: Sourcify (priority #1), ENS (priority #2), Umia (optional)
- Final sponsor decisions
- PR merges
- Scope cuts during execution

## Tracker — Orch (Claude orchestrator)

Not picked up by dev agents. Orch owns:

- `README.md`, `SCOPE.md`, `docs/`, `wiki/`, `prompts/` maintenance
- Backlog status updates post-merge in `docs/13-backlog.md`
- 3-minute booth script preparation
- Devfolio description + video script
- Mentor-finding translation into backlog adjustments
- Keeping Agent Float language out of active docs

## Build Priority (cross-stream)

| Priority | Must ship | Streams |
|---|---|---|
| P0 | ENS live resolution, Sourcify evidence, verdict UI, safe/dangerous/unverified demo | A + B + C |
| P1 | Governance comment, storage-layout diff, ABI risk diff polish | B + C |
| P2 | Siren Agent watchlist, signed report, optional Umia panel | C |
| P3 | API, wallet/explorer integrations | post-hack |

## Scope Cut Rule

If time is tight, cut in this order:

1. P3 (deferred)
2. P2 Siren Agent + Umia panel
3. P1 polish

**Never cut:** ENS live resolution, Sourcify evidence, verdict UI, dangerous demo. These are the product core.
