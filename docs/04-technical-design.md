# Technical Design

## Build Principle

Deterministic evidence first. AI text is optional polish, not the source of truth.

## Minimal Architecture

```text
ENS name
  -> live text records
  -> stable proxy/owner records + atomic upgrade manifest
  -> chain reads
  -> Sourcify evidence
  -> diff checks
  -> Siren Report
  -> web verdict + signature status
```

## ENS Resolution

The app resolves records at runtime:

- `siren:chain_id`
- `siren:proxy`
- `siren:owner`
- `siren:schema`
- `siren:upgrade_manifest`
- `agent-context`
- `agent-endpoint[web]`
- `agent-endpoint[mcp]` (P2)

Implementation rule:

- demo config may provide fallback ENS names
- contract addresses and manifest data must come from live resolution in the main path
- hardcoded addresses are allowed only in fixture/deploy docs and must be labeled

## Atomic Upgrade Manifest

Changing upgrade data must not be split across multiple ENS text records. The app reads one composite `siren:upgrade_manifest` JSON object:

```json
{
  "schema": "siren-upgrade-manifest@1",
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

- fetch report from `siren:upgrade_manifest.reportUri`
- verify bytes hash to `siren:upgrade_manifest.reportHash`
- verify report EIP-712 signature
- recover signer
- require recovered signer equals `siren:owner`
- reject unsigned or invalidly signed production reports

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

If the live proxy slot does not match `siren:upgrade_manifest.currentImpl`, verdict is `SIREN`.

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
  "ens": {
    "recordsResolvedLive": true,
    "manifestHash": "0x...",
    "owner": "0x..."
  },
  "auth": {
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
- no private key custody
- no token contracts
- no marketplace
- no custom ENS resolver unless mentor feedback demands it
