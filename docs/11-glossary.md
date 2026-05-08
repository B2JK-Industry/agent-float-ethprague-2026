# Glossary

| Term | Meaning |
|---|---|
| Upgrade Siren | Public upgrade-risk alarm for named Ethereum contracts |
| Siren Agent | Monitoring agent that watches contracts and produces signed risk reports |
| ENS Contract Map | Stable ENS records plus one atomic upgrade manifest describing proxy identity, owner, report discovery, and implementation history |
| Atomic upgrade manifest | One `siren:upgrade_manifest` JSON text record containing upgrade state, report pointer/hash, version, timestamp, and previous manifest hash |
| Sourcify Evidence Engine | Module that fetches verified-contract evidence from Sourcify |
| Proxy | Contract address users interact with while logic lives in an implementation |
| Implementation | Logic contract behind a proxy |
| EIP-1967 slot | Standard storage slot where many proxies store implementation address |
| `SAFE` | Verified low-risk upgrade verdict |
| `REVIEW` | Upgrade may be valid but needs human review |
| `SIREN` | Upgrade should not be approved, funded, or trusted until fixed |
| Verification | Source/metadata match showing code can be inspected; not proof of safety |
| ABI diff | Comparison of callable functions before and after upgrade |
| Storage layout | Compiler metadata describing storage slots and types |
| Governance comment | Short explanation a DAO voter/delegate can paste into a proposal discussion |
| EIP-712 report signature | Typed-data signature proving the report was authorized by the `siren:owner` address |
| Mock | Simulated data path; must be explicitly labeled `mock: true` |
