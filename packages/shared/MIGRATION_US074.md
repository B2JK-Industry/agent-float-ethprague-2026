# US-074 typed-data migration

## What changed

The EIP-712 typed-data domain that `signReport` and `verifyReportSignature`
work against was extended from 10 fields to 15. Existing signed reports
will **not** verify against the new typed-data and must be re-signed.

| Field | Status | Type | Source |
|---|---|---|---|
| `name` | unchanged | `string` | `report.name` |
| `chainId` | unchanged | `uint256` | `report.chainId` |
| `proxy` | unchanged | `address` | `report.proxy` |
| `previousImplementation` | unchanged | `address` | `report.previousImplementation ?? 0x0` |
| `currentImplementation` | unchanged | `address` | `report.currentImplementation` |
| `verdict` | unchanged | `string` | `report.verdict` |
| `mode` | unchanged | `string` | `report.mode` |
| `confidence` | unchanged | `string` | `report.confidence` |
| `generatedAt` | unchanged | `string` | `report.generatedAt` |
| `summary` | unchanged | `string` | `report.summary` |
| **`recommendedAction`** | new | `string` | `report.recommendedAction` |
| **`mock`** | new | `bool` | `report.mock` |
| **`findingsHash`** | new | `bytes32` | `keccak256(canonicalJson(report.findings))` |
| **`sourcifyLinksHash`** | new | `bytes32` | `keccak256(canonicalJson(report.sourcify.links))` |
| **`signedAt`** | new | `string` | `report.auth.signedAt` (set pre-signing) |

## Why

Before US-074 the typed-data stopped at `summary`. An attacker could take
a valid signed-manifest report, swap the `findings` array, change
`recommendedAction`, or flip `mock`, and `recoverTypedDataAddress` would
still recover the original signer because the signed digest never covered
those fields. The verdict UI would render attacker-supplied evidence
under a legitimate signature.

The new typed-data binds the entire payload that the report claims to
authenticate. Any tampering of `findings`, `sourcify.links`,
`recommendedAction`, `mock`, or `signedAt` breaks recovery and the
report is rejected by `verifyReportSignature` /
`verifyReportFromManifest` (US-069).

## Migration path for existing signed reports

1. **Re-sign on next operator action.** Most demo and live signed reports
   are produced fresh per upgrade event by the operator running the
   provisioning scripts. The next time they sign anything, the new
   typed-data is in effect and the resulting reports verify cleanly.
2. **Existing on-chain manifests stay valid.** Manifest records in ENS
   carry `reportUri` + `reportHash`; only the report bytes (and their
   hash) change when re-signed. `manifest.reportHash` is recomputed
   alongside the new signature; `setText` writes the new manifest in
   one transaction.
3. **No on-chain changes required.** The typed-data is application-level;
   no Solidity contract reads or writes the fields, so no contract redeploy.
4. **Demo fixtures.** Stream A's US-011 provisioning regenerates the three
   signed reports (safe, dangerous, unverified) from source on every demo
   spin-up. After this PR merges, Stream A re-runs `pnpm provision-ens`
   (or whatever wraps the demo signing) and the new reports verify.

## Verification

A round-trip test in `test/eip712.test.ts` (US-074 describe block) signs
the canonical fixture, then for each newly-bound field tampers a copy
post-signing and asserts that recovery returns a different address. The
six tests cover `findings`, `sourcify.links`, `recommendedAction`, `mock`,
`auth.signedAt`, plus the canonical happy-path round trip.
