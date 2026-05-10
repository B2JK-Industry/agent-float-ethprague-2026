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

## Secondary: ENS — AI Agents ($2K) primary

> **Track switched 2026-05-09 from "Most Creative Use" to "AI Agents" per `EPIC_BENCH_MODE.md` Section 21 D-D lock.** Most Creative remains as fallback if AI Agents track signals weaken.

### Why It Fits (Epic 1 + Epic 2)

ENS is not just resolving a wallet address. It is the **identity layer** for two front doors on the same engine:

**Single-Contract Mode (Epic 1, LIVE)** — protocol upgrade map:

- named proxy
- previous implementation
- expected current implementation
- report pointer + hash + schema pointer
- atomic upgrade manifest
- ENSIP-26 context and web endpoint records
- project-specific `upgrade-siren:*` namespace

**Bench Mode (Epic 2, in build)** — universal subject registry:

- `agent-bench:bench_manifest` atomic JSON record listing every public data source for the subject (Sourcify projects + GitHub owner + on-chain primary address + ENS-internal root)
- `agent-bench:owner` for manifest authorship
- `agent-bench:schema` version pointer
- co-exists with `upgrade-siren:*` records on the same name without conflict
- public-read fallback for un-opted-in subjects (banner shows `confidence: public-read`, tier ceiling A)

### Why this is AI Agents track, not just Most Creative

Bench Mode treats any ENS name as a subject identity — agent, project, team — and pulls verifiable evidence of that subject's seniority and relevance. The trust-discount mechanic (0.6 multiplier on unverified GitHub claims) makes ENS the **identity anchor** for verifiability: claims that aren't cross-signed against the ENS owner's wallet are structurally weaker. That is the AI-Agents-grade primitive — identity rooted in ENS, claims verifiable via ENS-controlled signatures.

### What To Show

**Single-Contract path (live demo opener):**

- live ENS text-record resolution
- named contract hierarchy
- proxy slot compared against manifest-declared implementation
- report discovery through ENS
- EIP-712 report signature verified against `upgrade-siren:owner`
- ENSIP-26 records (`agent-context`, `agent-endpoint[web]`) reused instead of inventing every record

**Bench Mode segment:**

- live ENS resolution of `agent-bench:bench_manifest` on owned subject `siren-agent-demo.upgrade-siren-demo.eth`
- four-source grid populated from one ENS lookup
- public-read fallback on a Daniel-picked existing ENS name proves universal-registry shape works without opt-in
- v2 cross-sign upgrade path (gist signed by ENS-owner wallet → flips GitHub source from `unverified` to `verified` → discount removed) is in the schema, even though v1 ships unverified

### Judge Sentence

> ENS is the identity anchor for both the protocol's upgrade map and any subject's verifiable benchmark — one resolver, two product surfaces.

### Mentor Questions

1. Is `agent-bench:*` namespace acceptable alongside `upgrade-siren:*` for AI-Agents-track judging? Both atomic-manifest pattern.
2. Does the trust-discount + cross-sign upgrade path satisfy AI Agents judging criteria around "agent identity rooted in ENS"?
3. For the cross-sign v2 path, is a signed Gist-pointer the right verification primitive, or should we use ERC-1271 contract signature?
4. Would wildcard/offchain subnames be more compelling than normal text records for the universal-subject-registry shape?
5. Is the `kind: "ai-agent" | "human-team" | "project"` taxonomy something ENS would want to standardize?

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

Use only if Daniel decides to pursue the Best Agentic Venture track. Per `SCOPE.md` §5 + `EPIC_BENCH_MODE.md` Section 21 D-J, posture remains "optional, no proactive targeting" — but the integration code is built so a flip is one decision, not a new build.

### Two Integration Angles (`docs/15-umia-integration.md` is the source of truth)

**Angle A — Submitter (`umia venture apply` payload exporter):** Bench evidence (ENS records + GitHub fetched repos) prefills the canonical Umia Community Track schema; user downloads schema-validated JSON for handoff to a future Umia adapter. No upload. Lives under `apps/web/lib/umia/` + `UmiaVentureApplySection`.

**Angle B — Validator (EIP-712 ServerPermit issuer for Tailored Auctions):** Upgrade Siren issues per-bidder EIP-712 permits keyed on Bench tier; `UmiaValidationHook` accepts them via mode `0x01` server-permit branch with zero Umia-side changes. Lives under `packages/umia-permit/` + `apps/web/app/api/umia/permit/route.ts` + `UmiaPermitSection`.

### Sponsor-Native Test (Angle B)

Without Upgrade Siren, every Tailored Auction founder who wants tier-gated steps must run their own off-chain signing server. We already operate `REPORT_SIGNER_PRIVATE_KEY` for Siren Reports; reusing it as the Umia signer makes Bench tier a first-class auction-eligibility primitive at zero marginal infra cost. This passes the discriminating "could not exist without this technology" test (`feedback_sponsor_native_test`).

### What To Show

- `/b/[name]` page renders both Umia sections under the Bench verdict.
- Mint Bid Permit panel: connect wallet → enter hook address + step + minTier → API returns `hookData` blob signed by Upgrade Siren operator. Tier-below-threshold returns 403 with observed/required tiers visible.
- Foundry mock `UmiaValidationHookMock` proves the byte-on-wire accepted by a real hook: 6 round-trip tests cover valid permit, expired deadline, disabled step, wrong signer, missing type flag, bidder mismatch.

### Judge Sentence

> Upgrade Siren turns Bench tier into a Tailored Auction eligibility primitive — the EIP-712 server-permit Umia's hook already accepts.

### Risk

Umia may still prefer ventures that create economic output, not just analyze risk. The Validator angle is the strongest counter (Bench scoring becomes auction infrastructure, not just analysis). Do not force the pitch unless mentor feedback confirms it lands.

## Not Targeting

| Sponsor | Reason |
|---|---|
| Swarm | Interesting report-storage future, but low prize and not core |
| SpaceComputer | Hardware/KMS mismatch |
| Apify | Data extraction not needed for core demo |
