#!/usr/bin/env bash
# Booth fallback: Anvil fork against mainnet + Sepolia at a known block.
# When booth Wi-Fi or RPC fails during the demo, switch the web app to
# point at this local fork instead of Alchemy.
#
# Usage:
#   bash scripts/booth/run-anvil-fork.sh sepolia   # Sepolia fork on :8545
#   bash scripts/booth/run-anvil-fork.sh mainnet   # Mainnet fork on :8546
#
# After starting, set in apps/web/.env.local:
#   ALCHEMY_RPC_SEPOLIA=http://127.0.0.1:8545
#   ALCHEMY_RPC_MAINNET=http://127.0.0.1:8546
#   ENS_RPC_URL=http://127.0.0.1:8546
# and restart `pnpm --filter @upgrade-siren/web dev` (or run vercel dev).
#
# Requires anvil from foundry: `curl -L https://foundry.paradigm.xyz | bash && foundryup`.

set -euo pipefail

NETWORK="${1:-sepolia}"
SEPOLIA_BLOCK="${SEPOLIA_BLOCK:-}"
MAINNET_BLOCK="${MAINNET_BLOCK:-}"

# Read RPC URLs from .env if present
ENV_FILE="${ENV_FILE:-$(git rev-parse --show-toplevel)/.env}"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

case "$NETWORK" in
  sepolia)
    RPC_URL="${ALCHEMY_RPC_SEPOLIA:?ALCHEMY_RPC_SEPOLIA must be set in .env or environment}"
    PORT="8545"
    BLOCK_FLAG=""
    [ -n "$SEPOLIA_BLOCK" ] && BLOCK_FLAG="--fork-block-number $SEPOLIA_BLOCK"
    echo "Forking Sepolia from $RPC_URL on :$PORT"
    ;;
  mainnet)
    RPC_URL="${ALCHEMY_RPC_MAINNET:?ALCHEMY_RPC_MAINNET must be set in .env or environment}"
    PORT="8546"
    BLOCK_FLAG=""
    [ -n "$MAINNET_BLOCK" ] && BLOCK_FLAG="--fork-block-number $MAINNET_BLOCK"
    echo "Forking mainnet from $RPC_URL on :$PORT"
    ;;
  *)
    echo "Usage: $0 {sepolia|mainnet}" >&2
    exit 1
    ;;
esac

# shellcheck disable=SC2086
exec anvil \
  --fork-url "$RPC_URL" \
  --port "$PORT" \
  --host 0.0.0.0 \
  --chain-id "$([ "$NETWORK" = "sepolia" ] && echo 11155111 || echo 1)" \
  --silent \
  $BLOCK_FLAG