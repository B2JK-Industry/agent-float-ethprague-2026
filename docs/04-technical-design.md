# Technical Design

## Build Principle

Deterministic evidence first. AI text is optional polish, not the source of truth.

## Minimal Architecture

```text
ENS name
  -> live text records
  -> proxy address + expected implementations
  -> chain reads
  -> Sourcify evidence
  -> diff checks
  -> Siren Report
  -> web verdict + optional signed agent output
```

## ENS Resolution

The app resolves records at runtime:

- `siren:chain_id`
- `siren:proxy`
- `siren:previous_impl`
- `siren:current_impl`
- `siren:report_uri`
- `siren:report_hash`
- `siren:schema`

Implementation rule:

- demo config may provide fallback ENS names
- contract addresses must come from live resolution in the main path
- hardcoded addresses are allowed only in fixture/deploy docs and must be labeled

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

If the live proxy slot does not match `siren:current_impl`, verdict is `SIREN`.

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
    "recordHash": "0x..."
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
