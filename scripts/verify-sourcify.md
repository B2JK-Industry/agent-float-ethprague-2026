# Sourcify verification summary template

`scripts/verify-sourcify.sh` reads `deployments/sepolia.json` and submits the three "verifiable" demo implementations to Sourcify for verification on Sepolia (chain `11155111`). The fourth implementation (`UnverifiedImpl`) is deliberately excluded — the unverified-upgrade demo scenario requires Sourcify to return `not_found` for that contract.

## What the script does

1. Loads V1, V2Safe, V2Dangerous, UnverifiedImpl addresses from `deployments/sepolia.json`.
2. For each verifiable contract, runs `forge verify-contract --chain sepolia --verifier sourcify --watch <address> <target>`. Forge handles metadata + source upload automatically using the deterministic build pinned by `foundry.toml` (`solc 0.8.24`) and `foundry.lock` (`openzeppelin-contracts v5.0.2`).
3. Skips any contract whose address is `0x000...000` and emits a clear log line; this lets the script run cleanly against the placeholder `sepolia.json` before broadcast.
4. Prints a markdown summary with Sourcify lookup links.

Re-running is idempotent: `forge verify-contract` reports `already verified` for previously-submitted contracts and the script exits zero.

## Prerequisites

- `deployments/sepolia.json` populated by `scripts/deploy/Deploy.s.sol --broadcast` (US-009)
- `forge` installed (Foundry)
- `jq` installed

## Operator runbook

```bash
# After Sepolia broadcast has populated deployments/sepolia.json:
bash scripts/verify-sourcify.sh

# Verify resolution by querying Sourcify directly:
curl -s "https://sourcify.dev/server/check-by-addresses?addresses=<v1>,<v2safe>,<v2dangerous>&chainIds=11155111" | jq

# Confirm UnverifiedImpl is NOT in the verification set:
curl -s "https://sourcify.dev/server/check-by-addresses?addresses=<unverified>&chainIds=11155111" | jq
# Expected: status=false (not_found)
```

## Summary table format

When the script runs against real addresses, it emits a table like:

```
| Contract         | Address                                    | Sourcify lookup                               |
|------------------|--------------------------------------------|-----------------------------------------------|
| VaultV1          | 0x...                                      | https://sourcify.dev/#/lookup/0x...           |
| VaultV2Safe      | 0x...                                      | https://sourcify.dev/#/lookup/0x...           |
| VaultV2Dangerous | 0x...                                      | https://sourcify.dev/#/lookup/0x...           |
| UnverifiedImpl   | 0x...                                      | (intentionally not verified)                  |
```

## Why UnverifiedImpl is excluded

The unverified-upgrade demo scenario tests the "no source, no upgrade" product rule: a proxy that points at an unverified implementation must be classified `SIREN`. Verifying `UnverifiedImpl` on Sourcify would silently disable that scenario. Exclusion is enforced operationally here — the script never includes `UnverifiedImpl` in the verification batch.
