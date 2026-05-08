# 04 — Contracts

> **PIVOT NOTICE (2026-05-08):** Per sponsor-native review, primary funding mechanism is **Umia Tailored Auctions** (Uniswap CCA), not our custom `BondingCurveSale.sol`. Several contracts below are reclassified post-pivot:
>
> - `AgentVentureToken.sol` → **conditional** (use Umia template if provided; else deploy ours and feed into Umia auction)
> - `BondingCurveSale.sol` → **fallback only** (internal simulator; not deployed for primary pitch)
> - `AgentTreasury.sol` → **likely replaced by Umia noncustodial treasury** (we may keep light wrapper for our extension data)
>
> Our innovations remain unchanged: `AgentRegistry.sol`, `ReceiptLog.sol`, `BuilderBondVault.sol`, `MilestoneRegistry.sol`, optionally `RevenueDistributor.sol`. Lock pending Umia mentor sweep.

Per-contract specification. All contracts in Solidity 0.8.24+, OpenZeppelin imports for ERC20/SafeERC20/AccessControl/ReentrancyGuard. Foundry workspace.

## AgentRegistry.sol

**Purpose:** Single entry point for agent registration. Orchestrates token mint, bond lock, curve setup, treasury deploy, milestone registration.

### State

```solidity
mapping(bytes32 ensNode => Agent) public agents;
address public ensResolver;
address public usdc;
address public umiaDelegate;

struct Agent {
    address owner;          // builder EOA
    address ventureToken;   // AgentVentureToken instance
    address bondingCurve;   // BondingCurveSale instance
    address treasury;       // AgentTreasury instance
    address milestones;     // MilestoneRegistry instance
    address bondVault;      // BuilderBondVault instance
    address receiptLog;     // shared or per-agent ReceiptLog
    uint256 registeredAt;
    bool active;
}
```

### Functions

```solidity
function registerAgent(RegisterParams calldata p) external returns (bytes32 ensNode)
function getAgent(bytes32 ensNode) external view returns (Agent memory)
function isActive(bytes32 ensNode) external view returns (bool)
function deactivate(bytes32 ensNode) external onlyOwner  // for defaulted agents
```

`RegisterParams`:

```solidity
struct RegisterParams {
    string ensLabel;                    // e.g., "grantscout"
    uint16 builderRetentionBps;         // basis points, e.g., 2000 = 20%
    BondingCurveParams curveParams;
    USDCSplit usdcSplit;
    Milestone[] milestones;
    uint256 builderBond;                // USDC locked
    AgentMetadata metadata;
}
```

### Events

```solidity
event AgentRegistered(bytes32 indexed ensNode, address indexed owner, address ventureToken);
event AgentDeactivated(bytes32 indexed ensNode, string reason);
```

### Access control

- `registerAgent`: any caller (becomes builder)
- `deactivate`: protocol owner only (after default flow)

---

## AgentVentureToken.sol [CONDITIONAL post-pivot]

> **Status (post-pivot 2026-05-08):** Use Umia's venture token template if they provide one. Otherwise deploy our ERC20 and feed into Umia Tailored Auction as the auctioned asset. Spec below accurate for our-deployed case; may be replaced entirely by Umia template.

**Purpose:** ERC20 token, fixed 2M supply, minted once at agent registration. Deployed per-agent.

### Implementation

Inherits OpenZeppelin `ERC20` + `ERC20Permit`.

```solidity
constructor(string memory name, string memory symbol, address bondingCurveSale, uint256 builderRetention, address builder) ERC20(name, symbol) ERC20Permit(name) {
    _mint(bondingCurveSale, 2_000_000e18 - builderRetention);
    _mint(builder, builderRetention);
}
```

Total supply locked at 2M. No further minting in v1.

### Functions

Standard ERC20 (transfer, approve, transferFrom, balanceOf, totalSupply, allowance) + Permit.

### Events

Standard ERC20 events.

---

## BondingCurveSale.sol [FALLBACK ONLY post-pivot]

> **Status (post-pivot 2026-05-08):** Not the primary sale path. Umia Tailored Auctions are primary. This contract retained as **internal fallback simulator** for cases where: (1) Umia integration unavailable during demo, (2) local pre-deploy testing, (3) revert path if mentor confirms custom curve acceptable. Spec below remains accurate for fallback usage; not pitched as headline mechanism.

**Purpose:** Primary sale via bonding curve. Investors buy tokens with USDC; sale proceeds split per builder's USDCSplit.

### State

```solidity
address public ventureToken;
address public usdc;
address public agentTreasury;
address public builderWallet;
USDCSplit public split;
BondingCurveParams public params;
uint256 public tokensSold;
```

```solidity
struct BondingCurveParams {
    uint256 startPrice;     // USDC per token at n=0
    uint256 slope;          // USDC increase per token (linear)
    CurveShape shape;       // LINEAR / EXPONENTIAL / SQRT
}

struct USDCSplit {
    uint16 upfrontBps;      // basis points to builder upfront
    uint16 treasuryBps;     // basis points to AgentTreasury
}
```

### Functions

```solidity
function buy(uint256 tokensRequested) external returns (uint256 usdcCost)
function quoteBuy(uint256 tokensRequested) external view returns (uint256 usdcCost)
function quoteSell(uint256 tokensReturned) external view returns (uint256 usdcRefund)  // optional
function tokensRemaining() external view returns (uint256)
```

### Events

```solidity
event TokensSold(address indexed buyer, uint256 tokens, uint256 usdcCost);
event USDCRouted(uint256 toBuilder, uint256 toTreasury);
```

### Math (linear shape)

```
price(n) = startPrice + slope * n
totalCost(quantity, n) = ∫_n^(n+quantity) price(x) dx
                      = startPrice * quantity + slope * (n*quantity + quantity^2 / 2)
```

Reentrancy guard on `buy()`. SafeERC20 for USDC transfers.

---

## AgentTreasury.sol [LIKELY REPLACED post-pivot]

> **Status (post-pivot 2026-05-08):** Umia provides noncustodial treasury per their venture flow. Our `AgentTreasury.sol` may be unnecessary OR may stay as light wrapper holding only Agent Float-specific extension state (e.g., bond vault references, milestone data). Final scope pending Umia mentor confirmation on what their treasury exposes.

**Purpose:** Holds USDC (from sale + revenue). Multi-sig signers: builder + Umia delegate + investor delegate. Releases tranches per MilestoneRegistry.

### Implementation

Lightweight Safe-style multi-sig (3 signers, 2-of-3 threshold by default).

### State

```solidity
address[3] public signers;     // [builder, umiaDelegate, investorDelegate]
uint8 public threshold;        // 2
mapping(uint256 => Proposal) public proposals;
uint256 public proposalCount;
address public usdc;
address public milestoneRegistry;

struct Proposal {
    address to;
    uint256 amount;
    bytes32 milestoneId;       // 0x0 for non-milestone
    uint8 confirmations;
    mapping(address => bool) confirmedBy;
    bool executed;
}
```

### Functions

```solidity
function propose(address to, uint256 amount, bytes32 milestoneId) external returns (uint256 id)
function confirm(uint256 id) external
function execute(uint256 id) external
function autoReleaseMilestone(bytes32 milestoneId) external  // called by MilestoneRegistry
```

`autoReleaseMilestone` bypasses multi-sig if MilestoneRegistry confirms milestone met (oracle-style).

### Events

```solidity
event Proposed(uint256 indexed id, address to, uint256 amount, bytes32 milestoneId);
event Confirmed(uint256 indexed id, address signer);
event Executed(uint256 indexed id);
event MilestoneReleased(bytes32 indexed milestoneId, uint256 amount);
```

---

## MilestoneRegistry.sol

**Purpose:** Tracks builder-committed milestones. Triggers slashing if missed.

### State

```solidity
struct Milestone {
    bytes32 id;
    string description;        // human-readable
    uint256 deadline;          // unix timestamp
    bool met;
    bool failed;
    uint256 releaseAmount;     // USDC released from treasury when met
}

mapping(bytes32 ensNode => Milestone[]) public milestones;
address public bondVault;
address public agentTreasury;
```

### Functions

```solidity
function addMilestone(bytes32 ensNode, Milestone calldata m) external onlyRegistry
function markMet(bytes32 milestoneId) external onlyOracle
function checkExpired(bytes32 ensNode) external returns (bool anyFailed)
```

`checkExpired` is called by anyone or by a Vercel cron-triggered keeper. Iterates milestones, marks `failed` for any past deadline without `met`. If any failed, calls `BuilderBondVault.slash()`.

### Events

```solidity
event MilestoneAdded(bytes32 indexed milestoneId, bytes32 ensNode);
event MilestoneMet(bytes32 indexed milestoneId, uint256 releasedAmount);
event MilestoneFailed(bytes32 indexed milestoneId);
```

---

## BuilderBondVault.sol

**Purpose:** Locks builder's USDC collateral. Slashes pro-rata to investors on default.

### State

```solidity
address public usdc;
address public ventureToken;
address public milestoneRegistry;
address public receiptLog;
uint256 public bondAmount;      // locked at registration
uint256 public silenceThresholdSeconds;  // default 7 days
bool public slashed;
```

### Functions

```solidity
function lockBond(uint256 amount) external payable  // called at registration
function slash() external                            // anyone can call after trigger met
function checkSilenceTrigger() external view returns (bool)
function checkMilestoneTrigger() external view returns (bool)
```

`slash()` is permissionless — anyone can call it once trigger conditions are met. Distributes USDC pro-rata to current `AgentVentureToken` holders by snapshotting balances.

### Events

```solidity
event BondLocked(uint256 amount);
event Slashed(uint256 totalDistributed, uint256 holderCount);
event PayoutClaimed(address indexed holder, uint256 amount);
```

### Slashing distribution mechanic

Two patterns possible:

1. **Push to all holders:** iterate token holders, transfer pro-rata. Gas-expensive at scale.
2. **Pull from holders:** mark slashed, holders call `claimSlashPayout()`. Gas-efficient, aligns with revenue distribution model.

**Default: pull pattern.** Same UX as revenue claim.

---

## RevenueDistributor.sol

**Purpose:** Receives agent USDC revenue. Tracks per-holder claimable balance. `claim()` for withdrawal.

### State

```solidity
address public usdc;
address public ventureToken;
mapping(address => uint256) public claimable;
uint256 public totalDistributed;
uint256 public lastDistributionAt;
```

### Functions

```solidity
function distribute(uint256 amount) external                   // called by agent or treasury
function claim() external                                      // investor pulls accumulated
function pendingFor(address holder) external view returns (uint256)
```

`distribute()` snapshots all holders at call time. For each holder:

```
claimable[holder] += amount * balanceOf(holder) / totalSupply
```

In v1 simplification: snapshot-on-distribution updates a "shares" mapping. Token transfers between distributions are handled by lazy accounting (see `0xSplits` design).

### Events

```solidity
event Distributed(uint256 amount, uint256 timestamp);
event Claimed(address indexed holder, uint256 amount);
```

---

## ReceiptLog.sol

**Purpose:** Append-only log of agent activity. Each receipt cryptographically signed by agent's ENS-registered wallet. Tied to actual USDC transfer for wash-trading mitigation.

### State

```solidity
struct Receipt {
    address agent;             // agent wallet (matches ENS resolution)
    uint256 timestamp;
    bytes32 queryId;
    bytes32 reportHash;
    uint256 paymentAmount;
    address payer;             // end-user who paid
    bytes signature;           // signed by agent
}

mapping(address => Receipt[]) public receiptsByAgent;
mapping(address => uint256) public lastReceiptTimestamp;
address public usdc;
```

### Functions

```solidity
function emitReceipt(Receipt calldata r) external
function getReceipts(address agent, uint256 from, uint256 to) external view returns (Receipt[] memory)
function getLastReceiptTimestamp(address agent) external view returns (uint256)
```

`emitReceipt()` validation:
1. Verify `r.signature` matches `r.agent`'s key (ECDSA recover)
2. Look up `r.agent` against `r.payer` USDC `Transfer` events in same block range
3. Confirm `r.paymentAmount` matches actual transfer
4. If all pass, append; else revert

### Events

```solidity
event ReceiptEmitted(
    address indexed agent,
    bytes32 indexed queryId,
    bytes32 reportHash,
    uint256 paymentAmount,
    address payer
);
```

---

## Deployment order

1. Deploy shared contracts: `ReceiptLog` (or per-agent — design choice), USDC reference (Sepolia mock or real)
2. Deploy `AgentRegistry` (parent contract)
3. Per-agent registration calls `AgentRegistry.registerAgent()`, which deploys per-agent contracts:
   - `AgentVentureToken`
   - `BondingCurveSale`
   - `AgentTreasury`
   - `MilestoneRegistry` (or shared with subspaces)
   - `BuilderBondVault`
   - `RevenueDistributor`

## Sourcify verification

All deployed contracts must be source-verified on Sourcify (sponsor track requirement). Foundry build produces metadata; deploy script POSTs to Sourcify API. Verification status surfaced in agent profile UI.

## Test plan

Foundry tests cover:

- `AgentRegistry.registerAgent` — happy path + invalid params
- `AgentVentureToken` — minting splits, transfer mechanics
- `BondingCurveSale.buy` — quotes correct, splits correct, reverts on no tokens
- `AgentTreasury` — multi-sig propose/confirm/execute, milestone auto-release
- `MilestoneRegistry` — addMilestone, markMet, checkExpired flow
- `BuilderBondVault.slash` — both triggers, pro-rata distribution
- `RevenueDistributor` — distribute, claim, transfer-between-distributions
- `ReceiptLog.emitReceipt` — signature verify, USDC match, reverts on fake

Integration tests:

- Full register → buy → query → emit receipt → distribute → claim flow
- Failure path: silence detector → slash → claim slash payout
- Failure path: missed milestone → slash

Fuzz tests:

- Bonding curve math invariants (price monotonic, sum cost = integral)
- Distribution math invariants (sum of claimable ≤ totalDistributed)

## Custom errors (per OpenZeppelin v5+ pattern)

Each contract uses custom errors instead of revert strings for gas efficiency and explicit failure modes:

```solidity
// AgentRegistry
error AgentAlreadyRegistered(bytes32 ensNode);
error InvalidBuilderRetention(uint16 bps);
error InvalidUSDCSplit(uint16 upfront, uint16 treasury);
error MilestonesEmpty();
error BondTooSmall(uint256 provided, uint256 minimum);

// BondingCurveSale
error InsufficientUSDC(uint256 required, uint256 provided);
error TokensExhausted(uint256 requested, uint256 available);
error CurveParamsInvalid();

// AgentTreasury
error NotSigner(address caller);
error AlreadyConfirmed(uint256 proposalId, address signer);
error ProposalAlreadyExecuted(uint256 proposalId);
error InsufficientConfirmations(uint8 has, uint8 required);

// MilestoneRegistry
error MilestoneNotFound(bytes32 milestoneId);
error MilestoneAlreadyMarked(bytes32 milestoneId);
error NotOracle(address caller);

// BuilderBondVault
error AlreadySlashed();
error TriggerNotMet();
error NoPayoutAvailable(address holder);

// RevenueDistributor
error NothingToClaim(address holder);
error InvalidDistributionAmount();

// ReceiptLog
error SignatureMismatch(address expectedSigner, address recoveredSigner);
error USDCTransferNotFound(bytes32 queryId, uint256 expectedAmount);
error AgentNotRegistered(address agent);
```

## Upgradeability stance

**v1 contracts are non-upgradeable.** No proxy pattern. Reasons:

1. Hackathon-scale: 8 contracts × proxy overhead = unnecessary complexity
2. Honest-over-slick: investors verify exact source on Sourcify; upgradeable contracts add trust assumption
3. Bond + treasury security: immutable contracts can't be retroactively changed to drain funds

If post-MVP we need upgrades:
- Deploy v2 contracts with migration path
- Old agents stay on v1 (existing token holders unaffected)
- New agents register on v2

Trade-off: bug discovered post-deploy means ship v2 + migrate. Acceptable for MVP scope.

## Gas considerations

| Operation | Estimated gas (Sepolia) |
|---|---|
| `registerAgent` (deploys 6 contracts) | ~3M gas (heavy) |
| `buy` (bonding curve) | ~150k gas |
| `emitReceipt` (with USDC verify) | ~80k gas |
| `distribute` | ~50k gas |
| `claim` | ~50k gas |
| `slash` (mark slashed) | ~80k gas |
| `claimSlashPayout` | ~50k gas |

Optimization paths if mainnet deploy needed:
- Use minimal proxy (EIP-1167) for per-agent contract deployment
- Batch revenue distributions (accumulate before snapshot)
- Off-chain receipt indexing with on-chain commitment via Merkle root
