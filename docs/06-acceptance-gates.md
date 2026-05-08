# Acceptance Gates

These gates must be true before submission.

## Product Gates

| Gate | Requirement |
|---|---|
| GATE-1 | User can enter an ENS name and get a verdict |
| GATE-2 | Verdict is one of `SAFE`, `REVIEW`, `SIREN` |
| GATE-3 | ENS records are resolved live in the app |
| GATE-4 | Proxy implementation is read from chain state |
| GATE-5 | Sourcify verification status is fetched live |
| GATE-6 | At least one safe upgrade and one dangerous upgrade are demoable |
| GATE-7 | UI explains the verdict in plain language |

## Technical Gates

| Gate | Requirement |
|---|---|
| GATE-8 | EIP-1967 implementation slot read works |
| GATE-9 | Sourcify evidence links are included in report |
| GATE-10 | ENS expected implementation is compared to live proxy slot |
| GATE-11 | ABI risk diff runs deterministically |
| GATE-12 | Storage-layout result is shown when available |
| GATE-13 | Missing data lowers confidence instead of being hidden |
| GATE-14 | Every mock is labeled `mock: true` |
| GATE-15 | Local run instructions reproduce demo |

## Sponsor Gates

| Gate | Requirement |
|---|---|
| GATE-16 | Sourcify is central to verdict evidence |
| GATE-17 | ENS is central to identity and discovery |
| GATE-18 | Future Society pitch frames public-good safety |
| GATE-19 | Optional Umia pitch is clearly Siren Agent due diligence, not token launchpad |

## UX Gates

| Gate | Requirement |
|---|---|
| GATE-20 | Verdict appears within five seconds for demo cases |
| GATE-21 | Evidence drawer is understandable to technical judges |
| GATE-22 | Non-technical user understands recommended action |
| GATE-23 | Governance comment generator works |

## Kill Conditions

Do not submit if:

- ENS is only a label
- Sourcify is only a link
- verdict is generated only by LLM text
- no live chain read exists
- UI looks like a generic audit dashboard
- pitch says "AI auditor" or "generic scanner"
- old Agent Float story leaks into active pitch
