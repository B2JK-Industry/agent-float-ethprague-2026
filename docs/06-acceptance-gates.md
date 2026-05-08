# Acceptance Gates

These gates define submission readiness. `P0` gates must pass before submission. `P1` gates are still planned, but if Daniel explicitly cuts them they must be called out honestly in the submission. Current scope treats ABI diff, storage-layout result, and governance comment generator as `P0`.

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

## Technical Gates

| Gate | Tier | Requirement |
|---|---|---|
| GATE-8 | P0 | EIP-1967 implementation slot read works |
| GATE-9 | P0 | Sourcify evidence links are included in report |
| GATE-10 | P0 | ENS expected implementation is compared to live proxy slot |
| GATE-11 | P0 | ABI risk diff runs deterministically |
| GATE-12 | P0 | Storage-layout result is shown when available for fixture contracts |
| GATE-13 | P0 | Missing data lowers confidence instead of being hidden |
| GATE-14 | P0 | Every mock is labeled `mock: true` |
| GATE-15 | P0 | Local run instructions reproduce demo |

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
| GATE-23 | P0 | Governance comment generator works |

## Kill Conditions

Do not submit if:

- ENS is only a label
- Sourcify is only a link
- verdict is generated only by LLM text
- no live chain read exists
- UI looks like a generic audit dashboard
- pitch says "AI auditor" or "generic scanner"
- old Agent Float story leaks into active pitch
