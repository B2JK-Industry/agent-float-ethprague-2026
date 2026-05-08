# 08 — Naming research

Template + execution for collision check on the project name.

## Why this matters

SBO3L lesson: rebrand mid-hackathon (Mandate → SBO3L in PR #58) cost a full day plus outreach confusion. Naming research belongs **before the first commit**, not after.

This document is the collision-check ledger for *Agent Float*. Status updated as checks run.

---

## Provisional name

**Agent Float**

Rationale:
- Verb "to float" in finance means to list publicly (IPO float, stock float) — semantic fit
- "Agent" + "Float" is two simple English words, googleable, mama would understand
- Cleanly distinguishes from "Agent Vault" (related but different) and "Agent OS" (anti-pattern)
- Pitch sentence works: *"Agent Float turns working AI agents into investable ventures."*
- Tagline works: *"Your agent has receipts. Now give it runway."*

## Backup names (pre-approved by Daniel)

If "Agent Float" has unacceptable collisions:

1. **AgentRunway** — emphasizes capital-for-growth; no major web3 collisions known
2. **AgentPier** — nautical metaphor matching "float"; clean
3. **AgentDrydock** — agents prepared for launch
4. **AgentBerth** — agents docked, ready to sail

Optional further candidates if all primary backups collide: AgentMooring, AgentSlipway, AgentWharf, AgentDeck.

---

## Collision-check ledger

Status legend: ✅ available, ⚠️ partial collision (acceptable), ❌ blocked

### Agent Float

| Channel | Status | Notes |
|---|---|---|
| GitHub org `agent-float` | (pending) | Check `https://github.com/agent-float` |
| GitHub repo `B2JK-Industry/agent-float-ethprague-2026` | ✅ live | Public, wiki/discussions/issues/projects enabled |
| npm `agent-float` | (pending) | Check `https://www.npmjs.com/package/agent-float` |
| npm scope `@agentfloat/*` | (pending) | Check `https://www.npmjs.com/~agentfloat` |
| crates.io `agent-float` | (pending) | Lower priority — no Rust planned in v1 |
| PyPI `agentfloat` | (pending) | Check `https://pypi.org/project/agentfloat/` |
| ENS `agentfloat.eth` (mainnet) | (pending) | Use Alchemy mainnet RPC; check `https://app.ens.domains/agentfloat.eth` |
| ENS `agent-float.eth` (mainnet) | (pending) | Alternative without space concatenation |
| X handle `@agentfloat` | (pending) | Check `https://x.com/agentfloat` |
| X handle `@agent_float` | (pending) | Alternative with underscore |
| Domain `agentfloat.app` | (pending) | Check whois |
| Domain `agentfloat.io` | (pending) | Check whois |
| Domain `agentfloat.xyz` | (pending) | Check whois |
| Domain `agentfloat.com` | (pending) | Premium TLD, low likelihood available |
| Web search "Agent Float" | (pending) | Top 10 results — must not collide with existing crypto/AI products |
| Web3 search "Float" | (pending) | Watch out for Float Protocol (DeFi), Float Capital (financial) |

### Known potential collisions to verify

- **Float Protocol** — DeFi protocol that issued FLOAT token (defunct?). Check if name still actively used.
- **Float Capital** — financial services firm; unlikely to claim Web3 namespace but check.
- **Float (Rust crate)** — generic word, may have minor crate. Low impact since we don't use Rust in v1.

If any of these are active and product-relevant, "Agent Float" is blocked → switch to backup.

---

## Decision criteria

Agent Float is **acceptable** if:

- ✅ GitHub org/repo names available within B2JK-Industry
- ✅ npm scope `@agentfloat/*` available (we'll publish SDK packages)
- ✅ ENS `agentfloat.eth` available on mainnet (or near-equivalent)
- ✅ At least one strong domain (`.app`, `.io`, `.xyz`) available
- ✅ X handle `@agentfloat` or `@agent_float` available
- ✅ No active Web3/AI product called "Float" or "Agent Float" in Web search top 10

Agent Float is **rejected** if:

- ❌ Active competitor product with same name (e.g., another fundraising platform called Agent Float)
- ❌ Active token contract called Agent Float that could cause investor confusion
- ❌ Multiple critical channels (GitHub + npm + ENS) blocked

---

## Pivot procedure if rejected

If Agent Float fails:

1. Run identical collision check on top backup (AgentRunway)
2. If AgentRunway passes, pivot:
   - Update `README.md`, `SCOPE.md`, `BRAINSTORM.md`, `CLAUDE.md`, `AGENTS.md` with new name
   - Rename ENS subname pattern: `<agent>.agentrunway.eth`
   - Update memory `project_ethprague2026_status.md`
3. If AgentRunway also fails, proceed to AgentPier
4. Lock new name; update Decision log in SCOPE.md §13
5. Naming research belongs to this single check + pivot — no further iterations during build

---

## Final decision

**Locked name:** **Agent Float**
**Locked at:** 2026-05-08 (Daniel call: "na rebrand zatial kašleme")
**Decision type:** Risk-accepted (not collision-free; trade-off explicitly chosen)

### Channels confirmed available

- ✅ GitHub org `agentfloat` and `agent-float` — free
- ✅ GitHub repo `B2JK-Industry/agent-float-ethprague-2026` — already live
- ✅ npm `agentfloat`, `agent-float`, `@agentfloat/sdk` — free
- ✅ PyPI `agentfloat`, `agent-float` — free
- ✅ Domains `agentfloat.app`, `agentfloat.io`, `agent-float.app`, `agent-float.io` — free
- ✅ No competing AI agent / launchpad / Web3 product called "Agent Float" exists

### Channels with collisions (risk-accepted)

- ⚠️ **`agentfloat.eth` mainnet ENS** — has metadata configured (displayName + avatar); likely owned by a third party. Implication: we cannot register the canonical mainnet ENS for our brand. Mitigation: use Sepolia for hackathon; alternate parent `agent-float.eth` (hyphenated) appears to resolve `false` per ensideas API and may be free, but not yet locked. Daniel may verify and register the hyphenated parent if needed.
- ⚠️ **`agentfloat.com`** — registered 2026-05-06 by DropCatch.com 1404 LLC (domain reseller / squatter). Empty page. Not an active brand collision, but blocks the canonical .com.
- ⚠️ **`agentfloat.xyz`** — squatted via Onamae.com (Japan); parking page. Same posture as .com.

### Why we proceed despite the partial collisions

1. No active product collision — "Agent Float" as a brand is unique among AI agent launchpads / fundraising platforms.
2. Brand investment (repo, docs, pitch language) is already deep; full rename would cost more than the collisions cost us at the hackathon.
3. .app / .io / GitHub / npm / PyPI are all free — sufficient infrastructure to ship and pitch.
4. ENS Most Creative track does not strictly require mainnet parent; Sepolia mirror is acceptable per our earlier mentor question (pending confirmation in `docs/09`).
5. Squatted .com / .xyz are speculative holdings, not active brand competition — manageable post-hack.

### Trade-offs explicitly accepted

- We may not be able to acquire `agentfloat.eth` mainnet without buying from current owner.
- Post-hack, if we want canonical .com or .xyz domains, we deal with squatters.
- Public brand search may surface squatter parking pages alongside our project until we own a primary domain.

### What we own / can register tonight if needed

- GitHub repo (live)
- npm scope `@agentfloat` (registerable)
- PyPI `agentfloat` (registerable)
- `agentfloat.app` (registerable, ~$15/yr)
- `agent-float.eth` mainnet (likely — needs Daniel's manual verify on app.ens.domains before register)

### Backup names — kept as record only

If the partial collisions become real blockers (Big Corp buys squatter portfolio, ENS mainnet owner refuses sale, judge confusion), pivot candidates remain available. Cleanest fully-free alternatives identified during collision check:
- AgentBerth (npm + GitHub + .app + .com all free)
- AgentSlipway (same)
- AgentMooring (same)

These are not active candidates — recorded in case a forced rebrand becomes necessary post-hack.
