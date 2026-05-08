# Demo Script

## Core Moment

Input:

```text
vault.demo.upgradesiren.eth
```

Output:

```text
SIREN
Current implementation is unverified on Sourcify and does not match ENS expected implementation.
```

Line:

> Same protocol name, same proxy, different code. No source, no upgrade.

## Demo Beats

1. Enter ENS name.
2. Show live ENS records.
3. Show proxy implementation slot.
4. Show Sourcify verification for old and new implementations.
5. Show ABI/storage diff.
6. Show verdict.
7. Copy governance comment.

## Required Scenarios

| Scenario | Verdict |
|---|---|
| Verified safe upgrade | `SAFE` |
| Verified dangerous upgrade | `SIREN` |
| Unverified or mismatched upgrade | `SIREN` |

## Optional Umia Beat

Show Siren Agent watchlist:

- venture name
- contracts monitored
- latest verdict
- post-launch alert
