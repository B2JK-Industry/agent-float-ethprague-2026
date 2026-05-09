# ETHPrague 2026 — Brainstorm / Decision Log

> Active idea: **Upgrade Siren**.

## Current Decision

- [Daniel] 2026-05-08: Agent Float / Umia funding idea is too close to crowded agent funding / trust / marketplace territory.
- [Daniel] 2026-05-08: Pivot docs toward **Upgrade Siren** and rewrite repo documentation/wiki as needed.
- [Codex] 2026-05-08: Upgrade Siren is stronger than Agent Float for Sourcify + ENS + Future Society because it has a sharper technical core, clearer demo, and less crowded sponsor fit.

## Active Idea: Upgrade Siren

**One-liner:** Upgrade Siren warns DAO voters and venture investors when a named protocol upgrade changes what they are trusting.

**Stage tagline:** No source, no upgrade.

**Primary user:** DAO voter / delegate / investor / wallet / venture launch reviewer.

**Pain:** Upgradeable contracts can silently change their implementation. Users and voters rarely inspect source verification, ABI diffs, storage layouts, admin rights, proxy slots, or timelocks before approving or trusting upgrades.

**Sponsors:**

| Target | Fit |
|---|---|
| Sourcify | Core evidence: verified source, ABI, compiler metadata, storage layout, bytecode |
| ENS | Contract identity, version naming, report discovery, live records |
| ETHPrague Future Society | Public-good security and governance transparency |
| Umia optional | Siren Agent as due-diligence and post-launch monitoring for agentic ventures |

**5-second moment:** `vault.demo.upgradesiren.eth` resolves through ENS, a new implementation appears, Sourcify shows it is unverified or dangerous, and the UI flips to `SIREN`.

**Why it can win:**

- Sourcify is not decorative; the product depends on its data.
- ENS is not decorative; names and records define the contract/version/report map.
- The demo is immediately understandable: green safe upgrade vs red dangerous upgrade.
- Solarpunk fit is real: public protection for DAO voters and users.

**Why it can fail:**

- If pitched as a generic scanner, it loses to existing tools.
- If ENS is just a search alias, ENS fit dies.
- If Sourcify is only a verification badge, Sourcify fit is weak.
- If deterministic findings are thin and the report is only LLM prose, judges will reject it.

## Rejected / Deprioritized Directions

| Idea | Reason |
|---|---|
| Agent Float | Too close to Slopstock / Obolos / agent-funding / agent-passport territory; Umia may already solve too much of the launch/funding flow |
| Generic ENS agent directory | Crowded by A2A, AgentRadar, ClankRoad, Oikonomos, HumanENS, TrustAgent |
| EIP-7702 seatbelt | Crowded by wallet/security vendors and existing tooling |
| Swarm-first report storage | Useful extension, but weak prize/focus tradeoff for current direction |
| Umia-only agent venture verifier | Business framing is viable, but technical win is stronger through Sourcify + ENS |

## Pre-Build Gate

| Gate | Status | Note |
|---|---|---|
| 5-second visual moment | Pass | SAFE vs SIREN upgrade screen |
| Memorable one-liner | Pass | No source, no upgrade |
| Sponsor-native | Pass | Sourcify and ENS are core |
| Solarpunk | Pass | Public-good safety for governance and users |
| Non-crowded framing | Conditional | Must avoid "generic scanner" and "AI auditor" |
| Build clarity | Pass | Fixture contracts + ENS map + Sourcify diff + UI |

## Open Decisions

| Decision | Options | Default |
|---|---|---|
| Sponsor pair | Sourcify + ENS vs Sourcify + Umia | Sourcify + ENS |
| ENS parent | `upgradesiren.eth` vs alternate parent | Registry owner check on 2026-05-08 showed `upgradesiren.eth`, `upgrade-siren.eth`, and `upgrade-siren-demo.eth` unowned; default to `upgradesiren.eth` if still available at registration |
| Report storage | App DB / JSON route vs Swarm | App JSON route for now; Swarm future |
| Agent framing | Main product vs optional business panel | Optional Siren Agent panel |

## Decision Log

### 2026-05-09 — US-060 — Operator wallet and report signer custody

**Decision (policy-only).** Three keys, held in environment variables, never committed. Two of them are the same key.

| Env var | Wallet purpose | Source policy |
|---|---|---|
| `DEPLOYER_PRIVATE_KEY` | Sepolia fixture deployer (Stream A US-009) | Dedicated burner key generated locally with `cast wallet new`, funded from a public Sepolia faucet. Mainnet ENS parent is custodied separately by Daniel and never appears in this `.env`. |
| `OPERATOR_PRIVATE_KEY` | ENS subname provisioning + `upgrade-siren:owner` authority (Stream A US-010) | Dedicated burner key generated locally with `cast wallet new`. **Same key as `REPORT_SIGNER_PRIVATE_KEY`.** |
| `REPORT_SIGNER_PRIVATE_KEY` | EIP-712 Siren Report signing (Stream A US-011, Stream B US-028 verification target) | **Same key as `OPERATOR_PRIVATE_KEY`.** Single key collapses the GATE-24 invariant `recoveredSigner == upgrade-siren:owner` to identity. |

**Rationale for OPERATOR == REPORT_SIGNER (single key).** Flagged by Stream A while saving the decision to memory. The `upgrade-siren:owner` ENS text record holds one address; that address is the authority both for ENS record updates and for EIP-712 report signatures. A two-key variant would require either (a) a second `upgrade-siren:report_signer` ENS record (schema expansion, out of current scope), or (b) signed delegation from owner to signer (out of current scope). Single key is the simplest viable hackathon path. Two-key variant is a post-hackathon hardening if a real protocol pursues this.

**Storage.** Local `.env` for hackathon dev. `.env` is in `.gitignore` (added by US-009). Production deploys consume the same names from Vercel Environment Variables (Production scope) per `docs/12-implementation-roadmap.md`. No example keys, real keys, or addresses are committed to this repo. Real burner addresses live only in `deployments/sepolia.json` after US-009 broadcast (that file is committed because deployed addresses are public chain state, not secret material).

**Rotation.** If a key is compromised: generate new key with `cast wallet new`, update Vercel Secrets, redeploy Siren Reports under the new signer, update `upgrade-siren:owner` ENS record on all subnames, invalidate prior signed reports. A `siren:revoked_signers` ENS record is post-hackathon hardening, not in current scope.

**Mainnet ENS parent control.** Custodied personally by Daniel, separate from the three burner keys above. US-061 (ENS parent registration on mainnet) executes from that wallet and does not touch this repo's `.env`.

### 2026-05-09 — US-061 — Descope mainnet ENS parent registration to P1 / post-hack

**Decision.** US-061 reclassified from P0 to P1, status flipped to `blocked` (deferred). Mainnet `upgradesiren.eth` registration will not happen during the hackathon. Demo and Devfolio submission run on the Sepolia parent `upgrade-siren-demo.eth` already provisioned by Stream A US-010 in PR #68.

**Trigger.** Daniel attempted the mainnet registration through the ENS Manager twice on 2026-05-09 and the commit-reveal flow stalled both times — most likely between the `commit()` transaction and the 60-second-delayed `register()` transaction (MetaMask timeout, gas estimation failure, or UI state loss). Continuing to retry under hackathon time pressure trades a demo-blocking risk for a feature that does not affect demo readiness.

**Why this is safe for the demo.**

- Booth demo, Devfolio link, and judge verification all run against Sepolia chain ID 11155111.
- The four demo subnames (`vault.`, `safe.`, `dangerous.`, `unverified.upgrade-siren-demo.eth`) already carry the stable records, atomic `upgrade-siren:upgrade_manifest`, and `upgrade-siren:owner` per PR #68 broadcast.
- The three signed Siren Reports (safe / dangerous / unverified) are hosted and verified end-to-end with EIP-712 signature recovery to `upgrade-siren:owner`.
- GATE-3 (live ENS resolution) and GATE-17 (ENS central to identity/discovery) are both satisfied through the Sepolia parent; mainnet would be a sponsor-pitch nicety, not a gate prerequisite.
- US-010 (which originally referenced US-061 as the production parent) already lists `upgrade-siren-demo.eth` as the live parent in `contracts/DEPLOYMENTS.md` (per PR #68 + #50).

**What remains for post-hackathon.**

- Register `upgradesiren.eth` (or alternate per `SCOPE.md §7` provisional list) on mainnet without the deadline pressure.
- Fund the operator wallet with the production gas budget per the original AC.
- Re-broadcast a mainnet equivalent of the four demo subnames OR migrate to a different naming scheme for production (TBD post-hack).
- Re-open US-061 with status `open` and bump priority back to P1 active when the project enters production prep.

**No code or backlog dep is broken by this descope.** Stream C US-050 demo runner targets Sepolia subnames. Stream B verifier reads `upgrade-siren:*` records from any chain configured in `ALCHEMY_RPC_*` env vars; mainnet is supported but not required.
