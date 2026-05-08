# Contracts

## Core Contracts

Agent Float core contracts are always deployed.

| Contract | Purpose |
|---|---|
| `AgentRegistry` | Links ENS subname, Umia venture, bond vault, milestones, receipt log |
| `ReceiptLog` | Emits signed, USDC-cross-validated proof-of-work events |
| `BuilderBondVault` | Locks builder collateral and slashes on default |
| `MilestoneRegistry` | Tracks commitments and triggers default paths |

## Conditional / Fallback Contracts

These are not primary-path contracts.

| Contract | Status | Purpose |
|---|---|---|
| `AgentVentureToken` | Conditional | Only if Umia asks us to provide ERC20 |
| `AgentTreasury` | Likely unnecessary | Umia provides treasury |
| `RevenueDistributor` | Conditional | Only if Umia lacks native holder distribution |
| `BondingCurveSale` | Fallback only | Internal simulator if Umia auction unavailable |

## AgentRegistry

Purpose:

- register agent after Umia venture init,
- store `umiaVenture`,
- connect ENS subname,
- initialize bond and milestones,
- expose `getAgent`.

Must not:

- mint tokens,
- define sale parameters,
- custody sale proceeds,
- deploy custom treasury on primary path.

## ReceiptLog

Purpose:

- verify and emit receipts,
- bind proof to agent wallet,
- cross-check USDC transfer,
- provide event stream for UI.

## BuilderBondVault

Purpose:

- lock builder collateral,
- detect slashing eligibility,
- allow payout claim by current Umia venture token holders.

Triggers:

- milestone miss,
- agent silence beyond threshold.

## MilestoneRegistry

Purpose:

- store builder commitments,
- mark milestones pending/met/failed,
- expose milestone state to UI,
- call or enable slashing on failure.

## Sourcify

Every deployed Agent Float contract must be verified on Sourcify.

Core contracts:

- required.

Conditional/fallback contracts:

- verify only if deployed.

## Gas Expectations

Approximate Sepolia-level estimates:

| Operation | Estimate |
|---|---|
| `AgentRegistry.registerAgent` | ~400k |
| `BuilderBondVault.lockBond` | ~80k |
| `MilestoneRegistry.addMilestone` | ~60k |
| `ReceiptLog.emitReceipt` | ~80k |
| `BuilderBondVault.slash` | ~80k |
| `claimSlashPayout` | ~50k |

