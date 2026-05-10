#!/usr/bin/env bash
# Deploy + provision UmiaValidationHookMock on Sepolia.
#
# Idempotent-ish: deploys a fresh hook, sets Upgrade Siren as the permit
# signer, enables step 1 for server-permit gating. Prints a one-line
# summary at the end with the hookAddress for downstream demo use.
#
# Required env (set in your shell, NOT in .env files committed to repo):
#   ALCHEMY_RPC_SEPOLIA       — Sepolia RPC URL (Alchemy or any provider)
#   DEPLOY_KEY                — private key for `forge create` broadcaster.
#                               Must hold ~0.01 Sepolia ETH for gas.
#                               Per project_us060_key_custody this is
#                               OPERATOR_PRIVATE_KEY in your local env, NOT
#                               REPORT_SIGNER_PRIVATE_KEY (OPERATOR != DEPLOYER).
#   REPORT_SIGNER_PRIVATE_KEY — private key Upgrade Siren uses to sign EIP-712
#                               ServerPermits. We DERIVE its address here and
#                               register it on the hook via setSigner(...).
#                               The script does NOT broadcast with this key.
#
# Usage:
#   export ALCHEMY_RPC_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/...
#   export DEPLOY_KEY=$OPERATOR_PRIVATE_KEY
#   export REPORT_SIGNER_PRIVATE_KEY=...
#   bash scripts/deploy-umia-hook-sepolia.sh
#
# Exit codes: 0 success; 1 missing env; 2 deploy failed; 3 setup failed.

set -euo pipefail

require_env() {
    local name="$1"
    if [ -z "${!name:-}" ]; then
        echo "ERROR: $name is not set" >&2
        echo "       export it in your shell, then re-run." >&2
        exit 1
    fi
}

require_env ALCHEMY_RPC_SEPOLIA
require_env DEPLOY_KEY
require_env REPORT_SIGNER_PRIVATE_KEY

if ! command -v forge >/dev/null 2>&1; then
    echo "ERROR: forge not found in PATH. Install Foundry: https://getfoundry.sh" >&2
    exit 1
fi
if ! command -v cast >/dev/null 2>&1; then
    echo "ERROR: cast not found in PATH (comes with Foundry)." >&2
    exit 1
fi

echo "==> Deriving Upgrade Siren signer address from REPORT_SIGNER_PRIVATE_KEY"
SIGNER_ADDR=$(cast wallet address --private-key "$REPORT_SIGNER_PRIVATE_KEY")
echo "    signer = $SIGNER_ADDR"

echo "==> Deriving deployer address from DEPLOY_KEY"
DEPLOYER_ADDR=$(cast wallet address --private-key "$DEPLOY_KEY")
DEPLOYER_BALANCE=$(cast balance "$DEPLOYER_ADDR" --rpc-url "$ALCHEMY_RPC_SEPOLIA")
echo "    deployer = $DEPLOYER_ADDR"
echo "    balance  = $DEPLOYER_BALANCE wei"
if [ "$DEPLOYER_BALANCE" = "0" ]; then
    echo "WARNING: deployer balance is 0; deploy will fail. Get Sepolia ETH first." >&2
fi

echo "==> forge create UmiaValidationHookMock on Sepolia"
DEPLOY_OUTPUT=$(
    forge create \
        --rpc-url "$ALCHEMY_RPC_SEPOLIA" \
        --private-key "$DEPLOY_KEY" \
        --broadcast \
        contracts/umia/UmiaValidationHookMock.sol:UmiaValidationHookMock \
        2>&1
)
echo "$DEPLOY_OUTPUT"

HOOK_ADDR=$(
    echo "$DEPLOY_OUTPUT" \
        | grep -E "^Deployed to:" \
        | awk '{print $3}' \
        | head -1
)
if [ -z "$HOOK_ADDR" ]; then
    echo "ERROR: could not parse Deployed-to address from forge output." >&2
    exit 2
fi
echo "    hook = $HOOK_ADDR"

echo "==> hook.setSigner($SIGNER_ADDR)"
cast send "$HOOK_ADDR" "setSigner(address)" "$SIGNER_ADDR" \
    --rpc-url "$ALCHEMY_RPC_SEPOLIA" \
    --private-key "$DEPLOY_KEY" >/dev/null

echo "==> hook.enableStepPermit(1)"
cast send "$HOOK_ADDR" "enableStepPermit(uint256)" 1 \
    --rpc-url "$ALCHEMY_RPC_SEPOLIA" \
    --private-key "$DEPLOY_KEY" >/dev/null

echo "==> Verifying state"
ON_CHAIN_SIGNER=$(cast call "$HOOK_ADDR" "signer()(address)" --rpc-url "$ALCHEMY_RPC_SEPOLIA")
ON_CHAIN_STEP_ENABLED=$(cast call "$HOOK_ADDR" "stepPermitEnabled(uint256)(bool)" 1 --rpc-url "$ALCHEMY_RPC_SEPOLIA")

if [ "$(echo "$ON_CHAIN_SIGNER" | tr '[:upper:]' '[:lower:]')" != "$(echo "$SIGNER_ADDR" | tr '[:upper:]' '[:lower:]')" ]; then
    echo "ERROR: on-chain signer ($ON_CHAIN_SIGNER) != expected ($SIGNER_ADDR)" >&2
    exit 3
fi
if [ "$ON_CHAIN_STEP_ENABLED" != "true" ]; then
    echo "ERROR: stepPermitEnabled(1) is not true (got $ON_CHAIN_STEP_ENABLED)" >&2
    exit 3
fi

echo ""
echo "================================================================"
echo " UmiaValidationHookMock provisioned on Sepolia"
echo "================================================================"
echo " hook address    : $HOOK_ADDR"
echo " signer (Upgrade Siren operator) : $SIGNER_ADDR"
echo " enabled step    : 1"
echo " explorer        : https://sepolia.etherscan.io/address/$HOOK_ADDR"
echo "================================================================"
echo ""
echo "Demo recipe:"
echo "  1. Open https://upgrade-siren.vercel.app/b/<your-ens>"
echo "  2. Connect wallet that controls addr(<your-ens>)"
echo "  3. Expand 'Mint bid permit'"
echo "  4. Set hookAddress=$HOOK_ADDR, chainId=11155111, step=1, minTier=<your-tier>"
echo "  5. Click Mint bid permit, copy the returned hookData blob"
echo "  6. cast send $HOOK_ADDR \\"
echo "       \"validate(address,bytes)\" <your-wallet> <hookData> \\"
echo "       --rpc-url \$ALCHEMY_RPC_SEPOLIA --private-key \$DEPLOY_KEY"
echo "  7. Etherscan tx → 'Registered' event = the live demo moment."
