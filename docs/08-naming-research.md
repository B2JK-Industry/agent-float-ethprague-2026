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

(to be locked here once collision check completes)

**Locked name:** _____________________
**Locked at:** _____________________
**Channels confirmed available:** _____________________
**Notes:** _____________________
