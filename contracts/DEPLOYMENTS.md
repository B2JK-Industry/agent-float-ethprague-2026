# Upgrade Siren — Sepolia deployments, ENS records, and Siren Reports

This document is the single reproduction source for the demo. It describes how the on-chain artifacts (contracts), the ENS records (manifest + ENSIP-26), and the off-chain artifacts (signed Siren Reports) tie together end-to-end.

> **Status:** scripts and templates are merged; the on-chain broadcast is pending Tracker **US-060** (operator-wallet / signer custody) and Tracker **US-061** (ENS parent registration). Address fields below are populated automatically by `scripts/deploy/Deploy.s.sol` once the Sepolia broadcast runs. The structure of this document is itself part of the AC for US-013 — values are filled in post-broadcast.

## 1. Contract addresses

Source of truth: `deployments/sepolia.json`. Block numbers and per-deployment tx hashes live in `broadcast/Deploy.s.sol/11155111/run-latest.json` after `forge script ... --broadcast`.

| Contract | Address | Sepolia explorer | Sourcify |
|---|---|---|---|
| `Proxy` (TransparentUpgradeableProxy, US-002) | `<populated post-broadcast: deployments/sepolia.json .proxy>` | `https://sepolia.etherscan.io/address/<addr>` | n/a (proxy itself is not the verification target) |
| `VaultV1` (US-003) | `<.v1>` | `https://sepolia.etherscan.io/address/<addr>` | `https://sourcify.dev/#/lookup/<addr>` |
| `VaultV2Safe` (US-004) | `<.v2safe>` | `https://sepolia.etherscan.io/address/<addr>` | `https://sourcify.dev/#/lookup/<addr>` |
| `VaultV2Dangerous` (US-005) | `<.v2dangerous>` | `https://sepolia.etherscan.io/address/<addr>` | `https://sourcify.dev/#/lookup/<addr>` |
| `UnverifiedImpl` (US-006) | `<.unverified>` | `https://sepolia.etherscan.io/address/<addr>` | **intentionally not verified** — `https://sourcify.dev/server/check-by-addresses?addresses=<addr>&chainIds=11155111` returns `not_found` |

Sourcify verification is performed by `scripts/verify-sourcify.sh` (US-007). The four `Vault*` contracts above are submitted; `UnverifiedImpl` is deliberately excluded so the unverified-upgrade demo scenario reproduces correctly.

## 2. ENS demo subnames

`ENS_PARENT` defaults to `demo.upgradesiren.eth` (Tracker US-061 finalizes the choice).

Each subname carries the four stable `upgrade-siren:*` records and one atomic `upgrade-siren:upgrade_manifest` JSON record. The atomic-manifest pattern is the desync mitigation: a single `setText` updates `previousImpl`, `currentImpl`, `reportUri`, `reportHash`, `version`, `effectiveFrom`, and `previousManifestHash` together.

Stable records (identical across subnames except for `upgrade-siren:owner` which is fixed by US-060):

| Record | Value |
|---|---|
| `upgrade-siren:chain_id` | `11155111` |
| `upgrade-siren:proxy` | `<deployments/sepolia.json .proxy>` |
| `upgrade-siren:owner` | `<operator wallet address; chosen in US-060>` |
| `upgrade-siren:schema` | `upgrade-siren-manifest@1` |

Per-subname `upgrade-siren:upgrade_manifest`:

| Subname | `previousImpl` | `currentImpl` | Verdict |
|---|---|---|---|
| `vault.${ENS_PARENT}` | `<.v1>` | `<.v1>` (canonical baseline) | `SAFE` (no upgrade yet) |
| `safe.${ENS_PARENT}` | `<.v1>` | `<.v2safe>` | `SAFE` |
| `dangerous.${ENS_PARENT}` | `<.v1>` | `<.v2dangerous>` | `SIREN` |
| `unverified.${ENS_PARENT}` | `<.v1>` | `<.unverified>` | `SIREN` |

Manifest JSON shape (per `docs/04-technical-design.md`):

```json
{
  "schema": "upgrade-siren-manifest@1",
  "chainId": 11155111,
  "proxy": "0x...",
  "previousImpl": "0x...",
  "currentImpl": "0x...",
  "reportUri": "https://upgradesiren.app/r/<subname>.json",
  "reportHash": "0x...",
  "version": 1,
  "effectiveFrom": "2026-05-09T..Z",
  "previousManifestHash": "0x000...000"
}
```

ENSIP-26 records (US-012, P1):

| Record | Value (per subname `<name>`) |
|---|---|
| `agent-context` | `Upgrade Siren risk report for <name> (<label>)` |
| `agent-endpoint[web]` | `https://upgradesiren.app/r/<name>` |

`agent-endpoint[mcp]` is intentionally not set yet; it ships with the P2 Siren Agent watchlist (US-056).

## 3. Siren Report URIs and hashes

Reports are committed at `reports/<scenario>.json` and (post Stream C deploy) hosted at `https://upgradesiren.app/r/<subname>.json`. Each report's `keccak256(file bytes)` is the `reportHash` written into the corresponding ENS manifest.

The hashes below are the keccak256 of the **unsigned templates** committed in US-011. Once the operator signs the reports, the hashes change; re-running `scripts/sign-reports.ts` and `scripts/provision-ens.ts` updates both the report files and the ENS manifest record (idempotent).

| Scenario | Verdict | Report URI | reportHash (current = unsigned template) |
|---|---|---|---|
| `safe` | `SAFE` | `https://upgradesiren.app/r/safe.demo.upgradesiren.eth.json` | `0x90727f0f636fe6af6cf0f35994a7854aec26c1fc8267bed6db4eaf4327dc2929` |
| `dangerous` | `SIREN` | `https://upgradesiren.app/r/dangerous.demo.upgradesiren.eth.json` | `0xbc82725cbfef26c6db6874f09de8708c4e62e884cebc2ca29bd84aad46eb3b35` |
| `unverified` | `SIREN` | `https://upgradesiren.app/r/unverified.demo.upgradesiren.eth.json` | `0x541b736c9dd4104165115d141380df85a1bada17aaa05cddf97645a68ea1dd69` |
| `vault` (live public-read) | `REVIEW` or `SIREN` | `<TBD: target chosen in US-062>` | `<populated when US-062 picks target>` |

After operator signing (US-060), the unsigned templates' bytes change (`auth.status` flips from `unsigned` to `valid` and signature fields populate); the hashes above will move accordingly. Update this table from the output of `pnpm tsx scripts/sign-reports.ts` and `cast call ... "upgrade-siren:upgrade_manifest"` after re-provisioning.

## 4. End-to-end reproduction

### 4.1 Resolve a demo subname

```bash
# Pick a subname:
SUBNAME=vault.demo.upgradesiren.eth

# Compute namehash (32 bytes):
NODE=$(cast namehash "$SUBNAME")

# Read the upgrade_manifest text record from the Sepolia PublicResolver
# (0x8FADE66B79cC9f707aB26799354482EB93a5B7dD):
MANIFEST_HEX=$(cast call --rpc-url $ALCHEMY_RPC_SEPOLIA \
  0x8FADE66B79cC9f707aB26799354482EB93a5B7dD \
  "text(bytes32,string)" \
  "$NODE" \
  "upgrade-siren:upgrade_manifest")

# Decode the hex-encoded string back to JSON:
MANIFEST=$(cast --to-utf8 "$MANIFEST_HEX")
echo "$MANIFEST" | jq
```

### 4.2 Fetch and hash-check the report

```bash
REPORT_URI=$(echo "$MANIFEST" | jq -r .reportUri)
REPORT_HASH=$(echo "$MANIFEST" | jq -r .reportHash)

# Fetch the report directly to a file. Writing to a file (rather than via
# REPORT_BYTES=$(curl ...)) is load-bearing: bash command substitution strips
# trailing newlines, but `scripts/sign-reports.ts` writes
# `JSON.stringify(report, null, 2) + "\n"` — the trailing newline is part of
# the bytes the manifest reportHash is computed over.
curl -fsS "$REPORT_URI" -o /tmp/report.json

# keccak256 of the exact file bytes. xxd hex-encodes the file (including the
# trailing newline); `tr -d '\n'` strips xxd's column-wrap newlines from the
# encoding output (NOT from the encoded data); cast keccak hashes the hex.
COMPUTED=$(cast keccak "0x$(xxd -p /tmp/report.json | tr -d '\n')")

# Confirm the manifest reportHash matches the actual file:
[ "$REPORT_HASH" = "$COMPUTED" ] && echo "OK: hash match" || echo "FAIL: hash mismatch"
```

### 4.3 Recover the EIP-712 signature and confirm authority

```bash
# Read the operator address advertised in upgrade-siren:owner:
OWNER_HEX=$(cast call --rpc-url $ALCHEMY_RPC_SEPOLIA \
  0x8FADE66B79cC9f707aB26799354482EB93a5B7dD \
  "text(bytes32,string)" \
  "$NODE" \
  "upgrade-siren:owner")
OWNER=$(cast --to-utf8 "$OWNER_HEX")

# Use scripts/verify-reports.ts to recover the signer and check it matches.
# The script reads /tmp/report.json with Node fs.readFileSync (preserves
# trailing newline), recomputes keccak256 the same way sign-reports.ts wrote
# it, recovers the EIP-712 signer, and asserts signer == --owner.
pnpm tsx scripts/verify-reports.ts /tmp/report.json --owner "$OWNER"
# Expected:
#   OK: signature recovers to auth.signer and matches --owner
```

If `auth.status` is `unsigned` the verifier prints "Report is correctly marked UNSIGNED. Production verifier will return SIREN." — this is the current state until US-060 closes.

### 4.4 Confirm Sourcify status for the current implementation

```bash
CURRENT=$(echo "$MANIFEST" | jq -r .currentImpl)
curl -s "https://sourcify.dev/server/check-by-addresses?addresses=$CURRENT&chainIds=11155111" | jq
# Expected for safe / dangerous (verified):  status="perfect" or "partial"
# Expected for unverified scenario:          status="false"  (i.e. not_found)
```

Combined with the verdict rules in `docs/04-technical-design.md`, these four steps reproduce the full Upgrade Siren signed-manifest path locally — no app required.

## 5. Backlog cross-reference

| Backlog item | What it produces here |
|---|---|
| US-001..US-006 | The five contracts in §1 (compiled, layout-asserted in US-008) |
| US-007 | Sourcify verification for V1/V2Safe/V2Dangerous (§1, last column) |
| US-008 | Foundry tests proving fixture safety + danger claims |
| US-009 | `scripts/deploy/Deploy.s.sol`, `deployments/sepolia.json`, `.env.example` (§1 source) |
| US-010 | `scripts/provision-ens.ts` + the four manifest records in §2 |
| US-011 | `scripts/sign-reports.ts`, `scripts/verify-reports.ts`, `reports/{safe,dangerous,unverified}.json` (§3 + §4.3) |
| US-012 | ENSIP-26 records on each subname (§2 last block) |
| US-013 | This document |
| Tracker US-060 | Provisions `OPERATOR_PRIVATE_KEY` / `REPORT_SIGNER_PRIVATE_KEY` so the placeholders in §1, §2, §3 become real values |
| Tracker US-061 | Registers `${ENS_PARENT}` so the §2 records can be written |
| Tracker US-062 | Picks the live public-read target for the `vault` row in §3 |

## 6. Updating this document

After US-060 + US-061 close and the broadcast runs, this document is updated mechanically by:

```bash
# 1. Broadcast the deployment:
forge script scripts/deploy/Deploy.s.sol --rpc-url $ALCHEMY_RPC_SEPOLIA --broadcast

# 2. Verify on Sourcify:
bash scripts/verify-sourcify.sh

# 3. Sign reports:
pnpm tsx scripts/sign-reports.ts

# 4. Provision ENS records (writes the post-signing reportHash into the manifest):
pnpm tsx scripts/provision-ens.ts
pnpm tsx scripts/provision-ensip26.ts

# 5. Substitute the placeholders in §1-§3 with the values from
#    deployments/sepolia.json and the printed reportHashes.
```

The structural layout above is fixed by the AC of US-013; only the placeholder values change between revisions.
