# Technical Design

## Build Principle

Deterministic evidence first. AI text is optional polish, not the source of truth.

## Minimal Architecture

```text
ENS name
  -> live text records
  -> stable proxy/owner records + atomic upgrade manifest
  -> if absent: public-read fallback from address / ENS address record
  -> chain reads
  -> Sourcify evidence
  -> diff checks
  -> Siren Report
  -> web verdict + signature status
```

## ENS Resolution

The app resolves records at runtime:

- `upgrade-siren:chain_id`
- `upgrade-siren:proxy`
- `upgrade-siren:owner`
- `upgrade-siren:schema`
- `upgrade-siren:upgrade_manifest`
- `agent-context` (P1)
- `agent-endpoint[web]` (P1)
- `agent-endpoint[mcp]` (P2)

Implementation rule:

- demo config may provide fallback ENS names
- contract addresses and manifest data must come from live resolution in the signed manifest path
- hardcoded addresses are allowed only in fixture/deploy docs and must be labeled
- if Upgrade Siren records are absent, public-read mode may use a user-provided address or standard ENS address record; it must label confidence as `public-read` and cannot return `SAFE`

## Public-Read Fallback

Most real protocols will not have `upgrade-siren:*` records at hackathon time. The app must still be useful.

Fallback flow:

1. Resolve normal ENS address record or accept an address input.
2. Read EIP-1967 implementation slot.
3. Fetch Sourcify evidence for the live implementation.
4. Run ABI/storage/admin checks where enough evidence exists.
5. Return `SIREN` for unverified or dangerous evidence.
6. Return `REVIEW` for low-risk verified evidence because no operator-signed manifest exists.

This path is lower-confidence, not mocked. It is the bridge from "we can warn today" to "protocols can publish signed manifests for higher confidence tomorrow."

## Atomic Upgrade Manifest

Changing upgrade data must not be split across multiple ENS text records. The app reads one composite `upgrade-siren:upgrade_manifest` JSON object:

```json
{
  "schema": "upgrade-siren-manifest@1",
  "chainId": 11155111,
  "proxy": "0x...",
  "previousImpl": "0x...",
  "currentImpl": "0x...",
  "reportUri": "https://...",
  "reportHash": "0x...",
  "version": 3,
  "effectiveFrom": "2026-05-09T12:00:00Z",
  "previousManifestHash": "0x..."
}
```

This gives one ENS `setText` update per upgrade and avoids false `SIREN` states from partially updated implementation and report fields. `previousManifestHash` creates a hash-chain audit trail.

## Authentication Of Offchain Reports

`reportHash` proves integrity only. It does not prove the report was authorized by the ENS owner.

P0 trust path:

- fetch report from `upgrade-siren:upgrade_manifest.reportUri`
- verify bytes hash to `upgrade-siren:upgrade_manifest.reportHash`
- verify report EIP-712 signature
- recover signer
- require recovered signer equals `upgrade-siren:owner`
- reject unsigned or invalidly signed production reports

Undefined-record handling:

| Case | Result |
|---|---|
| `upgrade-siren:upgrade_manifest` absent | public-read mode; `REVIEW` unless a `SIREN` rule triggers; never `SAFE` |
| `upgrade-siren:owner` absent in signed-manifest path | `SIREN`; report authority cannot be verified |
| manifest current implementation mismatches live slot | `SIREN`; label as stale manifest or unexpected upgrade |
| malformed manifest JSON | `REVIEW` if public-read fallback can continue; `SIREN` if report claims signed-manifest mode |

Mock/demo exceptions:

- unsigned reports are allowed only with visible `mock: true`
- production UI must never label an unsigned report as trusted

P3 paths:

- ERC-3668 / CCIP-Read resolver for contract-readable verification of the same signed report payload
- ZK proof that the verdict engine ran over the declared ENS/Sourcify inputs

## Chain Reads

Required reads:

- EIP-1967 implementation slot:
  `0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc`
- `Upgraded(address)` event logs where available
- proxy admin or owner where available
- optional timelock ownership check

## Sourcify Reads

Use Sourcify to fetch:

- verification status
- metadata
- source files
- ABI
- compiler metadata
- storage layout if available
- contract page links

The report must include the Sourcify links used by the app so judges can inspect the evidence.

## Diff Checks

### Verification

If the current implementation is unverified, verdict is `SIREN`.

### ENS Consistency

If the live proxy slot does not match `upgrade-siren:upgrade_manifest.currentImpl`, verdict is `SIREN`.

P0 does not implement a grace-period downgrade. If a legitimate upgrade is executed before the manifest is updated, the alarm should fire as `SIREN: manifest stale or unexpected upgrade`. A P1 item may add a signed pending-upgrade or grace-window policy after mentor feedback.

### ABI Risk

Flag new selectors matching risky names:

- `upgradeTo`
- `upgradeToAndCall`
- `setOwner`
- `transferOwnership`
- `setAdmin`
- `sweep`
- `withdraw`
- `mint`
- `pause`
- `unpause`
- arbitrary `call`
- arbitrary `delegatecall`

### Storage Layout

If storage layout exists for both implementations:

- changed existing slot type: `SIREN`
- reordered existing slot: `SIREN`
- inserted variable before existing variables: `SIREN`
- appended variable only: usually `SAFE` or `REVIEW`

If storage layout is missing:

- do not fake confidence
- show `REVIEW` unless another `SIREN` condition exists

## Report Format

```json
{
  "name": "vault.demo.upgradesiren.eth",
  "chainId": 11155111,
  "proxy": "0x...",
  "previousImplementation": "0x...",
  "currentImplementation": "0x...",
  "verdict": "SAFE",
  "summary": "Verified upgrade with compatible storage layout.",
  "findings": [
    {
      "id": "VERIFICATION_CURRENT",
      "severity": "info",
      "title": "Current implementation verified",
      "evidence": {}
    }
  ],
  "sourcify": {
    "previousVerified": true,
    "currentVerified": true,
    "links": []
  },
  "mode": "signed-manifest",
  "confidence": "operator-signed",
  "ens": {
    "recordsResolvedLive": true,
    "manifestHash": "0x...",
    "owner": "0x..."
  },
  "auth": {
    "status": "valid",
    "signatureType": "EIP-712",
    "signer": "0x...",
    "signature": "0x...",
    "signedAt": "2026-05-09T00:00:00Z"
  },
  "recommendedAction": "approve",
  "mock": false,
  "generatedAt": "2026-05-08T00:00:00Z"
}
```

## Demo Fixture Contracts

When Daniel locks build, create:

- proxy fixture
- `VaultV1`
- `VaultV2Safe`
- `VaultV2Dangerous`

Dangerous fixture should add a plainly visible privileged function and an unsafe storage change.

## Technical Non-Goals

- no custom static analyzer
- no full audit engine
- no user private key custody; P0 only uses a dedicated deploy-time report signer loaded from local environment
- no token contracts
- no marketplace
- no custom ENS resolver unless mentor feedback demands it
