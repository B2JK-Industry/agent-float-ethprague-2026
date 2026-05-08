# Business Model

## Business Framing

Upgrade Siren is a risk-intelligence product for upgradeable Ethereum contracts.

The business value is simple:

> Before a DAO approves, a wallet routes, or a launch platform funds, Upgrade Siren checks whether the contract upgrade is transparent enough to trust.

## Buyer Segments

| Segment | Pain | Paid value |
|---|---|---|
| DAOs | Delegates miss technical upgrade risk | Upgrade reports for proposals |
| Wallets | Users interact with changed contracts blindly | API warning before interaction |
| Explorers | Contract pages lack plain-language upgrade risk | Embedded verdict widget |
| Venture platforms | Projects launch with opaque contracts | Due-diligence reports and monitoring |
| Funds | Small teams need contract-risk triage | Watchlists and alerts |
| Protocol teams | Need to prove upgrade transparency | Public upgrade evidence page |

## Free Product

- Public ENS lookup
- Public-read fallback for addresses / ENS address records without Upgrade Siren records
- One-off report for a named contract
- Basic `SAFE` / `REVIEW` / `SIREN` verdict
- Sourcify links
- Governance comment generator

## Paid Product

- Continuous watchlists
- Signed reports
- API access
- DAO proposal monitoring
- Venture due-diligence packages
- Wallet/explorer integrations
- Custom risk policies for funds and launch platforms

## Umia Angle (optional, only if Daniel pursues Umia track)

> Activated only if mentor feedback confirms the Siren Agent due-diligence story lands for Umia. Otherwise this section is post-hackathon territory. Per `SCOPE.md §10` and `docs/12`, Siren Agent is **P2 stretch** and the first cut under time pressure.

If Daniel decides to pursue Umia, Upgrade Siren does not compete with their tokenization or funding mechanics. It becomes the verification and monitoring layer around ventures.

For Umia, Siren Agent could answer:

- Are the venture's contracts verified?
- Is the proxy upgradeable?
- Who can upgrade it?
- Did the implementation change after funding?
- Did a new unverified contract become part of the system?
- Should investors be alerted?

Business sentence (Umia framing):

> Siren Agent gives Umia a contract due-diligence and post-launch monitoring layer for agentic ventures.

Default plan does **not** include Umia. Sourcify + ENS + Future Society are the locked sponsor pair.

## Why It Can Win Despite Existing Tools

Generic scanners exist. Upgrade Siren should not pretend otherwise.

The niche is sharper:

- named protocol identity via ENS
- upgrade-specific analysis
- Sourcify-backed evidence
- public verdict UX
- governance and venture-review workflow

## Revenue Hypothesis

1. Public-read fallback lets Upgrade Siren warn on existing protocols before they adopt any records.
2. Protocol teams publish signed `upgrade-siren:*` manifests to earn higher-confidence verdicts.
3. DAOs and venture platforms pay for watchlists and signed reports.
4. Wallets and explorers pay for API or embedded warnings.
5. Protocol teams pay for public transparency pages before major upgrades.

## Anti-Positioning

Do not pitch this as:

- "AI auditor"
- "smart contract scanner"
- "agent trust layer"
- "security marketplace"
- "token launchpad"

Pitch it as:

> Public upgrade-risk alarms for named Ethereum contracts.
