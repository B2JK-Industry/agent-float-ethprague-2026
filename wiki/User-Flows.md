# User Flows

## Main Loop

```text
Builder has working agent
  -> Agent emits receipts
  -> Builder creates Umia venture
  -> Agent Float registers agent
  -> ENS passport resolves venture + proof data
  -> Investor funds through Umia Tailored Auction
  -> Agent keeps emitting receipts
  -> Milestones update
  -> Builder bond protects default path
```

## Builder Flow

1. Builder operates an agent that already performs paid work.
2. Agent has a wallet for signing receipts.
3. Agent emits initial receipts through `ReceiptLog`.
4. Builder runs `umia venture init`.
5. Umia creates the venture wrapper, token, Tailored Auction, and treasury.
6. Builder calls Agent Float `registerAgent`.
7. Agent Float:
   - issues or links ENS subname,
   - writes ENSIP-26 records,
   - stores Umia venture pointer,
   - locks builder bond,
   - registers milestones.
8. Builder profile becomes visible to investors.
9. Builder keeps operating the agent.
10. Milestones and receipts update the public profile.

## Investor Flow

1. Investor opens Agent Float.
2. Investor browses working agents.
3. Investor opens an agent profile.
4. Investor checks:
   - ENS passport,
   - receipts feed,
   - Umia auction state,
   - builder bond,
   - milestone status,
   - agent category and proposal.
5. Investor clicks **Fund via Umia**.
6. Investor lands on the Umia Tailored Auction page.
7. Investor bids through Umia.
8. Umia settles auction and credits venture tokens according to its mechanics.
9. Investor returns to Agent Float.
10. Investor watches receipts and milestone progress.

## End User Flow

1. End user calls the agent service.
2. End user pays USDC for the output.
3. Agent performs work.
4. Agent signs a receipt.
5. Receipt is posted to `ReceiptLog`.
6. Agent Float profile updates.

The end user does not need to understand the whole venture system. Their payment becomes proof that the agent is useful.

## Failure Flow: Agent Goes Silent

1. Agent stops emitting receipts for the configured threshold.
2. Silence detector or keeper identifies missing activity.
3. `BuilderBondVault.slash()` becomes callable if conditions are met.
4. Builder bond is distributed pro-rata to current Umia venture token holders.
5. Agent profile shows default/default-risk state.

## Failure Flow: Milestone Missed

1. Builder commits milestone at registration.
2. Milestone deadline passes.
3. Oracle/multi-sig marks milestone failed.
4. `BuilderBondVault.slash()` becomes callable.
5. Bond payout path activates.

## Demo Flow

The demo uses investor POV:

1. Landing page.
2. GrantScout profile.
3. ENS resolution.
4. Receipts feed.
5. Fund via Umia.
6. Return to Agent Float.
7. Trigger live paid query.
8. New receipt appears.
9. Bond and milestone panel.
10. Closing tagline.

