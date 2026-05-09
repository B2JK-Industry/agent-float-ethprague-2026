# Bench Mode — Component Patterns

> **Source-of-truth (canonical reference HTML in this repo):**
> - `assets/brand/bench-v2-foundations.html` — DEV MANUAL 02 OF 06, v0.7. Tokens (color, type, space, motion, a11y).
> - `assets/brand/bench-v3-components.html` — DEV MANUAL 03 OF 06, v0.7 (2026-05-09). **13 components, every state.** Anatomy + states + tokens + do/don't per component.
> - `assets/brand/bench-v1-sequential-review.html` — FILE 01 OF 04, v1.1. UI mockup of allocator demo flow (Agent North/Meridian/Halo).
> - `assets/brand/tokens.css` — extracted CSS custom properties.
>
> All token references use the names defined in `tokens.css`. **Do not hard-code hex values** — if you reach for one, you are missing a token. Open an issue.
>
> **Authority order:** v3 (components, anatomy of individual parts) > v2 (foundations, tokens) > v1 (layouts, how parts compose into a page). Where v3 specifies a component, v3 wins. Where v3 is silent, fall back to v2 + v1 + operating principles.
>
> **Authority for `/r/[name]` Single-Contract Mode** is `assets/brand/brand-manual.html` (US-067 v1.0). It is a SEPARATE visual system. Do not pull from it for Bench Mode work.

---

## 0. Operating Principles (v2 §0)

Five non-negotiable rules. Every component below derives from these:

1. **Color is information, not decoration.** Every color carries one meaning. The same hue does not get reused for a different role; the same role does not get expressed in two hues.
2. **Siren red is reserved.** Only for refusal moments — invalid signature, replaced citation, fictional registry. Never as a hover state, never as a brand accent.
3. **Trust and Confidence are different gradients.** Trust runs cool (verified ▲) → discounted (▼). Confidence runs neutral-warm (HI ●) → LO (●). Do not collapse them.
4. **The system is flat.** No drop shadows, no gradients on surfaces, no glows except the heartbeat dot. Depth comes from border weight and ink density.
5. **Type does the heavy lifting.** Four families, four jobs: **Display** (Space Grotesk) → verdicts/numbers, **Body** (Inter) → paragraphs, **Mono** (JetBrains Mono) → evidence/values, **Serif italic** (Source Serif 4) → human voice (quotes, claims, brand asides).

**Carry-rules (v2 §2B):**
- Color is a redundancy, not a sole signal. Every state ships with a glyph (`✓ ⊘ ✕`), label, or numeric multiplier.
- Dashed border is reserved for "missing source" only. The colorblind-safe identifier.

**Banned (v2 §5C + v3):**
- ✕ Drop shadows except heartbeat dot.
- ✕ Gradients on surfaces.
- ✕ Bouncing animations / spring overshoots above 4%.
- ✕ Counting-up score numbers. Numbers land at full value.
- ✕ Parallax.
- ✕ Rounded corners except heartbeat dot (`var(--r-pulse)`).
- ✕ Reusing `--siren` / `--o-block` for hover states or brand accents.

---

## v3 Components (13 parts — anatomy spec)

Each entry: anatomy + state list + key tokens + do/don't headlines. Full visual reference + extended commentary in `bench-v3-components.html` (live document — open in browser to see rendered states with grid overlay).

### C-01 · Tier Monogram

```
<TierMonogram tier="a" label="FAST-TRACK" />
```

**The dominant mark.** 160 × 200 tile with single A/B/C/D/U letter.

| Anatomy | Spec |
|---|---|
| Outer tile | 160 × 200, `1px solid var(--border-strong)`, bg `var(--surface)`, radius 0 |
| Letter | 88px Display 700, tracking `-0.04em`, line-height 0.85, color `var(--tier-{a,b,c,d,u})`, optical centering |
| Separator rule | 1px solid for A/B/C/D, **1px dashed** for tier U (unrated/queue) |
| Caption | 9/10px Mono UPPERCASE, top line `var(--t1)` 0.18em + bottom descriptor `var(--t3)` 0.16em |

**States:** A (cyan, ≥4 verified sources) · B (ink white, neutral) · C (brass, evidence required) · D (bronze, block) · U (graphite, dashed separator).

**Do** · one monogram per agent per artefact · pair monogram + score tile + outcome chip as one unit · keep tiles square.
**Don't** · tint letter to non-token color · add glow/shadow/fill behind letter · compress below 120 × 160 (letter min 64px).

**Tokens:** `--surface` `--border-strong` `--tier-{a,b,c,d,u}` `--display 700/88/-0.04em`

---

### C-02 · Score Tile

```
<ScoreTile value={87} max={100} tier="a" />
```

**The headline number.** 0–100, always tabular, always landed.

| Anatomy | Spec |
|---|---|
| Label | 9/14px Mono 0.18em UPPERCASE, color `var(--t3)`, "SCORE · 0–100" — never "/100" in label |
| Number | 88px Display 700, tier color, tracking `-0.04em`, `tabular-nums` mandatory, lands instantly (`--t-instant`) — never animated up |
| "/100" max | 18px Display 500, `var(--t3)`, baseline-aligned to number |

**States:** A=87 (cyan) · C=52 (brass) · D=28 (bronze) · Pending=`—` placeholder (em-dash, never `0`).

**Do** · land instantly (verdict not slot machine) · `tabular-nums` always · color matches tier exactly.
**Don't** · count up (no `0 → 87` tween) · show `0` for unjudged (use em-dash) · gradient/two-tone fill on number.

**Tokens:** `--display 700/88/-0.04em` · `--mono 500/9/0.18em` · `tier-*` color · `tabular-nums` · `--t-instant`

---

### C-03 · Outcome Chip

```
<OutcomeChip kind="fast" />
```

**The verdict instruction.** 1 of 4 values, pairs with tier monogram.

| Anatomy | Spec |
|---|---|
| Frame | `1px solid currentColor`, radius 0, padding `8 14`, transparent fill EXCEPT `block` gets `rgba(255,59,48,0.08)` |
| Glyph | Mono 13px — `▶` fast · `◆` emerge · `⚠` evid · `✕` block. **Carries meaning if hue missing — never drop it.** |
| Label | 11px Mono 500, 0.16em UPPERCASE — `FAST-TRACK` · `EMERGING` · `EVIDENCE-REQUIRED` · `BLOCK` |

**States (the four canonical outcomes):**
- `FAST-TRACK` (cyan `--o-fast`) — Allocate now. Tier A only.
- `EMERGING` (ink white `--o-emerge`) — Pilot tranche. Tier B.
- `EVIDENCE-REQUIRED` (brass `--o-evid`) — Send back for proof. Tier C.
- `BLOCK` (siren `--o-block`) — Refusal. Tier D. **Only chip with tinted background (8%).**

**Do** · exactly one chip per verdict · keep glyph (color-blind carry) · use BLOCK only when Bench refuses.
**Don't** · invent new outcomes (no REVIEW/WATCH/HOLD — four values total) · fill chip with hue (BLOCK 8% tint excepted) · use BLOCK as hover or destructive button.

**Tokens:** `--o-fast` `--o-emerge` `--o-evid` `--o-block`

---

### C-04 · Trust Pill

```
<TrustPill x={0.85} state="part" />
```

**Per-source multiplier — discount made visible.**

| Anatomy | Spec |
|---|---|
| Multiplier form | `×0.00` to `×1.00`, Mono 10/500, 0.06em, padding `3 8`, `1px solid currentColor`, **two decimals always** (`×0.30` not `×.3`) |
| Invalid form | Word form `INVALID` (or `FORGED` / `404`), `--o-block` color, 8% tinted bg, solid border. **Never mix multiplier + word — pick one per source.** |
| Missing form | `×0.00`, dashed border, `--src-missing`. **Distinct from invalid — silence vs. lie.** |

**States:** FULL `×1.00` (cyan, default for Sourcify/ENS sig/EIP-1967) · PARTIAL `×0.40–0.85` (brass, "we trust this, but…") · DISCOUNTED `×0.20–0.40` (bronze, just barely counts) · MISSING `×0.00` (dashed, source did not return) · INVALID (siren tinted, active forgery).

**Do** · one pill per source row in Trust Ledger · always two decimals · dashed border for missing (CB-safe).
**Don't** · use percentages (`40%` — multiplier semantics clearer) · display `×1` (`×1.00` for alignment) · mix INVALID and `×0.00`.

**Tokens:** `--src-verified` `--src-partial` `--src-discounted` `--src-missing` (dashed) `--o-block`

---

### C-05 · Source Row

```
<SourceRow source="sourcify" weight={0.35} trust="full" />
```

**One source per row.** Dot + name(+sub) + trust pill + weight.

| Anatomy | Spec |
|---|---|
| Status dot | 8 × 8 — verified gets 6px halo (`box-shadow: 0 0 6px`); missing gets `border: dashed` no fill |
| Name + sub | Mono 12 / Mono 10 — name `var(--t1)`, sub `var(--t3)` 10/16. **Truncate sub on overflow with ellipsis; never truncate name.** |
| Trust pill | C-04 component, right-aligned, vertically centered |
| Weight | Mono 10, 0.16em, `var(--t3)`, `w 35%` form. **Weight is score-math contribution, NOT trust multiplier.** |

**States:** FULL (halo dot, cyan pill) · PARTIAL (solid dot, brass) · MISSING (dashed border + dashed dot, the silence) · INVALID (siren dot + tinted pill, the lie).

**Do** · one source per row (no grouping under summary) · show second line (provenance details earn trust) · order by descending weight, NOT trust state.
**Don't** · truncate name (shrink another column) · fill row bg with trust color · show multiplier inline as string.

**Tokens:** `--surface` `--border` (`dashed` when missing) `--mono 12/10` + all source-state tokens

---

### C-06 · Axis Bar

```
<AxisBar name="substance" weight={0.50} earned={46} max={50} />
```

**One of three score axes.** Earned/max with line items.

| Anatomy | Spec |
|---|---|
| Name + weight | Mono 10 0.16em — name `var(--t1) 500` UPPERCASE, weight `var(--t3) 400`, format `w 0.50 · 50pt max` |
| Earned/max | 18px Display 600, earned `var(--t1)`, max `var(--t3) 13`, `tabular-nums`, baseline aligned |
| Fill bar | 6px high, track `var(--border)`, fill driven by ratio: **≥0.80 cyan (`--src-verified`)** · **0.50–0.79 brass (`--src-partial`)** · **<0.50 bronze (`--src-discounted`)**. **No animation on score change.** |
| Line items | Mono 10, row 6px y-pad, label left `var(--t2)`, earned/max right `var(--t1)`, dotted dividers |

**States:** High ≥0.80 (cyan fill, strong axis) · Med 0.50–0.79 (brass) · Low <0.50 (bronze, trust collapse axis).

**Do** · always show line items beneath bar (bar without them is decoration) · `tabular-nums` on every numeric column · order axes consistently (Substance · Provenance · Relevance).
**Don't** · animate fill width on score reveal · flip axis colors to "warning amber" (siren reserved) · render partial line items (all four or none).

**Tokens:** `--display 600/18/-0.01em` · `--mono 10/0.16em` · thresholds 0.80 / 0.50

---

### C-07 · Math Line

```
<MathLine axes={[46, 22, 23]} trust={0.96} result={87} />
```

**Final formula resolution.** The auditor's worksheet bottom row.

| Anatomy | Spec |
|---|---|
| Expression | Mono 13 — operators `var(--t3)`, grouped values `var(--t1)`, `&nbsp;` around `+ × =`. **Two intermediate steps max** — anything more goes into worksheet body |
| Result | Display 700 32px, tier-matched color, tracking `-0.02em`, `margin-left: auto` (right-pinned), **always two decimals** (`87.36` not `87`) |

**States:** Result color tracks verdict tier (A cyan / B ink white / C brass / D bronze).

Format example:
```
( 46 + 22 + 23 ) × 0.96 = 91 × 0.96 = 87.36
```

**Do** · show actual arithmetic (opaque models lose trust) · two decimals on every numeric · pin result right with auto margin.
**Don't** · compress formula into one step (show `91 × 0.96` middle) · round to integers in math line (only headline does that) · decorate with extra equality glyphs/arrows.

**Tokens:** `--mono 13` · `--display 700/32/-0.02em` · tier-* color on result

---

### C-08 · Docket Step

```
<DocketStep idx={2} state="active" />
```

**Stepper item** for sequential review. `pending → active → done`.

| Anatomy | Spec |
|---|---|
| Done | Index in tier color, border in tier color, bg `var(--surface)`. Right pill: `{TIER} · {SCORE} · {OUTCOME}` in outcome color |
| Active | **3px left border in `var(--accent)`**, bg inverts to `var(--bg)`, index gets cyan tint `rgba(0,184,217,0.08)`, right pill `UNDER REVIEW` accent |
| Pending | Dashed index border, everything `var(--t3)`, right pill `PENDING` dashed |
| Right pill | Mono 9, 0.14em, 1px solid currentColor — dashed for pending only |

**States:** PENDING (dashed, inactive) · ACTIVE (cyan accent left rail, in focus) · DONE-A (cyan, FAST) · DONE-D (bronze, BLOCK — promise made physical).

**Do** · render rows in queue order (steppers sequential, NOT leaderboard) · on NEXT, transition `active → done` + `next-pending → active` same frame (160ms) · keep tier color on done index AND pill (same verdict).
**Don't** · sort by score (bench reviews in queue order) · allow editing done verdict from docket (that's report's job) · show "skip" affordance (reviewer rolls forward only).

**Tokens:** `--accent` (active) · tier-* on done · outcome-* on done pill

---

### C-09 · Heartbeat Dot

```
<Heartbeat state="ok|warn|crit" label="Bench is reading" />
```

**The only ambient motion.** Proves Bench is live.

| Anatomy | Spec |
|---|---|
| Dot | 8 × 8, `border-radius: 50%` (the only exception, `var(--r-pulse)`) — color `var(--src-verified|review|o-block)`, pulses outward via `box-shadow` rgba 0.55 → 0 across `--t-pulse` 2s ease-out infinite |
| Label | Mono 11, 0.14em UPPERCASE, `var(--t2)`. **Pair format: action verb in present continuous** (`READING`, not `READ`) |

**States:** OK cyan (default, term-bar mode word) · WARN amber (source slow/stale, Bench still reads) · CRIT siren (verdict refused — once per session max).

**Do** · heartbeat as system-status signal, not decoration · respect `prefers-reduced-motion: reduce` (replace pulse with static dot) · keep pulse exactly 2.0s.
**Don't** · put heartbeat next to button (buttons not alive) · pulse on hover (hover gets `--t-quick`) · add second dot (one per surface max).

**Tokens:** `--t-pulse 2s ease-out` · `r 9999px` (only here) · `--src-verified` `--review` `--o-block`

---

### C-10 · Button

```
<Button kind="primary|default|ghost|refuse" disabled? />
```

**Five kinds.** Primary · default · ghost · refuse · disabled.

| Anatomy | Spec |
|---|---|
| Frame | 1px solid, radius 0, padding `12 20`, transition `120ms cubic-bezier(0.2,0,0,1)` on bg+color, transparent fill EXCEPT `.primary` |
| Label | 11px Mono 500, 0.16em UPPERCASE — arrows `← →` as separate glyph children with `gap: 10px`, **never wrap** (use `&nbsp;` to keep label on one line) |
| Focus | **3px solid `var(--accent)` outline, offset 2** — `:focus-visible` ONLY (not `:focus`). Hover inverts: bg `var(--t1)`, color `var(--bg)` |

**States:**
- `PRIMARY` — accent fill + bg text, the forward action, **one per surface**
- `DEFAULT` — transparent fill, t1 border, companion/secondary
- `GHOST` — softer: border `var(--border-strong)`, text `var(--t2)`, tertiary
- `REFUSE` — `var(--o-block)` outline, fills on hover (destructive/refusal only — NOT for harmless deletes)
- `DISABLED` — border + label drop to `var(--t3)`, `cursor: not-allowed`

**Do** · exactly one PRIMARY per surface (if you need two, design is wrong) · use REFUSE only for destructive/refusal, NOT for CRUD deletes · always wire `:focus-visible` with 3px accent ring.
**Don't** · round corners (system has one radius: zero) · add icons inside label (only `← →` arrows or external glyphs) · use filled siren button as "delete" (it's contract refusal, not CRUD).

**Tokens:** `--mono 11/0.16em UPPERCASE` · pad `12 × 20` · `--t-quick 120ms` · `--e-ui`

---

### C-11 · Evidence Row

```
<EvidenceRow source="sourcify" hash="0x…" verdict="ok|fail|miss" />
```

**The proof itself.** Lives only in evidence drawer (L2 raised surface).

| Anatomy | Spec |
|---|---|
| Source tag | Mono 10, 0.06em UPPERCASE, `var(--accent)`. **Six canonical tags:** `SOURCIFY` · `ENS` · `SIG` · `REGISTRY` · `IPFS` · `RPC`. **New tags require v3 patch.** |
| Body | Body 13, line-height 1.55 — plain English finding + actual hash/path/identifier on its own `.hash` line in Mono 11 `var(--accent)`, `word-break: break-all` |
| Check | Mono 11, 0.06em — `✓ OK` (`--src-verified`) · `✕ INVALID` (`--o-block`) · `⊘ NOT FOUND` (`--src-missing`). Right-aligned, **top-aligned** (not centered) |

**States:** OK (solid border, cyan check, the proof) · INVALID (solid, siren check, the lie) · MISSING (dashed border, graphite check, the silence).

**Do** · always show actual hash/path/address (proof, not summary) · keep evidence rows on `--raised` (L2, not commentary) · cluster rows by source family (chain → registry → off-chain).
**Don't** · truncate hash with ellipsis on desktop (wrap it) · translate source tag (SOURCIFY/ENS/RPC are protocol names) · pair evidence row with thumbs-up or human emoji (check glyph IS the icon).

**Tokens:** `--raised` (L2) · `--accent` (tag, hash) · 3 verdicts ok/fail/miss

---

### C-12 · FINAL Stamp

```
<FinalStamp date="2026-05-09" />
```

**Used once per artefact.** Marks docket closed. Ink on paper.

| Anatomy | Spec |
|---|---|
| Frame | **3px solid `var(--stamp)` + inner 1px inset 4px**, rotation `-6deg`, padding `18 28`, radius 0, bg `var(--paper)`. **Lives only on paper-colored surfaces.** |
| Word | Display 700 24, 0.18em UPPERCASE — **"FINAL" only, never localize**. Color `var(--stamp)` `#9E1E14` |
| Caption | Mono 10, 0.20em — format `LEDGER CLOSED · YYYY-MM-DD`, single line, baseline-attached below word |

**States:** FINAL (default, max one per artefact) · scaled-small (acceptable down to 14px headline; never below).

**Do** · animate lander once with `--t-stamp` (300ms cubic-bezier(0.6,0,0.4,1)), then still · only on paper/paper-alt surfaces · ISO date (`2026-05-09`, not `May 9, '26`).
**Don't** · put on dark surfaces (stamp belongs to printed filing) · loop rotation or pulse border (land it, stop) · add second stamp (no `APPROVED` / `REJECTED` — `FINAL` is the only word).

**Tokens:** `--paper` · `--stamp` · `--t-stamp 300ms` · `--e-stamp`

---

### C-13 · Verdict Head (composite)

```
<VerdictHead agent={...} />
```

**Composite** of monogram + name + claim + score + outcome. The page-opener.

| Anatomy | Spec |
|---|---|
| Layout | `grid-template-columns: 160 1fr auto`, gap 24, `align-items: start`. Folds beneath name block at `<720px` |
| Monogram | C-01 component, fixed 160 × 200 left column |
| Name block | Eyebrow Mono 10 0.18em accent · H3 Display 600 32px ("Reviewing Agent *{Name}.*" with name **italic-serif**) · ENS Mono 11 t2 · claim Source Serif 4 italic 16/24 |
| Right stack | column gap 12 — score tile (C-02) on top, outcome chip (C-03) below, both right-aligned. Vertical until 720px |
| Claim | Source Serif italic 16/24, **quoted**, max-width 48ch, `text-wrap: pretty`. **The agent's words, in their voice — never paraphrased.** |

**States:** A · 87 · FAST (cyan stack) · B · 71 · EMERGE (ink white) · C · 52 · EVID (brass) · D · 28 · BLOCK (siren outcome).

**Do** · always show monogram + score + outcome together (one verdict, one unit) · use agent's own claim, quoted in serif italic with quote marks · match score color to tier monogram color exactly.
**Don't** · paraphrase claim into "key takeaways" · show non-tabular score (digits dance between agents) · add portrait/logo/avatar (Bench reviews words and proofs, not faces).

**Tokens:** uses C-01 + C-02 + C-03 · `--display 600/32` · `--serif italic 16/24`

---

## Layout Patterns from v1 (how parts compose)

The 13 components above are atoms. v1 Sequential Review.html shows how they compose into a page. The patterns below are reproduced from v1 verbatim for Bench Mode `/b/[name]` reuse:

### L-A · Terminal Bar (sticky top navbar)

`grid: auto 1fr auto`, gap 24, padding `14 24`, `position: sticky; top: 0; z-index: 10`, bg `--bg`, border-bottom `--b-hair`. Lockup left (logo SVG + "UPGRADE SIREN / BENCH" Mono 11 0.08em) · session id center (truncate with ellipsis) · meta right (heartbeat dot C-09 + date/time).

### L-B · Page Document Container

`max-width: 1480px; margin: 0 auto; padding: 40px 32px 64px`. Section gutters `--s-16` 64px between sections.

### L-C · Report Two-Pane Grid (per-applicant page)

`grid-template-columns: minmax(0, 1fr) 380px`, gap 1px on `--border` background (creates single hairline). Responsive: collapses to 1 column below 1080px. Left panel `bg: --bg, padding: 32px`. Right evidence drawer `bg: --raised, padding: 32px`.

### L-D · Subject Bar (per-applicant headline)

`margin-top: 32px; grid: 1fr auto; gap: 32px; align-items: flex-end; padding-bottom: 20px; border-bottom: --b-hair`. Eyebrow + h1 (clamp 40-64px, agent name in italic serif via `<em>`) + ENS line in accent. Nav buttons right (Prev / Next Applicant primary).

### L-E · Bench Reads Block (verified findings list)

`margin-top: 32px; padding: 20px; bg: --surface; border-left: 3px solid --border-strong`. Item layout `grid: 18px 1fr; gap: 10px; padding: 8px 0; Mono 13; line-height: 1.45`. Glyph variants per v2 §2B carry-rule: `.ok .icn { color: --src-verified }` (`✓`) · `.warn` (`⊘` or `⚠`) · `.bad` (`✕`).

### L-F · Score Math Worksheet

`border: --b-hair; bg: --surface`. Math head + math formula (centered, bg --bg) + 2-column math grid (1fr 1fr, responsive 1-col below 780px) where each `.math-axis` block contains AxisBar (C-06) instances + Math Line (C-07) at the bottom.

---

## Banned Patterns (consolidated)

- ✕ Drop shadows except heartbeat dot (`0 0 8px var(--src-verified)`)
- ✕ Gradients on surfaces — backgrounds are flat solid color tokens
- ✕ Bouncing animations / spring overshoots above 4%
- ✕ Counting-up scores — numbers land at full value
- ✕ Parallax — backgrounds stay still
- ✕ Rounded corners except heartbeat dot (`var(--r-pulse)`)
- ✕ Reusing `--siren` / `--o-block` for hover states or brand accents
- ✕ Dashed borders except `--b-dash` for missing source
- ✕ Inventing new outcome chips (4 values total: fast / emerge / evid / block)
- ✕ New evidence source tags (6 canonical: SOURCIFY / ENS / SIG / REGISTRY / IPFS / RPC)
- ✕ More than one PRIMARY button per surface
- ✕ More than one heartbeat dot per surface
- ✕ More than one FINAL stamp per artefact
- ✕ Score number in non-tabular figures (digits dance between agents)
- ✕ Paraphrased claims (agent's own words, in serif italic with quote marks)

---

## Extrapolation Tracker (v3 RESOLVES most)

Items previously extrapolated, now resolved by v3:

| Was extrapolated | Now resolved by |
|---|---|
| Button anatomy (hover/focus/disabled/ghost/danger) | C-10 Button §10 |
| Tier monogram exact dimensions | C-01 |
| Score tile typography | C-02 |
| Outcome chip 4-state set | C-03 |
| Trust pill multiplier format | C-04 |
| Source row (dot + name + sub + pill + weight) | C-05 |
| Axis bar fill thresholds | C-06 (≥0.80 / 0.50–0.79 / <0.50) |
| Math line formula presentation | C-07 |
| Docket step state machine | C-08 |
| Heartbeat dot timing + states | C-09 |
| Evidence row format | C-11 |
| FINAL stamp anatomy | C-12 |
| Verdict head composition | C-13 |
| Mobile breakpoint behavior | partial — C-13 specifies 720px fold-rule |

Still pending v4 (per v3 footer "NEXT · v4 patterns"):

```
// EXTRAPOLATED FROM v2 PRINCIPLES + v3 component anatomy — NOT IN MANUAL (waiting on v4)
- Page-level layout patterns beyond v1 (multi-page navigation, side panels)
- Form input anatomy (no input field appears in v3 — Bench /b/[name] takes ENS via /lookup/[name] route handler, not in-page form)
- Tooltip / popover anatomy
- Toast / notification anatomy
- Modal overlay scrim
- Empty state for /b/[name] when subject has no manifest at all (only public-read fallback specced)
- Mobile breakpoints below 780px for L-C report grid (only the C-13 720px fold is specified)
```

For any state still extrapolated, apply v2 §0 operating principles + v3 component primitives.

---

## Sources (canonical reference HTML in this repo)

- **`assets/brand/bench-v2-foundations.html`** — v2 Foundations (color, type, space, motion, a11y) — DEV MANUAL 02 OF 06
- **`assets/brand/bench-v3-components.html`** — v3 Components (13 atoms with anatomy + states + tokens + do/don't) — DEV MANUAL 03 OF 06 ← **opens in browser, has live render of every state with grid overlay**
- **`assets/brand/bench-v1-sequential-review.html`** — v1 Sequential Review (UI mockup of allocator demo flow) — FILE 01 OF 04
- `assets/brand/tokens.css` — extracted CSS custom properties
- `assets/brand/logo-bench.svg` — Bench-mode lockup mark
- `assets/brand/brand-tokens.json` v2.0.0 — machine-readable mirror
- `assets/brand/tailwind-preset.ts` — Tailwind 4 utility classes

**Pending:** Bench v4 Patterns (page-level composition) per v3 footer "NEXT · v4 patterns".

`assets/brand/brand-manual.html` (US-067 v1.0) is the **Single-Contract Mode (`/r/[name]`)** brand spec — NOT applicable to Bench Mode, except where `/b/[name]` embeds `/r/[name]` UI inside the Sourcify drawer per US-135.