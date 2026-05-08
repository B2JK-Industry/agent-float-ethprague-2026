# Sponsor Fit

## Primary: Sourcify

### Why It Fits

Sourcify is the evidence engine. Upgrade Siren cannot make credible claims without verified source, ABI, compiler metadata, bytecode links, and storage-layout data.

### What To Show

- old and new implementation verification status
- direct Sourcify links
- ABI diff based on verified metadata
- storage-layout comparison when available
- unverified implementation causing `SIREN`

### Judge Sentence

> Upgrade Siren turns Sourcify's verified-contract data into a public upgrade-risk alarm.

### Adoption Flywheel

Upgrade Siren should be framed as a Sourcify adoption loop, not just an API consumer:

1. Protocol wants a `SAFE` or high-confidence `REVIEW` verdict.
2. Upgrade Siren requires Sourcify-verified implementations for credible evidence.
3. If an implementation is unverified, the public verdict becomes `SIREN`.
4. DAO voters, wallets, and reviewers ask the protocol to verify on Sourcify.
5. Sourcify gets more verified contracts, more inspection traffic, and clearer public-good value.

### Mentor Questions

1. Which Sourcify API path is preferred for metadata, ABI, and storage layout during the hackathon?
2. What is the best way to link judges directly to the verified contract evidence?
3. Is partial verification acceptable for `REVIEW`, or should it always be `SIREN`?
4. Are there Sourcify endpoints for similarity or signature data we should use for unverified implementations?

## Secondary: ENS Most Creative Use

### Why It Fits

ENS is not just resolving a wallet address. It is the protocol's public upgrade map:

- named proxy
- previous implementation
- expected current implementation
- report pointer
- report hash
- schema pointer
- atomic upgrade manifest
- ENSIP-26 context and web endpoint records
- project-specific `upgrade-siren:*` namespace to avoid broad `siren:*` collisions

### What To Show

- live ENS text-record resolution
- named contract hierarchy
- proxy slot compared against manifest-declared implementation
- report discovery through ENS
- EIP-712 report signature verified against `upgrade-siren:owner`
- ENSIP-26 records (`agent-context`, `agent-endpoint[web]`) reused instead of inventing every record
- no hardcoded product path

### Judge Sentence

> ENS becomes the readable contract/version/report layer for upgradeable protocols.

### Mentor Questions

1. Is `upgrade-siren:*` a reasonable collision-reduced text-record namespace for the upgrade-specific records?
2. Should `upgrade-siren:upgrade_manifest` be a text record, contenthash pointer, or CCIP-Read response?
3. Is reusing ENSIP-26 `agent-context` and `agent-endpoint[web]` the right standard compatibility layer?
4. Would wildcard/offchain subnames be more compelling than normal text records?
5. What would make this feel "Most Creative" rather than ordinary ENS metadata?

## Organizer: Future Society

### Why It Fits

Public upgrade alarms help communities govern shared infrastructure. This is a civic Ethereum tool, not a private alpha feed.

### What To Show

- DAO voter workflow
- plain-language verdict
- governance comment generator
- evidence open to everyone
- no paywall around the basic alarm

## Optional: Umia

Use only if Daniel decides to pitch Siren Agent as an agentic venture.

### Umia Framing

Siren Agent monitors venture contracts before and after funding:

- readiness to fund
- unverified contract warning
- proxy/admin risk
- post-launch implementation-change alert
- signed due-diligence report

### Risk

Umia may prefer ventures that create economic output, not just analyze risk. Do not force this unless mentor feedback suggests it lands.

## Not Targeting

| Sponsor | Reason |
|---|---|
| Swarm | Interesting report-storage future, but low prize and not core |
| SpaceComputer | Hardware/KMS mismatch |
| Apify | Data extraction not needed for core demo |
