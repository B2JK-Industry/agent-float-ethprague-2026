# Vision

## One-Liner

Upgrade Siren warns the public when a named Ethereum protocol upgrade changes what users are trusting.

## Thesis

Upgradeable contracts are a governance and user-safety blind spot. A protocol can keep the same address, same brand, and same front end while the implementation behind the proxy changes.

Most people will never inspect proxy slots, `Upgraded(address)` events, ABI diffs, storage-layout changes, or Sourcify verification status. Upgrade Siren turns that hidden upgrade moment into a public signal:

> No source, no upgrade.

## What Makes It Sharp

Upgrade Siren is not trying to audit all smart contracts. It focuses on one high-risk moment:

1. A named protocol has an upgradeable contract.
2. The implementation changes.
3. The public needs to know whether the upgrade is verified, explainable, and consistent with the protocol's declared version map.

The output is deliberately simple:

| Verdict | Meaning |
|---|---|
| `SAFE` | Verified upgrade with no obvious high-risk diff |
| `REVIEW` | Upgrade may be valid but needs human review |
| `SIREN` | Do not approve, fund, or trust until fixed |

## Solarpunk Fit

This is public-good safety infrastructure. It helps DAO voters, delegates, users, and small investors see the same upgrade-risk evidence that sophisticated teams can already collect manually.

The product is anti-extractive because it does not sell mystery risk scores or token speculation. It makes upgrade risk legible in public.

## Why ENS

ENS becomes the public contract map:

- which proxy belongs to the named protocol
- which implementation is expected
- where the latest report lives
- which schema defines the records
- whether the live chain state matches the named declaration

If ENS is removed, the product loses its human-readable identity and public discovery surface.

## Why Sourcify

Sourcify is the evidence layer:

- verified source
- ABI and metadata
- compiler metadata
- storage layout where available
- bytecode and verification links

If Sourcify is removed, the product loses the proof behind the verdict.

## What Judges Should Remember

1. It is an alarm for upgradeable contracts, not a generic scanner.
2. ENS names the protocol and version map (live-resolved, not decorative).
3. Sourcify proves what code is actually behind the upgrade (deterministic evidence, not LLM prose).
4. Public-read fallback makes it useful for existing protocols before they publish Upgrade Siren records.
5. The UX is built for non-auditors (DAO voters, delegates, wallet users).
6. The demo has a visible green-to-red moment within 5 seconds — `vault.demo.upgradesiren.eth` resolves, proxy implementation changes, Sourcify evidence loads, screen flips to `SIREN`.

## Future Directions

The hackathon scope uses ENS records, an atomic upgrade manifest, Sourcify evidence, and EIP-712 report signatures. Post-hackathon directions:

- ERC-3668 / CCIP-Read resolver path for contract-readable verification of the same signed report data.
- ZK proof that a verdict engine ran deterministically over a given Sourcify/ENS input set.
- ZK or signed-origin proofs for external evidence responses where a direct API response is not enough.

These are not P0. The P0 signed trust path is: live ENS records, atomic manifest, Sourcify evidence, and EIP-712 signature by `upgrade-siren:owner`. The P0 adoption path is public-read fallback: address or ENS address record, chain state, Sourcify evidence, lower-confidence verdict, never `SAFE`.
