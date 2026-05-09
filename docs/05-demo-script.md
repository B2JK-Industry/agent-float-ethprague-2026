# Demo Script

## Five-Second Moment

Enter `vault.demo.upgradesiren.eth`.

The app resolves ENS, reads the proxy, fetches Sourcify evidence, and the verdict turns red:

> SIREN: current implementation is unverified.

Line:

> Same protocol name, same proxy, different code. No source, no upgrade.

## Three-Minute Booth Script

### 0:00 Hook

"Upgradeable contracts can change underneath users while the address and brand stay the same. Upgrade Siren makes that moment public."

### 0:20 ENS Lookup

Show the lookup field and enter:

```text
vault.demo.upgradesiren.eth
```

Explain:

"ENS is not cosmetic here. It is the public contract map: stable proxy and owner records, one atomic upgrade manifest, and optionally ENSIP-26 discovery."

### 0:45 Live Chain Check

Show:

- progressive checklist: `ENS`, `chain`, `Sourcify`, `diff`, `signature`
- proxy address
- manifest-declared previous implementation
- current implementation from EIP-1967 slot
- manifest-declared current implementation
- match or mismatch

### 1:10 Sourcify Evidence

Open the evidence drawer:

- previous implementation verified
- current implementation verified or unverified
- report hash matches fetched bytes
- EIP-712 signature recovers to `upgrade-siren:owner`
- ABI diff
- storage-layout result
- Sourcify links

### 1:45 Three Scenarios

Run the three prepared examples:

| Scenario | Expected screen |
|---|---|
| Safe upgrade | `SAFE` |
| Dangerous upgrade | `SIREN` |
| Unverified upgrade | `SIREN` |

Then run the live public-read example:

| Scenario | Expected screen |
|---|---|
| Existing mainnet protocol without Upgrade Siren records | `REVIEW` or `SIREN`, never `SAFE`; confidence badge says `public-read` |

### 2:20 Governance Comment

Click "Copy governance comment" and show the format switcher:

| Format | Use |
|---|---|
| Short | Tweet-length summary with signed report link |
| Forum | Discourse/Snapshot forum post with evidence bullets |
| Vote reason | One or two sentences for vote rationale |

Show that a delegate can paste a concise forum reason:

```text
I cannot support this upgrade yet. Upgrade Siren reports SIREN for vault.demo.upgradesiren.eth: current implementation 0x... is not verified on Sourcify and does not match the signed Upgrade Siren manifest. Evidence: https://...
```

### 2:45 Sponsor Close

"For Sourcify, verified source is the evidence layer. For ENS, names become a contract/version/report map. For ETHPrague, this is public-good safety infrastructure for DAO voters and users."

## Optional Umia Add-On

If pitching Umia, show Siren Agent:

- watchlist of venture contracts
- due-diligence verdict before funding
- post-launch alert when an implementation changes

Line:

> Siren Agent gives launch platforms a contract-risk monitor around funded ventures.

## Failure Demo

Keep one intentionally bad case:

- ENS manifest says current implementation is `0xA`
- live proxy slot points to `0xB`
- Sourcify cannot verify `0xB`
- UI returns `SIREN`

This is the strongest judge moment.

## Bench Mode Segment (Epic 2 — appended 2026-05-09 per US-141)

> Source: `EPIC_BENCH_MODE.md` Section 14. Append after the existing 3-minute single-contract booth flow. Total 90 seconds. Hits the 5-second meta moment plus the trust-discount memorable line.

> **Setup:** Existing 3-minute single-contract demo (`vault.demo.upgradesiren.eth` → SAFE / dangerous → SIREN / unverified → SIREN / live public-read → REVIEW) runs first. Bench segment opens with "Same product, second front door."

### 90-second flow

| Time | Action | Voiceover |
|---|---|---|
| 0:00 | Type owned subject `siren-agent-demo.upgrade-siren-demo.eth` (provisioned per US-146) | "Same product, second front door. Any ENS name." |
| 0:10 | Score banner renders: e.g. "63 / 100 — Tier B — Seniority 60, Relevance 66" | "One number. Seniority and relevance. Disclaimer is right there: it measures verifiability, not intent." |
| 0:20 | Source grid renders four tiles, GitHub tile shows `⚠ unverified` badge | "Four sources. GitHub is unverified — values count for 60 percent until cross-signed. Sourcify, on-chain, ENS — all verified." |
| 0:35 | Click Sourcify tile → drawer opens → upgrade-history timeline → row highlights `slot 5: uint256 → address` red | "Sourcify drawer: every contract, every upgrade. Slot 5 changed type — storage collision. The score reflects it." |
| 0:55 | Back to grid, click GitHub tile → repo grid → highlight one repo with green CI badge | "GitHub drawer: top 20 repos, recent push, README + LICENSE, test presence — all from public API." |
| 1:10 | Click on-chain tile → first tx, total nonce, contracts deployed | "On-chain: first transaction, lifetime activity, contracts deployed. RPC truth, no indexer needed." |
| 1:20 | (If P1 shipped) Click "Submit similarity" on the unverified Sourcify entry → score climbs visibly | "The unverified contract is structurally similar to a known one. Sourcify auto-verifies. Score climbs — without any on-chain action." |
| 1:30 | Sponsor close | "For Sourcify: the only verified seniority source. For ENS: universal subject registry. For Future Society: public-good transparency, not just for upgrades." |

### Memorable line (Gate 8 candidate)

> *"Type any ENS name. See a 0–100 benchmark of how senior and relevant the subject is — every signal sourced, every claim discounted if unverified."*

### Five-second moment

User types `siren-agent-demo.upgrade-siren-demo.eth` → score banner renders within 5 seconds (cached) → the `× 0.6` trust-discount on GitHub component is visible above the fold in the breakdown panel. No slides, no voiceover required.

### Public-read backup demo (if owned subject is unavailable)

If the owned subject route fails on the day, fall back to a Daniel-on-site-picked existing ENS name (e.g. `vitalik.eth`). The product handles it via public-read fallback (US-112) — banner shows `confidence: public-read` chip, tier capped at A. This proves the universal-registry shape works even without explicit opt-in.

### What NOT to do during this segment

- Do NOT pitch Bench as "AI auditor" or "generic scanner" — same kill conditions as Epic 1.
- Do NOT claim S-tier is reachable in v1 — it is reserved for verified-GitHub v2 per Section 21 D-G lock.
- Do NOT show normalized score breakdown (`0.601 / 0.700 → 86`) — render raw discounted axis only.
