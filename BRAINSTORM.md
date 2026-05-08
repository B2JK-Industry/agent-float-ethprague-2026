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
