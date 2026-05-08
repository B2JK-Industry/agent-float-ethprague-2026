# Demo Plan

## Demo POV

Investor POV.

The builder flow is explained in voiceover but not deeply navigated unless judges ask.

## Primary Demo Agent

GrantScout:

- scrapes Gitcoin / Octant / public-goods funding opportunities,
- summarizes grant opportunities,
- charges 0.01 USDC per report,
- emits signed receipts,
- uses ENS passport,
- links to Umia venture.

## Five-Minute Flow

| Segment | Action | Point |
|---|---|---|
| 0-25 sec | Landing page | No receipts, no float |
| 25-80 sec | GrantScout profile | ENS + receipts + bond + Umia auction |
| 80-150 sec | Fund via Umia | Sponsor-native auction path |
| 150-210 sec | Live paid query | Receipt appears live |
| 210-250 sec | Portfolio + proof | Investor sees ongoing productivity |
| 250-280 sec | Bond/milestone panel | Accountability |
| 280-300 sec | Closing tagline | Memorable summary |

## Wow Moment

The receipt feed updates live after a paid query.

The judge sees:

- agent did work,
- USDC moved,
- receipt emitted,
- ENS identity resolves,
- bond is locked,
- funding runs through Umia.

## Acceptance Gates

Demo must pass 12 gates:

1. real Sepolia tx,
2. live ENS resolution,
3. real receipts feed,
4. real proposal text,
5. mocks labeled,
6. reproducible demo,
7. Umia venture linked,
8. Umia auction visible,
9. signed + USDC-validated receipts,
10. builder bond locked,
11. milestones queryable,
12. ENS records resolve.

## Fallbacks

| Failure | Fallback |
|---|---|
| Live query fails | Use recorded same flow |
| ENS resolution slow | Show cached fallback with explicit wording |
| Sepolia RPC fails | Anvil fork |
| Umia auction fails | Second pre-warmed agent |
| Umia unavailable | Simulator with `mock: true` |
| Whole demo fails | Full 5-minute recording |

## Lines To Say

> "No receipts, no float."

> "Umia is the venture engine; Agent Float is the proof and accountability layer."

> "This receipt is signed by the agent wallet and cross-validated against a USDC transfer."

> "The builder has collateral at risk if the agent disappears."

## Lines To Avoid

- "We guarantee investor revenue."
- "Our curve prices the token."
- "Agent Float handles legal compliance."
- "Investors claim USDC from us by default."

