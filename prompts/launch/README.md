# Launch prompts

Four self-contained prompts for the autonomous dev pipeline. Each one is engineered to **self-activate** on read: when a Claude Code session encounters one of these files (either pasted content or a path), the agent enters the role immediately rather than treating it as a passive document.

## Recommended invocation

In four separate terminal windows, all from the repo root:

```bash
cd /path/to/Upgrade-Siren-ETHPrague2026
claude --dangerously-skip-permissions
```

Then activate each session with one of the two methods below.

## Two activation methods

### Method A: type the path (preferred)

In the Claude Code prompt, type just the path:

```
prompts/launch/release-manager.md
```

The session reads the file and the ACTIVATION preamble at the top of every launch prompt forces immediate role entry. This is the fastest method.

### Method B: paste the content

If Method A produces a session that asks "what do you want me to do" instead of activating, the session may be running an older prompt without the ACTIVATION preamble. Open the file, copy its full contents, paste as the first message. Add an explicit go signal at the bottom if the session still hesitates:

```
Activate this prompt as my first message. You ARE this agent now. Start the non-stop loop.
```

## The four agents

| Agent | Prompt file | Role | Launch order |
|---|---|---|---|
| Release Manager | `prompts/launch/release-manager.md` | review + merge + backlog status updates | start FIRST (idle-poll until PRs land) |
| Dev A | `prompts/launch/dev-a.md` | Contract Fixtures (US-001..US-013) | start in parallel with B and C |
| Dev B | `prompts/launch/dev-b.md` | Evidence Engine (US-014..US-036) | start in parallel with A and C |
| Dev C | `prompts/launch/dev-c.md` | Web UX + optional Siren Agent (US-037..US-058) | start in parallel with A and B |

The terminal numbers above are not a strict order — they reflect dependency: the Release Manager wants to be running before the first dev PR lands so it picks up reviews from the start.

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
