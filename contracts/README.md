# contracts/

Foundry workspace for Upgrade Siren demo fixtures.

## Toolchain

```text
forge Version: 1.5.1-stable
Commit SHA:    b0a9dd9ceda36f63e2326ce530c10e6916f4b8a2
Build Timestamp: 2025-12-22T11:41:09.812070000Z (1766403669)
Build Profile: maxperf
```

Pinned in `foundry.toml`:

- `solc_version = "0.8.24"`
- `optimizer = true` with `optimizer_runs = 200`
- OpenZeppelin Contracts at tag `v5.0.2` (rev `dbb6104ce834628e473d2173bbc9d47f81a9eec3`), recorded in `foundry.lock`

The compiler version pin is a Sourcify-verification prerequisite: any drift produces non-deterministic metadata hashes and breaks the verified-fixture demo.

## Layout

| Path | Purpose |
|---|---|
| `contracts/` | Solidity source (this directory) |
| `lib/openzeppelin-contracts/` | OZ Contracts submodule |
| `contracts/out/` | Build artifacts (gitignored) |
| `contracts/cache/` | Compiler cache (gitignored) |
| `contracts/broadcast/` | Forge script broadcast logs (gitignored) |
| `test/` | Foundry tests (added in US-008) |

Remapping: `@openzeppelin/contracts/` resolves to `lib/openzeppelin-contracts/contracts/`.

## Reproducing the build

```bash
forge --version
git submodule update --init --recursive
forge build
```

Subsequent backlog items (US-002..US-013) populate `contracts/`, deploy scripts, Sourcify verification, and ENS provisioning. This directory must remain at solc 0.8.24 with the pinned OZ tag for the verified-fixture demo to reproduce.
