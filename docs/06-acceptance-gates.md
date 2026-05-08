# 06 — Acceptance gates

Honest-over-slick verification protocol. Demo passes only if every gate verified.

## Why gates exist

Without gates, "demo works" is subjective. With gates, every claim made during demo can be reproduced from `git checkout && pnpm dev`. Judges who want to verify can.

The gates also force pre-demo discipline: if a gate fails during dry-run, we know which feature is not honest.

## Severity tiers

| Tier | Meaning | Action if fails |
|---|---|---|
| **CRITICAL** | Without this, the entire pitch is undermined | DO NOT submit; fix or pivot |
| **HIGH** | Significantly weakens credibility | Fix or label `mock: true` and acknowledge in voiceover |
| **MEDIUM** | Polish-tier; degrades but does not break | Acceptable to ship with `mock: true` label |

Gates 1, 3, 7, 8, 9, 10 are **CRITICAL** — they verify the core honest-over-slick promise (real Sepolia tx, ENS resolves, real receipts, real Umia venture, live auction state, builder bond locked).
Gates 2, 6, 11, 12 are **HIGH** — credibility-degrading (live ENS resolution, reproducibility, milestone state, ENSIP-26 record resolution).
Gates 4, 5 are **MEDIUM** — polish (proposal text, mock labeling).

---

## GATE-1 — Real Sepolia tx during agent paid query

**Claim:** Demo agent (GrantScout) executes a real paid query during demo, not pre-recorded.

**Verify:**
- During demo §150-210, query triggers a real Sepolia tx
- New tx hash appears in agent receipts feed
- Tx is visible on Sepolia explorer (Etherscan, Blockscout)
- Tx timestamp matches demo time (within 60s)

**Pass criteria:** Sepolia explorer link shows fresh tx with matching `Receipt` event emitted.

---

## GATE-2 — Live ENS subname resolution

**Claim:** `grantscout.agentfloat.eth` resolves to current agent metadata at demo time.

**Verify:**
- During demo §25-80, ENS resolution happens client-side via wagmi/viem
- Browser DevTools → Network tab shows ENS RPC calls
- Resolution returns ENSIP-26 records (`agent-context`, `agent-endpoint[web]`, `agent-endpoint[mcp]`) + namespaced extensions (`agentfloat:umia_venture`, `agentfloat:bond_vault`, `agentfloat:milestones`, `agentfloat:receipts_pointer`)

**Pass criteria:** No cached/hardcoded display. RPC call visible in network log.

---

## GATE-3 — Real receipts feed (filtered Sepolia events)

**Claim:** Receipts shown on agent profile are real on-chain events, not mocked.

**Verify:**
- Receipts feed reads `ReceiptLog` events filtered by agent address
- Each receipt links to its Sepolia tx
- Click any receipt → opens Sepolia explorer to verify event

**Pass criteria:** Every visible receipt has a matching on-chain `ReceiptEmitted` event with same fields.

---

## GATE-4 — Real funding proposal (not Lorem ipsum)

**Claim:** Funding proposal text reflects what builder actually needs.

**Verify:**
- Proposal references concrete spend categories (Apify credits, AI Gateway tokens, compute)
- Numbers are reasonable for agent's stated use case
- No Lorem ipsum, no "TODO", no placeholder text

**Pass criteria:** Manual review confirms proposal is plausible and specific.

---

## GATE-5 — Mocked components labeled

**Claim:** Any feature simulated for demo purposes is labeled `mock: true` visibly in UI.

**Verify:**
- Walk through demo flow
- Identify any simulated component (e.g., Umia simulator if real Umia API not integrated)
- Confirm label is visible (badge, watermark, or inline text)

**Pass criteria:** No simulated component is presented as real.

---

## GATE-6 — Reproducibility from `git checkout`

**Claim:** Anyone can clone the repo and reproduce the demo.

**Verify:**
- Fresh clone on different machine
- `pnpm install` succeeds
- Environment variables documented in `.env.example`
- `pnpm dev` starts platform without errors
- Local agent query flow works end-to-end with documented Sepolia keys

**Pass criteria:** Independent reviewer can run the demo within 30 minutes of cloning.

---

## GATE-7 — Umia venture linked

**Claim:** Each Agent Float-registered agent points to a real Umia venture.

**Verify:**
- Resolve `<agent>.agentfloat.eth` → read text record `agentfloat:umia_venture`
- Verify the address is a valid Umia venture (matches Umia's known venture pattern, returns expected metadata when called)
- `AgentRegistry.getAgent(ensNode).umiaVenture` returns the same address

**Pass criteria:** ENS record and on-chain registry agree on the Umia venture address; address is non-zero and belongs to Umia.

---

## GATE-8 — Umia auction visible from agent profile

**Claim:** Investors can see Umia Tailored Auction state directly from the Agent Float profile.

**Verify:**
- Open `/agent/<ens-name>` profile in browser
- Auction state visible: live (with current clearing price progression) or post-auction (with final clearing data)
- "Fund via Umia" CTA present and resolves to a real Umia auction page
- No mocked auction data unless explicitly labeled `mock: true`

**Pass criteria:** Auction data is fetched from Umia (not fabricated), state correctly reflected, CTA functional.

---

## GATE-9 — Receipts feed verified (signed + USDC-cross-validated)

**Claim:** Receipts shown on agent profile are real on-chain events, signed by agent wallet, tied to actual USDC transfers.

**Verify:**
- Receipts feed reads `ReceiptLog` events filtered by agent address
- For each receipt: ECDSA recover from `signature` matches the agent's ENS-resolved wallet
- For each receipt: corresponding USDC `Transfer(from=payer, to=agent, amount=paymentAmount)` event exists in same block range
- `ReceiptLog.emitReceipt()` reverts on signature mismatch or USDC mismatch (test path)

**Pass criteria:** All visible receipts pass both signature and USDC cross-validation.

---

## GATE-10 — Builder bond locked at registration

**Claim:** `BuilderBondVault` holds builder's USDC collateral immediately after registration.

**Verify:**
- After `AgentRegistry.registerAgent()` tx, inspect `BuilderBondVault` balance
- Equals `builderBond` USDC parameter passed at registration
- Builder cannot withdraw without slash trigger or end-of-life payout

**Pass criteria:** Bond locked at correct amount; non-extractable absent trigger.

---

## GATE-11 — Milestone state queryable

**Claim:** Milestones committed at registration are visible and individually queryable from the agent profile.

**Verify:**
- `MilestoneRegistry.getMilestones(ensNode)` returns full milestone array
- Each milestone has `(id, description, deadline, met, failed, releaseAmount)`
- UI surfaces milestones with current status (pending/met/failed)
- Trigger silence or expiry → check `checkExpired()` correctly marks failed
- Failed milestone triggers BuilderBondVault slash flow

**Pass criteria:** Milestones queryable, statuses correctly tracked, slash trigger fires on miss.

---

## GATE-12 — ENS records resolve correctly (ENSIP-26 + namespaced extensions)

**Claim:** `<agent>.agentfloat.eth` resolves with both ENSIP-26 standard records and Agent Float namespaced extensions.

**Verify:**
- Live ENS resolution via wagmi/viem in browser
- Read records: `agent-context`, `agent-endpoint[web]`, `agent-endpoint[mcp]` (ENSIP-26)
- Read records: `agentfloat:umia_venture`, `agentfloat:bond_vault`, `agentfloat:milestones`, `agentfloat:receipts_pointer` (namespaced)
- All records return non-empty values; addresses are valid contracts
- No hard-coded values in UI; everything resolved from ENS

**Pass criteria:** All listed records resolve live; values correct and addresses verifiable.

---

## Pre-demo verification checklist

Before submitting to Devfolio:

- [ ] All 12 gates run through dry-run successfully
- [ ] Recording fallback exists for each demo segment
- [ ] All deployed contracts verified on Sourcify
- [ ] Demo wallets pre-funded
- [ ] Bonding curve pre-warmed (1-2 small buys)
- [ ] Receipts feed has 3+ real events
- [ ] ENS subname resolves on first try
- [ ] `.env.example` complete
- [ ] README has run instructions
- [ ] Sourcify links visible on agent profile

## In-demo verification

During the live demo, mention key gates verbally:

- §25-80: *"ENS resolves live — you can see this in the network tab"* (GATE-2)
- §150-210: *"This is a real Sepolia tx — here's the explorer link"* (GATE-1, GATE-3)
- §150-210: *"USDC split happens on-chain — verify in the tx"* (GATE-9)
- §250-280: *"Builder bond is locked here — link to contract on explorer"* (GATE-12)

## Post-demo verification (judges)

Judges who want to dig deeper can:

1. Open Sepolia explorer with provided contract addresses
2. Verify token total supply is exactly 2,000,000
3. Click any receipt → verify Receipt event matches displayed data
4. Verify all contracts source-verified on Sourcify
5. Clone repo and run locally

## Honest-over-slick discipline

If during dry-run a gate fails, do not paper over it. Either:

1. Fix the underlying mechanism so the gate passes honestly
2. Remove that part of the demo entirely
3. Add `mock: true` label and acknowledge in voiceover

Never claim a gate passes if it doesn't. The discipline is the moat.
