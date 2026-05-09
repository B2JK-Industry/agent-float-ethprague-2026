# Demo recording — instructions

Record a 3-minute walkthrough of the booth flow. Save as `booth/demo-recording.mp4` (gitignored — too large for repo; host on Vercel static or YouTube unlisted and link from README).

## Pre-record

1. Browser at https://upgrade-siren.vercel.app, dark mode, full-screen, 1920×1080
2. OBS Studio or QuickTime, capture full screen, 60fps, 30Mbps bitrate
3. Audio: optional voiceover (lavalier mic) or silent — booth has speakers off anyway
4. Mouse: hover smoothly; do not click jitter

## Script — follow `docs/05-demo-script.md` exactly

| Time | Action | Notes |
|---|---|---|
| 0:00 | Hook: "Upgradeable contracts can change underneath users…" | Speak slowly, 1 sentence |
| 0:20 | Type `vault.upgrade-siren-demo.eth` in ENS lookup form, submit | Land on `/r/vault.upgrade-siren-demo.eth` |
| 0:45 | Live chain check: hover over evidence drawer "ENS records resolved live" | Drawer opens, judge sees `upgrade-siren:*` records resolving in real time |
| 1:10 | Sourcify evidence: click Sourcify links | New tab opens at sourcify.dev — judge confirms verification |
| 1:45 | Three scenarios: navigate `/demo`, click safe → dangerous → unverified | Each click flips the verdict card; SIREN scenarios trigger pulse animation |
| 2:20 | Governance comment: at dangerous scenario, click "Copy governance comment", paste into a text widget | Show short / forum / vote-reason format switcher |
| 2:45 | Sponsor close: "Sourcify is the evidence layer. ENS is the public contract map. Future Society public-good safety." | Land back on home page wordmark |

## Post-record

1. Trim to exactly 3:00 (cut intro/outro silence)
2. Export H.264, 30Mbps, MP4 container, ~600MB-1GB final size
3. Save as `booth/demo-recording.mp4` locally (gitignored)
4. Upload to YouTube unlisted OR Vercel static at `apps/web/public/demo-recording.mp4` (then accessible at `https://upgrade-siren.vercel.app/demo-recording.mp4`)
5. Link from `README.md` Current Status section + Devfolio submission body

## Why this matters

The recording is the **last-resort fallback** if the booth laptop completely dies, Wi-Fi melts, AND the Vercel production URL is unreachable (rare but possible — booth-day load on shared Wi-Fi). Walking through the script in front of the recording is still a valid 3-minute demo for judges.

Plus: pre-emptive screen recording lets you spot UX glitches before judges see them. Watch the recording end-to-end before the booth slot.

## Constraints

- **No emoji** in any UI overlay or audio
- **No corporate SaaS music** — silent or instrumental ambient max
- **Tagline `No source, no upgrade.` must appear** in the final frame (lower thirds or end card)
- **Hex addresses** truncated to first6+last4 in any zoom-in shot — do not show full burner private keys ever (env vars are gitignored, but be careful with terminal screenshots)