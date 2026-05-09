# Booth runbook

Switch from live mode to fallback in under 30 seconds. Use this when booth Wi-Fi, Alchemy RPC, or Sourcify becomes unreliable mid-demo.

## Pre-booth checklist (do once before walking up)

```bash
# From repo root
bash scripts/booth/run-anvil-fork.sh sepolia &   # → :8545 background
bash scripts/booth/run-anvil-fork.sh mainnet &   # → :8546 background

# Pre-warm Sourcify + ENS + EIP-1967 caches for the four demo subnames + six mainnet protocols
ALCHEMY_RPC_SEPOLIA="$ALCHEMY_RPC_SEPOLIA" \
ALCHEMY_RPC_MAINNET="$ALCHEMY_RPC_MAINNET" \
pnpm tsx scripts/booth/prewarm-cache.ts

# Confirm cache files written
find apps/web/public/cache -name '*.json' | wc -l    # expect ≥ 7
```

If `apps/web/public/cache/<chainId>/<address>.json` exists for each demo target, the local fallback is ready.

## Switching to fallback (under 30s)

1. **Stop the live web app:** `Ctrl+C` in the `pnpm --filter @upgrade-siren/web dev` window.
2. **Replace `apps/web/.env.local`:** edit or `cat > apps/web/.env.local <<'EOF' ... EOF` with:
   ```
   ALCHEMY_RPC_SEPOLIA=http://127.0.0.1:8545
   ALCHEMY_RPC_MAINNET=http://127.0.0.1:8546
   ENS_RPC_URL=http://127.0.0.1:8546
   NEXT_PUBLIC_BOOTH_FALLBACK=1
   ```
3. **Restart:** `pnpm --filter @upgrade-siren/web dev`. Open http://localhost:3000.
4. **Verify:** click any demo scenario at `/demo` — verdict card renders within ~2s using the local fork + pre-warmed cache.

If the Anvil forks died (battery, kernel sleep), restart them per "Pre-booth checklist" before step 2.

## Last-resort fallback: pre-recorded video

Open `booth/demo-recording.mp4` (see `RECORDING.md` for instructions on producing one). Walk through the 3-minute booth script per `docs/05-demo-script.md` while the video plays. Best for "everything is on fire" cases — laptop unable to start any local stack.

## What works in fallback mode

- All four demo subnames at `/r/vault.upgrade-siren-demo.eth` etc. — Sourcify + ENS + EIP-1967 reads served from disk cache; verdict computed locally
- Six curated mainnet public-read targets at `/r/<address>?mode=public-read` — Aave V3 Pool, Lido stETH, Compound v3, Optimism Bridge, EigenLayer Delegation, ENS Public Resolver
- Brand identity, navigation, evidence drawer, governance comment generator — all client-side, no upstream dependency
- Source diff (US-076) — uses cached Sourcify metadata

## What does NOT work in fallback mode

- ENS lookup for any name **outside the cache** — local Anvil fork cannot resolve names that were not warmed
- Public-read for any address **outside the curated list** — Sourcify request to local fork would fail
- Live status badges that show "current state" — frozen at the cache `fetchedAt` timestamp

If a judge types something off-list, gracefully fall back to the cached scenario picker on the home page and explain "we have six mainnet examples pre-warmed; here's what each looks like."

## Switching back to live

```bash
# Remove apps/web/.env.local (or restore from .env.local.backup)
rm apps/web/.env.local
# Restart pnpm dev
```

The Vercel production deployment at https://upgrade-siren.vercel.app stays live regardless of laptop state — pointing the audience there is also a valid fallback.