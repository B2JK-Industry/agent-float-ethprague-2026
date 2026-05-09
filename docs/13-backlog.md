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
- Status: open / merged / blocked (the existence of an open PR is tracked in GitHub; we do not duplicate it here)
- Dependencies: list of US-NNN ids that must be `merged` before this item can start. An open PR on a dependency does not unblock its consumers.
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
| US-001 | Foundry workspace with pinned compiler 0.8.24 | A | P0 | S | merged | none |
| US-002 | EIP-1967 transparent proxy fixture contract | A | P0 | S | merged | none |
| US-003 | VaultV1 baseline implementation | A | P0 | S | merged | none |
| US-004 | VaultV2Safe storage-compatible implementation | A | P0 | M | merged | US-003 |
| US-005 | VaultV2Dangerous implementation with sweep and incompatible storage | A | P0 | M | merged | US-003 |
| US-006 | Unverified-implementation deployment scenario contract | A | P0 | S | merged | none |
| US-007 | Sourcify verification scripts for V1, V2Safe, V2Dangerous | A | P0 | M | merged | US-009 |
| US-008 | Foundry tests: storage-layout assertions, dangerous-selector behavior, upgrade flow | A | P0 | M | merged | US-001, US-002, US-003, US-004, US-005 |
| US-009 | Sepolia deploy script with documented addresses | A | P0 | M | merged | US-001, US-002, US-003, US-004, US-005, US-006 |
| US-010 | ENS subname provisioning script with stable records and atomic upgrade_manifest | A | P0 | L | merged | US-009 |
| US-011 | Signed and hosted Siren Reports for safe, dangerous, unverified, live public-read | A | P0 | M | merged | US-009, US-010, US-014, US-015 |
| US-012 | ENSIP-26 agent-context and agent-endpoint records for demo subnames | A | P1 | S | merged | US-010 |
| US-013 | Documentation of deployed addresses, ENS records, and manifest values | A | P0 | S | merged | US-009, US-010, US-011 |

### Stream B — Evidence Engine

> Per `prompts/write-backlog.md` Effort and Scheduling Guidance, the schema item (US-014) and the signReport helper item (US-015) are listed first because they unblock Stream A signing and Stream C consumption. Both are Effort `S`.

| ID | Title | Owner | Priority | Effort | Status | Depends on |
|---|---|---|---|---|---|---|
| US-014 | Siren Report JSON schema in packages/shared | B | P0 | S | merged | none |
| US-015 | EIP-712 typed-data builder and signReport helper in packages/shared | B | P0 | S | merged | US-014 |
| US-016 | Shared types package for cross-stream consumption | B | P0 | S | merged | none |
| US-017 | ENS live record resolution (stable upgrade-siren records and manifest) | B | P0 | M | merged | none |
| US-018 | Atomic upgrade-siren:upgrade_manifest parser and validator | B | P0 | M | merged | US-014, US-017 |
| US-019 | Public-read fallback path for absent Upgrade Siren records | B | P0 | M | merged | US-017 |
| US-020 | Absent-record verdict paths (missing manifest, owner, malformed, slot mismatch) | B | P0 | M | merged | US-018, US-019 |
| US-021 | Schema version policy for upgrade-siren-manifest@1 | B | P0 | S | merged | US-014, US-018 |
| US-022 | EIP-1967 implementation slot reader | B | P0 | S | merged | none |
| US-023 | Upgraded(address) event reader | B | P0 | S | merged | none |
| US-024 | Sourcify verification status fetch | B | P0 | M | merged | none |
| US-025 | Sourcify metadata fetch (source, ABI, compiler, storage layout) | B | P0 | M | merged | none |
| US-026 | ABI risky-selector diff | B | P0 | M | merged | US-025 |
| US-027 | Storage-layout compatibility diff | B | P0 | M | merged | US-025 |
| US-028 | EIP-712 Siren Report signature verification against upgrade-siren:owner | B | P0 | M | merged | US-014, US-015, US-017 |
| US-029 | Verdict engine: SAFE / REVIEW / SIREN rules | B | P0 | L | merged | US-018, US-019, US-020, US-022, US-026, US-027, US-028 |
| US-030 | Manifest hash-chain validation using previousManifestHash | B | P1 | S | merged | US-018 |
| US-031 | ENSIP-26 agent-context and agent-endpoint[web] record reading | B | P1 | S | merged | US-017 |
| US-032 | Sourcify response cache layer with TTL | B | P1 | M | merged | US-024, US-025 |
| US-033 | ENS resolution cache layer | B | P1 | S | merged | US-017 |
| US-034 | RPC retry/failover and Sourcify rate-limit handling | B | P1 | M | merged | US-022, US-024 |
| US-035 | 4byte signature lookup for unverified contracts | B | P1 | S | merged | US-026 |
| US-036 | Upgrade-window grace policy (P1) | B | P1 | M | merged | US-018, US-029 |

### Stream C — Web UX and Siren Agent

> Per `prompts/write-backlog.md` Effort and Scheduling Guidance, at least four Stream C P0 items are Effort `S` to prevent reviewer-bottleneck pile-up. The four `S` items are: ENS lookup form (US-038), public-read address input (US-039), mock-path badge (US-040), signature status badge (US-041).

| ID | Title | Owner | Priority | Effort | Status | Depends on |
|---|---|---|---|---|---|---|
| US-037 | Next.js 16 app scaffold with Tailwind 4 | C | P0 | M | merged | none |
| US-038 | ENS lookup form component | C | P0 | S | merged | none |
| US-039 | Public-read address / ENS-address-record input component | C | P0 | S | merged | none |
| US-040 | Mock-path visible badge component | C | P0 | S | merged | none |
| US-041 | Signature status badge component | C | P0 | S | merged | US-014 |
| US-042 | Verdict card component (SAFE / REVIEW / SIREN) | C | P0 | M | merged | US-037, US-041 |
| US-043 | Progressive loading checklist (ENS, chain, Sourcify, diff, signature) | C | P0 | M | merged | US-037 |
| US-044 | Before/after implementation comparison view | C | P0 | M | merged | US-014, US-037 |
| US-045 | Evidence drawer with Sourcify links | C | P0 | M | merged | US-014, US-025, US-037 |
| US-046 | ABI diff renderer | C | P0 | M | merged | US-026, US-037 |
| US-047 | Storage diff renderer | C | P0 | M | merged | US-027, US-037 |
| US-048 | ENS records resolved live panel | C | P0 | M | merged | US-017, US-037 |
| US-049 | Governance comment generator (short, forum, vote-reason) | C | P0 | M | merged | US-014, US-037 |
| US-050 | Demo mode runner with four scenarios | C | P0 | M | merged | US-009, US-010, US-011, US-029, US-037, US-042 |
| US-051 | Empty/error states for absent records, RPC, Sourcify, malformed manifest, unsigned report | C | P0 | M | merged | US-019, US-020, US-037 |
| US-052 | Five-second-rule performance check | C | P0 | S | open | US-042, US-043, US-068 |
| US-053 | Share-verdict link with precomputed result | C | P1 | M | open | US-042 |
| US-054 | Mobile responsive layout check (viewport <= 768px) | C | P1 | S | open | US-042, US-045 |
| US-055 | Accessibility pass for WCAG AA and screen-reader status labels | C | P1 | M | open | US-042, US-045 |
| US-056 | Siren Agent watchlist config | C | P2 | M | open | US-029 |
| US-057 | Operator report-signing workflow UX for Siren Agent automation | C | P2 | M | open | US-015, US-056 |
| US-058 | Umia-style due-diligence panel | C | P2 | M | open | US-029 |
| US-067 | Brand visual identity assets and Tailwind preset integration | C | P0 | L | merged | US-037 |
| US-068 | Live verdict pipeline integration in /r/[name] route (real ENS + chain + Sourcify fetch via @upgrade-siren/evidence; replace fixture reads) | C | P0 | L | open | US-017, US-022, US-024, US-025, US-028, US-029 |
| US-069 | Server-side report-hash + signature trust path runtime (fetch reportUri, verify bytes hash, recover EIP-712 signer, gate verdict) | B | P0 | M | merged | US-014, US-015, US-028, US-068 |
| US-070 | Replace homepage scaffold copy with live product framing (lookup CTA wired to /r/[name], remove "ships later" wording) | C | P0 | S | open | US-068 |
| US-073 | Refresh README current-status section to reflect live-deployment state (this PR) | Orch | P1 | S | merged | none |
| US-074 | Extend EIP-712 typed-data domain to sign full report payload (findings + sourcify links + recommendedAction + auth.signedAt) | B | P1 | M | open | US-014, US-015, US-068 |

### Tracker — Daniel + Orch

> Four Tracker items must start at scope-lock, not after dev pipeline ships: US-059 (sponsor pitch), US-060 (key custody), US-062 (live target research), US-063 (booth fallback artifacts). Their Notes section flags this explicitly.

| ID | Title | Owner | Priority | Effort | Status | Depends on |
|---|---|---|---|---|---|---|
| US-059 | Sponsor pitch finalization (start at scope-lock) | Daniel + Orch | P0 | M | open | none |
| US-060 | Operator wallet / report signer custody decision (start at scope-lock) | Daniel | P0 | S | merged | none |
| US-061 | ENS parent registration on mainnet (deferred post-hack; Sepolia parent suffices for demo) | Daniel | P1 | M | blocked | US-060 |
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
| Status | merged |

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
| Status | merged |

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
| Status | merged |

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
| Status | merged |

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
| Status | merged |

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
| Status | merged |

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
| Status | merged |

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
| Status | merged |

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
| Status | merged |

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
| Status | merged |

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
| Status | merged |

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
| Status | merged |

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
| Status | merged |

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

### US-014 - Siren Report JSON schema in packages/shared

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | B |
| Effort | S |
| Sponsor | Sourcify, ENS |
| Dependencies | none |
| Acceptance gates | GATE-9 |
| Status | merged |

#### Scope

Define the canonical Siren Report JSON schema as a TypeScript type in `packages/shared/src/sirenReport.ts` plus a JSON Schema document at `packages/shared/schemas/siren-report-v1.json`. Schema must match the structure documented in `docs/04-technical-design.md` Report Format section: top-level fields, `sourcify` object, `ens` object, `auth` object, `mode` enum, `confidence` enum, `findings` array, `mock` boolean. Out of scope: signing helper (US-015), verification (US-028).

#### Acceptance Criteria

- [ ] `packages/shared/src/sirenReport.ts` exports `SirenReport` type with all fields fully typed (no `any`)
- [ ] `packages/shared/schemas/siren-report-v1.json` is a valid JSON Schema document
- [ ] Type and JSON Schema match each other (verified by a generation or assertion test)
- [ ] `mode` enum: `signed-manifest | public-read | mock`
- [ ] `confidence` enum: `operator-signed | public-read | mock`
- [ ] `auth` object includes `signatureType`, `signer`, `signature`, `signedAt`, `status` (`valid | unsigned | invalid`)
- [ ] Schema validates the example report from `docs/04-technical-design.md`
- [ ] PR body references US-014

#### Files

- `packages/shared/src/sirenReport.ts`
- `packages/shared/schemas/siren-report-v1.json`
- `packages/shared/test/sirenReport.test.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/shared typecheck
pnpm --filter @upgrade-siren/shared test
```

#### Notes

This is the cross-stream contract. Stream A signs reports against this schema (US-011), Stream C renders them (US-044, US-045, US-049), Stream B verifies them (US-028) and produces them (US-029). Effort `S` and listed first in the Stream B Index per scheduling guidance.

### US-015 - EIP-712 typed-data builder and signReport helper in packages/shared

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | B |
| Effort | S |
| Sponsor | Sourcify |
| Dependencies | US-014 |
| Acceptance gates | GATE-24 |
| Status | merged |

#### Scope

Implement the EIP-712 typed-data structure for Siren Reports in `packages/shared/src/eip712/sirenReportTypedData.ts`. Implement `signReport(report, privateKey)` in `packages/shared/src/eip712/signReport.ts` returning `{report, signature}` with `report.auth` populated. Domain: `name="Upgrade Siren"`, `version="1"`, `chainId` from the report, `verifyingContract=address(0)`. Uses viem's `signTypedData`. Out of scope: verification (US-028), automated signing flow (US-057 P2).

#### Acceptance Criteria

- [ ] `buildSirenReportTypedData(report: SirenReport)` returns a viem-compatible typed-data object
- [ ] Domain fields exactly: `name="Upgrade Siren"`, `version="1"`, `chainId`, `verifyingContract=0x0000000000000000000000000000000000000000`
- [ ] Primary type `SirenReport` enumerates the typed-data fields (subset of full report relevant to authentication)
- [ ] `signReport(report, privateKey)` populates `report.auth.signatureType="EIP-712"`, `report.auth.signer=<recovered>`, `report.auth.signature=<hex>`, `report.auth.signedAt=<ISO>`, `report.auth.status="valid"`
- [ ] Helper does not log the private key, mocks `console.log` in tests to assert this
- [ ] Round-trip test: sign, then `recoverTypedDataAddress` returns the same address
- [ ] PR body references US-015 and US-014 as merged prerequisite

#### Files

- `packages/shared/src/eip712/sirenReportTypedData.ts`
- `packages/shared/src/eip712/signReport.ts`
- `packages/shared/test/eip712.test.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/shared test eip712
```

#### Notes

Effort `S` and listed second in the Stream B Index per scheduling guidance. Stream A (US-011) imports this directly to sign demo reports. Stream C does NOT import the signing helper; only verification (US-028) is consumed by C via Stream B.

### US-016 - Shared types package for cross-stream consumption

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | B |
| Effort | S |
| Sponsor | - |
| Dependencies | none |
| Acceptance gates | - |
| Status | merged |

#### Scope

Bootstrap `packages/shared/` as a pnpm workspace package: `package.json`, `tsconfig.json`, `index.ts` re-exporting types. Configure ESM build via `tsup` or `tsc`. Consumed by `packages/evidence/` and `apps/web/`. Out of scope: schema content (US-014), signing helpers (US-015), specific business types beyond infrastructure.

#### Acceptance Criteria

- [ ] `packages/shared/package.json` declares `name=@upgrade-siren/shared`, ESM exports, `types` field
- [ ] `packages/shared/tsconfig.json` extends a root tsconfig, strict mode on
- [ ] `packages/shared/src/index.ts` re-exports from sub-modules
- [ ] `pnpm --filter @upgrade-siren/shared build` produces `dist/` with `.js` and `.d.ts`
- [ ] Root `pnpm-workspace.yaml` includes `packages/shared`
- [ ] PR body references US-016

#### Files

- `pnpm-workspace.yaml`
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/shared/src/index.ts`

#### Verification commands

```bash
pnpm install
pnpm --filter @upgrade-siren/shared build
```

#### Notes

Pure scaffolding. US-014 and US-015 add content. Splitting infrastructure from content lets US-014 and US-015 ship in parallel after this is merged.

### US-017 - ENS live record resolution

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | B |
| Effort | M |
| Sponsor | ENS |
| Dependencies | none |
| Acceptance gates | GATE-3, GATE-17 |
| Status | merged |

#### Scope

Implement `resolveEnsRecords(name)` in `packages/evidence/src/ens/resolve.ts` that resolves stable `upgrade-siren:*` records and the atomic `upgrade-siren:upgrade_manifest` record live against a configured Alchemy RPC. Returns a typed `EnsResolutionResult` with each record present/absent flagged explicitly. Out of scope: manifest parsing (US-018), ENSIP-26 records (US-031), public-read fallback path (US-019), caching (US-033).

#### Acceptance Criteria

- [ ] `resolveEnsRecords(name: string)` returns a typed object with `chainId`, `proxy`, `owner`, `schema`, `upgradeManifestRaw`, plus per-record presence flags
- [ ] Uses viem `getEnsText` or equivalent against Sepolia and mainnet Alchemy endpoints (configurable)
- [ ] Absent record returns `null` for that field, not throws
- [ ] Malformed ENS name returns a typed error result, not throws
- [ ] Integration test against the demo subnames provisioned in US-010 (after merge)
- [ ] Unit tests with viem mocks covering all-records-present, partial, and all-absent cases
- [ ] PR body references US-017

#### Files

- `packages/evidence/src/ens/resolve.ts`
- `packages/evidence/src/ens/types.ts`
- `packages/evidence/test/ens/resolve.test.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/evidence test ens/resolve
```

#### Notes

This is the core ENS reader. Live resolution is the GATE-3 + GATE-17 invariant; mock paths are not acceptable in the production code path. Caching layer (US-033) sits on top of this.

### US-018 - Atomic upgrade-siren:upgrade_manifest parser and validator

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | B |
| Effort | M |
| Sponsor | ENS |
| Dependencies | US-014, US-017 |
| Acceptance gates | GATE-10 |
| Status | merged |

#### Scope

Implement `parseUpgradeManifest(raw: string)` in `packages/evidence/src/manifest/parse.ts` that takes the raw text record content, parses JSON, validates against the manifest schema (subset of report schema at US-014), and returns a typed `UpgradeManifest` or a discriminated `ManifestError` (`malformed_json`, `missing_required_field`, `unknown_schema_version`, `invalid_address`). Out of scope: hash-chain validation (US-030), absent-record paths (US-019, US-020).

#### Acceptance Criteria

- [ ] `parseUpgradeManifest(raw)` returns `Result<UpgradeManifest, ManifestError>`
- [ ] Validates: `schema`, `chainId`, `proxy`, `previousImpl`, `currentImpl`, `reportUri`, `reportHash`, `version`, `effectiveFrom`, `previousManifestHash`
- [ ] Address fields validated as 0x-prefixed 20-byte hex
- [ ] `reportHash` validated as 0x-prefixed 32-byte hex
- [ ] `effectiveFrom` validated as ISO-8601 string
- [ ] `schema` field equals `upgrade-siren-manifest@1` for known version; unknown versions return `unknown_schema_version` error
- [ ] Five unit tests covering each error branch + happy path
- [ ] PR body references US-018

#### Files

- `packages/evidence/src/manifest/parse.ts`
- `packages/evidence/src/manifest/types.ts`
- `packages/evidence/test/manifest/parse.test.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/evidence test manifest/parse
```

#### Notes

The `unknown_schema_version` error is the bridge to US-021 (schema version policy): unknown versions return `REVIEW` unless another `SIREN` rule fires.

### US-019 - Public-read fallback path for absent Upgrade Siren records

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | B |
| Effort | M |
| Sponsor | ENS, Sourcify |
| Dependencies | US-017 |
| Acceptance gates | GATE-25 |
| Status | merged |

#### Scope

Implement `runPublicReadFallback(input)` in `packages/evidence/src/fallback/publicRead.ts` that handles inputs without `upgrade-siren:*` records. Input is either a raw 0x-prefixed address or a normal ENS name resolving to an address record. The function reads the EIP-1967 slot of the address (assumed proxy), fetches Sourcify evidence for the implementation, and returns a `PublicReadResult` with `mode="public-read"` and `confidence="public-read"`. Out of scope: verdict computation (US-029), absent-record verdict paths (US-020).

#### Acceptance Criteria

- [ ] Function accepts both raw address and ENS name with `addr` record
- [ ] When input is a name without `upgrade-siren:*` records, returns `mode="public-read"`
- [ ] Result never returns `confidence="operator-signed"`; this branch is only reachable when no signed manifest exists
- [ ] Includes proxy address, current implementation, and Sourcify verification status in result
- [ ] PR body references US-019

#### Files

- `packages/evidence/src/fallback/publicRead.ts`
- `packages/evidence/test/fallback/publicRead.test.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/evidence test fallback/publicRead
```

#### Notes

This is the addition that makes Upgrade Siren useful for protocols that have not yet adopted the records. Without this fallback, the product is demo-only.

### US-020 - Absent-record verdict paths

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | B |
| Effort | M |
| Sponsor | - |
| Dependencies | US-018, US-019 |
| Acceptance gates | GATE-13 |
| Status | merged |

#### Scope

Implement the explicit verdict-condition table for absent and malformed records: missing manifest, missing owner in signed-manifest path, malformed manifest, slot-vs-manifest mismatch during a real upgrade window. Each case returns a typed `VerdictReason` consumed by the verdict engine (US-029). Out of scope: full verdict engine integration (US-029), grace-policy for upgrade window (US-036, P1).

#### Acceptance Criteria

- [ ] `manifest absent + signed-manifest path` returns `REVIEW` with reason `manifest_absent_falling_back_public_read`
- [ ] `owner absent + signed-manifest path` returns `SIREN` with reason `owner_absent_authority_unverifiable`
- [ ] `malformed manifest` returns `SIREN` with reason `malformed_manifest`
- [ ] `slot != manifest currentImpl` returns `SIREN` with reason `manifest_stale_or_unexpected_upgrade`
- [ ] Each path has a unit test with explicit input fixtures
- [ ] PR body references US-020

#### Files

- `packages/evidence/src/verdict/absentRecords.ts`
- `packages/evidence/test/verdict/absentRecords.test.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/evidence test verdict/absentRecords
```

#### Notes

These edge cases are the difference between a verdict engine that handles real-world ENS state and one that only handles the happy-path demo. GATE-13 is the honesty gate: missing data must lower confidence, never produce false `SAFE`.

### US-021 - Schema version policy for upgrade-siren-manifest@1

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | B |
| Effort | S |
| Sponsor | - |
| Dependencies | US-014, US-018 |
| Acceptance gates | - |
| Status | merged |

#### Scope

Document and enforce the schema version policy: `upgrade-siren-manifest@1` is the only known version at hackathon time. Unknown versions parsed by US-018 must surface a `unknown_schema_version` reason that the verdict engine treats as `REVIEW`. Document the upgrade path for v2: introduce a new schema, dual-read for a deprecation window, then sunset v1. Out of scope: implementing v2.

#### Acceptance Criteria

- [ ] `packages/evidence/src/manifest/versionPolicy.ts` exports `KNOWN_MANIFEST_VERSIONS=["upgrade-siren-manifest@1"]`
- [ ] Parser (US-018) imports this list and rejects unknown versions
- [ ] `packages/evidence/MANIFEST_VERSIONING.md` documents: how to add a new version, dual-read window, and sunset criteria
- [ ] PR body references US-021

#### Files

- `packages/evidence/src/manifest/versionPolicy.ts`
- `packages/evidence/MANIFEST_VERSIONING.md`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/evidence test manifest/versionPolicy
```

#### Notes

Schema versioning is a future-proofing item, not a feature. Without it, a future v2 manifest crashes the parser instead of producing a graceful `REVIEW`.

### US-022 - EIP-1967 implementation slot reader

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | B |
| Effort | S |
| Sponsor | - |
| Dependencies | none |
| Acceptance gates | GATE-4, GATE-8 |
| Status | merged |

#### Scope

Implement `readImplementationSlot(chainId, proxyAddress)` in `packages/evidence/src/chain/eip1967.ts` that reads the EIP-1967 implementation slot via `eth_getStorageAt` against the configured RPC. Returns the implementation address or `null` if zero. Out of scope: caching (US-033), Upgraded event reader (US-023).

#### Acceptance Criteria

- [ ] Slot constant is exactly `0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc` (no typo)
- [ ] Returns 20-byte address from the rightmost 20 bytes of the slot value
- [ ] Returns `null` when slot is zero (proxy not initialized)
- [ ] Handles RPC error by returning a typed error result, not throwing
- [ ] Unit test with fixture slot value
- [ ] Integration test against a real EIP-1967 proxy on Sepolia (after US-009 merged)
- [ ] PR body references US-022

#### Files

- `packages/evidence/src/chain/eip1967.ts`
- `packages/evidence/test/chain/eip1967.test.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/evidence test chain/eip1967
```

#### Notes

The slot constant is canonical and grep-able. Reviewer must verify the constant byte-for-byte.

### US-023 - Upgraded(address) event reader

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | B |
| Effort | S |
| Sponsor | - |
| Dependencies | none |
| Acceptance gates | - |
| Status | merged |

#### Scope

Implement `readUpgradeEvents(chainId, proxyAddress, fromBlock?)` in `packages/evidence/src/chain/upgradeEvents.ts` that fetches `Upgraded(address)` event logs for the proxy. Returns a typed array of events with `blockNumber`, `txHash`, `newImplementation`. Out of scope: previous-implementation derivation logic (lives in verdict engine, US-029).

#### Acceptance Criteria

- [ ] Function uses viem `getLogs` with the canonical `Upgraded(address)` event signature
- [ ] Returns events sorted ascending by block number
- [ ] When proxy has no events, returns empty array
- [ ] Handles RPC log-range limits by paginating
- [ ] Unit test with viem mock
- [ ] PR body references US-023

#### Files

- `packages/evidence/src/chain/upgradeEvents.ts`
- `packages/evidence/test/chain/upgradeEvents.test.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/evidence test chain/upgradeEvents
```

#### Notes

Used to derive the `previousImpl` when an ENS manifest is absent and we need to know what changed. Pagination matters because Sepolia RPC limits log windows.

### US-024 - Sourcify verification status fetch

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | B |
| Effort | M |
| Sponsor | Sourcify |
| Dependencies | none |
| Acceptance gates | GATE-5, GATE-16 |
| Status | merged |

#### Scope

Implement `fetchSourcifyStatus(chainId, address)` in `packages/evidence/src/sourcify/status.ts` calling `https://sourcify.dev/server/v2/contract/{chainId}/{address}?fields=match`. Returns a typed `SourcifyStatus` with match level (`exact_match | match | not_found`), or a typed `SourcifyError` (`server_error`, `malformed_response`, `rate_limited`). Out of scope: full metadata fetch (US-025), caching (US-032), retry/rate-limit handling (US-034).

#### Acceptance Criteria

- [ ] Function returns `Result<SourcifyStatus, SourcifyError>`
- [ ] HTTP 404 -> `match: "not_found"` (this is success, not error)
- [ ] HTTP 5xx -> `server_error` with status code
- [ ] HTTP 429 -> `rate_limited`
- [ ] Malformed JSON -> `malformed_response`
- [ ] No `any` types in exports
- [ ] Unit tests covering all branches with `mock: true` fixtures
- [ ] PR body references US-024

#### Files

- `packages/evidence/src/sourcify/status.ts`
- `packages/evidence/src/sourcify/types.ts`
- `packages/evidence/test/sourcify/status.test.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/evidence test sourcify/status
```

#### Notes

Uses Sourcify's v2 endpoint per the API decision in `prompts/write-backlog.md` Stream B coverage list. v1 endpoints are deprecated paths.

### US-025 - Sourcify metadata fetch

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | B |
| Effort | M |
| Sponsor | Sourcify |
| Dependencies | none |
| Acceptance gates | GATE-9, GATE-16 |
| Status | merged |

#### Scope

Implement `fetchSourcifyMetadata(chainId, address)` in `packages/evidence/src/sourcify/metadata.ts` calling `https://sourcify.dev/server/v2/contract/{chainId}/{address}?fields=all`. Returns a typed `SourcifyMetadata` with source files, ABI, compiler metadata, and storage layout where present, or a discriminated `SourcifyError`. Out of scope: ABI diff (US-026), storage diff (US-027), caching (US-032).

#### Acceptance Criteria

- [ ] Function returns `Result<SourcifyMetadata, SourcifyError>`
- [ ] Parses `abi`, `compilerSettings`, `storageLayout`, `sources`
- [ ] Missing `storageLayout` returns successful `SourcifyMetadata` with `storageLayout: null`, NOT an error (verdict engine handles missing layout per docs/04)
- [ ] HTTP 404, 5xx, 429, malformed handled per US-024 error vocabulary
- [ ] Integration test against a Sourcify-verified contract on Sepolia (after US-007 merged)
- [ ] PR body references US-025

#### Files

- `packages/evidence/src/sourcify/metadata.ts`
- `packages/evidence/test/sourcify/metadata.test.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/evidence test sourcify/metadata
```

#### Notes

Storage layout being `null` is a legitimate state, not an error: many older contracts don't publish storage layout in metadata. The verdict engine treats `null` storage layout as `REVIEW` per `docs/04-technical-design.md`.

### US-026 - ABI risky-selector diff

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | B |
| Effort | M |
| Sponsor | Sourcify |
| Dependencies | US-025 |
| Acceptance gates | GATE-11 |
| Status | merged |

#### Scope

Implement `diffAbiRiskySelectors(previousAbi, currentAbi)` in `packages/evidence/src/diff/abi.ts`. Returns the list of newly-added selectors that match the risky list (`sweep`, `withdraw`, `setOwner`, `setAdmin`, `transferOwnership`, `mint`, `pause`, `unpause`, `upgradeTo`, `upgradeToAndCall`, arbitrary `call`, arbitrary `delegatecall`). Result is deterministic: same inputs always produce same output. Out of scope: 4byte fallback for unverified contracts (US-035).

#### Acceptance Criteria

- [ ] Risky selector list is exported as a constant array `RISKY_SELECTOR_NAMES` and grep-able
- [ ] Function returns `{added: SelectorMatch[], removed: SelectorMatch[]}` with each selector's name and 4-byte signature
- [ ] When previous ABI lacks a selector and current ABI has it AND it matches a risky name, it is in `added`
- [ ] When current ABI lacks a selector previously present and it matches a risky safety function, it is in `removed`
- [ ] Unit tests covering: V1->V2Safe (no risky added), V1->V2Dangerous (sweep added)
- [ ] PR body references US-026

#### Files

- `packages/evidence/src/diff/abi.ts`
- `packages/evidence/src/diff/riskySelectors.ts`
- `packages/evidence/test/diff/abi.test.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/evidence test diff/abi
```

#### Notes

The list is a closed set per `docs/04-technical-design.md`. Adding a selector to the list is a P1 polish item, not a P0 fix.

### US-027 - Storage-layout compatibility diff

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | B |
| Effort | M |
| Sponsor | Sourcify |
| Dependencies | US-025 |
| Acceptance gates | GATE-12 |
| Status | merged |

#### Scope

Implement `diffStorageLayout(previousLayout, currentLayout)` in `packages/evidence/src/diff/storage.ts`. Returns one of: `compatible_appended_only`, `incompatible_changed_type`, `incompatible_reordered`, `incompatible_inserted_before_existing`, `unknown_missing_layout`. Out of scope: integration with full verdict engine (US-029).

#### Acceptance Criteria

- [ ] Function returns one of the five enum values + a list of changed slots with details
- [ ] When either layout is null, returns `unknown_missing_layout` (no fake confidence)
- [ ] Append-only changes return `compatible_appended_only`
- [ ] Type change on existing slot returns `incompatible_changed_type`
- [ ] Slot reorder returns `incompatible_reordered`
- [ ] Variable inserted before existing slots returns `incompatible_inserted_before_existing`
- [ ] Unit tests with V1 vs V2Safe layout (compatible) and V1 vs V2Dangerous layout (incompatible)
- [ ] PR body references US-027

#### Files

- `packages/evidence/src/diff/storage.ts`
- `packages/evidence/test/diff/storage.test.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/evidence test diff/storage
```

#### Notes

Diff result feeds the verdict engine (US-029). `unknown_missing_layout` is the honest state: rather than guess, surface to the user that storage compatibility cannot be verified.

### US-028 - EIP-712 Siren Report signature verification against upgrade-siren:owner

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | B |
| Effort | M |
| Sponsor | Sourcify, ENS |
| Dependencies | US-014, US-015, US-017 |
| Acceptance gates | GATE-24 |
| Status | merged |

#### Scope

Implement `verifyReportSignature(report, owner)` in `packages/evidence/src/verify/signature.ts`. Reconstructs the EIP-712 typed-data using the same builder as US-015, recovers the signer from `report.auth.signature`, and asserts the recovered address equals `owner` (the `upgrade-siren:owner` address). Returns `{valid: true} | {valid: false, reason: ...}`. Out of scope: hash-chain validation (US-030).

#### Acceptance Criteria

- [ ] Function returns `{valid: true}` only when signature recovers to the owner address
- [ ] Returns `{valid: false, reason: "missing_signature"}` when `report.auth.signature` is empty
- [ ] Returns `{valid: false, reason: "owner_mismatch", recovered: <address>}` when recovered does not equal owner
- [ ] Returns `{valid: false, reason: "malformed_signature"}` for syntactically invalid signatures
- [ ] Round-trip test: sign with US-015 helper, verify with this function, expect `valid: true`
- [ ] Negative tests for each failure branch
- [ ] PR body references US-028 and US-014, US-015, US-017 as merged prerequisites

#### Files

- `packages/evidence/src/verify/signature.ts`
- `packages/evidence/test/verify/signature.test.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/evidence test verify/signature
```

#### Notes

This is the GATE-24 enforcement point. Verdict engine (US-029) uses this; if the result is `valid: false`, the verdict is `SIREN` (unless `mock: true`).

### US-029 - Verdict engine: SAFE / REVIEW / SIREN rules

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | B |
| Effort | L |
| Sponsor | Sourcify, ENS, Future Society |
| Dependencies | US-018, US-019, US-020, US-022, US-026, US-027, US-028 |
| Acceptance gates | GATE-2, GATE-13 |
| Status | merged |

#### Scope

Implement `computeVerdict(input)` in `packages/evidence/src/verdict/engine.ts`. Aggregates manifest parse result, EIP-1967 slot read, Sourcify status, ABI diff, storage diff, signature verification result, and absent-record reasons into one of three verdicts (`SAFE`, `REVIEW`, `SIREN`) plus a structured findings list. Implements the verdict table from `docs/02-product-architecture.md`. Out of scope: caching (US-032), grace policy (US-036).

#### Acceptance Criteria

- [ ] `computeVerdict` returns `{verdict, findings, summary, mode, confidence}`
- [ ] Verdict mapping matches `docs/02-product-architecture.md` Verdict Logic table exactly
- [ ] `mode` is `signed-manifest`, `public-read`, or `mock` per Confidence Modes table
- [ ] In `public-read` mode, verdict is never `SAFE` (always `REVIEW` or `SIREN`)
- [ ] In `signed-manifest` mode, an unsigned report or signature mismatch returns `SIREN`
- [ ] Each finding has `id`, `severity`, `title`, `evidence` keys
- [ ] Engine is pure: same inputs always yield same outputs (deterministic)
- [ ] Comprehensive unit tests for each verdict-table row
- [ ] Integration test running the engine end-to-end against the V1->V2Safe and V1->V2Dangerous fixtures (after Stream A items merged)
- [ ] PR body references US-029

#### Files

- `packages/evidence/src/verdict/engine.ts`
- `packages/evidence/src/verdict/findings.ts`
- `packages/evidence/test/verdict/engine.test.ts`
- `packages/evidence/test/verdict/integration.test.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/evidence test verdict/engine
pnpm --filter @upgrade-siren/evidence test verdict/integration
```

#### Notes

The engine is the heart of the product. Reviewer must verify the code matches the verdict table in `docs/02-product-architecture.md` row-for-row. Determinism is non-negotiable: any LLM-generated text is purely cosmetic on top of these structured findings.

### US-030 - Manifest hash-chain validation using previousManifestHash

| Field | Value |
|---|---|
| Type | task |
| Priority | P1 |
| Owner | B |
| Effort | S |
| Sponsor | ENS |
| Dependencies | US-018 |
| Acceptance gates | - |
| Status | merged |

#### Scope

Implement `validateManifestChain(currentManifest, previousManifest)` that asserts `currentManifest.previousManifestHash === keccak256(canonical(previousManifest))`. Returns `{valid: true}` or `{valid: false, reason}`. Used to construct an audit trail of upgrade history. Out of scope: full historical fetcher; this validates only one link.

#### Acceptance Criteria

- [ ] Function computes canonical JSON serialization (sorted keys, no whitespace) before hashing
- [ ] Returns `valid: true` only when hash matches exactly
- [ ] Unit test with two fixture manifests forming a valid chain link
- [ ] Unit test with a tampered current manifest (different `previousManifestHash`) returning `valid: false`
- [ ] PR body references US-030

#### Files

- `packages/evidence/src/manifest/chain.ts`
- `packages/evidence/test/manifest/chain.test.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/evidence test manifest/chain
```

#### Notes

P1 because the demo verdict path works without chain validation. Strengthens the ENS pitch by showing audit-trail integrity.

### US-031 - ENSIP-26 agent-context and agent-endpoint[web] record reading

| Field | Value |
|---|---|
| Type | task |
| Priority | P1 |
| Owner | B |
| Effort | S |
| Sponsor | ENS |
| Dependencies | US-017 |
| Acceptance gates | - |
| Status | merged |

#### Scope

Extend `resolveEnsRecords` (US-017) to also read ENSIP-26 standard records: `agent-context`, `agent-endpoint[web]`, `agent-endpoint[mcp]`. Returns each as a separate field in `EnsResolutionResult`. Out of scope: behavioral integration (the records are surfaced to the UI but do not change the verdict).

#### Acceptance Criteria

- [ ] `EnsResolutionResult` gains `agentContext`, `agentEndpointWeb`, `agentEndpointMcp` fields
- [ ] Each is `string | null`; absent record is `null`, not error
- [ ] Unit test against a fixture with all three present and all three absent
- [ ] Integration test against the demo subnames (after US-012 merged)
- [ ] PR body references US-031

#### Files

- Extension of `packages/evidence/src/ens/resolve.ts`
- `packages/evidence/test/ens/ensip26.test.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/evidence test ens/ensip26
```

#### Notes

ENSIP-26 records are sponsor-positioning material more than verdict signals. The UI surfaces them in the ENS records panel (US-048).

### US-032 - Sourcify response cache layer with TTL

| Field | Value |
|---|---|
| Type | task |
| Priority | P1 |
| Owner | B |
| Effort | M |
| Sponsor | Sourcify |
| Dependencies | US-024, US-025 |
| Acceptance gates | - |
| Status | merged |

#### Scope

Implement an in-memory + optional Upstash Redis cache for Sourcify status and metadata responses. TTL configurable per response type (default 1 hour for verified contracts, 30 seconds for `not_found`). Cache key includes `chainId` + `address` + endpoint type. Out of scope: ENS cache (US-033), retry/failover (US-034).

#### Acceptance Criteria

- [ ] Cache layer wraps `fetchSourcifyStatus` and `fetchSourcifyMetadata`
- [ ] In-memory implementation always available; Upstash backend behind env-var feature flag
- [ ] TTL configurable via constructor parameter
- [ ] Cache hits do not call the network; cache miss + fetch + store works
- [ ] Cache layer is testable in isolation with a mocked clock
- [ ] PR body references US-032

#### Files

- `packages/evidence/src/sourcify/cache.ts`
- `packages/evidence/test/sourcify/cache.test.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/evidence test sourcify/cache
```

#### Notes

Important for the booth-day demo: Sourcify rate-limits or short outages can be papered over with a 1-hour TTL on the demo fixtures. Marked P1 because the cold path works without cache; cache is an availability layer.

### US-033 - ENS resolution cache layer

| Field | Value |
|---|---|
| Type | task |
| Priority | P1 |
| Owner | B |
| Effort | S |
| Sponsor | ENS |
| Dependencies | US-017 |
| Acceptance gates | - |
| Status | merged |

#### Scope

Implement caching for ENS record resolution in `packages/evidence/src/ens/cache.ts`. Default TTL 60 seconds (records change infrequently but not never). Same cache-key + backend pattern as US-032.

#### Acceptance Criteria

- [ ] Cache wraps `resolveEnsRecords`
- [ ] TTL default 60 seconds
- [ ] Cache invalidation key includes the ENS name
- [ ] Tests parallel to US-032
- [ ] PR body references US-033

#### Files

- `packages/evidence/src/ens/cache.ts`
- `packages/evidence/test/ens/cache.test.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/evidence test ens/cache
```

#### Notes

ENS RPC calls are rate-limited by Alchemy; caching matters for repeat lookups during a demo run.

### US-034 - RPC retry/failover and Sourcify rate-limit handling

| Field | Value |
|---|---|
| Type | task |
| Priority | P1 |
| Owner | B |
| Effort | M |
| Sponsor | Sourcify, ENS |
| Dependencies | US-022, US-024 |
| Acceptance gates | - |
| Status | merged |

#### Scope

Add a retry wrapper for RPC calls (EIP-1967 reads, ENS resolution) and Sourcify fetches. On rate-limit (HTTP 429) or 5xx, retry with exponential backoff up to N times. On exhaustion, fall back to a configured public RPC if Alchemy is the primary. Out of scope: caching (US-032, US-033).

#### Acceptance Criteria

- [ ] Retry wrapper applies to all RPC and Sourcify calls
- [ ] Exponential backoff: 100ms, 200ms, 400ms, 800ms (max 4 retries)
- [ ] On exhaustion, surfaces a typed `network_unavailable` error
- [ ] Fallback RPC config via `ALCHEMY_RPC_*` and `PUBLIC_RPC_*` env vars
- [ ] Unit tests with viem retry mocks
- [ ] PR body references US-034

#### Files

- `packages/evidence/src/network/retry.ts`
- `packages/evidence/test/network/retry.test.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/evidence test network/retry
```

#### Notes

Booth-day risk mitigation. Without retries, a single Alchemy hiccup can render the demo SIREN-on-network-error.

### US-035 - 4byte signature lookup for unverified contracts

| Field | Value |
|---|---|
| Type | task |
| Priority | P1 |
| Owner | B |
| Effort | S |
| Sponsor | Sourcify |
| Dependencies | US-026 |
| Acceptance gates | - |
| Status | merged |

#### Scope

When the current implementation is unverified on Sourcify, fetch its bytecode, extract function selectors, and look up names via the 4byte signature directory (Sourcify's similarity API or 4byte.directory fallback). Surface guessed names as a finding labeled `low-confidence`. Out of scope: full bytecode-level analysis.

#### Acceptance Criteria

- [ ] Function `lookup4byteSelectors(selectors: Hex[])` returns `Map<Hex, string[]>` (selector -> candidate names)
- [ ] Names that match the risky-selector list (US-026) are flagged as `risky_low_confidence`
- [ ] Confidence label is propagated to the verdict findings
- [ ] PR body references US-035

#### Files

- `packages/evidence/src/sourcify/fourbyte.ts`
- `packages/evidence/test/sourcify/fourbyte.test.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/evidence test sourcify/fourbyte
```

#### Notes

P1 because the unverified demo scenario already returns `SIREN` from the verification check alone; 4byte lookup adds nuance but does not gate the verdict.

### US-036 - Upgrade-window grace policy (P1)

| Field | Value |
|---|---|
| Type | task |
| Priority | P1 |
| Owner | B |
| Effort | M |
| Sponsor | - |
| Dependencies | US-018, US-029 |
| Acceptance gates | - |
| Status | merged |

#### Scope

Implement an optional grace window for the manifest-vs-slot mismatch verdict path. If the slot disagrees with the manifest's `currentImpl` AND the manifest's `effectiveFrom` is within the past 5 minutes, return `REVIEW` with reason `manifest_update_in_flight` instead of `SIREN`. P0 default remains conservative `SIREN`. Configurable via env var `MANIFEST_GRACE_SECONDS`.

#### Acceptance Criteria

- [ ] Grace window configurable, default disabled (0 seconds = P0 conservative behavior)
- [ ] When enabled and within window, returns `REVIEW` with the documented reason
- [ ] When enabled and outside window, returns `SIREN` per existing US-020 path
- [ ] Unit tests with mocked clock at boundary times
- [ ] PR body references US-036
- [ ] PR body explicitly notes that this is P1 and disabled by default; mentor feedback decides whether to enable

#### Files

- `packages/evidence/src/verdict/gracePolicy.ts`
- `packages/evidence/test/verdict/gracePolicy.test.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/evidence test verdict/gracePolicy
```

#### Notes

Mentor question 60 in `docs/07-sponsor-fit.md` flags this as a sensitive verdict path; default-off lets us ship conservative and turn on if ENS mentor recommends.

### US-037 - Next.js 16 app scaffold with Tailwind 4

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | C |
| Effort | M |
| Sponsor | - |
| Dependencies | none |
| Acceptance gates | GATE-1 |
| Status | merged |

#### Scope

Bootstrap `apps/web/` as a Next.js 16 App Router app with Tailwind 4. Configure pnpm workspace inclusion, dark-mode-primary theme tokens (per `prompts/design-brief.md`), and a `/health` route that returns env config status. Out of scope: ENS lookup form (US-038), verdict card (US-042), demo runner (US-050).

#### Acceptance Criteria

- [ ] `apps/web/package.json` declares `name=@upgrade-siren/web`, depends on `@upgrade-siren/shared` and `@upgrade-siren/evidence` (workspace links)
- [ ] Next.js 16 App Router structure: `app/layout.tsx`, `app/page.tsx`, `app/health/route.ts`
- [ ] Tailwind 4 configured with token references for verdict colors (`safe`, `review`, `siren`)
- [ ] Dark mode is the default theme; light mode is opt-in via system or toggle
- [ ] `/health` returns `200 OK` with `{ ens_rpc, sourcify, ai_gateway: "configured" | "missing" }`
- [ ] `pnpm --filter @upgrade-siren/web build` produces a production build
- [ ] `pnpm --filter @upgrade-siren/web dev` runs locally on port 3000
- [ ] PR body references US-037

#### Files

- `apps/web/package.json`
- `apps/web/next.config.ts`
- `apps/web/tailwind.config.ts`
- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/health/route.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/web build
pnpm --filter @upgrade-siren/web dev &
curl -s http://localhost:3000/health | jq
```

#### Notes

Scaffold only. The home page is intentionally a placeholder until US-038 lands. Tailwind tokens for verdict colors must match the design brief and the GATE-22 plain-language requirement (color paired with glyph, not color alone).

### US-038 - ENS lookup form component

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | C |
| Effort | S |
| Sponsor | ENS |
| Dependencies | none |
| Acceptance gates | GATE-1 |
| Status | merged |

#### Scope

Build `<EnsLookupForm />` in `apps/web/components/EnsLookupForm.tsx`: input field for an ENS name, submit button, validation that name has at least one dot. On submit, navigate to `/r/<name>`. Out of scope: address input variant (US-039), verdict rendering (US-042).

#### Acceptance Criteria

- [ ] Component renders an input + submit button
- [ ] Validates input has at least one dot before submitting
- [ ] On valid submit, navigates to `/r/<encodeURIComponent(name)>`
- [ ] On invalid submit, shows inline error message
- [ ] Storybook story or test file demonstrating both states
- [ ] Component test asserts navigation behavior on submit
- [ ] No `any` types in props
- [ ] PR body references US-038

#### Files

- `apps/web/components/EnsLookupForm.tsx`
- `apps/web/components/EnsLookupForm.test.tsx`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/web test EnsLookupForm
```

#### Notes

Effort `S` per scheduling guidance: this is one of the four fast-merging Stream C items meant to relieve reviewer queue pressure.

### US-039 - Public-read address / ENS-address-record input component

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | C |
| Effort | S |
| Sponsor | ENS, Sourcify |
| Dependencies | none |
| Acceptance gates | GATE-25 |
| Status | merged |

#### Scope

Build `<PublicReadInput />` in `apps/web/components/PublicReadInput.tsx`: accepts either a 0x-prefixed address or an ENS name. On submit, navigates to `/r/<input>?mode=public-read`. Out of scope: actual public-read fetching (Stream B US-019); this component is just the input.

#### Acceptance Criteria

- [ ] Detects whether input is a hex address (0x + 40 hex chars) or an ENS name
- [ ] On hex address, navigates to `/r/<address>?mode=public-read`
- [ ] On ENS name, navigates to `/r/<name>?mode=public-read` (the page resolves address client-side)
- [ ] Validation rejects strings that are neither
- [ ] Component test covering both branches and invalid input
- [ ] PR body references US-039

#### Files

- `apps/web/components/PublicReadInput.tsx`
- `apps/web/components/PublicReadInput.test.tsx`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/web test PublicReadInput
```

#### Notes

This is the entry point for the read-only fallback flow that makes the product useful for protocols without `upgrade-siren:*` records. Effort `S` per scheduling guidance.

### US-040 - Mock-path visible badge component

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | C |
| Effort | S |
| Sponsor | - |
| Dependencies | none |
| Acceptance gates | GATE-14 |
| Status | merged |

#### Scope

Build `<MockBadge />` in `apps/web/components/MockBadge.tsx` rendering a visible "MOCK" label whenever the underlying data path is a mock. Includes color (amber stripe), text label, and accessible aria-label. Out of scope: integration into specific renderers (those happen item-by-item in Stream C as data flows in).

#### Acceptance Criteria

- [ ] `<MockBadge />` accepts `{visible: boolean, label?: string}` typed props
- [ ] Renders nothing when `visible=false`
- [ ] When `visible=true`, renders an amber-bordered chip with "MOCK" or custom label
- [ ] `aria-label` reads "Mock data path"
- [ ] Storybook covers both states
- [ ] Component test asserts conditional rendering
- [ ] PR body references US-040

#### Files

- `apps/web/components/MockBadge.tsx`
- `apps/web/components/MockBadge.test.tsx`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/web test MockBadge
```

#### Notes

GATE-14 enforcement: every mock path renders this badge. Reviewer must verify it is wired wherever a mock value is used.

### US-041 - Signature status badge component

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | C |
| Effort | S |
| Sponsor | ENS |
| Dependencies | US-014 |
| Acceptance gates | GATE-24 |
| Status | merged |

#### Scope

Build `<SignatureStatusBadge />` in `apps/web/components/SignatureStatusBadge.tsx`: takes a `SirenReport.auth` value and renders one of three states: `signed` (green check, "Signed by 0x..."), `unsigned` (amber, "No operator signature"), `signature-invalid` (red, "Signature mismatch"). Out of scope: full verdict card (US-042).

#### Acceptance Criteria

- [ ] Component accepts `{auth: SirenReport["auth"]}` typed prop
- [ ] Renders three distinct states based on `auth.status`
- [ ] Color paired with glyph (check / warning / cross), not color alone
- [ ] Truncated signer address shown with copy-to-clipboard affordance for `signed` state
- [ ] Storybook covers all three states
- [ ] Component test asserts correct state mapping
- [ ] PR body references US-041 and US-014 as merged prerequisite

#### Files

- `apps/web/components/SignatureStatusBadge.tsx`
- `apps/web/components/SignatureStatusBadge.test.tsx`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/web test SignatureStatusBadge
```

#### Notes

Critical for GATE-24: signature failures must be visible, not hidden in the evidence drawer. The verdict card (US-042) embeds this badge near the verdict label.

### US-042 - Verdict card component (SAFE / REVIEW / SIREN)

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | C |
| Effort | M |
| Sponsor | Future Society |
| Dependencies | US-037, US-041 |
| Acceptance gates | GATE-1, GATE-2, GATE-22 |
| Status | merged |

#### Scope

Build `<VerdictCard />` in `apps/web/components/VerdictCard.tsx`. Renders the verdict (SAFE / REVIEW / SIREN) as the largest visual element above the fold. Color paired with glyph (color-blind safe). Includes protocol name, truncated proxy address, one-sentence summary, embedded signature status badge (US-041), confidence mode badge, and `mock` badge when applicable. Out of scope: evidence drawer (US-045), governance comment (US-049).

#### Acceptance Criteria

- [ ] `VerdictCard` accepts `{verdict, name, proxy, summary, auth, mode, mock?}` typed props
- [ ] SAFE renders green bg + check glyph + "SAFE" label
- [ ] REVIEW renders amber bg + warning glyph + "REVIEW" label
- [ ] SIREN renders red bg + alarm glyph + "SIREN" label
- [ ] Verdict label is the largest text on the card
- [ ] Embeds `<SignatureStatusBadge />` and a confidence mode chip
- [ ] When `mock: true`, renders `<MockBadge visible />` in card corner
- [ ] No `text-green` / `text-red` classes outside this component (audit grep should only find them here and in MockBadge)
- [ ] Storybook covers all three verdicts + mock variant
- [ ] Component test asserts correct labels and styles per verdict
- [ ] PR body references US-042

#### Files

- `apps/web/components/VerdictCard.tsx`
- `apps/web/components/VerdictCard.stories.tsx`
- `apps/web/components/VerdictCard.test.tsx`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/web test VerdictCard
pnpm --filter @upgrade-siren/web grep "text-green\|text-red" apps/web/components | grep -v VerdictCard\|MockBadge && exit 1 || echo "OK"
```

#### Notes

The five-second moment depends on this card. Color-blind safe is non-negotiable per `docs/06-acceptance-gates.md` (GATE-22) and the design brief. WCAG AA contrast for verdict text on verdict background is the floor.

### US-043 - Progressive loading checklist

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | C |
| Effort | M |
| Sponsor | Future Society |
| Dependencies | US-037 |
| Acceptance gates | GATE-20, GATE-26 |
| Status | merged |

#### Scope

Build `<LoadingChecklist />` in `apps/web/components/LoadingChecklist.tsx`. Vertical list of evidence-fetch milestones (`ENS`, `chain`, `Sourcify`, `diff`, `signature`) that fill in real-time as upstream data arrives. Each row shows pending / success / failure state. Out of scope: actual data orchestration logic (lives in `app/r/[name]/page.tsx`).

#### Acceptance Criteria

- [ ] Component accepts `{steps: Array<{key, label, status}>}` typed props
- [ ] Status enum: `pending | running | success | failure`
- [ ] Renders glyph + label + optional duration ms once complete
- [ ] Updates render in under 50ms when status changes (visible to user as flowing)
- [ ] Failure state shows specific error message
- [ ] Storybook covers each combination
- [ ] PR body references US-043

#### Files

- `apps/web/components/LoadingChecklist.tsx`
- `apps/web/components/LoadingChecklist.stories.tsx`
- `apps/web/components/LoadingChecklist.test.tsx`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/web test LoadingChecklist
```

#### Notes

Five-second-rule mitigation per `docs/05-demo-script.md` and the audit recommendations. Without progressive loading, a cold uncached lookup feels like a 6-second blank page.

### US-044 - Before/after implementation comparison view

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | C |
| Effort | M |
| Sponsor | Sourcify |
| Dependencies | US-014, US-037 |
| Acceptance gates | GATE-21 |
| Status | merged |

#### Scope

Build `<ImplementationComparison />` rendering the previous and current implementations side by side: address (truncated + copy), Sourcify verification status, deployment block, last-changed timestamp from upgrade events. Out of scope: ABI/storage diff renderers (US-046, US-047).

#### Acceptance Criteria

- [ ] Component accepts `{previous, current}` typed props matching `SirenReport.previousImplementation` and `SirenReport.currentImplementation` shape
- [ ] Two columns on desktop, stacked on mobile (≤ 768px)
- [ ] Each side shows address (truncated to 6+4 chars), copy button, Sourcify link if verified, "unverified" label otherwise
- [ ] Storybook covers both verified, only previous verified, only current verified, neither verified
- [ ] PR body references US-044

#### Files

- `apps/web/components/ImplementationComparison.tsx`
- `apps/web/components/ImplementationComparison.stories.tsx`
- `apps/web/components/ImplementationComparison.test.tsx`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/web test ImplementationComparison
```

#### Notes

Stack on mobile is the responsive contract. The judge demo viewport is desktop, but DAO voters reading on phone need the comparison to work.

### US-045 - Evidence drawer with Sourcify links

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | C |
| Effort | M |
| Sponsor | Sourcify |
| Dependencies | US-014, US-025, US-037 |
| Acceptance gates | GATE-9, GATE-21 |
| Status | merged |

#### Scope

Build `<EvidenceDrawer />` as a right-side collapsible panel containing: Sourcify links for previous and current implementations, ABI summary (count of selectors + risky selectors flagged), storage layout summary (compatible / incompatible / unknown), report download link. Out of scope: full ABI diff renderer (US-046), storage diff renderer (US-047).

#### Acceptance Criteria

- [ ] Drawer opens/closes via button on the verdict card
- [ ] Renders Sourcify links for both implementations (or "unverified" placeholder)
- [ ] Shows summary counts (e.g., "12 selectors, 1 risky added")
- [ ] Shows storage layout result tag
- [ ] Includes a "download report JSON" button serving the canonical signed report
- [ ] Keyboard-accessible (Esc closes)
- [ ] Storybook covers expanded and collapsed states
- [ ] PR body references US-045

#### Files

- `apps/web/components/EvidenceDrawer.tsx`
- `apps/web/components/EvidenceDrawer.stories.tsx`
- `apps/web/components/EvidenceDrawer.test.tsx`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/web test EvidenceDrawer
```

#### Notes

Drawer is for the technical judge moment. The non-technical user sees the verdict card and never opens the drawer.

### US-046 - ABI diff renderer

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | C |
| Effort | M |
| Sponsor | Sourcify |
| Dependencies | US-026, US-037 |
| Acceptance gates | GATE-11 |
| Status | merged |

#### Scope

Build `<AbiDiffRenderer />` consuming the diff result from `diffAbiRiskySelectors` (US-026). Renders added/removed selectors grouped, with risky selectors highlighted in red. Out of scope: full ABI explorer (post-hack feature).

#### Acceptance Criteria

- [ ] Component accepts `{diff: AbiDiffResult}` typed prop
- [ ] Lists added selectors with name, signature hex, severity
- [ ] Lists removed selectors with same fields
- [ ] Risky selectors highlighted with red dot + label
- [ ] When diff is empty, renders "no ABI changes detected"
- [ ] Storybook covers V1->V2Safe (no risky), V1->V2Dangerous (sweep added)
- [ ] PR body references US-046

#### Files

- `apps/web/components/AbiDiffRenderer.tsx`
- `apps/web/components/AbiDiffRenderer.stories.tsx`
- `apps/web/components/AbiDiffRenderer.test.tsx`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/web test AbiDiffRenderer
```

#### Notes

Dangerous selector highlighting maps to GATE-11 (deterministic ABI risk diff visible to user).

### US-047 - Storage diff renderer

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | C |
| Effort | M |
| Sponsor | Sourcify |
| Dependencies | US-027, US-037 |
| Acceptance gates | GATE-12 |
| Status | merged |

#### Scope

Build `<StorageDiffRenderer />` consuming the diff result from `diffStorageLayout` (US-027). Renders the result tag (`compatible_appended_only` etc.) plus a slot-by-slot table when changes exist. Out of scope: visual storage-layout explorer for full layouts.

#### Acceptance Criteria

- [ ] Component accepts `{diff: StorageDiffResult}` typed prop
- [ ] Renders result tag prominently with color (green/amber/red)
- [ ] Slot table shows: index, previous type/name, current type/name, change kind
- [ ] When `unknown_missing_layout`, renders honest "storage layout not published" message
- [ ] Storybook covers each result type
- [ ] PR body references US-047

#### Files

- `apps/web/components/StorageDiffRenderer.tsx`
- `apps/web/components/StorageDiffRenderer.stories.tsx`
- `apps/web/components/StorageDiffRenderer.test.tsx`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/web test StorageDiffRenderer
```

#### Notes

`unknown_missing_layout` rendering is the GATE-13 honesty test: the UI must not pretend to know storage compatibility when it does not.

### US-048 - ENS records resolved live panel

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | C |
| Effort | M |
| Sponsor | ENS |
| Dependencies | US-017, US-037 |
| Acceptance gates | GATE-3, GATE-17 |
| Status | merged |

#### Scope

Build `<EnsRecordsPanel />` rendering each `upgrade-siren:*` record live-resolved value (chain_id, proxy, owner, schema, upgrade_manifest). Includes ENSIP-26 records (`agent-context`, `agent-endpoint[web]`) when present. Manifest is rendered as collapsible JSON. Out of scope: editing records (out of scope for the entire product).

#### Acceptance Criteria

- [ ] Component accepts `{ens: EnsResolutionResult}` typed prop
- [ ] Each stable record shows label + value (or "absent" tag)
- [ ] Manifest renders as collapsible JSON, valid syntax-highlighted
- [ ] ENSIP-26 records shown as separate sub-section when present
- [ ] "absent" records visually distinct from present (for the public-read fallback case)
- [ ] Storybook covers signed-manifest and public-read modes
- [ ] PR body references US-048

#### Files

- `apps/web/components/EnsRecordsPanel.tsx`
- `apps/web/components/EnsRecordsPanel.stories.tsx`
- `apps/web/components/EnsRecordsPanel.test.tsx`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/web test EnsRecordsPanel
```

#### Notes

Live records being shown explicitly is the GATE-3 demonstration: the judge sees records resolving in real time, not hardcoded.

### US-049 - Governance comment generator (short / forum / vote-reason)

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | C |
| Effort | M |
| Sponsor | Future Society |
| Dependencies | US-014, US-037 |
| Acceptance gates | GATE-7, GATE-22, GATE-23 |
| Status | merged |

#### Scope

Build `<GovernanceComment />` with three switchable formats: `short` (tweet-length, ~240 chars including signed report link), `forum` (multi-line Discourse/Snapshot post with evidence bullets), `vote-reason` (1-2 sentences for on-chain vote rationale). Each format includes a copy button that copies plain text plus an inline signed-report citation link. Out of scope: AI-generated text (deterministic templates only; LLM polish optional P1).

#### Acceptance Criteria

- [ ] Component accepts `{report: SirenReport, name: string}` typed props
- [ ] Three radio/tab buttons switch format
- [ ] Each format produced by a deterministic template function over the report's findings + verdict
- [ ] Short format ≤ 240 chars including the report URL
- [ ] Forum format includes bullet list of top 3 findings
- [ ] Vote-reason format ≤ 200 chars
- [ ] Copy button copies the rendered text + report URL
- [ ] Component test asserts output matches expected templates for sample report fixtures
- [ ] PR body references US-049

#### Files

- `apps/web/components/GovernanceComment.tsx`
- `apps/web/components/GovernanceComment.test.tsx`
- `apps/web/lib/governanceTemplates.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/web test GovernanceComment
```

#### Notes

Three formats per audit recommendation. Deterministic templates beat LLM at hackathon time: predictable demo + reviewable. AI polish is P1 if time allows.

### US-050 - Demo mode runner with four scenarios

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | C |
| Effort | M |
| Sponsor | Sourcify, ENS, Future Society |
| Dependencies | US-009, US-010, US-011, US-029, US-037, US-042 |
| Acceptance gates | GATE-6 |
| Status | merged |

#### Scope

Build `/demo` route in `apps/web/app/demo/page.tsx` with a scenario picker (radio: safe / dangerous / unverified / live public-read). Selecting a scenario navigates to the verdict result page using the corresponding pre-provisioned ENS subname or live-target address. Live public-read scenario uses the address selected by US-062. Out of scope: target selection (US-062, Tracker).

#### Acceptance Criteria

- [ ] `/demo` page exists with four scenario buttons
- [ ] Safe button navigates to `/r/safe.demo.upgradesiren.eth`
- [ ] Dangerous button navigates to `/r/dangerous.demo.upgradesiren.eth`
- [ ] Unverified button navigates to `/r/unverified.demo.upgradesiren.eth`
- [ ] Live public-read button navigates to `/r/<chosen-target>?mode=public-read` (target read from config; placeholder until US-062 selects)
- [ ] Each navigation produces the expected verdict (SAFE / SIREN / SIREN / REVIEW respectively, asserted by integration test)
- [ ] PR body references US-050

#### Files

- `apps/web/app/demo/page.tsx`
- `apps/web/app/demo/demo.config.ts`
- `apps/web/app/demo/demo.test.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/web test app/demo
pnpm --filter @upgrade-siren/web e2e demo
```

#### Notes

Four-scenario picker is the booth demo orchestration. The live public-read scenario address may land late if US-062 research takes longer; demo runner handles missing config by greying out that scenario rather than 404-ing.

### US-051 - Empty/error states

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | C |
| Effort | M |
| Sponsor | - |
| Dependencies | US-019, US-020, US-037 |
| Acceptance gates | GATE-13, GATE-26 |
| Status | merged |

#### Scope

Build typed error-state components for: ENS name has no `upgrade-siren:*` records (empty state -> public-read CTA), RPC down (error state with retry button), Sourcify down (error state with cached-data note), malformed manifest (error state with raw record dump for debugging), unsigned production report (red verdict with explicit "no operator signature" reason). Out of scope: full network retry orchestration (US-034 in Stream B).

#### Acceptance Criteria

- [ ] `<EmptyStateNoRecords />` renders when ENS resolves but `upgrade-siren:*` records absent; offers "switch to public-read mode" CTA
- [ ] `<ErrorStateRpc />` renders with retry button and link to `/health`
- [ ] `<ErrorStateSourcify />` renders with cached-data note when applicable
- [ ] `<ErrorStateMalformedManifest />` renders raw record content for inspection
- [ ] `<ErrorStateUnsignedReport />` renders with verdict locked to SIREN and explicit reason
- [ ] Storybook covers each state
- [ ] Each state has a component test
- [ ] PR body references US-051

#### Files

- `apps/web/components/EmptyStateNoRecords.tsx`
- `apps/web/components/ErrorStateRpc.tsx`
- `apps/web/components/ErrorStateSourcify.tsx`
- `apps/web/components/ErrorStateMalformedManifest.tsx`
- `apps/web/components/ErrorStateUnsignedReport.tsx`
- `apps/web/components/error-states.test.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/web test error-states
```

#### Notes

GATE-26 requires explicit empty/error states per audit recommendation. Without these, a silent failure looks like a verdict bug.

### US-052 - Five-second-rule performance check

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | C |
| Effort | S |
| Sponsor | Future Society |
| Dependencies | US-042, US-043 |
| Acceptance gates | GATE-20 |
| Status | merged |

#### Scope

Add a Playwright test in `apps/web/e2e/five-second-rule.spec.ts` that navigates to each demo scenario page and asserts the verdict text is visible within 5000ms of navigation start. Also adds a Lighthouse check in CI requiring performance ≥ 90 on the demo page. Out of scope: actually optimizing performance (this item is the regression test; optimizations live in caching items US-032, US-033).

#### Acceptance Criteria

- [ ] Playwright spec asserts verdict text visible within 5000ms for safe, dangerous, unverified scenarios
- [ ] Test passes in CI against the local dev server
- [ ] Lighthouse CI config in `.lighthouserc.json` requires performance ≥ 90 for `/r/safe.demo.upgradesiren.eth`
- [ ] PR body references US-052

#### Files

- `apps/web/e2e/five-second-rule.spec.ts`
- `apps/web/.lighthouserc.json`
- `apps/web/package.json` (add `e2e` and `lighthouse:demo` scripts)

#### Verification commands

```bash
pnpm --filter @upgrade-siren/web e2e five-second-rule
pnpm --filter @upgrade-siren/web lighthouse:demo
```

#### Notes

If the test fails, the fix lies in caching (US-032, US-033) or the progressive loading (US-043), not in this item. Reviewer must not approve a PR that "fixes" performance by lowering the budget.

### US-053 - Share-verdict link with precomputed result

| Field | Value |
|---|---|
| Type | task |
| Priority | P1 |
| Owner | C |
| Effort | M |
| Sponsor | Future Society |
| Dependencies | US-042 |
| Acceptance gates | - |
| Status | open |

#### Scope

Build `<ShareVerdictLink />` that produces a stable URL of the form `/r/<name>?v=<verdict>&t=<timestamp>` so a DAO voter can paste a snapshot of "what Siren said when I voted". The page reads the precomputed verdict from URL params and renders it without re-fetching, then offers a "verify live now" button. Out of scope: cryptographic proof of the precomputed verdict (P3, ZK-proof territory).

#### Acceptance Criteria

- [ ] Verdict result page accepts `?v=` and `?t=` URL params
- [ ] When present, renders the precomputed verdict alongside a "verify live now" affordance
- [ ] When user clicks "verify live now", page re-fetches and renders the live verdict (which may differ)
- [ ] Share button copies the share URL to clipboard
- [ ] Component test covers both initial-render-from-url and live-refresh paths
- [ ] PR body references US-053

#### Files

- `apps/web/components/ShareVerdictLink.tsx`
- `apps/web/app/r/[name]/page.tsx` (modification)

#### Verification commands

```bash
pnpm --filter @upgrade-siren/web test ShareVerdictLink
```

#### Notes

P1 because the demo path doesn't need shareable links; this is for real-world DAO governance use after hackathon.

### US-054 - Mobile responsive layout check (viewport ≤ 768px)

| Field | Value |
|---|---|
| Type | task |
| Priority | P1 |
| Owner | C |
| Effort | S |
| Sponsor | Future Society |
| Dependencies | US-042, US-045 |
| Acceptance gates | - |
| Status | open |

#### Scope

Add a Playwright test that verifies the verdict result page renders correctly on a 390x844 viewport (iPhone-sized). Verdict card stacks vertically, evidence drawer becomes a full-screen modal instead of side panel, governance comment generator collapses formats into a dropdown.

#### Acceptance Criteria

- [ ] Playwright test runs at 390x844 viewport against demo scenarios
- [ ] Asserts verdict text visible without horizontal scroll
- [ ] Asserts evidence drawer button still tappable (≥ 44px hit area)
- [ ] Asserts no critical content cut off
- [ ] PR body references US-054

#### Files

- `apps/web/e2e/mobile-responsive.spec.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/web e2e mobile-responsive
```

#### Notes

P1 because demo audience is desktop. DAO voters on phones are real-world, not booth-day, so this can ship in a follow-up.

### US-055 - Accessibility pass for WCAG AA and screen-reader status labels

| Field | Value |
|---|---|
| Type | task |
| Priority | P1 |
| Owner | C |
| Effort | M |
| Sponsor | Future Society |
| Dependencies | US-042, US-045 |
| Acceptance gates | - |
| Status | open |

#### Scope

Run axe-core against the verdict result page and fix any WCAG AA violations. Verify all verdict states (SAFE / REVIEW / SIREN) have screen-reader-friendly aria-labels (color paired with text label). Verify keyboard navigation works for the evidence drawer and governance comment generator.

#### Acceptance Criteria

- [ ] axe-core scan reports zero WCAG AA violations on `/r/safe.demo.upgradesiren.eth` and `/r/dangerous.demo.upgradesiren.eth`
- [ ] Verdict card has `role="status"` and `aria-label` reading the full verdict word
- [ ] Tab order is logical
- [ ] Esc closes evidence drawer
- [ ] PR body references US-055

#### Files

- `apps/web/e2e/accessibility.spec.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/web e2e accessibility
```

#### Notes

P1 because public-good positioning demands a11y, but the gate-listed tests do not enforce it. Mentor feedback may upgrade this to P0.

### US-056 - Siren Agent watchlist config (P2)

| Field | Value |
|---|---|
| Type | task |
| Priority | P2 |
| Owner | C |
| Effort | M |
| Sponsor | Umia |
| Dependencies | US-029 |
| Acceptance gates | - |
| Status | open |

#### Scope

Build `apps/siren-agent/` package: a long-running watcher that takes a list of ENS names from a config file and runs `computeVerdict` on each every N minutes. Logs verdict changes. Out of scope: signed report automation (US-057), Umia panel (US-058), persistence (Neon Postgres is a future P3 item).

#### Acceptance Criteria

- [ ] `apps/siren-agent/package.json` declares the package
- [ ] CLI: `pnpm siren-agent --config watchlist.json` runs the watcher
- [ ] Config schema: array of `{name, intervalSeconds}` entries
- [ ] On verdict change, logs structured event to stdout
- [ ] Unit tests for the polling loop
- [ ] PR body references US-056
- [ ] PR body explicitly notes this is P2, only ships if Daniel pursues Umia track

#### Files

- `apps/siren-agent/package.json`
- `apps/siren-agent/src/cli.ts`
- `apps/siren-agent/src/watcher.ts`
- `apps/siren-agent/test/watcher.test.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/siren-agent test
```

#### Notes

Conditional on Umia track decision per `SCOPE.md §10`. First cut if time pressure.

### US-057 - Operator report-signing workflow UX for Siren Agent automation (P2)

| Field | Value |
|---|---|
| Type | task |
| Priority | P2 |
| Owner | C |
| Effort | M |
| Sponsor | Umia |
| Dependencies | US-015, US-056 |
| Acceptance gates | - |
| Status | open |

#### Scope

Add a UX flow in `apps/siren-agent/` for the operator to approve a generated Siren Report and trigger the signing helper (US-015) to produce the signed JSON. Includes a CLI prompt with diff against the previous report and a confirmation step. Out of scope: web-based signing UI (further P2 stretch).

#### Acceptance Criteria

- [ ] CLI prompt shows the new report alongside the previous report's diff
- [ ] Operator confirms with `y/N`; on `y`, calls `signReport` and writes the signed JSON to disk
- [ ] On `n`, prints "skipped, no new report signed"
- [ ] Operator key is read from environment, never logged
- [ ] PR body references US-057 and US-015 as merged prerequisite

#### Files

- `apps/siren-agent/src/signFlow.ts`
- `apps/siren-agent/test/signFlow.test.ts`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/siren-agent test signFlow
```

#### Notes

Same conditional as US-056. P2 only.

### US-058 - Umia-style due-diligence panel (P2)

| Field | Value |
|---|---|
| Type | task |
| Priority | P2 |
| Owner | C |
| Effort | M |
| Sponsor | Umia |
| Dependencies | US-029 |
| Acceptance gates | GATE-19 |
| Status | open |

#### Scope

Build `<UmiaDueDiligencePanel />` rendering a Siren Agent watchlist for venture contracts: list of monitored contracts, latest verdict per contract, last-changed timestamp, signed report links. Frames the agent as a due-diligence tool, not a token launchpad. Out of scope: actual Umia integration (post-hack feature).

#### Acceptance Criteria

- [ ] Component accepts `{watchlist: WatchlistEntry[]}` typed prop
- [ ] Each entry shows name, current verdict, signed-report link, last-changed time
- [ ] Page route at `/umia` renders the panel
- [ ] Pitch text in the page header explicitly says "due-diligence and post-launch monitoring", not "token launch"
- [ ] PR body references US-058 and notes this is P2

#### Files

- `apps/web/app/umia/page.tsx`
- `apps/web/components/UmiaDueDiligencePanel.tsx`

#### Verification commands

```bash
pnpm --filter @upgrade-siren/web test UmiaDueDiligencePanel
```

#### Notes

GATE-19 enforcement: Umia pitch must NOT read as launchpad. Reviewer audits the page header copy specifically.

### US-059 - Sponsor pitch finalization (start at scope-lock)

| Field | Value |
|---|---|
| Type | story |
| Priority | P0 |
| Owner | Daniel + Orch |
| Effort | M |
| Sponsor | Sourcify, ENS, Future Society |
| Dependencies | none |
| Acceptance gates | GATE-16, GATE-17, GATE-18 |
| Status | open |

#### Scope

Finalize the per-sponsor pitch language for Sourcify, ENS, and Future Society. For each: lock the one-sentence judge framing, the demo beat that lands, and the evidence the judge will inspect. Update `docs/07-sponsor-fit.md` if framings shift. Daniel runs mentor sweeps; Orch updates docs and Devfolio submission body. **Start at scope-lock (2026-05-09).**

#### Acceptance Criteria

- [ ] Sourcify one-sentence framing locked and verified with mentor sweep: "Upgrade Siren turns Sourcify-verified contract data into a public upgrade-risk alarm" or equivalent
- [ ] ENS framing locked: stable records + atomic manifest + ENSIP-26 reuse + EIP-712 signature against `upgrade-siren:owner`
- [ ] Future Society framing locked: public-good DAO governance hygiene
- [ ] `docs/07-sponsor-fit.md` reflects locked language
- [ ] Devfolio track selection finalized (Sourcify primary + ENS secondary + Future Society organizer; Umia conditional)
- [ ] Mentor sweeps logged with date and feedback
- [ ] PR body references US-059

#### Files

- `docs/07-sponsor-fit.md` (Orch update)
- `BRAINSTORM.md` (decision log entries)

#### Verification commands

```bash
# Manual: read the doc and Devfolio body
cat docs/07-sponsor-fit.md | head -50
```

#### Notes

**Start-at-scope-lock item.** Must begin 2026-05-09 because pitch language drives the demo script (US-065) and Devfolio submission (US-064).

### US-060 - Operator wallet / report signer custody decision (start at scope-lock)

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | Daniel |
| Effort | S |
| Sponsor | - |
| Dependencies | none |
| Acceptance gates | GATE-24 |
| Status | merged |

#### Scope

Decide and document the operator key custody pattern for `REPORT_SIGNER_PRIVATE_KEY` and `OPERATOR_PRIVATE_KEY`. Default per `SCOPE.md §11`: dedicated burner key, env-only, never committed; mainnet ENS parent uses Daniel's existing operator wallet. Document the decision in `BRAINSTORM.md` decision log and reference from `docs/12-implementation-roadmap.md`. **Start at scope-lock (2026-05-09).**

#### Acceptance Criteria

- [ ] Decision committed to `BRAINSTORM.md` decision log with date and rationale
- [ ] `REPORT_SIGNER_PRIVATE_KEY` source: env var, generated burner, stored in Vercel Secrets for production
- [ ] `OPERATOR_PRIVATE_KEY` source: same pattern, separate key from deployer
- [ ] Documented escalation: how to rotate keys if leaked
- [ ] PR body references US-060

#### Files

- `BRAINSTORM.md` (decision log entry)
- `docs/12-implementation-roadmap.md` (key-handling note if missing)

#### Verification commands

```bash
grep -A5 "REPORT_SIGNER_PRIVATE_KEY" BRAINSTORM.md
```

#### Notes

**Start-at-scope-lock item.** Stream A's US-009 (Sepolia deploy) and US-011 (signed reports) cannot start without this decision because they need to know where keys come from.

### US-061 - ENS parent registration on mainnet (deferred post-hack)

| Field | Value |
|---|---|
| Type | task |
| Priority | P1 |
| Owner | Daniel |
| Effort | M |
| Sponsor | ENS |
| Dependencies | US-060 |
| Acceptance gates | GATE-3, GATE-17 (satisfied via Sepolia parent for demo; mainnet upgrade is post-hack) |
| Status | blocked |

> **2026-05-09 descope:** Daniel attempted mainnet registration of `upgradesiren.eth` twice during hackathon and the ENS commit-reveal flow stalled both times. For demo and Devfolio submission, Stream A US-010 already provisioned `upgrade-siren-demo.eth` on Sepolia with the four required subnames + atomic manifests + signed reports (per PR #68). The booth demo, Devfolio link, and judge verification all run against Sepolia. Mainnet parent is a production-readiness feature, not a demo blocker. Reclassified P0 -> P1, status `blocked` (deferred). Will be re-opened post-hackathon if the project continues. See `BRAINSTORM.md` Decision Log 2026-05-09 entry for full rationale.

#### Scope

Register the ENS parent name on mainnet (`upgradesiren.eth` if available, else fallback per `SCOPE.md §7` provisional list) and fund the operator wallet with enough ETH for subname provisioning + manifest updates over the demo lifetime. Sepolia testnet parent is provisioned separately by Stream A US-010 using a test parent if needed.

#### Acceptance Criteria

- [ ] ENS parent registered on mainnet, registration tx hash documented in `BRAINSTORM.md`
- [ ] Operator wallet funded with ≥ 0.05 ETH for subname provisioning gas budget
- [ ] Sepolia ETH funded for the deployer wallet (Stream A US-009 prerequisite)
- [ ] Final parent name communicated to Stream A in a PR comment so US-010 references the live parent
- [ ] PR body references US-061 and US-060 as merged prerequisite

#### Files

- `BRAINSTORM.md` (registration log entry)

#### Verification commands

```bash
# Manual: verify mainnet registry ownership
cast call --rpc-url $ALCHEMY_RPC_MAINNET <ens-registrar> "ownerOf(uint256)" <tokenid>
```

#### Notes

This unblocks Stream A US-010 ENS provisioning in production-mode. Stream A can ship US-010 against a Sepolia test parent first; the mainnet flip happens once this lands.

### US-062 - Live public-read protocol target research (start at scope-lock)

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | Daniel + Orch |
| Effort | M |
| Sponsor | Sourcify, ENS, Future Society |
| Dependencies | none |
| Acceptance gates | GATE-25 |
| Status | open |

#### Scope

Research and select the live mainnet protocol target for the public-read demo scenario. Constraints: protocol uses an upgradeable proxy (EIP-1967), implementation is Sourcify-verified, no privileged sweep risk in current implementation, well-known enough for judges to recognize, and has had at least one historical upgrade visible via `Upgraded(address)` events. Candidates to evaluate: Lido stETH, Compound v3, Optimism OPCM, Aave v3 Pool. Document choice in `BRAINSTORM.md` decision log. **Start at scope-lock (2026-05-09).**

#### Acceptance Criteria

- [ ] At least three candidates evaluated against the constraint list
- [ ] One target selected and documented in `BRAINSTORM.md`
- [ ] Selected target's mainnet proxy address recorded
- [ ] Pre-flight verdict from running US-019 against the target predicted (likely `REVIEW` since `public-read` mode never returns `SAFE`)
- [ ] Stream C US-050 demo runner config updated with the selected target (post-merge into Stream C)
- [ ] PR body references US-062

#### Files

- `BRAINSTORM.md` (decision log entry)
- `apps/web/app/demo/demo.config.ts` (Orch updates after Stream C US-050 merges)

#### Verification commands

```bash
# Manual: read the decision entry
grep -A10 "live public-read target" BRAINSTORM.md
```

#### Notes

**Start-at-scope-lock item.** Without a chosen target, US-050 demo runner has a placeholder for the 4th scenario. Selection eliminates the "syntetic demo" critique from the audit.

### US-063 - Booth fallback artifacts: Anvil, cached fixtures, recorded demo (start at scope-lock)

| Field | Value |
|---|---|
| Type | epic |
| Priority | P0 |
| Owner | Orch |
| Effort | L |
| Sponsor | - |
| Dependencies | US-009, US-050 |
| Acceptance gates | - |
| Status | open |

#### Scope

Prepare booth-day fallback artifacts: an Anvil local fork running the demo state, pre-warmed Sourcify and ENS response caches for the four demo subnames, and a recorded full-demo video. The video must be standalone (no live network calls) and runnable on the booth laptop offline. **Start at scope-lock (2026-05-09).**

#### Acceptance Criteria

- [ ] `scripts/booth/run-anvil-fork.sh` starts an Anvil instance at the deployed Sepolia state, with deployed addresses unchanged
- [ ] `scripts/booth/prewarm-cache.sh` invokes US-024, US-025, US-017 against each demo target and stores responses in a local cache directory
- [ ] `booth/demo-video.mp4` exists, ≥ 3 minutes, covers all four scenarios end-to-end
- [ ] Booth runbook documents how to switch from live mode to fallback mode in under 30 seconds
- [ ] PR body references US-063

#### Files

- `scripts/booth/run-anvil-fork.sh`
- `scripts/booth/prewarm-cache.sh`
- `booth/RUNBOOK.md`
- `booth/demo-video.mp4` (committed via Git LFS or hosted externally with link in runbook)

#### Verification commands

```bash
bash scripts/booth/run-anvil-fork.sh &
bash scripts/booth/prewarm-cache.sh
```

#### Notes

**Start-at-scope-lock item.** Risks register `docs/10-risks.md` lists booth Wi-Fi, RPC limits, and Sourcify outage as high-severity. This item is the unified mitigation. Recording is the lowest-priority sub-item; Anvil fork + cache pre-warm are the critical first deliverables.

### US-064 - Devfolio submission materials

| Field | Value |
|---|---|
| Type | story |
| Priority | P0 |
| Owner | Daniel + Orch |
| Effort | M |
| Sponsor | - |
| Dependencies | US-013, US-029, US-050, US-059 |
| Acceptance gates | GATE-15, GATE-16, GATE-17, GATE-18 |
| Status | open |

#### Scope

Assemble the Devfolio submission package: project description, tags, track selection (Sourcify primary + ENS secondary + Future Society organizer + optional Umia), gate checklist, repo URL, demo URL, video link. Per `docs/12-implementation-roadmap.md` Devfolio Submission Checklist.

#### Acceptance Criteria

- [ ] Devfolio submission body drafted with: tagline, 3-paragraph description, sponsor-specific framing per US-059
- [ ] Tags include Sourcify, ENS, EIP-1967, proxy, upgrade-risk, DAO governance, public-good
- [ ] Track selection submitted on Devfolio
- [ ] Live demo URL points to Vercel production deploy
- [ ] Sourcify-verified contract addresses listed (Sourcify links per US-007)
- [ ] ENS subname examples listed (per US-010, US-013)
- [ ] Demo video link (per US-063)
- [ ] Acceptance gates checklist marked
- [ ] Submission ID logged in `BRAINSTORM.md`
- [ ] PR body references US-064

#### Files

- `BRAINSTORM.md` (submission log entry)
- `docs/12-implementation-roadmap.md` (checklist updates if needed)

#### Verification commands

```bash
# Manual: open Devfolio and verify submission state
```

#### Notes

Submission deadline 2026-05-10 12:00 PM Prague time per `SCOPE.md`. Submit at least 60 minutes early to handle validation errors.

### US-065 - 3-minute booth script rehearsal

| Field | Value |
|---|---|
| Type | task |
| Priority | P0 |
| Owner | Daniel |
| Effort | S |
| Sponsor | - |
| Dependencies | US-050 |
| Acceptance gates | GATE-15 |
| Status | open |

#### Scope

Rehearse the 3-minute booth script per `docs/05-demo-script.md` against the live demo runner. Time each beat (hook, ENS lookup, live chain check, Sourcify evidence, three scenarios, governance comment, sponsor close). Identify and fix any beat exceeding its time budget. Out of scope: video recording (US-063).

#### Acceptance Criteria

- [ ] Live rehearsal recorded and timed
- [ ] Total time ≤ 3:00 with safety margin
- [ ] Each beat within its budget per `docs/05`
- [ ] Adjustments to UI flow (if any) committed as Stream C bug-fix items
- [ ] PR body references US-065

#### Files

- (no source code changes; rehearsal log added to BRAINSTORM.md)

#### Verification commands

```bash
# Manual rehearsal
```

#### Notes

If a beat blows the budget, the fix lives in Stream C as a backlog-add (Orch flags for Daniel approval). Do not silently extend the budget.

### US-066 - Devfolio logo and cover asset

| Field | Value |
|---|---|
| Type | task |
| Priority | P1 |
| Owner | Daniel + Orch |
| Effort | S |
| Sponsor | - |
| Dependencies | none |
| Acceptance gates | - |
| Status | open |

#### Scope

Produce the Devfolio cover image (1200x630) and project logo per `prompts/design-brief.md`. Lead visual: the green-to-red verdict flip moment per `docs/05-demo-script.md`. If the design brief produces deliverables in time, use those; otherwise use a wordmark + tagline composition as fallback.

#### Acceptance Criteria

- [ ] Devfolio cover image saved at `assets/brand/devfolio-cover.png` (1200x630)
- [ ] Project logo saved at `assets/brand/logo-mark.svg` and `assets/brand/wordmark.svg`
- [ ] Both assets readable at thumbnail size in Devfolio grid
- [ ] No emoji in any asset
- [ ] PR body references US-066

#### Files

- `assets/brand/devfolio-cover.png`
- `assets/brand/logo-mark.svg`
- `assets/brand/wordmark.svg`

#### Verification commands

```bash
# Manual: open assets and verify rendering
file assets/brand/devfolio-cover.png
```

#### Notes

P1 because Devfolio accepts a default placeholder if the visual identity from `prompts/design-brief.md` arrives late. Do not block submission on this item.

### US-067 - Brand visual identity assets and Tailwind preset integration

| Field | Value |
|---|---|
| Type | story |
| Priority | P0 |
| Owner | C |
| Effort | L |
| Sponsor | Future Society |
| Dependencies | US-037 |
| Acceptance gates | GATE-2, GATE-22 |
| Status | merged |

#### Scope

The Upgrade Siren brand manual (Direction A "Triade Stack" recommended primary, full color/type/motion/icon spec) is realized as a self-contained HTML document. Daniel will paste the canonical HTML content into the Dev C terminal as the source-of-truth artifact. Dev C extracts the tokens into machine-readable form, exports the inline SVG assets as standalone files, wires the tokens into the Next.js Tailwind config, and rebases all open Stream C component PRs (US-038, US-039, US-040, US-041 if still open) so they consume the real verdict tokens instead of placeholder Tailwind colors. Out of scope: production-grade illustration beyond logo + verdict glyphs (per brand manual section 14), Siren Agent watchlist UI, Umia panel.

#### Acceptance Criteria

- [ ] `assets/brand/brand-manual.html` exists with the canonical HTML content (paste from Daniel; treat as immutable artifact, do not edit beyond UTF-8 cleanup)
- [ ] `assets/brand/brand-tokens.json` lists every CSS variable from the manual's `:root` block as flat key-value (verdict-safe, verdict-review, verdict-siren, verdict-*-on-light, verdict-*-surf, neutrals bg through paper, accent, font families)
- [ ] `assets/brand/tailwind-preset.ts` exports a Tailwind 4 `@theme` preset consumable by `apps/web/tailwind.config.ts`. Token names match `brand-tokens.json` keys.
- [ ] `assets/brand/icons/` contains 18 SVG files: 3 verdict glyphs (`verdict-safe.svg`, `verdict-review.svg`, `verdict-siren.svg`) plus 15 UI icons matching the brand manual section 06 grid (`ens-evidence`, `sourcify-evidence`, `eip-1967-slot`, `sig-signed`, `sig-unsigned`, `sig-invalid`, `conf-signed-manifest`, `conf-public-read`, `conf-mock`, `step-pending`, `step-success`, `step-failure`, `copy`, `share`, `expand`, `external-link`, `info`, `alert`). Each SVG is the inline `<svg>` from the brand manual extracted as a standalone file, 1.5px stroke, no fill except verdict glyphs.
- [ ] `assets/brand/logo/` contains 5 SVG files: `mark-primary.svg` (Direction A Triade Stack), `mark-mono-dark.svg`, `mark-mono-light.svg`, `wordmark-horizontal.svg`, `lockup-stacked.svg`
- [ ] `assets/brand/README.md` documents the consumption pattern: how Stream C imports the Tailwind preset, which token name maps to which CSS variable, where to add new icons, and the protected-tagline rule.
- [ ] `apps/web/tailwind.config.ts` imports the preset; placeholder Tailwind utility classes (`text-emerald-500`, `text-amber-500`, `text-red-500`) replaced with semantic verdict tokens (`bg-verdict-safe`, `bg-verdict-review`, `bg-verdict-siren`, `text-verdict-safe`, etc.)
- [ ] `apps/web/app/page.tsx` and any other US-037-introduced placeholder color usage swapped to semantic tokens
- [ ] Google Fonts loaded for Space Grotesk (500/600/700), Inter (400/500/600), JetBrains Mono (400/500/700) per brand manual section 05
- [ ] Encoding cleanup: any mojibake artifacts in the pasted HTML (`Â·`, `â`, `Ã`) replaced with correct UTF-8 (`·`, `—`, `×`)
- [ ] Verification: `pnpm --filter @upgrade-siren/web build` succeeds; visual smoke test shows verdict colors rendering at correct hex values
- [ ] PR body references US-067 and confirms which open Stream C PRs need rebase after merge

#### Files

- `assets/brand/brand-manual.html` (seed from Daniel paste)
- `assets/brand/brand-tokens.json`
- `assets/brand/tailwind-preset.ts`
- `assets/brand/icons/*.svg` (18 files)
- `assets/brand/logo/*.svg` (5 files)
- `assets/brand/README.md`
- `apps/web/tailwind.config.ts` (modification)
- `apps/web/app/page.tsx` (modification — placeholder colors swap)
- `apps/web/app/globals.css` (modification — Google Fonts import + Tailwind preset import)
- `apps/web/app/layout.tsx` (modification if Google Fonts loaded via `next/font`)

#### Verification commands

```bash
pnpm install
pnpm --filter @upgrade-siren/web build
pnpm --filter @upgrade-siren/web dev
# visual smoke test:
# - http://localhost:3000 shows Space Grotesk display, Inter body, JetBrains Mono mono
# - inspect element on any verdict color confirms #00D67A / #FFB020 / #FF3B30
grep -rn "text-emerald-500\|text-amber-500\|text-red-500" apps/web/ && exit 1 || echo "placeholder colors removed: pass"
```

#### Notes

Single-PR delivery covering brand seed + Tailwind integration + token swap in the existing US-037 scaffold. Effort `L` because it touches 24+ asset files plus Tailwind config and font loading, with verification of color-faithful rendering.

After merge, all open Stream C component PRs that consumed the placeholder color tokens must rebase per Hard Rule 14 and swap utility classes. Specifically: US-038, US-039, US-040, US-041 if still open at merge time.

`prompts/design-brief.md` describes this brand identity from the design side. The brand manual realizes it. After this US-067 merges, `prompts/design-brief.md` may be marked as fulfilled by Orch.
