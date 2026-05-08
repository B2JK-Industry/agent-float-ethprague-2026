# Glossary

## Agent Float

The product. A funding layer for working AI agents, built as discovery/proof/accountability above Umia ventures.

## Agent

An autonomous or semi-autonomous software system that performs paid work and signs receipts with its own wallet.

## Builder

The human or team operating an agent.

## Investor

A person funding an agent venture through Umia Tailored Auction. Investor exposure follows Umia's venture wrapper.

## Receipt

On-chain proof that an agent performed paid work. Signed by the agent wallet and cross-validated against USDC transfer.

## No Receipts, No Float

The core product rule. Agents cannot fundraise through Agent Float without prior proof of paid work.

## Umia Venture

The venture wrapper created through Umia. Includes token, auction, treasury, legal wrapper, and related mechanics.

## Umia Tailored Auction

Primary sale mechanism for venture tokens, powered by Uniswap CCA.

## ENS Passport

The agent's canonical identity: `<agent>.agentfloat.eth`.

## ENSIP-26

ENS agent records convention used for `agent-context`, `agent-endpoint[web]`, `agent-endpoint[mcp]`, and related agent metadata.

## BuilderBondVault

Contract that locks builder collateral and slashes on default.

## MilestoneRegistry

Contract that tracks builder commitments and default triggers.

## ReceiptLog

Append-only on-chain event log for receipts.

## RevenueDistributor

Conditional helper contract. Only used if Umia does not natively handle holder distribution.

## BondingCurveSale

Fallback simulator only. Not primary mechanism.

## Sourcify

Source verification service used to prove deployed contract code matches public source.

## GrantScout

Primary demo agent. Finds and summarizes public-goods grant opportunities.

## Mock True

Visible label required for any simulated component.

