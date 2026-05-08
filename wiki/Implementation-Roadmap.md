# Implementation Roadmap

This roadmap is dependency-based, not time-cut based.

## Track A: ENS Identity

Deliver:

- parent name decision,
- subname issuance helper,
- ENSIP-26 records,
- namespaced Agent Float records,
- live resolver helpers.

Blocks:

- agent profile,
- receipt verification,
- sponsor demo.

## Track B: Contracts

Core contracts:

- `AgentRegistry`,
- `ReceiptLog`,
- `BuilderBondVault`,
- `MilestoneRegistry`.

Deliver:

- Foundry workspace,
- deploy scripts,
- tests,
- Sourcify verification,
- Sepolia deployment.

Blocked by:

- Umia mentor answers for venture shape,
- ENS decision for parent/subname approach.

## Track C: Demo Agents

Primary:

- GrantScout.

Deliver:

- paid query endpoint,
- Apify-backed data,
- AI summarization,
- USDC payment validation,
- receipt signing,
- ReceiptLog emit.

Stretch:

- DataMonitor,
- TenderEye.

Blocks:

- demo,
- submission,
- receipts acceptance gates.

Blocked by:

- Track A,
- Track B.

## Track D: Platform UI

Views:

- landing,
- agent profile,
- investor browse,
- portfolio,
- builder onboarding,
- leaderboard.

Must show:

- ENS resolution,
- receipts feed,
- Umia auction state,
- builder bond,
- milestones,
- Sourcify links.

Blocks:

- demo,
- submission.

Blocked by:

- Track A,
- Track B for read-only contract data,
- Track E for live funding.

## Track E: Umia Integration

Deliver:

- venture pointer model,
- auction link/redirect,
- auction state fetch,
- fallback simulator if needed,
- clear `mock: true` labels.

Mentor questions:

- SDK/API,
- testnet/mainnet,
- token template,
- treasury events,
- legal wording.

Blocks:

- "Float" interface,
- demo.

Blocked by:

- Track G mentor sweep #1.

## Track F: SDK

Deliver:

- TypeScript SDK,
- Python SDK,
- receipt helpers,
- verification helpers,
- example integration.

Blocks:

- builder onboarding adoption story.

## Track G: Mentor Sweeps

Priority order:

1. Umia.
2. ENS.
3. Sourcify.

Deliver:

- integration answers,
- mentor contacts,
- SDK/API links,
- mainnet vs Sepolia decisions,
- sponsor-specific bar for winning.

Blocks:

- Track A mainnet/Sepolia decision,
- Track B token/contract shape,
- Track E Umia integration.

## Track H: Demo and Submission

Deliver:

- 5-minute walkthrough,
- acceptance gate checklist,
- fallback recording,
- Devfolio submission,
- sponsor-specific wording.

Blocked by:

- Tracks A-F.

## Done Means

The project is demo-ready only if:

- all 12 acceptance gates pass,
- mocks are labeled,
- Umia/ENS sponsor story is obvious,
- receipts are real,
- repo can be cloned and run,
- contracts are verified where deployed.
