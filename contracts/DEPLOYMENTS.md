# Upgrade Siren — Sepolia deployments, ENS records, and Siren Reports

This document is the single reproduction source for the demo. It describes how the on-chain artifacts (contracts), the ENS records (manifest + ENSIP-26), and the off-chain artifacts (signed Siren Reports) tie together end-to-end.

> **Status:** **LIVE on Sepolia** (broadcast 2026-05-09 after Tracker US-060 closed). All five contracts deployed, V1/V2Safe/V2Dangerous Sourcify-verified, four ENS subnames provisioned under `upgrade-siren-demo.eth`, three Siren Reports signed by the operator. Live public-read scenario is still TODO (US-062 chooses target).
>
> Operator wallet: `0x747E453F13B5B14313E25393Eb443fbAaA250cfC` (advertised in `upgrade-siren:owner` on every demo subname; recovers EIP-712 signatures of the three signed reports).
> Deployer wallet: `0xD282908b524D29db87495fD6E2Bd0114eB97c3Aa`.

## 1. Contract addresses

Source of truth: `deployments/sepolia.json`. Block numbers and per-deployment tx hashes live in `broadcast/Deploy.s.sol/11155111/run-latest.json` after `forge script ... --broadcast`.

Deployment block: `10819434`. Chain: Sepolia (`11155111`).

| Contract | Address | Sepolia explorer | Sourcify |
|---|---|---|---|
| `Proxy` (TransparentUpgradeableProxy, US-002) | `0x8391fa804d3755493e3C9D362D49c339C4469388` | https://sepolia.etherscan.io/address/0x8391fa804d3755493e3C9D362D49c339C4469388 | n/a (proxy itself is not the verification target) |
| `VaultV1` (US-003) | `0xC53d3879aCF9Dd9d6fCF8Ed9B335A410Cc66Eb30` | https://sepolia.etherscan.io/address/0xC53d3879aCF9Dd9d6fCF8Ed9B335A410Cc66Eb30 | https://sourcify.dev/#/lookup/0xC53d3879aCF9Dd9d6fCF8Ed9B335A410Cc66Eb30 (`perfect`) |
| `VaultV2Safe` (US-004) | `0x9A9DCb4CE0F03aCB6aa8e26905D6aBb93c95B774` | https://sepolia.etherscan.io/address/0x9A9DCb4CE0F03aCB6aa8e26905D6aBb93c95B774 | https://sourcify.dev/#/lookup/0x9A9DCb4CE0F03aCB6aa8e26905D6aBb93c95B774 (`perfect`) |
| `VaultV2Dangerous` (US-005) | `0xfD7F5B48C260a32102AA05117C13a599B0d4d568` | https://sepolia.etherscan.io/address/0xfD7F5B48C260a32102AA05117C13a599B0d4d568 | https://sourcify.dev/#/lookup/0xfD7F5B48C260a32102AA05117C13a599B0d4d568 (`perfect`) |
| `UnverifiedImpl` (US-006) | `0x819326b9d318e1bb8c3EA73e744dEEC0c9aAbe77` | https://sepolia.etherscan.io/address/0x819326b9d318e1bb8c3EA73e744dEEC0c9aAbe77 | **intentionally not verified** — `curl "https://sourcify.dev/server/check-by-addresses?addresses=0x819326b9d318e1bb8c3EA73e744dEEC0c9aAbe77&chainIds=11155111"` returns `status="false"` (not_found) |

Sourcify verification is performed by `scripts/verify-sourcify.sh` (US-007). The four `Vault*` contracts above are submitted; `UnverifiedImpl` is deliberately excluded so the unverified-upgrade demo scenario reproduces correctly.

## 2. ENS demo subnames

ENS parent: **`upgrade-siren-demo.eth`** on Sepolia, owned by the operator wallet `0x747E453F13B5B14313E25393Eb443fbAaA250cfC` (registered via `scripts/register-sepolia-parent.ts` then unwrapped from NameWrapper to ENS Registry on 2026-05-09). Tracker US-061 still owns the mainnet equivalent.

Each subname carries the four stable `upgrade-siren:*` records and one atomic `upgrade-siren:upgrade_manifest` JSON record. The atomic-manifest pattern is the desync mitigation: a single `setText` updates `previousImpl`, `currentImpl`, `reportUri`, `reportHash`, `version`, `effectiveFrom`, and `previousManifestHash` together.

Stable records (identical across subnames):

| Record | Value |
|---|---|
| `upgrade-siren:chain_id` | `11155111` |
| `upgrade-siren:proxy` | `0x8391fa804d3755493e3C9D362D49c339C4469388` |
| `upgrade-siren:owner` | `0x747E453F13B5B14313E25393Eb443fbAaA250cfC` |
| `upgrade-siren:schema` | `upgrade-siren-manifest@1` |

Per-subname `upgrade-siren:upgrade_manifest`:

| Subname | `previousImpl` | `currentImpl` | Verdict |
|---|---|---|---|
| `vault.upgrade-siren-demo.eth` | `0xC53d3879aCF9Dd9d6fCF8Ed9B335A410Cc66Eb30` | `0xC53d3879aCF9Dd9d6fCF8Ed9B335A410Cc66Eb30` (canonical baseline) | `SAFE` (no upgrade yet) |
| `safe.upgrade-siren-demo.eth` | `0xC53d3879aCF9Dd9d6fCF8Ed9B335A410Cc66Eb30` | `0x9A9DCb4CE0F03aCB6aa8e26905D6aBb93c95B774` | `SAFE` |
| `dangerous.upgrade-siren-demo.eth` | `0xC53d3879aCF9Dd9d6fCF8Ed9B335A410Cc66Eb30` | `0xfD7F5B48C260a32102AA05117C13a599B0d4d568` | `SIREN` |
| `unverified.upgrade-siren-demo.eth` | `0xC53d3879aCF9Dd9d6fCF8Ed9B335A410Cc66Eb30` | `0x819326b9d318e1bb8c3EA73e744dEEC0c9aAbe77` | `SIREN` |

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

| Scenario | Verdict | Report URI | reportHash (signed) |
|---|---|---|---|
| `safe` | `SAFE` | `https://upgradesiren.app/r/safe.upgrade-siren-demo.eth.json` | `0xb90816fdd11f446b26266b1f019da648747ffde3cec020cd892991e56ae7008f` |
| `dangerous` | `SIREN` | `https://upgradesiren.app/r/dangerous.upgrade-siren-demo.eth.json` | `0x5edabf661ccd20f868afc3e0c4f580467f47da0bf8a0322ee62db4b5687a26c2` |
| `unverified` | `SIREN` | `https://upgradesiren.app/r/unverified.upgrade-siren-demo.eth.json` | `0x022867f57b600c5c1dc259773edd324ad3c3c7284ec2e285ef44dffce62d0ea9` |
| `vault` (live public-read) | `REVIEW` or `SIREN` | `<TBD: target chosen in US-062>` | `<populated when US-062 picks target>` |

All three signable scenarios are signed by `0x747E453F13B5B14313E25393Eb443fbAaA250cfC` (matches `upgrade-siren:owner`). `auth.status="valid"`, `signatureType="EIP-712"`. Source-of-truth files are committed at `reports/<scenario>.json`; the live HTTPS URIs above are populated by Stream C's web deploy (when `apps/web/public/r/` ships). The committed report bytes hash to the values above; see `pnpm tsx scripts/verify-reports.ts reports/safe.json --owner 0x747E453F13B5B14313E25393Eb443fbAaA250cfC`.

## 4. End-to-end reproduction

### 4.1 Resolve a demo subname

```bash
# Pick a subname:
SUBNAME=vault.upgrade-siren-demo.eth

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

# Fetch the report bytes:
REPORT_BYTES=$(curl -fsS "$REPORT_URI")

# keccak256 of the file bytes:
COMPUTED=$(echo -n "$REPORT_BYTES" | cast keccak)

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

# Use scripts/verify-reports.ts to recover the signer and check it matches:
echo "$REPORT_BYTES" > /tmp/report.json
pnpm tsx scripts/verify-reports.ts /tmp/report.json --owner "$OWNER"
# Expected:
#   OK: signature recovers to auth.signer and matches --owner
```

All three live signable scenarios (`safe`, `dangerous`, `unverified`) ship with `auth.status="valid"` and recover to the operator address. The `vault` row in §3 is intentionally still TODO and would be marked unsigned (or absent) until US-062 picks a live public-read target.

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
