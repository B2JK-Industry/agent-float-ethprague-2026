# Umia Integration

> Status: in build, sponsor-track posture remains "optional alternate" per `SCOPE.md` §5 + Section 21 D-J. This document captures the two integration angles the codebase implements so the sponsor pitch and demo script can ship them without re-deriving the canonical Umia ABI.

## Canonical Umia surface (re-read 2026-05-10)

- Marketing: <https://www.umia.finance/>
- Inbound (founder onboarding): <https://inbound.umia.finance/>
- Docs root + sitemap: <https://docs.umia.finance/sitemap.xml> (17 pages)
- GitHub org: <https://github.com/umiafinance> (only `.github` profile repo, no public code)

Real CLI surface (verbatim from the docs site):

| Command | Purpose |
|---|---|
| `umia evaluate` | Non-binding agentic assessment — "low-commitment first step" |
| `umia venture init` | Main create command for an Agentic Venture |
| `umia venture apply` | **Community Track** submission |
| `umia venture status` | Progress check |
| `umia decide` | Decision-market governance |

Listing tracks:

- **Curated** — team-selected, requires existing traction. Direct evaluation; no competitive process.
- **Community** — `umia venture apply` + decision-market ranking by UMIA token holders. Caveat from the docs: *"until then, all projects that apply will be selected using the Curated Track"* — Community track may not be live yet.

## Two integration angles in this repo

### Angle A — Submitter: `umia venture apply` payload exporter

**Where it lives**

- `apps/web/lib/umia/umia-venture-apply.schema.json` — canonical Community Track payload schema
- `apps/web/lib/umia/buildUmiaVenturePayload.ts` — Bench evidence + score → prefilled form
- `apps/web/lib/umia/validate.ts` — Ajv validator
- `apps/web/components/umia/UmiaVentureApplySection.tsx` — UI section under `/b/[name]`

**What it does**

Reads ENS text records from the Bench evidence (`description`, `url`, `com.github`, `com.twitter`, etc.), maps them to the Umia Community Track schema fields, locks fields that came from authoritative sources (ENS / report / manifest), leaves the rest editable. The user clicks Download to save a schema-validated JSON that is shaped to be fed into a future `umia venture apply` adapter — no upload, no real CLI execution today.

**Honest limit**

The schema is `app-owned` (we wrote it from public Umia docs); a future Umia CLI adapter will need to translate to whatever final shape Umia accepts. The reference + score block is embedded inside `submission_notes` so a regex can recover it later.

### Angle B — Validator: EIP-712 ServerPermit issuer for Tailored Auctions

**Where it lives**

- `packages/umia-permit/` — pure EIP-712 typed-data + signer + encoder
- `apps/web/app/api/umia/permit/route.ts` — `GET /api/umia/permit` endpoint
- `apps/web/components/umia/UmiaPermitSection.tsx` — client UI under `/b/[name]`
- `contracts/umia/UmiaValidationHookMock.sol` — reference Solidity hook
- `test/umia/UmiaValidationHookMockTest.t.sol` — Foundry round-trip proof

**Why this is the sponsor-native angle**

Umia's `UmiaValidationHook` is the smart contract called by the CCA on every Tailored Auction bid. Per [docs.umia.finance/docs/technical-reference/validation-hook](https://docs.umia.finance/docs/technical-reference/validation-hook) it accepts three eligibility modes:

1. Pre-submitted Reclaim proof
2. Inline Reclaim proof (current default)
3. **EIP-712 server permit** — issued by an off-chain "signer" the founder configures via `setSigner(address)`

Mode 3 is dormant unless somebody runs an issuer. Without one, every Tailored Auction founder who wants tier-gated steps must build their own signing infra. Upgrade Siren already runs an EIP-712 signer (the `REPORT_SIGNER_PRIVATE_KEY` that signs Siren Reports), so we can serve as that issuer for free, with the bidder's eligibility derived live from their Bench tier.

This is the discriminating "could not exist without this technology" sponsor-native test: the Bench score engine + the existing EIP-712 stack + Umia's existing hook composition primitive.

**On-chain shape (verbatim from the docs)**

EIP-712 domain:

```
EIP712Domain { name: "UmiaValidationHook", version: "1", chainId, verifyingContract }
```

EIP-712 message:

```
ServerPermit { address wallet, uint256 step, uint256 deadline }
```

`hookData` wire encoding (mode `0x01` = server permit):

```
0x01 || abi.encode(uint256 permitStep, uint256 deadline, bytes signature)
```

**End-to-end flow**

```
[Founder]                          [Upgrade Siren]                     [Bidder]
Deploy UmiaValidationHook
hook.setSigner(siren_signer)
hook.enableStepPermit(2)
hook.setCCA(auction_cca)
                                                                       Connect wallet
                                                                       Visit /b/<their.eth>
                                                                       Expand "Mint bid permit"
                                                                       Set hookAddress, chainId,
                                                                       step=2, minTier=B
                                                                       Submit
                                  GET /api/umia/permit?subject=<ens>
                                  &wallet=<bidder>&step=2&minTier=B
                                  &hookAddress=<hook>&chainId=<id>
                                  
                                  - resolve subject's primary address
                                  - addr(subject) == wallet ?
                                  - load Bench score for subject
                                  - score.tier >= minTier ?
                                  - sign ServerPermit { wallet, step,
                                    deadline } with REPORT_SIGNER_KEY
                                  - encode hookData = 0x01 || abi(...)
                                  - return { hookData, signer, expiresAt,
                                    evidence: { tier, score } }
                                                                       Copy hookData blob
                                                                       Submit Tailored
                                                                       Auction bid with
                                                                       --hook-data <hex>

                                                                       umia auction bid
                                                                       ↓
                                                                       hook.validate(bidder,
                                                                                     hookData)
                                                                       - decode 0x01 prefix
                                                                       - decode (step, deadline,
                                                                         signature)
                                                                       - check step enabled,
                                                                         deadline live
                                                                       - recover signer from
                                                                         EIP-712 digest
                                                                       - signer == hook.signer?
                                                                       - PASS → bid admitted
                                                                       - FAIL → revert
                                                                         InvalidSignature() /
                                                                         ExpiredDeadline() /
                                                                         ServerPermitNotEnabled
```

**API contract (`GET /api/umia/permit`)**

Query params (all required unless marked optional):

- `subject` — ENS name being attested (Bench score source)
- `wallet` — bidder wallet address
- `step` — uint256 auction step index
- `minTier` — `S | A | B | C | D` Bench tier threshold
- `hookAddress` — `UmiaValidationHook` contract address
- `chainId` — hook deployment chain
- `deadline` — optional unix seconds; default `now + 1800`
- `controllerCheck` — optional `false` to skip `addr(subject) == wallet` gate

200 response:

```json
{
  "ok": true,
  "mode": "signed",
  "mock": false,
  "permit": {
    "hookData": "0x01...",
    "signer": "0x...",
    "signedAt": 1747000000,
    "expiresAt": 1747001800,
    "wallet": "0x...",
    "step": "2",
    "deadline": "1747001800",
    "hookAddress": "0x...",
    "chainId": 11155111
  },
  "evidence": {
    "subject": "alice.eth",
    "observedTier": "A",
    "score_100": 78,
    "required": "B"
  }
}
```

403 reasons:

- `controller_mismatch` — wallet ≠ subject's primary address
- `tier_below_threshold` — observed tier rank < required
- `no_primary_address` — subject has no `addr()` on chain

When `REPORT_SIGNER_PRIVATE_KEY` is absent the endpoint falls through to a `mode: "mock"` response with `mock: true`, signer `0x0`, and an all-zero signature so UI flows can be exercised without secrets. Per CLAUDE.md mock rule.

**Reference deployment**

`contracts/umia/UmiaValidationHookMock.sol` is a faithful Solidity reference of the EIP-712 server-permit branch. It is NOT the production Umia hook. Its purpose is to prove that the bytes-on-wire produced by `packages/umia-permit` are accepted by a hook that uses the documented domain + struct hash. Production deployments must point at the real Umia contract; the EIP-712 surface is byte-identical.

Foundry test (`test/umia/UmiaValidationHookMockTest.t.sol`) exercises:

- Valid permit → admitted, `verifiedFromStep[bidder] = step`
- Expired deadline → revert `ExpiredDeadline`
- Disabled step → revert `ServerPermitNotEnabled(step)`
- Wrong signer → revert `InvalidSignature`
- Missing type flag → revert `WrongTypeFlag`
- Bidder ≠ permitted wallet → revert `InvalidSignature`

## What is NOT included

- **Decision Markets feed.** The Umia docs do not expose a third-party reputation surface on application cards. Pitching Bench-as-DM-data is wishful thinking.
- **zkTLS provider replacement.** Reclaim is the only provider Umia accepts; injecting Upgrade Siren as an alternative provider would require Umia-side changes.
- **Smart wallet integration.** Umia uses ERC-4337 + Kernel + Privy + Pimlico. Reusing it as the signer for `agent-bench:owner` records is technically possible but adds no demo value.

## Sponsor pitch deltas

`docs/07-sponsor-fit.md` — Umia section reframed around the Validator angle as the discriminating sponsor-native primitive.

`docs/05-demo-script.md` — Optional Umia add-on extended with the Mint Bid Permit segment (60s).
