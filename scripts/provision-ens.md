# ENS provisioning runbook (US-010)

`scripts/provision-ens.ts` writes the Upgrade Siren ENS records for the four demo subnames on Sepolia. Run it after the deployer has broadcast `scripts/deploy/Deploy.s.sol` (US-009) and the ENS parent has been registered (US-061).

## What gets provisioned

For each subname, four stable text records and one atomic `upgrade-siren:upgrade_manifest` JSON record:

| Record | Purpose |
|---|---|
| `upgrade-siren:chain_id` | Chain where contracts live (`11155111` on Sepolia) |
| `upgrade-siren:proxy` | Proxy address from `deployments/sepolia.json` |
| `upgrade-siren:owner` | Operator wallet address (from `OPERATOR_PRIVATE_KEY`) |
| `upgrade-siren:schema` | `upgrade-siren-manifest@1` |
| `upgrade-siren:upgrade_manifest` | Composite JSON with `previousImpl`, `currentImpl`, `reportUri`, `reportHash`, `version`, `effectiveFrom`, `previousManifestHash` |

The atomic-manifest pattern is the desync mitigation: a single `setText` updates all upgrade-related fields together, so a partially-written upgrade can never leak through as a false `SAFE` verdict (see `docs/04-technical-design.md`).

## Subnames

`ENS_PARENT` defaults to `demo.upgradesiren.eth`. Override by exporting a different value before running.

| Subname | `currentImpl` |
|---|---|
| `vault.${ENS_PARENT}` | `v1` (canonical baseline; the 5-second-moment subname) |
| `safe.${ENS_PARENT}` | `v2safe` (SAFE upgrade scenario) |
| `dangerous.${ENS_PARENT}` | `v2dangerous` (SIREN scenario via storage incompat + sweep) |
| `unverified.${ENS_PARENT}` | `unverified` (SIREN scenario via Sourcify `not_found`) |

## Prerequisites

- `deployments/sepolia.json` populated with non-zero addresses (US-009 broadcast complete)
- `${ENS_PARENT}` registered on Sepolia, controlled by `OPERATOR_PRIVATE_KEY`'s wallet (US-061)
- `OPERATOR_PRIVATE_KEY` exported (env-only; never committed)
- `ALCHEMY_RPC_SEPOLIA` exported

The Sepolia ENS PublicResolver is hardcoded at `0x8FADE66B79cC9f707aB26799354482EB93a5B7dD` per the canonical ENS deployments page.

## Run

```bash
export OPERATOR_PRIVATE_KEY=0x...
export ALCHEMY_RPC_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/...
pnpm tsx scripts/provision-ens.ts
```

Idempotent: each `setText` is preceded by a public read; a write is only issued when the on-chain value differs from the desired value. Re-running against a fully-provisioned tree is a no-op (every line ends with `-> unchanged`).

## Verify on-chain

```bash
# Resolve a single record:
cast call --rpc-url $ALCHEMY_RPC_SEPOLIA \
  0x8FADE66B79cC9f707aB26799354482EB93a5B7dD \
  "text(bytes32,string)" \
  $(cast namehash "vault.demo.upgradesiren.eth") \
  "upgrade-siren:upgrade_manifest"
```

The returned hex decodes to the JSON manifest the script wrote.

## Why the script halts on placeholder addresses

`deployments/sepolia.json` is committed to the repo with all-zero addresses (US-009's intentional placeholder). Running this script before the Sepolia broadcast detects the placeholder and exits cleanly with the message:

> deployments/sepolia.json holds all-zero placeholders.
> Sepolia broadcast has not happened yet (Tracker US-060: deployer-key custody).
> Re-run this script after the broadcast populates real addresses.

This avoids polluting the ENS records with `0x000...000` values and provides a clear pointer back to the upstream blocker.
