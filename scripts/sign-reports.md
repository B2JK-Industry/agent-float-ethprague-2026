# Siren Report signing runbook (US-011)

`scripts/sign-reports.ts` builds and (when the operator key is available) signs the three demo Siren Reports:

| Scenario | Verdict | currentImpl | Sourcify |
|---|---|---|---|
| `safe.${ENS_PARENT}` | `SAFE` | `v2safe` | verified |
| `dangerous.${ENS_PARENT}` | `SIREN` | `v2dangerous` | verified |
| `unverified.${ENS_PARENT}` | `SIREN` | `unverified` | not verified (intentionally) |

The fourth scenario — live public-read — is left as a TODO; the target address is chosen by Tracker US-062 ("live target research").

## What the script does

1. Reads `deployments/sepolia.json`.
2. For each scenario, builds a `SirenReport` matching `packages/shared/schemas/siren-report-v1.json`.
3. If `OPERATOR_PRIVATE_KEY` is set AND addresses are non-zero, signs the report via `signReport()` from `@upgrade-siren/shared` (EIP-712 typed-data, OZ v5 compatible). Otherwise writes the report with `auth.status="unsigned"`.
4. Computes `keccak256(file bytes)` and prints it. This is the value that `scripts/provision-ens.ts` must store as `upgrade-siren:upgrade_manifest.reportHash`.
5. Writes `reports/<scenario>.json` (canonical: `JSON.stringify(report, null, 2) + "\n"`).

## Production run

```bash
export OPERATOR_PRIVATE_KEY=0x...
pnpm tsx scripts/sign-reports.ts
# safe:       signed by 0x...  reportHash=0x...
# dangerous:  signed by 0x...  reportHash=0x...
# unverified: signed by 0x...  reportHash=0x...

# Re-run scripts/provision-ens.ts so upgrade_manifest.reportHash matches:
pnpm tsx scripts/provision-ens.ts

# Externally verify each report:
pnpm tsx scripts/verify-reports.ts reports/safe.json --owner 0x...
# OK: signature recovers to auth.signer and matches --owner
```

The keccak256 of a report's bytes is the canonical hash for both the ENS manifest's `reportHash` field and the docs reproduction recipe (US-013).

## Hosting the reports

Per AC, reports are hosted at stable public URLs. Two options:

- **Vercel static asset.** `apps/web/public/r/<scenario>.json` (Stream C scaffold). Each scenario URL is `https://upgradesiren.app/r/<subname>.json` and matches the `reportUri` field in the upgrade_manifest.
- **GitHub Pages.** Less preferred; Vercel is the production deploy per Daniel's 2026-05-08 confirmation in `CLAUDE.md`.

Until the live broadcast happens (US-060), the scripts produce unsigned placeholders that document the schema and let the rest of the pipeline (Stream B verifier, Stream C UI, US-013 docs) be exercised end-to-end.

## Why unsigned placeholders are correct here

The verdict engine in `packages/evidence/` (US-028) refuses unsigned production reports — it returns `SIREN`. Committing UNSIGNED templates in `reports/` is therefore a faithful representation of "operator signing has not yet happened", not a `mock: true` deception. After `OPERATOR_PRIVATE_KEY` is provisioned and the script re-runs, the same files become valid signed reports.
