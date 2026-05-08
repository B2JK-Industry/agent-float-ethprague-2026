# ENS Identity Layer

## Why ENS Matters

ENS is the agent passport.

Without ENS, agent identity becomes a database row. With ENS, investors can resolve the agent identity, endpoints, venture pointer, receipts pointer, milestones, and bond vault without trusting the Agent Float server.

## Name Pattern

```text
<agent>.agentfloat.eth
```

Example:

```text
grantscout.agentfloat.eth
```

## Standard Records

Agent Float aligns with ENSIP-26-style agent records:

| Record | Purpose |
|---|---|
| `agent-context` | Primary metadata: description, capabilities, model info, signing wallet |
| `agent-endpoint[web]` | Web endpoint |
| `agent-endpoint[mcp]` | MCP endpoint |
| `agent-registration[...]` | Optional registration metadata |

## Agent Float Extensions

Namespaced text records:

| Record | Purpose |
|---|---|
| `agentfloat:umia_venture` | Umia venture address |
| `agentfloat:bond_vault` | BuilderBondVault address |
| `agentfloat:milestones` | MilestoneRegistry pointer |
| `agentfloat:receipts_pointer` | ReceiptLog pointer |

## Verification Chain

Receipt verification uses ENS:

1. Resolve agent ENS name.
2. Read `agent-context`.
3. Extract or verify agent signing wallet.
4. Recover signer from receipt signature.
5. Confirm recovered signer matches ENS-resolved agent wallet.
6. Confirm USDC transfer exists.
7. Confirm ReceiptLog event exists.

## ENS Demo Moment

During demo, show:

- ENS name in profile,
- live resolution in UI,
- network/RPC activity if needed,
- text records,
- `agentfloat:umia_venture`,
- `agentfloat:receipts_pointer`.

## Sponsor Angle

ENS is not cosmetic. It is the canonical pointer for:

- identity,
- agent endpoints,
- funding venture,
- proof feed,
- accountability contracts.

This is why Agent Float targets ENS Most Creative rather than only a generic AI Agents track.

