# Competitive Landscape

## Brutal Assessment

Generic smart-contract scanners already exist. Upgrade monitoring also exists. If the pitch is "AI scanner for contracts", the project is weak.

The winnable wedge is narrower:

> ENS-named upgrade maps plus Sourcify-backed implementation diff, packaged as a public alarm for DAO voters and venture reviewers.

## Existing Adjacent Tools

| Category | Examples | Why Upgrade Siren is different |
|---|---|---|
| Contract scanners | Static analyzers, audit assistants, AI review tools | Upgrade Siren focuses on the proxy upgrade moment and public verdict |
| Monitoring tools | OpenZeppelin Defender Monitor, explorer alerts | Usually team-facing, not ENS-named public governance UX |
| Explorers | Etherscan, Blockscout | Show raw data; not a civic upgrade-risk alarm |
| Wallet warnings | Transaction simulation and phishing warnings | Usually interaction-focused, not protocol version-map focused |
| Source verification | Sourcify | Evidence layer, not end-user upgrade UX |

## Why It Can Still Be Strong

The project combines four things that are rarely presented together:

1. Human-readable protocol identity through ENS.
2. Proxy implementation change detection.
3. Sourcify-backed verification and diff evidence.
4. A simple public verdict for governance and funding decisions.
5. Public-read fallback that works on existing protocols before they publish Upgrade Siren records.

## Weak Points

| Weakness | Mitigation |
|---|---|
| Not globally novel as "contract risk" | Never pitch generic risk scanning |
| Storage-layout data may be incomplete | Show honest `REVIEW` state when missing |
| Sourcify cannot prove code is safe | Say verification is necessary, not sufficient |
| ENS records could be stale or malicious | Compare ENS declaration against live chain state |
| Hackathon demo may feel synthetic | Add one live mainnet public-read scenario, not only fixtures |

## Hard Differentiators To Repeat

- "No source, no upgrade"
- "ENS is the public contract map"
- "Sourcify is the evidence layer"
- "Public alarm, not private dashboard"
- "Built for DAO voters, not just auditors"

## Phrases To Avoid

- AI auditor
- generic scanner
- trust layer
- agent OS
- token launchpad
- marketplace
- fully automated audit
- verified means safe
