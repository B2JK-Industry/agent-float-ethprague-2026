# Bench Mode — Component Patterns

> Source-of-truth: `Bench v1 - Sequential Review.html` (FILE 01 OF 04, 2026-05-09 19:14 CET) and `Bench v2 - Foundations.html` (DEV MANUAL 02 OF 06, v0.7, 2026-05-09 19:15 CET).
>
> All token references use the names defined in `assets/brand/tokens.css`. Do not hard-code hex values; if you find yourself reaching for one, you are missing a token — open an issue.
>
> **Authority**: this document is canonical for Bench Mode (`/b/[name]`) component layouts. Single-Contract Mode (`/r/[name]`) layouts continue to use the existing US-067 component inventory in `apps/web/components/`. Where Bench Mode embeds Single-Contract UI (e.g. inside the Sourcify drawer per US-135), the embedded component is reused as-is, not restyled.
>
> **Extrapolation policy**: anything in this file marked `// EXTRAPOLATED` is inferred from the v1+v2 principles — those exact paddings/states are not literally in the manual. Replace with canonical values when Manual 03 (Components) ships.

---

## 0. Operating Principles (v2 §0)

Five non-negotiable rules. Every other pattern in this file derives from these:

1. **Color is information, not decoration.** Every color carries one meaning. The same hue does not get reused for a different role; the same role does not get expressed in two hues. *If two things look alike, they mean alike.*
2. **Siren red is reserved.** It only appears when Bench refuses to discount — invalid signature, replaced citation, fictional registry. Never as a hover state, never as a brand accent, never as decoration.
3. **Trust and Confidence are different gradients.** Trust runs cool (verified ▲) → discounted (▼). Confidence runs neutral-warm (HI ●) → LO (●). Do not collapse them into one axis.
4. **The system is flat.** No drop shadows, no gradients on surfaces, no glows except the heartbeat dot. Depth comes from *border weight and ink density*, the way a printed filing builds hierarchy.
5. **Type does the heavy lifting.** Four families, four jobs: **Display** (Space Grotesk) for verdicts, **Body** (Inter) for paragraphs, **Mono** (JetBrains Mono) for evidence and numbers, **Serif italic** (Source Serif 4) for the human voice — quotes, claims, brand asides.

---

## 1. Terminal Bar (sticky top navbar)

```
┌────────────────────────────────────────────────────────────────────────┐
│ [LOGO] UPGRADE SIREN / BENCH    SESSION BNCH-…    ● SOURCIFY ENS CHAIN │
└────────────────────────────────────────────────────────────────────────┘
```

| Property | Value |
|---|---|
| Layout | `display: grid; grid-template-columns: auto 1fr auto; gap: 24px` |
| Padding | `14px 24px` |
| Background | `var(--bg)` |
| Border-bottom | `var(--b-hair)` |
| Position | `sticky; top: 0; z-index: 10` |
| Font | `var(--mono); font-size: 11px; letter-spacing: 0.08em; color: var(--t2)` |

**Lockup (left):**
- 22×22 SVG mark (`assets/brand/logo-bench.svg`) inline
- `<b>UPGRADE SIREN</b>` in display 700 14px tracking -0.01em
- Pipe `/` in `var(--border-strong)`
- Mode label `BENCH` in `var(--accent)` mono uppercase

**Session (center):**
- Truncate with ellipsis if overflow
- Layout: `text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap`
- Bold elements (session id, allocation amount) in `var(--t1)`

**Meta (right):**
- Heartbeat dot before "SOURCIFY · ENS · CHAIN" — 6px circle, `background: var(--src-verified)`, `box-shadow: 0 0 8px var(--src-verified)`, animated `beat 2s ease-in-out infinite`
- Date + time in mono, bold elements in `var(--t1)`

**Heartbeat keyframe:** `@keyframes beat { 0%,100% { opacity:1 } 50% { opacity:0.4 } }` — only ambient motion in the entire system.

---

## 2. Docket / Stepper (subject queue)

```
┌────────────────────────────────────────────────────────────────────────┐
│ DOCKET · 3 applicants on the bench                  Position 01 / 03   │
├──────────────────┬──────────────────┬──────────────────────────────────┤
│ ▍01 Agent North  │  02 Agent Meri…  │  03 Agent Halo                   │
│   north.allo.… A │    meridian.allo C│    halo.allo.…  D                │
│   UNDER REVIEW   │    QUEUED        │    QUEUED                        │
└──────────────────┴──────────────────┴──────────────────────────────────┘
```

| Property | Value |
|---|---|
| Wrapper | `border: var(--b-hair); background: var(--surface)` |
| Header | `padding: 14px 20px; border-bottom: var(--b-hair); font: var(--mono) 10px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--t3)` |
| Stepper | `display: grid; grid-template-columns: repeat(3, 1fr); gap: 0` (responsive — collapses to 1 column on narrow viewports) |
| Step | `padding: 18px 20px; border-right: var(--b-hair); display: grid; grid-template-columns: auto 1fr auto; gap: 14px; align-items: center; cursor: pointer; transition: background var(--t-base)` |

**Step states (3):**

| State | Background | Text color | Indicator |
|---|---|---|---|
| `queued` | (default `var(--surface)`) | `var(--t2)` at opacity 0.55 | mini-tier `·` placeholder, `tier-u` color |
| `reviewed` | `var(--bg)` (inverts to page bg) | `var(--t1)` | mini-tier letter (A/C/D) shown |
| `focus` | `var(--bg)` + `::before` 3px accent strip on left | `var(--t1)` + accent num | `mini-tier u` (`·`) until reviewed |

**Mini-tier square** (`24×24`):
- `display: grid; place-items: center; font: var(--display) 700 14px; line-height: 1; border: 1px solid currentColor`
- Color matches tier letter token (`var(--tier-a)`, `var(--tier-c)`, `var(--tier-d)`, `var(--tier-u)`)
- For `tier-u`: `border-style: dashed`

**Tier pill (within reviewed step right-side):** `display: inline-flex; gap: 6px; padding: 3px 8px; border: 1px solid currentColor; font: var(--mono) 10px; letter-spacing: 0.12em` — color matches tier token.

---

## 3. Subject Bar (per-applicant headline)

```
SUBJECT 01 · APPLICANT ON THE BENCH
Reviewing Agent North.                    [◀ PREV]  [NEXT APPLICANT ▶]
north.allo.upgradesiren.eth · 0xA0b8…eB48
```

| Property | Value |
|---|---|
| Wrapper | `margin-top: 32px; display: grid; grid-template-columns: 1fr auto; gap: 32px; align-items: flex-end; padding-bottom: 20px; border-bottom: var(--b-hair)` |
| Eyebrow `.eye` | `var(--mono) 11px; letter-spacing: 0.18em; color: var(--t2); text-transform: uppercase` |
| Heading `h1` | `var(--display) 600; font-size: clamp(40px, 5vw, 64px); line-height: 1.0; letter-spacing: -0.025em; margin: 8px 0 4px` |
| `h1 em` | `font-family: var(--serif); font-style: italic; color: var(--t2); font-weight: 400` — agent name in italic serif |
| ENS line | `var(--mono) 13px; color: var(--accent); word-break: break-all` |

**Nav buttons:**
- Default: `appearance: none; background: transparent; color: var(--t1); border: 1px solid var(--border-strong); font: var(--mono) 11px; letter-spacing: 0.14em; padding: 9px 14px; cursor: pointer; text-transform: uppercase`
- Hover: `border-color: var(--t1)`
- Disabled: `color: var(--t3); border-color: var(--border); cursor: not-allowed`
- Primary (NEXT): `background: var(--accent); color: var(--bg); border-color: var(--accent); font-weight: 600`
- Primary hover: `filter: brightness(1.08)`
- Danger variant: `color: var(--o-block); border-color: var(--o-block)`

---

## 4. Report Grid (the main two-pane layout)

```
┌─────────────────────────────────────────────┬──────────────────────┐
│ [LEFT PANEL — verdict + math]               │ [EVIDENCE DRAWER]    │
│  • report-head (tier monogram + score)      │  • Source rows       │
│  • claim-block (serif blockquote)           │  • Recommendations   │
│  • reads-block (✓/⚠/✕ findings list)        │                      │
│  • math (formula + axis breakdown bars)     │                      │
└─────────────────────────────────────────────┴──────────────────────┘
```

| Property | Value |
|---|---|
| Layout | `display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 1px; background: var(--border); border: var(--b-hair)` |
| Responsive | `@media (max-width: 1080px) { grid-template-columns: 1fr }` — drawer stacks under panel |
| Panel | `background: var(--bg); padding: 32px` |
| Evidence | `background: var(--raised); padding: 32px` |

The 1px gap on `var(--border)` background creates a single hairline between panels without doubling borders.

**Panel head:**
- `display: flex; justify-content: space-between; align-items: baseline`
- `var(--mono) 10px; letter-spacing: 0.18em; color: var(--t3); text-transform: uppercase; margin-bottom: 18px`
- Bold elements in `var(--t1) font-weight: 500`

---

## 5. Report Head (tier monogram + score banner)

```
┌──────┐  SCORE
│  A   │  87 / 100              [● Fast-track]
│      │  TIER A
│ 120  │  ▲ +0.4 (7 day)
└──────┘
```

| Property | Value |
|---|---|
| Layout | `display: flex; gap: 24px; align-items: flex-start; padding-bottom: 24px; border-bottom: var(--b-hair)` |

**Tier monogram** (large square):
- `width: 120px; height: 120px; flex-shrink: 0`
- `display: grid; place-items: center`
- `font: var(--display) 700 88px; line-height: 1; letter-spacing: -0.04em`
- `border: var(--b-mono)` (2px solid in current tier color)
- Color via tier token: `.tier-mono.a { color: var(--tier-a) }` etc.

**Head meta** (right side):
- `flex: 1; min-width: 0`
- Label: `var(--mono) 10px; letter-spacing: 0.18em; color: var(--t3); text-transform: uppercase`
- Agent name: `var(--display) 600 32px; letter-spacing: -0.015em; margin: 6px 0 4px; line-height: 1.05`
- ENS: `var(--mono) 12px; color: var(--accent); word-break: break-all`
- Score row: `margin-top: 18px; display: flex; gap: 18px; flex-wrap: wrap; align-items: baseline`

**Score-big** (the headline number):
- `var(--display) 700 88px; line-height: 0.85; letter-spacing: -0.04em; font-variant-numeric: tabular-nums`
- Color via tier: `.score-big.a { color: var(--tier-a) }`, etc.
- **Numbers land at full value, never animate** (v2 §5C banned motion).

**Score meta** (small label cluster):
- `var(--mono) 11px; line-height: 1.55; color: var(--t2); letter-spacing: 0.06em`
- `<b>` elements in `var(--t1) font-weight: 500`
- Layout: `/ 100\nTIER A\n▲ +0.4 (7 day)` — three lines

**Outcome chip:**
- `display: inline-flex; align-items: center; gap: 10px; padding: 9px 14px; border: 1px solid currentColor`
- `var(--mono) 11px; letter-spacing: 0.18em; text-transform: uppercase`
- `::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0 }`
- Variants: `.fast { color: var(--o-fast); background: rgba(122,217,255,0.06) }`, `.evid { color: var(--o-evid); background: rgba(179,163,106,0.06) }`, `.block { color: var(--o-block); background: rgba(255,59,48,0.06) }`

---

## 6. Claim Block (serif italic blockquote)

```
HEADLINE CLAIM            self-asserted · operator manifest
"
Delta-neutral yield strategy on Ethereum mainnet.
Public track record across 14 months, $8.2M AUM
at peak, 18.4% trailing APY net of fees.

— OPERATOR MANIFEST, SIGNED BY ENS CONTROLLER
```

| Property | Value |
|---|---|
| Wrapper | `margin-top: 28px` |
| Quotation mark `.qmark` | `var(--serif); font-style: italic; font-size: 80px; line-height: 0.4; color: var(--t3); float: left; margin-right: 12px; margin-top: 24px` |
| Blockquote | `var(--serif) 22px; line-height: 1.4; color: var(--t1); text-wrap: pretty` |
| Attribution `.attr` | `margin-top: 12px; clear: both; var(--mono) 10px; letter-spacing: 0.16em; color: var(--t3); text-transform: uppercase` |

The float-left quote-mark technique makes the blockquote wrap around the `"` at left.

---

## 7. Bench Reads (verified findings list)

```
┌─ BENCH READS ────────────────────────────────────────┐
│ ✓ AUM & APY independently verifiable. Settlement…   │
│ ✓ Genesis matches Sourcify-verified contract. Full…  │
│ ⚠ Operator manifest signed by ENS controller. …      │
│ ✕ No SIREN-grade contract findings in linked perim…  │
└──────────────────────────────────────────────────────┘
```

| Property | Value |
|---|---|
| Wrapper | `margin-top: 32px; padding: 20px; background: var(--surface); border-left: 3px solid var(--border-strong)` |
| Label | `var(--mono) 10px; letter-spacing: 0.18em; color: var(--t2); text-transform: uppercase; margin-bottom: 12px` |
| List | `margin: 0; padding: 0; list-style: none` |
| Item | `display: grid; grid-template-columns: 18px 1fr; gap: 10px; padding: 8px 0; var(--mono) 13px; line-height: 1.45; color: var(--t1); border-top: var(--b-dot)` |
| First item | `border-top: 0` |
| `<b>` in item | `color: var(--t1); font-weight: 500` |
| `<code>` in item | `var(--mono) 12px; color: var(--accent); background: transparent; padding: 0; border: 0` |

**Glyph variants** (3 states, mandatory pairing per v2 §2B carry-rule):
- `.ok .icn { color: var(--src-verified) }` — `✓`
- `.warn .icn { color: var(--src-partial) }` — `⊘` or `⚠`
- `.bad .icn { color: var(--o-block) }` — `✕`

**Border-left variants** (signals the row's overall mood):
- Default — `var(--border-strong)`
- `.reads-block.b { border-left-color: var(--src-partial) }` — partial mood
- `.reads-block.r { border-left-color: var(--o-block) }` — block mood

---

## 8. Score Math (the auditor's worksheet)

```
┌─ SCORE MATH ── how 87 was built · open ledger ────────────────────┐
│   SCORE  =  ( SUBSTANCE + PROVENANCE + RELEVANCE )  ×  TRUST       │
├─────────────────────────────┬─────────────────────────────────────┤
│ SUBSTANCE / 50          46  │ PROVENANCE & SENIORITY / 30      28 │
│ AUM verifiability  ▮▮▮▮▮▮▮▮▮ │ Audit trail        ▮▮▮▮▮▮▮ 7 / 8    │
│ APY verifiability  ▮▮▮▮▮▮▮▮▮ │ Source diversity   ▮▮▮▮▮▮ 6 / 8     │
│ Strategy clarity   ▮▮▮▮▮▮▮▮  │ ...                                 │
├─────────────────────────────┴─────────────────────────────────────┤
│  SCORE  =  ( 46 + 28 + 12 ) × 0.96  =  87 → A                      │
└────────────────────────────────────────────────────────────────────┘
```

| Property | Value |
|---|---|
| Wrapper `.math` | `margin-top: 32px; border: var(--b-hair); background: var(--surface)` |
| Math head | `padding: 14px 20px; border-bottom: var(--b-hair); var(--mono) 10px; letter-spacing: 0.18em; color: var(--t3); text-transform: uppercase` |
| Math formula | `padding: 14px 20px; border-bottom: var(--b-hair); background: var(--bg); var(--mono) 12px; letter-spacing: 0.04em; color: var(--t2); text-align: center` |
| Formula `<b>` | `color: var(--t1) font-weight: 500` |
| Formula `.op` | `color: var(--t3); margin: 0 6px` |
| Math grid | `display: grid; grid-template-columns: 1fr 1fr` (responsive: 1 col below 780px) |
| Math col | `padding: 18px 20px` |
| Col separator | `+ .math-col { border-left: var(--b-hair) }` (top-border on narrow) |

**Math axis (one per axis: substance, provenance, relevance):**
- `.math-axis + .math-axis { margin-top: 18px; padding-top: 18px; border-top: var(--b-dot) }`
- Header `.math-axis-h`: `display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; var(--mono) 10px; letter-spacing: 0.16em; color: var(--t1); text-transform: uppercase`
- Got value (right side): `var(--display) 700 20px; line-height: 1; letter-spacing: -0.01em; font-variant-numeric: tabular-nums` — colored by axis tier (`.got.a` → tier-a, `.got.c` → tier-c, etc.)

**Math line (per signal within axis):**
- `display: grid; grid-template-columns: 1fr 80px 64px; gap: 12px; align-items: center; padding: 6px 0; var(--mono) 11px; color: var(--t2); letter-spacing: 0.02em`
- `+ .math-line { border-top: var(--b-dot) }`
- `.lbl em` — italic serif annotation: `var(--serif) italic; color: var(--t3); font-size: 10px; display: block; margin-top: 2px; letter-spacing: 0`
- `.bar` — horizontal bar: `position: relative; height: 6px; background: var(--bg); border: var(--b-hair)`
- `.bf` — bar fill: `position: absolute; top: 0; bottom: 0; left: 0; background: var(--t1)` (default); colored by axis (`.bf.a { background: var(--tier-a) }`, etc.)
- `.n` — value column: `text-align: right; color: var(--t1); font-variant-numeric: tabular-nums; font-size: 11px`
- `.n .max` — denominator: `color: var(--t3)`

**Math final (the summary line):**
- `border-top: var(--b-rule); padding: 18px 20px; background: var(--bg); display: flex; flex-wrap: wrap; gap: 14px; align-items: baseline; justify-content: space-between; var(--mono) 13px; color: var(--t2); letter-spacing: 0.04em`
- LHS label: `color: var(--t3); letter-spacing: 0.16em; text-transform: uppercase; font-size: 10px`
- Calc: `color: var(--t1); font-variant-numeric: tabular-nums`
- Calc operators: `color: var(--t3); margin: 0 8px`
- RHS: `display: inline-flex; align-items: baseline; gap: 10px; ::before { content: "→"; color: var(--t3) }`
- RHS bold (final score): `var(--display) 700 32px; line-height: 1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums` — tier color

---

## 9. Trust Ledger Table (alternate math layout)

| Property | Value |
|---|---|
| Wrapper | `width: 100%; border-collapse: collapse; var(--mono) 11px; color: var(--t2)` |
| Header | `text-align: left; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; font-size: 9px; color: var(--t3); padding: 6px 0 8px; border-bottom: var(--b-hair)` |
| Cell | `padding: 8px 0; border-bottom: var(--b-dot); font-variant-numeric: tabular-nums` |
| First cell | `color: var(--t1); letter-spacing: 0.04em` |
| `tr.zero` | All cells `color: var(--t3)` |
| `tr.bad` | All cells `color: var(--o-block)` |
| `tr.sum` | `border-bottom: 0; border-top: var(--b-rule); padding-top: 10px; color: var(--t1); font-weight: 500; text-transform: uppercase; letter-spacing: 0.14em; font-size: 10px` |
| `tr.sum td:last-child` | `var(--display) 700 14px; letter-spacing: -0.01em` |

---

## 10. Signal Chips (small mono pills)

`<span class="sig">PROOF · 7 of 8</span>` rendered as:

| Property | Value |
|---|---|
| Wrapper | `var(--mono) 9px; letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 8px; border: 1px solid var(--border-strong); color: var(--t2)` |
| `<b>` | `color: var(--t1); font-weight: 500` |
| `.warn` | `color: var(--src-partial); border-color: var(--src-partial)` |
| `.bad` | `color: var(--o-block); border-color: var(--o-block)` |

Layout container: `margin-top: 14px; padding-top: 12px; border-top: var(--b-dot); display: flex; flex-wrap: wrap; gap: 6px`.

---

## 11. Evidence Drawer (right column source list)

```
SOURCES

● Sourcify · vault.eth proxy 0xA0b…       ×1.00
  https://sourcify.dev/...

● ENS owner sig recovered                  ×1.00
  EIP-712, signer 0x747…0cfC

⊘ GitHub claimed: "B2JK-Industry"          ×0.60
  unverified — no cross-sign

⊘ no Etherscan key configured              ×0.00
  fell back to nonce/cap-1000

✕ proof URI 404                            INVALID
  https://...

RECOMMENDATIONS
1. Cross-sign GitHub via signed gist
2. Provision Etherscan key
3. Replace dead proof URI
```

| Property | Value |
|---|---|
| Wrapper | `background: var(--raised); padding: 32px` |
| Heading `h3` | `var(--mono) 11px; letter-spacing: 0.18em; color: var(--t2); text-transform: uppercase; margin: 0 0 14px` |
| Source row `.src` | `display: grid; grid-template-columns: 14px 1fr auto; gap: 10px; align-items: center; padding: 14px 0; border-top: var(--b-hair); var(--mono) 12px` |
| First source row | `border-top: 0` |
| Source dot `.dot` | `width: 10px; height: 10px; flex-shrink: 0` |
| Source name `.name` | `color: var(--t1); letter-spacing: 0.06em; font-size: 12px` |
| Source citation `.citation` | `color: var(--t3); font-size: 10px; margin-top: 2px; letter-spacing: 0.04em; word-break: break-all` |
| Source multiplier `.mult` | `font-size: 11px; letter-spacing: 0.08em; padding: 3px 8px; border: 1px solid currentColor` |

**Source row state variants** (mandatory color × dot × multiplier triple per v2 §2B carry-rule):

| State | dot bg | name color | mult color | mult content |
|---|---|---|---|---|
| `.verified` | `var(--src-verified)` | `var(--t1)` | `var(--src-verified)` | `×1.00` |
| `.partial` | `var(--src-partial)` | `var(--t1)` | `var(--src-partial)` | `×0.40-0.85` |
| `.discounted` | `var(--src-discounted)` | `var(--t1)` | `var(--src-discounted)` | `×0.20-0.40` |
| `.degraded` | `var(--src-degraded)` | `var(--t1)` | `var(--src-degraded)` | `degraded` |
| `.missing` | `transparent` + `1px dashed var(--border-strong)` | `var(--t3)` | `var(--t3)` | `×0.00` |
| `.invalid` | `var(--o-block)` | `var(--o-block)` | `var(--o-block)` | `INVALID` |

**Recommendations** (`.recs`):
- `margin-top: 24px; padding-top: 20px; border-top: var(--b-hair)`
- Heading: `margin-bottom: 10px` (otherwise same as drawer h3)
- List: `margin: 0; padding-left: 20px; var(--body) 13px; color: var(--t1); line-height: 1.6`
- Items: `margin-bottom: 8px; text-wrap: pretty; <b> { color: var(--t1); font-weight: 500 }`

---

## 12. Paper / Stamp (printed-artefact surface)

For marketing collateral, exported PDF bench reports, and the once-per-artefact "FINAL" stamp:

| Property | Value |
|---|---|
| Surface | `background: var(--paper); color: var(--ink)` |
| Alt surface | `background: var(--paper-alt)` (slightly darker, for filed/aged feel) |
| Body text | `color: var(--ink)` (14:1 ratio AAA) |
| Secondary text | `color: var(--ink-soft)` |
| Hairline rule | `border-color: var(--rule)` |
| FINAL stamp | `color: var(--stamp); ::before { content: "FINAL" }` — used 1× per artefact maximum, animated with `--t-stamp` 300ms `--e-stamp` cubic-bezier(0.6, 0, 0.4, 1) for slight overshoot

Stamp WCAG: 6.5:1 on paper — AAA-passable. Pair always with the literal word "FINAL" (carry-rule v2 §2B).

---

## 13. Page Document Container

```
<div class="doc">
  <!-- terminal bar -->
  <!-- docket -->
  <!-- subject-bar (per step) -->
  <!-- report (panel + evidence) -->
  <!-- design notes -->
</div>
```

| Property | Value |
|---|---|
| Wrapper | `max-width: 1480px; margin: 0 auto; padding: 40px 32px 64px` |

Section gutters: `--s-16` 64px between sections. First section: `margin-top: 0`.

---

## 14. State Machine — Sequential Review

The `[data-step]` attribute drives applicant visibility. Default CSS:

```css
[data-step] { display: none; }
[data-step].active { display: block; }
```

JS toggles `.active` on the focused step. Stepper item states (`.queued / .reviewed / .focus`) are independently driven — multiple steps may be `.reviewed` while only one is `.focus`.

For Bench Mode (`/b/[name]`) routes, this state machine is inactive — Bench shows ONE subject per route. The Sequential Review pattern is reserved for the allocator demo / multi-applicant comparison surface (which is NOT in v1 backlog scope per US-131..US-140).

---

## 15. Banned Patterns (v2 §5C + §0)

- ✕ No drop shadows. No `box-shadow` except on the heartbeat dot (`0 0 8px var(--src-verified)`).
- ✕ No gradients on surfaces. Backgrounds are flat solid color tokens.
- ✕ No bouncing animations. No spring overshoots above 4%.
- ✕ No counting-up scores. Numbers land at full value — the verdict is not a slot machine.
- ✕ No parallax. Backgrounds stay still; the report is a document, not a scene.
- ✕ No rounded corners except the heartbeat dot (`var(--r-pulse)`). Tier monograms, score tiles, evidence rows, outcome chips: all square.
- ✕ No reusing `--siren` or `--o-block` for hover states or brand accents. Reserved for refusal moments only.
- ✕ No dashed borders except `--b-dash` for missing source. (Carry-rule v2 §2B identifier.)

---

## 16. Extrapolation Tracker

Items below are NOT literally specified in v1 or v2 manuals — they are extrapolated from the operating principles. Replace with canonical values when Manual 03 (Components) ships.

```
// EXTRAPOLATED FROM v2 PRINCIPLES — NOT IN MANUAL
- Button hover/focus/disabled paddings beyond the nav-btn pattern in §3
- Input field borders, focus rings, error states (form components don't appear in v1 layout)
- Tooltip / popover anatomy
- Toast / notification anatomy
- Modal / drawer overlay scrim
- Loading skeleton patterns (spinner → progress bar → 5-second checklist)
- Empty state mockups (zero subjects, zero results)
- Mobile breakpoint behavior below 780px (some layouts collapse explicitly; others not specified)
```

When implementing any of the above in Stream C (US-131..US-140), apply the operating principles:
- Right angles only (`--r-0`)
- Border weight is the language (no shadows, no gradients)
- Pair color with glyph + label (carry-rule)
- Use existing tokens; never hex literals
- Motion stays within the 7 timings + 3 easings of v2 §5

---

## 17. Sources

- `Bench v2 - Foundations.html` — DEV MANUAL 02 OF 06, v0.7, supplied by Daniel 2026-05-09 19:14 CET. Full manual series will eventually contain 6 files: 01 (intro/principles), 02 ✓ (foundations), 03 (components, NOT YET PROVIDED), 04 (templates), 05, 06.
- `Bench v1 - Sequential Review.html` — FILE 01 OF 04, v1.1, supplied by Daniel 2026-05-09 19:15 CET. UI mockup demonstrating the per-applicant review flow (Agent North → Meridian → Halo). Full series 4 files; only 01 provided.
- This document, `assets/brand/tokens.css`, and `assets/brand/logo-bench.svg` together are the canonical brand spec for Bench Mode UI implementation in Stream C (US-131..US-140).