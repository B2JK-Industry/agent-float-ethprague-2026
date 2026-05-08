# 13 - Backlog

> Locked-scope work breakdown for Upgrade Siren. Source of truth: `SCOPE.md` and `docs/06-acceptance-gates.md`.
> Dev agents work non-stop per `prompts/run-dev-stream.md`. PR Reviewer works non-stop per `prompts/review-prs.md`.
> Scope-lock date: **2026-05-09**. Daniel locked Upgrade Siren as the build scope on this date.
> GitHub Wiki note: at backlog-generation time, the local `docs/` tree (especially `SCOPE.md`, `docs/04-technical-design.md`, `docs/06-acceptance-gates.md`, and `docs/12-implementation-roadmap.md`) is the authoritative source. Wiki content mirrors the same material.

## Conventions

- IDs: US-NNN (ascending, no gaps, sequential allocation A then B then C then Tracker)
- Type: epic / story / task
- Priority: P0 (must ship) / P1 (polish) / P2 (stretch) / P3 (post-hack)
- Effort: XS (<1h) / S (1-2h) / M (half-day) / L (1 day) / XL (split required)
- Owner: A / B / C / Daniel / Orch
- Status: open / pr-open / merged / blocked
- Dependencies: list of US-NNN ids that must be `merged` before this item can start. PR-open does not unblock.
- Sponsor: Sourcify / ENS / Future Society / Umia / - (no relevant sponsor)
- Acceptance gates: `GATE-N` references map directly to `docs/06-acceptance-gates.md`. P0 items list one or more gates; non-P0 items use `-` if no gate applies.

## Stream Ownership Map

| Stream | Name | Owns |
|---|---|---|
| A | Contract Fixtures | `contracts/`, `scripts/deploy*`, `test/`, Sourcify verification scripts |
| B | Evidence Engine | `packages/evidence/`, `packages/shared/`, report schema, ENS/Sourcify/onchain readers |
| C | Web UX and Siren Agent | `apps/web/`, `apps/siren-agent/`, demo UI, governance comment, optional Umia panel |

Tracker-only owners (not picked up by dev agents):

| Owner | Scope |
|---|---|
| Daniel | mentor sweeps, final sponsor decisions, PR merges, scope cuts, custody decisions, target selection |
| Orch | docs maintenance, GitHub Wiki, prompts, backlog post-merge updates, Devfolio submission materials, booth fallback artifacts, video script |

## Index

### Stream A — Contract Fixtures

| ID | Title | Owner | Priority | Effort | Status | Depends on |
|---|---|---|---|---|---|---|
| US-001 | Foundry workspace with pinned compiler 0.8.24 | A | P0 | S | open | none |
| US-002 | EIP-1967 transparent proxy fixture contract | A | P0 | S | open | none |
| US-003 | VaultV1 baseline implementation | A | P0 | S | open | none |
| US-004 | VaultV2Safe storage-compatible implementation | A | P0 | M | open | US-003 |
| US-005 | VaultV2Dangerous implementation with sweep and incompatible storage | A | P0 | M | open | US-003 |
| US-006 | Unverified-implementation deployment scenario contract | A | P0 | S | open | none |
| US-007 | Sourcify verification scripts for V1, V2Safe, V2Dangerous | A | P0 | M | open | US-009 |
| US-008 | Foundry tests: storage-layout assertions, dangerous-selector behavior, upgrade flow | A | P0 | M | open | US-001, US-002, US-003, US-004, US-005 |
| US-009 | Sepolia deploy script with documented addresses | A | P0 | M | open | US-001, US-002, US-003, US-004, US-005, US-006 |
| US-010 | ENS subname provisioning script with stable records and atomic upgrade_manifest | A | P0 | L | open | US-009 |
| US-011 | Signed and hosted Siren Reports for safe, dangerous, unverified, live public-read | A | P0 | M | open | US-009, US-010, US-014, US-015 |
| US-012 | ENSIP-26 agent-context and agent-endpoint records for demo subnames | A | P1 | S | open | US-010 |
| US-013 | Documentation of deployed addresses, ENS records, and manifest values | A | P0 | S | open | US-009, US-010, US-011 |

### Stream B — Evidence Engine

> Per `prompts/write-backlog.md` Effort and Scheduling Guidance, the schema item (US-014) and the signReport helper item (US-015) are listed first because they unblock Stream A signing and Stream C consumption. Both are Effort `S`.

| ID | Title | Owner | Priority | Effort | Status | Depends on |
|---|---|---|---|---|---|---|
| US-014 | Siren Report JSON schema in packages/shared | B | P0 | S | open | none |
| US-015 | EIP-712 typed-data builder and signReport helper in packages/shared | B | P0 | S | open | US-014 |
| US-016 | Shared types package for cross-stream consumption | B | P0 | S | open | none |
| US-017 | ENS live record resolution (stable upgrade-siren records and manifest) | B | P0 | M | open | none |
| US-018 | Atomic upgrade-siren:upgrade_manifest parser and validator | B | P0 | M | open | US-014, US-017 |
| US-019 | Public-read fallback path for absent Upgrade Siren records | B | P0 | M | open | US-017 |
| US-020 | Absent-record verdict paths (missing manifest, owner, malformed, slot mismatch) | B | P0 | M | open | US-018, US-019 |
| US-021 | Schema version policy for upgrade-siren-manifest@1 | B | P0 | S | open | US-014, US-018 |
| US-022 | EIP-1967 implementation slot reader | B | P0 | S | open | none |
| US-023 | Upgraded(address) event reader | B | P0 | S | open | none |
| US-024 | Sourcify verification status fetch | B | P0 | M | open | none |
| US-025 | Sourcify metadata fetch (source, ABI, compiler, storage layout) | B | P0 | M | open | none |
| US-026 | ABI risky-selector diff | B | P0 | M | open | US-025 |
| US-027 | Storage-layout compatibility diff | B | P0 | M | open | US-025 |
| US-028 | EIP-712 Siren Report signature verification against upgrade-siren:owner | B | P0 | M | open | US-014, US-015, US-017 |
| US-029 | Verdict engine: SAFE / REVIEW / SIREN rules | B | P0 | L | open | US-018, US-019, US-020, US-022, US-026, US-027, US-028 |
| US-030 | Manifest hash-chain validation using previousManifestHash | B | P1 | S | open | US-018 |
| US-031 | ENSIP-26 agent-context and agent-endpoint[web] record reading | B | P1 | S | open | US-017 |
| US-032 | Sourcify response cache layer with TTL | B | P1 | M | open | US-024, US-025 |
| US-033 | ENS resolution cache layer | B | P1 | S | open | US-017 |
| US-034 | RPC retry/failover and Sourcify rate-limit handling | B | P1 | M | open | US-022, US-024 |
| US-035 | 4byte signature lookup for unverified contracts | B | P1 | S | open | US-026 |
| US-036 | Upgrade-window grace policy (P1) | B | P1 | M | open | US-018, US-029 |

### Stream C — Web UX and Siren Agent

> Per `prompts/write-backlog.md` Effort and Scheduling Guidance, at least four Stream C P0 items are Effort `S` to prevent reviewer-bottleneck pile-up. The four `S` items are: ENS lookup form (US-038), public-read address input (US-039), mock-path badge (US-040), signature status badge (US-041).

| ID | Title | Owner | Priority | Effort | Status | Depends on |
|---|---|---|---|---|---|---|
| US-037 | Next.js 16 app scaffold with Tailwind 4 | C | P0 | M | open | none |
| US-038 | ENS lookup form component | C | P0 | S | open | none |
| US-039 | Public-read address / ENS-address-record input component | C | P0 | S | open | none |
| US-040 | Mock-path visible badge component | C | P0 | S | open | none |
| US-041 | Signature status badge component | C | P0 | S | open | US-014 |
| US-042 | Verdict card component (SAFE / REVIEW / SIREN) | C | P0 | M | open | US-037, US-041 |
| US-043 | Progressive loading checklist (ENS, chain, Sourcify, diff, signature) | C | P0 | M | open | US-037 |
| US-044 | Before/after implementation comparison view | C | P0 | M | open | US-014, US-037 |
| US-045 | Evidence drawer with Sourcify links | C | P0 | M | open | US-014, US-025, US-037 |
| US-046 | ABI diff renderer | C | P0 | M | open | US-026, US-037 |
| US-047 | Storage diff renderer | C | P0 | M | open | US-027, US-037 |
| US-048 | ENS records resolved live panel | C | P0 | M | open | US-017, US-037 |
| US-049 | Governance comment generator (short, forum, vote-reason) | C | P0 | M | open | US-014, US-037 |
| US-050 | Demo mode runner with four scenarios | C | P0 | M | open | US-009, US-010, US-011, US-029, US-037, US-042 |
| US-051 | Empty/error states for absent records, RPC, Sourcify, malformed manifest, unsigned report | C | P0 | M | open | US-019, US-020, US-037 |
| US-052 | Five-second-rule performance check | C | P0 | S | open | US-042, US-043 |
| US-053 | Share-verdict link with precomputed result | C | P1 | M | open | US-042 |
| US-054 | Mobile responsive layout check (viewport <= 768px) | C | P1 | S | open | US-042, US-045 |
| US-055 | Accessibility pass for WCAG AA and screen-reader status labels | C | P1 | M | open | US-042, US-045 |
| US-056 | Siren Agent watchlist config | C | P2 | M | open | US-029 |
| US-057 | Operator report-signing workflow UX for Siren Agent automation | C | P2 | M | open | US-015, US-056 |
| US-058 | Umia-style due-diligence panel | C | P2 | M | open | US-029 |

### Tracker — Daniel + Orch

> Four Tracker items must start at scope-lock, not after dev pipeline ships: US-059 (sponsor pitch), US-060 (key custody), US-062 (live target research), US-063 (booth fallback artifacts). Their Notes section flags this explicitly.

| ID | Title | Owner | Priority | Effort | Status | Depends on |
|---|---|---|---|---|---|---|
| US-059 | Sponsor pitch finalization (start at scope-lock) | Daniel + Orch | P0 | M | open | none |
| US-060 | Operator wallet / report signer custody decision (start at scope-lock) | Daniel | P0 | S | open | none |
| US-061 | ENS parent registration and operator wallet provisioning | Daniel | P0 | M | open | US-060 |
| US-062 | Live public-read protocol target research (start at scope-lock) | Daniel + Orch | P0 | M | open | none |
| US-063 | Booth fallback artifacts: Anvil, cached fixtures, recorded demo (start at scope-lock) | Orch | P0 | L | open | US-009, US-050 |
| US-064 | Devfolio submission materials | Daniel + Orch | P0 | M | open | US-013, US-029, US-050, US-059 |
| US-065 | 3-minute booth script rehearsal | Daniel | P0 | S | open | US-050 |
| US-066 | Devfolio logo and cover asset | Daniel + Orch | P1 | S | open | none |

## Dependency DAG (text form)

Items by stream that can start immediately at scope-lock (Dependencies | none):

- **Stream A:** US-001, US-002, US-003, US-006
- **Stream B:** US-014, US-016, US-017, US-022, US-023, US-024, US-025
- **Stream C:** US-037, US-038, US-039, US-040
- **Tracker:** US-059, US-060, US-062, US-066

Cross-stream dependency edges:

- **B -> A:** US-011 (signed Siren Reports for fixtures) waits for US-014 (schema) and US-015 (signReport helper) merged. Drives Effort `S` rule on both.
- **B -> C:** US-041, US-044, US-045, US-049 (UI items consuming the Siren Report schema) wait for US-014 merged.
- **B -> C:** US-046 waits for US-026 merged. US-047 waits for US-027 merged. US-048 waits for US-017 merged. US-051 waits for US-019 and US-020 merged.
- **A -> C:** US-050 (demo runner) waits for US-009 (deploy), US-010 (ENS provisioning), and US-011 (signed reports) merged.
- **B -> C:** US-050 waits for US-029 (verdict engine) merged.
- **A -> Tracker:** US-063 (booth fallback artifacts) waits for US-009 and US-050 merged.
- **B + A -> Tracker:** US-064 (Devfolio submission) waits for US-013, US-029, US-050, US-059 merged.
- **Tracker -> dev:** US-061 (ENS parent registration) is itself blocked by US-060 (custody decision); US-061 then unblocks Stream A US-010 in production-mode but not in demo-fixture mode (US-010 uses test parent on Sepolia).
- **Tracker -> C:** US-050 (demo runner 4th scenario) is content-blocked on US-062 (live public-read target research); US-050 can scaffold the runner without the target chosen and add the live scenario in a follow-up commit if the target lands late.

Stream B items that genuinely run in parallel (no inter-stream deps): US-014, US-016, US-017, US-022, US-023, US-024, US-025. Stream B can have seven open PRs simultaneously at scope-lock.

## Backlog Detail

### US-001 - Foundry workspace with pinned compiler 0.8.24

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | A |
| Effort | S |
| Sponsor | - |
| Dependencies | none |
| Acceptance gates | GATE-15 |
| Status | open |

#### Scope

Initialize the Foundry workspace at the repo root with `forge init --no-git`. Pin the Solidity compiler to `0.8.24` in `foundry.toml` and pin OpenZeppelin Contracts to a specific tag via git submodule or `forge install`. Out of scope: writing any contract code (subsequent items) and Sourcify configuration (US-007).

#### Acceptance Criteria

- [ ] `foundry.toml` exists at repo root with `solc_version = "0.8.24"` and `optimizer = true` with explicit runs
- [ ] OpenZeppelin Contracts installed at a pinned version, recorded in `foundry.toml` remappings
- [ ] `forge build` succeeds against an empty contracts directory
- [ ] `forge --version` recorded in `contracts/README.md`
- [ ] PR body references US-001
- [ ] No mocks introduced

#### Files

- `foundry.toml`
- `contracts/README.md`
- `lib/openzeppelin-contracts/` (submodule)
- `.gitmodules`

#### Verification commands

```bash
forge --version
forge build
```

#### Notes

Compiler version pinning is a Sourcify-verification prerequisite: a non-pinned compiler produces non-deterministic metadata hashes and breaks the verified-fixture demo. OpenZeppelin pin is required so the proxy fixture (US-002) can rely on stable interfaces.

### US-002 - EIP-1967 transparent proxy fixture contract

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | A |
| Effort | S |
| Sponsor | - |
| Dependencies | none |
| Acceptance gates | GATE-4, GATE-8 |
| Status | open |

#### Scope

Author `contracts/Proxy.sol` using OpenZeppelin's `TransparentUpgradeableProxy` with no customization. The proxy must store its implementation at the EIP-1967 implementation slot `0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc` and emit `Upgraded(address)` on implementation changes. Out of scope: deploy script (US-009), tests (US-008), implementation contracts (US-003 through US-006).

#### Acceptance Criteria

- [ ] `contracts/Proxy.sol` imports OZ `TransparentUpgradeableProxy`
- [ ] Proxy compiles under Solidity 0.8.24 without warnings
- [ ] Constructor accepts `(address logic, address admin, bytes data)` signature
- [ ] `forge build --contracts contracts/Proxy.sol` succeeds
- [ ] No customization beyond OZ inheritance
- [ ] PR body references US-002

#### Files

- `contracts/Proxy.sol`

#### Verification commands

```bash
forge build
```

#### Notes

Using stock OZ here is intentional. A custom proxy would force Stream B to special-case slot reads. Stock proxy makes Stream B's EIP-1967 reader (US-022) testable against a canonical implementation.

### US-003 - VaultV1 baseline implementation

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | A |
| Effort | S |
| Sponsor | - |
| Dependencies | none |
| Acceptance gates | GATE-6 |
| Status | open |

#### Scope

Author `contracts/VaultV1.sol` as a minimal `Initializable` upgradeable vault. Storage: `address public owner`, `mapping(address => uint256) public balances`. Functions: `initialize(address)`, `deposit() payable`, `withdraw(uint256)`, `balanceOf(address) view`. No privileged sweep or admin selectors beyond `owner` storage. Out of scope: V2 implementations (US-004, US-005), tests (US-008).

#### Acceptance Criteria

- [ ] `contracts/VaultV1.sol` implements `Initializable` (OZ upgradeable)
- [ ] Storage layout commits to: slot 0 = owner, slot 1 = balances mapping
- [ ] `initialize(address)` sets owner, can only be called once (OZ `initializer` modifier)
- [ ] `deposit`, `withdraw`, `balanceOf` work as documented
- [ ] No `sweep`, `setOwner`, `setAdmin`, `pause`, or arbitrary `call` selectors
- [ ] `forge build` succeeds
- [ ] PR body references US-003

#### Files

- `contracts/VaultV1.sol`

#### Verification commands

```bash
forge build
forge inspect VaultV1 storage-layout > /tmp/v1-layout.json
```

#### Notes

V1 storage layout is the reference for V2Safe (US-004 must be storage-compatible) and V2Dangerous (US-005 must be deliberately incompatible). The dangerous-selector NatSpec rule applies to V2Dangerous, not here.

### US-004 - VaultV2Safe storage-compatible implementation

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | A |
| Effort | M |
| Sponsor | - |
| Dependencies | US-003 |
| Acceptance gates | GATE-6 |
| Status | open |

#### Scope

Author `contracts/VaultV2Safe.sol` as a strict storage-compatible upgrade of V1. Reuses the same slot layout (owner at slot 0, balances at slot 1), appends new state at the end (e.g., `uint256 public depositCount` at slot 2). Adds a non-privileged read function (`getTotalDeposits()`). Adds NO new privileged selectors; specifically NO `sweep`, NO `setAdmin`, NO arbitrary `call`. Out of scope: V2Dangerous (US-005), tests (US-008).

#### Acceptance Criteria

- [ ] `contracts/VaultV2Safe.sol` keeps slots 0 and 1 identical to V1
- [ ] New state appended at slot 2 only; no existing slot reordered or retyped
- [ ] At least one new non-privileged read or write function
- [ ] No `sweep`, `setOwner`, `setAdmin`, `pause`, `unpause`, `mint`, `withdraw` (other than V1's), arbitrary `call`, or `delegatecall` selectors
- [ ] Storage layout JSON committed at `test/fixtures/storage-layouts/VaultV2Safe.json`
- [ ] Layout-compat assertion test stub committed (full assertion comes in US-008)
- [ ] PR body references US-004

#### Files

- `contracts/VaultV2Safe.sol`
- `test/fixtures/storage-layouts/VaultV2Safe.json`

#### Verification commands

```bash
forge build
forge inspect VaultV2Safe storage-layout > test/fixtures/storage-layouts/VaultV2Safe.json
diff <(jq .storage test/fixtures/storage-layouts/VaultV1.json | head -2) <(jq .storage test/fixtures/storage-layouts/VaultV2Safe.json | head -2)
```

#### Notes

The diff command in verification is the human-readable check that V1 and V2Safe agree on the first two slots. The Foundry test in US-008 mechanizes this assertion.

### US-005 - VaultV2Dangerous implementation with sweep and incompatible storage

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | A |
| Effort | M |
| Sponsor | Sourcify |
| Dependencies | US-003 |
| Acceptance gates | GATE-6, GATE-11 |
| Status | open |

#### Scope

Author `contracts/VaultV2Dangerous.sol` as a deliberately dangerous upgrade. Storage layout reorders or retypes one V1 slot (e.g., swaps owner and balances slot positions). Adds `sweep(address token, address to)` callable by `owner`, transferring full token balance. NatSpec on `sweep` documents the danger explicitly. Out of scope: deploy (US-009), tests (US-008), Sourcify verification (US-007).

#### Acceptance Criteria

- [ ] `contracts/VaultV2Dangerous.sol` reorders or retypes at least one V1 slot
- [ ] `sweep(address token, address to)` selector exists, callable by owner, transfers full ERC20 balance via `IERC20.transfer`
- [ ] NatSpec on `sweep` includes the literal phrase `WARNING: dangerous selector` and explains the risk in plain English
- [ ] Storage layout JSON committed at `test/fixtures/storage-layouts/VaultV2Dangerous.json`
- [ ] `forge build` succeeds
- [ ] PR body references US-005

#### Files

- `contracts/VaultV2Dangerous.sol`
- `test/fixtures/storage-layouts/VaultV2Dangerous.json`

#### Verification commands

```bash
forge build
forge inspect VaultV2Dangerous storage-layout > test/fixtures/storage-layouts/VaultV2Dangerous.json
```

#### Notes

The danger is two-pronged: storage incompat AND a new privileged selector. Stream B's verdict engine (US-029) flags each independently; both must fire on this fixture in the demo. NatSpec phrase `WARNING: dangerous selector` is grep-able by reviewers verifying intent.

### US-006 - Unverified-implementation deployment scenario contract

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | A |
| Effort | S |
| Sponsor | Sourcify |
| Dependencies | none |
| Acceptance gates | GATE-6 |
| Status | open |

#### Scope

Author `contracts/UnverifiedImpl.sol` as a minimal vault implementation that will be deployed but never submitted to Sourcify. The bytecode must be deployable on Sepolia and pointed to by the proxy in the unverified demo scenario. Out of scope: deploy script (US-009), Sourcify exclusion logic (handled in US-007 by simply not verifying this contract).

#### Acceptance Criteria

- [ ] `contracts/UnverifiedImpl.sol` compiles under Solidity 0.8.24
- [ ] Implements the same `initialize(address)` interface as V1 so the proxy can switch to it
- [ ] Contains no verifiable Sourcify-readable patterns beyond the bytecode itself
- [ ] PR body references US-006
- [ ] PR body states explicitly: this contract is intentionally NOT verified on Sourcify

#### Files

- `contracts/UnverifiedImpl.sol`

#### Verification commands

```bash
forge build
```

#### Notes

The Sourcify verification scripts (US-007) explicitly exclude this contract. The demo scenario for unverified upgrade depends on Sourcify returning `not_found` for this contract's address.

### US-007 - Sourcify verification scripts for V1, V2Safe, V2Dangerous

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | A |
| Effort | M |
| Sponsor | Sourcify |
| Dependencies | US-009 |
| Acceptance gates | GATE-5, GATE-9, GATE-16 |
| Status | open |

#### Scope

Implement `scripts/verify-sourcify.sh` (or `.ts`) that submits V1, V2Safe, and V2Dangerous deployed addresses to Sourcify for verification. Use Sourcify's `/server/verify` endpoint with the metadata.json + source files produced by Foundry. Explicitly exclude `UnverifiedImpl` from verification. Out of scope: re-verification on re-deploy (manual operator task), Sourcify rate-limit handling (US-034).

#### Acceptance Criteria

- [ ] `scripts/verify-sourcify.sh` exists and verifies V1, V2Safe, V2Dangerous on Sepolia (chain 11155111)
- [ ] Script emits a markdown summary with Sourcify links per contract
- [ ] `UnverifiedImpl` is explicitly NOT in the verification list (with a comment explaining why)
- [ ] Re-running the script against already-verified contracts is idempotent (Sourcify returns `already verified`, script does not error)
- [ ] PR body references US-007 and includes verified Sourcify links for the three contracts
- [ ] PR body references US-009 as a merged prerequisite

#### Files

- `scripts/verify-sourcify.sh`
- `scripts/verify-sourcify.md` (summary template)

#### Verification commands

```bash
bash scripts/verify-sourcify.sh
curl -s "https://sourcify.dev/server/check-by-addresses?addresses=<v1>,<v2safe>,<v2dangerous>&chainIds=11155111" | jq
```

#### Notes

Sourcify verification is a hard prerequisite for the SAFE and dangerous-but-verified demo paths. The unverified scenario explicitly requires `UnverifiedImpl` to NOT be in this list.

### US-008 - Foundry tests: storage-layout assertions, dangerous-selector behavior, upgrade flow

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | A |
| Effort | M |
| Sponsor | - |
| Dependencies | US-001, US-002, US-003, US-004, US-005 |
| Acceptance gates | GATE-11, GATE-12 |
| Status | open |

#### Scope

Author Foundry tests covering: V1 happy path (deposit, withdraw, balance), V2Safe storage-layout compat against V1 (slots 0 and 1 unchanged), V2Dangerous storage incompat (at least one slot retyped or reordered), V2Dangerous sweep behavior (owner can drain, non-owner reverts), full upgrade flow on a deployed proxy (proxy admin upgrades from V1 to V2Safe, balances preserved). Out of scope: integration tests against Sepolia (covered by US-009 deploy verification).

#### Acceptance Criteria

- [ ] `test/VaultV1Test.t.sol` exists with at least 4 happy-path tests
- [ ] `test/VaultV2SafeTest.t.sol` includes a layout-compatibility assertion comparing slot offsets and types against V1
- [ ] `test/VaultV2DangerousTest.t.sol` asserts a slot is retyped or reordered AND that `sweep` is callable by owner and reverts for non-owner
- [ ] `test/UpgradeFlowTest.t.sol` deploys proxy + V1, performs deposit, upgrades to V2Safe, asserts balances preserved
- [ ] All tests pass: `forge test`
- [ ] PR body references US-008

#### Files

- `test/VaultV1Test.t.sol`
- `test/VaultV2SafeTest.t.sol`
- `test/VaultV2DangerousTest.t.sol`
- `test/UpgradeFlowTest.t.sol`

#### Verification commands

```bash
forge test -vv
```

#### Notes

The layout-compat assertion in V2SafeTest is the mechanized version of the manual `diff` in US-004's verification. The retype-or-reorder assertion in V2DangerousTest is the mechanized check that the dangerous fixture is genuinely dangerous, not just NatSpec-claimed.

### US-009 - Sepolia deploy script with documented addresses

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | A |
| Effort | M |
| Sponsor | - |
| Dependencies | US-001, US-002, US-003, US-004, US-005, US-006 |
| Acceptance gates | GATE-15 |
| Status | open |

#### Scope

Implement `scripts/deploy/Deploy.s.sol` (Foundry script) that deploys: one transparent proxy, V1 as initial implementation, V2Safe and V2Dangerous as separate standalone implementations (not attached to the proxy yet), and `UnverifiedImpl` as a separate standalone implementation. Records all five addresses to `deployments/sepolia.json`. Out of scope: ENS provisioning (US-010), Sourcify verification (US-007).

#### Acceptance Criteria

- [ ] `scripts/deploy/Deploy.s.sol` deploys all five contracts on Sepolia (chain 11155111)
- [ ] `deployments/sepolia.json` written with keys: `proxy`, `v1`, `v2safe`, `v2dangerous`, `unverified`, plus block numbers and tx hashes
- [ ] Deploy script uses an environment variable for the deployer key (`DEPLOYER_PRIVATE_KEY`); never hardcoded
- [ ] Script is re-runnable; if `deployments/sepolia.json` exists and addresses are already deployed, script logs and exits zero without redeploying
- [ ] PR body references US-009 and includes deployed addresses + Sepolia explorer links
- [ ] No private keys committed; `.env` example file documents `DEPLOYER_PRIVATE_KEY`

#### Files

- `scripts/deploy/Deploy.s.sol`
- `deployments/sepolia.json`
- `.env.example`

#### Verification commands

```bash
forge script scripts/deploy/Deploy.s.sol --rpc-url $ALCHEMY_RPC_SEPOLIA --broadcast
cat deployments/sepolia.json | jq
```

#### Notes

The proxy is initialized to V1; subsequent demo upgrade flows (`upgradeTo(V2Safe)`, `upgradeTo(V2Dangerous)`, `upgradeTo(UnverifiedImpl)`) happen at demo-runner time, not in this script. Sepolia faucet ETH funding for the deployer wallet is a Daniel-task pre-merge.

### US-010 - ENS subname provisioning script with stable records and atomic upgrade_manifest

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | A |
| Effort | L |
| Sponsor | ENS |
| Dependencies | US-009 |
| Acceptance gates | GATE-3, GATE-17 |
| Status | open |

#### Scope

Implement `scripts/provision-ens.ts` that, for each demo subname (`safe.demo.upgradesiren.eth`, `dangerous.demo.upgradesiren.eth`, `unverified.demo.upgradesiren.eth`, `vault.demo.upgradesiren.eth` for the canonical 5-second moment), writes the stable records (`upgrade-siren:chain_id`, `upgrade-siren:proxy`, `upgrade-siren:owner`, `upgrade-siren:schema`) and one atomic `upgrade-siren:upgrade_manifest` JSON record. Uses ENS public resolver `setText` calls. Out of scope: ENSIP-26 records (US-012), Siren Report hosting (US-011).

#### Acceptance Criteria

- [ ] `scripts/provision-ens.ts` reads `deployments/sepolia.json` and provisions four subnames
- [ ] For each subname, writes stable `upgrade-siren:chain_id`, `upgrade-siren:proxy`, `upgrade-siren:owner`, `upgrade-siren:schema`
- [ ] For each subname, writes one composite `upgrade-siren:upgrade_manifest` JSON text record matching the schema in `docs/04-technical-design.md`
- [ ] Manifest JSON includes `previousImpl`, `currentImpl`, `reportUri`, `reportHash`, `version`, `effectiveFrom`, `previousManifestHash`
- [ ] Script is idempotent: re-running against existing records updates only changed fields
- [ ] PR body references US-010 and lists the four provisioned subnames with their resolved manifest hashes
- [ ] No operator key committed; uses `OPERATOR_PRIVATE_KEY` from environment

#### Files

- `scripts/provision-ens.ts`
- `scripts/provision-ens.md` (operator runbook)

#### Verification commands

```bash
pnpm tsx scripts/provision-ens.ts
# Verify records resolved live:
cast call --rpc-url $ALCHEMY_RPC_SEPOLIA <ens-resolver> "text(bytes32,string)" <namehash> "upgrade-siren:upgrade_manifest"
```

#### Notes

The atomic manifest pattern is the mitigation for desync risk documented in `docs/10-risks.md`. Each manifest includes the previous manifest's hash, creating an audit trail. Sepolia ENS public resolver address must be documented in the runbook.

### US-011 - Signed and hosted Siren Reports for safe, dangerous, unverified, live public-read scenarios

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | A |
| Effort | M |
| Sponsor | ENS, Sourcify |
| Dependencies | US-009, US-010, US-014, US-015 |
| Acceptance gates | GATE-24 |
| Status | open |

#### Scope

For each demo scenario, build a Siren Report JSON conforming to the schema in `packages/shared/` (US-014), sign it using `packages/shared/signReport` (US-015) with the operator key, host it at a public URL (Vercel static asset or GitHub Pages), and update each ENS manifest's `reportUri` and `reportHash` accordingly. Out of scope: report content for the live public-read scenario (US-062 chooses the target; this item only scaffolds the path).

#### Acceptance Criteria

- [ ] Three signed Siren Report JSON files exist under `reports/` for safe, dangerous, unverified
- [ ] Each is signed by `OPERATOR_PRIVATE_KEY` matching the address in `upgrade-siren:owner`
- [ ] Hosted at stable public URLs (Vercel static asset or `reports.upgradesiren.app/<scenario>.json`)
- [ ] Each report's bytes hash matches the `reportHash` in the corresponding ENS manifest
- [ ] Each report's EIP-712 signature recovers to the operator address
- [ ] PR body references US-011 and US-014, US-015 as merged prerequisites
- [ ] Live public-read scenario report is left as a TODO with reference to US-062 for target selection
- [ ] No private keys committed; uses `OPERATOR_PRIVATE_KEY` from environment

#### Files

- `reports/safe.json`
- `reports/dangerous.json`
- `reports/unverified.json`
- `scripts/sign-reports.ts`
- `scripts/sign-reports.md` (operator runbook)

#### Verification commands

```bash
pnpm tsx scripts/sign-reports.ts
# Verify each report signature externally:
pnpm tsx scripts/verify-reports.ts reports/safe.json
```

#### Notes

This is the bridge between Stream A fixtures and Stream B verifier. Without these signed reports, the verdict engine returns SIREN due to missing signature even on the safe scenario. Operator key custody is decided in US-060 (Tracker, start at scope-lock).

### US-012 - ENSIP-26 agent-context and agent-endpoint records for demo subnames

| Field | Value |
|---|---|
| Type | task |
| Priority | P1 |
| Owner | A |
| Effort | S |
| Sponsor | ENS |
| Dependencies | US-010 |
| Acceptance gates | - |
| Status | open |

#### Scope

Extend `scripts/provision-ens.ts` (or add `scripts/provision-ensip26.ts`) to write ENSIP-26 standard records on each demo subname: `agent-context` with a human-readable description, `agent-endpoint[web]` pointing to the report viewer URL. Out of scope: `agent-endpoint[mcp]` (P2, with US-056 Siren Agent watchlist).

#### Acceptance Criteria

- [ ] Each demo subname has `agent-context` set to a string of the form `Upgrade Siren risk report for <name>`
- [ ] Each demo subname has `agent-endpoint[web]` set to `https://upgradesiren.app/r/<name>` or equivalent
- [ ] Records are live-resolvable
- [ ] PR body references US-012

#### Files

- `scripts/provision-ensip26.ts` (or modification of US-010 script)

#### Verification commands

```bash
pnpm tsx scripts/provision-ensip26.ts
cast call --rpc-url $ALCHEMY_RPC_SEPOLIA <ens-resolver> "text(bytes32,string)" <namehash> "agent-context"
```

#### Notes

ENSIP-26 reuse is the explicit ENS sponsor argument: existing standards extended with verdict-specific custom records, not invented. Marked P1 because the demo verdict path works without these records; they strengthen the ENS pitch but do not gate the product.

### US-013 - Documentation of deployed addresses, ENS records, and manifest values

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | A |
| Effort | S |
| Sponsor | - |
| Dependencies | US-009, US-010, US-011 |
| Acceptance gates | GATE-15 |
| Status | open |

#### Scope

Author `contracts/DEPLOYMENTS.md` documenting the deployed addresses, the four demo subnames, the per-subname manifest values, and the four Siren Report URIs and hashes. Include a step-by-step reproduction recipe so a reviewer (or judge) can resolve a demo subname end-to-end without running anything.

#### Acceptance Criteria

- [ ] `contracts/DEPLOYMENTS.md` lists all five contract addresses with Sepolia explorer links and Sourcify links (links to US-007 verified pages)
- [ ] Lists all four demo subnames with their `upgrade-siren:upgrade_manifest` JSON values
- [ ] Lists all four Siren Report URIs and report hashes
- [ ] Includes a reproduction section: how to resolve a subname, fetch its manifest, hash-check the report, recover the signature, and confirm the operator is `upgrade-siren:owner`
- [ ] PR body references US-013

#### Files

- `contracts/DEPLOYMENTS.md`

#### Verification commands

```bash
# Manual: open the file and verify links resolve
test -f contracts/DEPLOYMENTS.md && grep -c "https://" contracts/DEPLOYMENTS.md
```

#### Notes

This document is what the PR Reviewer (and the Devfolio judges) will read first. It is the human-side counterpart of the machine-side `deployments/sepolia.json`. The reproduction recipe maps to GATE-15 (local run reproduces demo).
