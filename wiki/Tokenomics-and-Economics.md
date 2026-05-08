# Tokenomics and Economics

## Current Rule

Agent Float does not define token economics on the primary path.

Umia defines:

- token supply,
- issuance,
- auction parameters,
- treasury routing,
- holder economics,
- governance,
- secondary trading.

Agent Float defines:

- receipts gate,
- builder bond,
- milestone accountability,
- ENS identity,
- proof UI.

## Primary Funding Mechanism

Umia Tailored Auction powered by Uniswap CCA.

Investor flow:

```text
Agent Float profile
  -> Fund via Umia
  -> Umia Tailored Auction
  -> Umia settlement
  -> Venture tokens in investor wallet
  -> Return to Agent Float for receipts and milestones
```

## Investor Exposure

Use this wording:

> Investor exposure follows Umia's venture wrapper.

Do not promise:

- guaranteed revenue share,
- fixed dividends,
- Agent Float-managed claims,
- pro-rata revenue unless Umia confirms.

## Builder Bond

Builder posts personal collateral.

If the builder defaults:

- agent silent,
- or milestone missed,

then the bond can slash pro-rata to current Umia venture token holders.

This is Agent Float's accountability primitive.

## Receipts As Economic Signal

Receipts show agent productivity:

- number of paid queries,
- amount paid,
- active users/payers,
- recent activity,
- trend over time.

Receipts are not themselves a guarantee of returns. They are evidence used by investors to evaluate the agent.

## Fallback Bonding Curve

`BondingCurveSale` exists only as fallback simulator.

It is not:

- the primary funding mechanism,
- the primary pitch,
- the sponsor-native Umia path.

If used during demo, it must be labeled `mock: true`.

## RevenueDistributor

`RevenueDistributor` is conditional.

Deploy only if:

- Umia treasury does not natively distribute to holders,
- Umia mentor confirms external distribution helper is appropriate,
- tests cover accounting edge cases.

Default assumption:

> Umia handles holder economics.

