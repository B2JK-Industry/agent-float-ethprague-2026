# Risks and Fallbacks

## Critical Risks

| Risk | Why It Matters | Mitigation |
|---|---|---|
| Umia integration unclear | Primary funding path depends on it | Mentor sweep first; simulator fallback |
| Fake receipts | Could undermine proof layer | Signature + USDC transfer validation |
| Token-casino perception | Judges may pattern-match to hype launchpad | Lead with no receipts, no float |
| Demo complexity | ENS + Umia + receipts + txs can fail live | Preflight + recordings + fallback agent |

## Umia Integration Risk

Unknowns:

- SDK/API availability,
- Sepolia support,
- Tailored Auction embed/link behavior,
- token template,
- treasury events,
- legal wording.

Fallback order:

1. Real Umia Sepolia/testnet integration.
2. Umia-provided simulator.
3. Internal simulator labeled `mock: true`.

## Wash-Trading Risk

Receipts raise the cost of fake activity but do not eliminate it.

Mitigations:

- agent wallet signature,
- USDC transfer check,
- visible payer history,
- suspicious pattern detection later,
- judge wording stays honest.

## Builder Rugpull Risk

Mitigations:

- Umia noncustodial treasury,
- builder personal bond,
- milestone deadlines,
- silence trigger,
- public default badge.

## Legal/Securities Risk

Agent Float does not define legal investor rights.

Mitigation:

- defer legal model to Umia,
- avoid promising revenue share,
- route venture/token mechanics through Umia.

## Demo Fallbacks

| Problem | Fallback |
|---|---|
| ENS fails | cached display with explicit wording |
| Umia auction fails | second pre-warmed agent |
| Sepolia fails | Anvil fork |
| Agent query fails | recorded clip |
| Full live demo fails | full recording |

## Documentation Risk

Biggest previous risk was docs drift between v1 bonding-curve model and v2 Umia-native model.

Current rule:

- Active product docs must say Umia-native.
- Bonding curve appears only as fallback.
- RevenueDistributor appears only as conditional.
- Token economics are Umia-side.

