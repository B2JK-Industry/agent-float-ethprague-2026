# Implementation Roadmap

> Code remains blocked until Daniel confirms Upgrade Siren as the locked build scope.

## Track A: Contract Fixtures

Owned paths after lock:

- `contracts/`
- `scripts/deploy*`
- `test/`

Tasks:

1. Deploy proxy fixture.
2. Deploy `VaultV1`.
3. Deploy `VaultV2Safe`.
4. Deploy `VaultV2Dangerous`.
5. Verify implementations on Sourcify.
6. Document deployed addresses and ENS record values.

## Track B: Evidence Engine

Owned paths after lock:

- `packages/evidence/`
- `packages/shared/`

Tasks:

1. Resolve ENS records live.
2. Read EIP-1967 implementation slot.
3. Fetch upgrade events.
4. Fetch Sourcify verification and metadata.
5. Compare ABI and risky selectors.
6. Compare storage layouts where available.
7. Produce deterministic Siren Report JSON.

## Track C: Web UX

Owned paths after lock:

- `apps/web/`

Tasks:

1. ENS lookup page.
2. Verdict-first screen.
3. Before/after implementation comparison.
4. Evidence drawer.
5. Sourcify link panel.
6. Governance comment generator.
7. Demo mode with three scenarios.

## Track D: Siren Agent

Owned paths after lock:

- `apps/siren-agent/`
- `packages/reporter/`

Tasks:

1. Watchlist config.
2. Run recurring evidence checks.
3. Emit signed report.
4. Optional Umia-style due-diligence panel.

## Track E: Docs and Submission

Owned paths:

- `README.md`
- `SCOPE.md`
- `docs/`
- `wiki/`
- `prompts/`

Tasks:

1. Keep sponsor pitch consistent.
2. Prepare 3-minute booth script.
3. Prepare Devfolio description.
4. Prepare video script.
5. Keep old Agent Float language out of active docs.

## Build Priority

| Priority | Must ship |
|---|---|
| P0 | ENS live resolution, Sourcify evidence, verdict UI, safe/danger demo |
| P1 | Governance comment, storage-layout diff, signed reports |
| P2 | Siren Agent watchlist, Umia panel |
| P3 | API, wallet/explorer integrations |

## Scope Rule

If time is tight, cut Siren Agent before cutting ENS or Sourcify. ENS and Sourcify are the product core.
