# Umia Integration

## Role Of Umia

Umia is the funding and venture engine. Agent Float is not.

Umia provides:

- legal wrapper,
- venture token,
- Tailored Auction powered by Uniswap CCA,
- noncustodial treasury,
- decision markets / governance,
- secondary market.

Agent Float provides:

- proof gate,
- ENS passport,
- receipts feed,
- builder bond,
- milestone accountability,
- discovery UI.

## Integration Sequence

### Step 1: Umia Venture Init

Builder creates the venture through Umia:

```text
umia venture init <agent-name>
```

Expected output:

- `ventureAddress`,
- `tokenAddress`,
- `treasuryAddress`,
- `auctionAddress`.

Exact flags, addresses, and sequencing are pending Umia mentor confirmation.

### Step 2: Agent Float Registration

Builder registers the Umia venture with Agent Float:

```solidity
registerAgent({
  ensLabel,
  umiaVenture,
  milestones,
  builderBond,
  silenceThresholdSeconds,
  agentMetadata
})
```

Agent Float then creates the proof/accountability layer around the Umia venture.

## Tailored Auction

Umia Tailored Auction is the primary funding mechanism.

Agent Float UI must:

- show auction state if accessible,
- link to real Umia auction page,
- label any simulator as `mock: true`,
- never present internal fallback as primary.

## Treasury

Auction proceeds route to Umia noncustodial treasury. Agent Float does not define sale proceeds routing.

Milestone progress and builder bond are Agent Float-side accountability signals, but treasury mechanics are Umia-side unless mentor confirms an integration hook.

## Holder Economics

Investor exposure follows Umia's venture wrapper.

Allowed wording:

- "economic exposure per Umia venture wrapper",
- "holder economics handled by Umia",
- "receipts feed shows proof of productivity",
- "Agent Float does not redefine token economics."

Avoid until confirmed:

- "guaranteed revenue share",
- "pro-rata revenue rights",
- "claim accumulated USDC",
- "X% of revenue goes to holders."

## Open Mentor Questions

1. Is Tailored Auction available on Sepolia or only mainnet?
2. Does `umia venture init` deploy the token automatically?
3. Can Agent Float embed auction state, or only link out?
4. What events should Agent Float index?
5. Does Umia treasury support holder distribution natively?
6. Can builder milestones feed into Umia treasury release logic?
7. What is the correct legal wording for investor exposure?

## Fallback

If Umia integration is unavailable during demo:

1. Prefer a Umia-provided simulator.
2. If not available, use Agent Float fallback simulator.
3. Mark fallback clearly as `mock: true`.
4. Say out loud that real Umia integration is post-hack or pending mentor access.

