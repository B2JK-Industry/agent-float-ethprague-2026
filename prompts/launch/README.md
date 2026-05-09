# Launch prompts

Four self-contained prompts for the autonomous dev pipeline. Paste each into a separate Claude Code session.

## Recommended invocation

In four separate terminal windows, all from the repo root:

```bash
cd /path/to/Upgrade-Siren-ETHPrague2026
claude --dangerously-skip-permissions
```

Then paste the corresponding prompt into each session as the first message.

## The four agents

| Terminal | Prompt file | Role |
|---|---|---|
| 1 | `prompts/launch/dev-a.md` | Dev A — Contract Fixtures (US-001..US-013) |
| 2 | `prompts/launch/dev-b.md` | Dev B — Evidence Engine (US-014..US-036) |
| 3 | `prompts/launch/dev-c.md` | Dev C — Web UX + optional Siren Agent (US-037..US-058) |
| 4 | `prompts/launch/release-manager.md` | Release Manager — review + merge + backlog status updates |

## Order of launch

1. Start the **Release Manager** first. The repo has zero PRs; it enters idle-poll immediately.
2. Start **Dev A**, **Dev B**, **Dev C** in parallel. They begin opening PRs from their respective dependency-free items.
3. Once PRs land, the Release Manager wakes, reviews, and merges. Devs rebase on dependency merges and continue.

## What you (Daniel) do

Nothing during steady-state. You hold:

- the operator wallets and `.env` keys (Stream A halts gracefully if missing)
- final authority on escalations the Release Manager flags with `@daniel`
- the four start-at-scope-lock Tracker items (US-059, US-060, US-062, US-063)

The pipeline runs without you until any of those needs your input.

## Stop signals

To stop the pipeline:

- `@dev-a stop`, `@dev-b stop`, `@dev-c stop` — stop a specific dev stream
- `@release-manager stop` — stop the Release Manager (open PRs will sit unreviewed)
- Or just close the terminal windows; the agents are stateless across sessions.
