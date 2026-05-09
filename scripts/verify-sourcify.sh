#!/usr/bin/env bash
#
# Submit V1, V2Safe, V2Dangerous deployed addresses to Sourcify for verification.
# UnverifiedImpl is deliberately NOT submitted: the unverified-upgrade demo
# scenario requires Sourcify to return `not_found` for that contract address.
#
# Idempotent: forge verify-contract reports `already verified` for re-runs, and
# this script exits 0 in that case.
#
# Prerequisites:
#   - deployments/sepolia.json populated by scripts/deploy/Deploy.s.sol --broadcast
#   - forge installed (uses `forge verify-contract --verifier sourcify`)
#   - jq installed
#
# Reproducible verification of the published, deterministic build:
#   - solc pinned at 0.8.24 in foundry.toml
#   - openzeppelin-contracts pinned at v5.0.2 in foundry.lock
#
set -euo pipefail

SEPOLIA_JSON="${SEPOLIA_JSON:-deployments/sepolia.json}"
ZERO_ADDR="0x0000000000000000000000000000000000000000"

if [ ! -f "$SEPOLIA_JSON" ]; then
    echo "ERROR: $SEPOLIA_JSON not found; run scripts/deploy/Deploy.s.sol --broadcast first." >&2
    exit 1
fi

V1=$(jq -r .v1 "$SEPOLIA_JSON")
V2SAFE=$(jq -r .v2safe "$SEPOLIA_JSON")
V2DANGEROUS=$(jq -r .v2dangerous "$SEPOLIA_JSON")
UNVERIFIED=$(jq -r .unverified "$SEPOLIA_JSON")

if [ "$V1" = "$ZERO_ADDR" ] \
    && [ "$V2SAFE" = "$ZERO_ADDR" ] \
    && [ "$V2DANGEROUS" = "$ZERO_ADDR" ]; then
    echo "All verification target addresses are zero in $SEPOLIA_JSON."
    echo "Sepolia broadcast has not happened yet (Tracker US-060: deployer-key custody)."
    echo "Re-run this script after the broadcast populates real addresses."
    exit 0
fi

verify_one() {
    local addr="$1"
    local target="$2"
    local label="$3"

    if [ "$addr" = "$ZERO_ADDR" ]; then
        echo "SKIP   $label: address is zero (not deployed)"
        return 0
    fi

    echo "VERIFY $label  $addr  ->  $target"
    if forge verify-contract \
        --chain sepolia \
        --verifier sourcify \
        --watch \
        "$addr" \
        "$target"
    then
        echo "OK     $label verified at https://sourcify.dev/#/lookup/$addr"
    else
        echo "WARN   $label verification command exited non-zero; check Sourcify status manually" >&2
    fi
}

echo "=== Sourcify verification (Sepolia, chain 11155111) ==="
verify_one "$V1" "contracts/VaultV1.sol:VaultV1" "VaultV1"
verify_one "$V2SAFE" "contracts/VaultV2Safe.sol:VaultV2Safe" "VaultV2Safe"
verify_one "$V2DANGEROUS" "contracts/VaultV2Dangerous.sol:VaultV2Dangerous" "VaultV2Dangerous"

# UnverifiedImpl is intentionally NOT submitted to Sourcify. The unverified
# demo scenario requires Sourcify to return `not_found` for this contract.
echo "EXCLUDE UnverifiedImpl ($UNVERIFIED): intentionally not verified (demo scenario)"

cat <<EOF

=== Summary ===
| Contract        | Address                                    | Sourcify lookup |
|-----------------|--------------------------------------------|-----------------|
| VaultV1         | $V1 | https://sourcify.dev/#/lookup/$V1 |
| VaultV2Safe     | $V2SAFE | https://sourcify.dev/#/lookup/$V2SAFE |
| VaultV2Dangerous| $V2DANGEROUS | https://sourcify.dev/#/lookup/$V2DANGEROUS |
| UnverifiedImpl  | $UNVERIFIED | (intentionally not verified)      |
EOF
