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

### What To Show

- live ENS text-record resolution
- named contract hierarchy
- proxy slot compared against ENS-declared implementation
- report discovery through ENS
- no hardcoded product path

### Judge Sentence

> ENS becomes the readable contract/version/report layer for upgradeable protocols.

### Mentor Questions

1. Is `siren:*` a reasonable text-record namespace for this prototype?
2. Should report discovery use text records, `contenthash`, or a hybrid?
3. Would wildcard/offchain subnames be more compelling than normal text records?
4. What would make this feel "Most Creative" rather than ordinary ENS metadata?

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
