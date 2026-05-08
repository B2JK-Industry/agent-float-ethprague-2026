# Product Architecture

## System Flow

```text
ENS name
  -> live records
  -> proxy address and expected implementation
  -> chain reads
  -> Sourcify evidence
  -> deterministic diff
  -> Siren Report
  -> public verdict
```

## ENS Layer

ENS stores stable public pointers:

- chain ID
- proxy address
- expected current implementation
- previous implementation
- report URI
- report hash
- schema pointer

ENS should not store secrets or fast-changing private state.

## Sourcify Layer

Sourcify provides:

- verification status
- source metadata
- ABI
- compiler metadata
- storage layout when available
- inspectable source links

## Verdict Engine

| Condition | Verdict |
|---|---|
| New implementation unverified | `SIREN` |
| ENS current implementation mismatches proxy slot | `SIREN` |
| Storage layout incompatible | `SIREN` |
| Risky selector added | `REVIEW` or `SIREN` |
| Missing evidence | `REVIEW` unless a `SIREN` rule triggers |
| Verified and low-risk diff | `SAFE` |

## Siren Report

The report is JSON-first, then rendered into UI. It includes:

- ENS name
- chain ID
- proxy address
- old and new implementations
- verdict
- findings
- Sourcify links
- ENS resolution status
- recommended action
- optional signature

## Siren Agent

Siren Agent monitors a watchlist and emits reports when contract state, ENS records, or Sourcify verification status changes.
