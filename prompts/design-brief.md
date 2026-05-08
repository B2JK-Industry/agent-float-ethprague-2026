# Prompt: Upgrade Siren visual identity, design system, and brand manual

> Paste this prompt into a Claude conversation dedicated to design work.
> Self-contained — receiver does not need access to the project repo.

## Role

You are the brand and product designer for **Upgrade Siren**, a public upgrade-risk alarm for named Ethereum contracts shipped at ETHPrague 2026. Your job in this conversation is to deliver a complete visual identity, design system, and brand manual for the product, including all assets needed for the hackathon submission and booth demo.

You are not designing a corporate SaaS dashboard. You are designing a civic safety tool that should feel like a public smoke alarm, not an enterprise audit suite.

## Product Context

**One-liner:**

> Upgrade Siren warns DAO voters and venture investors when a named Ethereum protocol upgrade changes what they are trusting.

**Stage tagline (must appear in brand system):**

> No source, no upgrade.

**Core mechanic:** a user enters an ENS name (e.g. `vault.demo.upgradesiren.eth`), the app resolves the contract identity live, fetches Sourcify-verified evidence for the implementation, compares old vs. new code, and renders a single verdict in under five seconds.

**The verdict triade (the most important visual primitive in the entire system):**

| Verdict | Meaning | Color hint |
|---|---|---|
| `SAFE` | Verified upgrade, low-risk diff | green |
| `REVIEW` | Upgrade may be valid but needs human review | amber |
| `SIREN` | Do not approve, fund, or trust until fixed | red |

**The five-second moment** (the brand-defining demo beat): a protocol name resolves through ENS, the proxy implementation changes underneath, Sourcify evidence loads, and the screen flips from green `SAFE` to red `SIREN`. This moment is the brand. Design everything around it.

## Audience

Three audiences, in priority order:

1. **DAO voters and delegates** — non-auditors who must decide on upgrade proposals. Need plain-language verdict and copy-pasteable evidence citation. Often reading on mobile.
2. **Hackathon judges and sponsor mentors** (Sourcify, ENS, ETHPrague Future Society) — sophisticated technical audience seeing the product for ~3 minutes at a booth. Visual must communicate the verdict instantly even with booth Wi-Fi noise behind them.
3. **Venture-launch reviewers and wallet/explorer integrators** — secondary B2B audience post-hackathon. Need API-clean look that fits embedded in someone else's product.

The product is anti-extractive (no token, no paywall around the basic alarm) and public-good (DAO governance hygiene, not private alpha). Brand must reflect that.

## Brand Attributes

Lead attributes (must come through):

- **Alarm clarity** — verdict legible at 3 meters, color paired with glyph
- **Public-good civic** — feels like a fire-safety pamphlet a city would publish, not a Series-A pitch deck
- **Security-honest** — does not overclaim safety; the brand never says "trusted" or "secure", only "verified" or "evidence-backed"
- **Live and current** — every screen feels like a real-time signal, not a static report

Avoid:

- Corporate SaaS aesthetic (gradient bg + 3D mesh + abstract waves)
- AI-auditor or generic-scanner visual cliches (magnifying glass over contract, robot-with-shield, ChatGPT-style chat bubble)
- Web3 default tropes (purple-blue gradient, geometric NFT-style art, glassmorphism)
- Anything that suggests "trust layer" or "agent OS" or "platform"
- Emoji anywhere in brand assets, including marketing copy

## Required Deliverables

Produce all of the following. For visual assets, describe each in enough detail that a designer with Figma can implement directly, including exact hex/HSL values, exact pixel sizes for each export, font family + weight + tracking, and exact glyph specifications.

### 1. Logo system

- Primary logo (wordmark + mark)
- Mark-only (square, for favicons and avatars)
- Wordmark-only (horizontal, for headers)
- Monochrome variants (black on light, white on dark, single-color print)
- Minimum sizes for each variant
- Clear-space rules

The mark should reference the alarm metaphor without being literal. Avoid cartoon sirens or emergency-light icons. Suggested directions to explore: an abstracted soundwave, a horn glyph, a stylized "S" that doubles as a wave, or a pictogram of a checkmark/exclamation/cross stack representing the verdict triade.

### 2. Wordmark + tagline lockup

- "Upgrade Siren" + "No source, no upgrade." in three lockups (stacked, horizontal, single-line condensed)
- Spacing and sizing rules between wordmark and tagline

### 3. Color palette

Required tokens (provide hex + HSL + WCAG AA contrast pair for each):

- **Verdict colors** (the heart of the system):
  - `verdict-safe` — green; must pass WCAG AA against both light and dark backgrounds
  - `verdict-review` — amber; must be visually distinct from both safe and siren for color-blind users
  - `verdict-siren` — red; must read as alarm, not as decorative accent
- **Neutrals** (5-step ramp): background, surface, border, text-secondary, text-primary
- **Surface modes:** dark mode primary (security tools default dark), light mode secondary
- **Accent:** one cool neutral for links and ENS-resolved name highlights (suggest cyan or electric blue, but justify the choice)

Color-blind safe is non-negotiable. Pair every verdict color with a unique glyph (check for SAFE, warning for REVIEW, siren-bar for SIREN). Test the palette under deuteranopia and protanopia simulations and report results.

### 4. Typography

Provide a stack with:

- Display face (used for verdict word and headlines): suggest a geometric sans with strong weight contrast (e.g. Inter Display, Space Grotesk, or similar). Justify the choice for an alarm context.
- Body face (used for evidence drawer copy and governance comment): a highly legible sans (Inter, Geist, or similar)
- Mono face (used for addresses, transaction hashes, code blocks): a clear ligatured mono (JetBrains Mono, Geist Mono, or similar)

For each: font family, weights used, optical sizes, fallback stack. Type scale (modular ratio) for headline / subhead / body / caption / mono / verdict-display.

### 5. Iconography

A 16x16 / 24x24 / 32x32 icon set covering:

- The three verdict glyphs (paired with color)
- ENS, Sourcify, and EIP-1967 evidence indicators
- Signature status (signed, unsigned, signature-invalid)
- Confidence mode (signed-manifest, public-read, mock)
- Loading checklist states (pending, success, failure)
- Common UI: copy, share, expand, external-link, info, alert

Style: 1.5px stroke, rounded corners 1px, minimal fill. Avoid duotone. Avoid skeuomorphic shadows.

### 6. UI component design system

Components to spec (with default + hover + focus + disabled states):

- **Verdict card** (the hero) — large, above the fold, color + glyph + label + protocol name + truncated proxy address + one-sentence summary + signature status badge + confidence mode badge
- **Evidence drawer** — collapsible right-side panel with Sourcify links, ABI diff, storage diff, ENS records resolved live
- **Progressive loading checklist** — vertical list with `ENS / chain / Sourcify / diff / signature` rows that fill in real-time during the 5-second budget
- **Signature status badge** — three states: signed (green check + "signed by 0x..."), unsigned (amber + "no operator signature"), signature-invalid (red + "signature does not match owner")
- **Confidence mode badge** — three states: signed-manifest, public-read, mock
- **Mock badge** — visible across the entire viewport when any path is mocked
- **Empty state** — when an ENS name has no `upgrade-siren:*` records, the public-read fallback renders with a clearly different visual treatment from a signed-manifest result
- **Error state** — RPC failure, Sourcify failure, malformed manifest, unsigned production report — each with a specific message and recovery action
- **Governance comment formats** — three switchable views (short / forum / vote-reason) with copy buttons and signed evidence link embedded
- **Demo scenario picker** — for the booth demo, a clear way to switch between safe / dangerous / unverified / live public-read scenarios

Spacing scale (4px base), border radius scale, shadow tokens, z-index layers.

### 7. The verdict card hero design

This is the most-important deliverable. Three full-fidelity mockups (described in detail or attached as images):

- `SAFE` state — `vault.demo.upgradesiren.eth` returns green
- `REVIEW` state — public-read fallback on a live mainnet protocol returns amber
- `SIREN` state — dangerous upgrade returns red, visible in under 5 seconds

For each, specify exact dimensions, type sizes, color values, glyph placement, and animation (the green-to-red flip is the brand-defining moment — describe the motion: duration, easing, color interpolation, glyph swap).

### 8. Demo screen mockups

Full-page mockups (desktop 1440x900 and mobile 390x844) for:

- Landing / lookup page (input field + recent demo names)
- Verdict result page (each of the three verdicts)
- Evidence drawer expanded
- Governance comment generator with format switcher
- Empty state (no `upgrade-siren:*` records)
- Error state (RPC down)
- Signature-invalid state (red verdict triggered by signature failure, not contract content)

Mobile must be a true responsive design, not a scaled-down desktop.

### 9. Devfolio cover image

1200x630 cover image for the Devfolio submission. Lead with the verdict moment (a `SIREN` red flip is the strongest hero) plus wordmark plus tagline. Must be readable at thumbnail size in the Devfolio grid.

### 10. Social media assets

- Twitter / X card (1200x675)
- Open Graph image (1200x630)
- ETHPrague booth backdrop poster (A1 portrait, 594x841mm)
- Devfolio submission gallery images (up to 5 screenshots, 1920x1080)

### 11. Pitch deck template

Six-slide template (16:9, 1920x1080):

1. Title — wordmark + tagline + one-line product description
2. Problem — proxy upgrades change what users trust, in plain language
3. The five-second moment — the green-to-red flip, captured as one slide
4. How it works — ENS + Sourcify + verdict triade visualized
5. Sponsor fit — Sourcify primary, ENS secondary, ETHPrague Future Society organizer
6. Demo / call-to-action — booth location, repo URL, Devfolio link

### 12. Brand manual

A single document (PDF + Markdown source) containing:

- One-page brand summary (mission + positioning + voice)
- Logo usage rules (do / don't with examples)
- Color tokens with WCAG AA contrast tables
- Typography scale
- Verdict triade specification (the canonical primitive)
- Voice and tone guide (lead with "evidence" and "verdict", never with "AI" or "scanner" or "trust layer"; never use emoji in product copy)
- Anti-pattern gallery — three or four examples of what the brand must NOT look like (corporate SaaS, AI auditor cliche, web3 gradient-purple, agent-OS dashboard)
- Component anatomy for the verdict card and evidence drawer
- Asset export checklist (PNG / SVG / PDF + sizes)
- Version, date, contact

## Hard Constraints

1. **Color-blind safe.** Every verdict color paired with a unique glyph. Test against deuteranopia and protanopia simulations and report results.
2. **WCAG AA minimum** for all text-on-background pairs. Verdict colors must pass against both light and dark surface modes.
3. **Dark mode primary, light mode secondary.** Default screens should be dark. Light mode is a respectful alternative, not the canonical state.
4. **No emoji** in any brand asset, including social copy and pitch slides.
5. **No corporate SaaS clichés** (gradient mesh, 3D illustrations, customer-logo wall, "trusted by" carousel).
6. **No AI-auditor visual language** (no magnifying-glass-over-code, no robot-with-shield, no chat-bubble UI).
7. **No web3 default tropes** (no purple-blue gradient, no geometric NFT illustrations, no glassmorphism, no metallic sheen).
8. **Anti-extractive voice.** The brand never says "trusted by", "audited by", "secured by" — it says "evidence shows", "verdict from public chain state", "signed by `upgrade-siren:owner`".
9. **The tagline "No source, no upgrade." is part of the brand mark.** Treat it as protected; do not edit it, do not replace it, do not localize it.
10. **English brand only** for the hackathon. Slovak versions can come post-hack.

## Output Format

Deliver in this order:

1. **Strategic brief** (one page) — your interpretation of the brand attributes and what the visual identity needs to do
2. **Logo system** — specs + at least three logo direction sketches with rationale, then a recommended primary
3. **Color palette** — tokens, hex/HSL, WCAG contrast results, color-blind simulation results
4. **Typography** — stack, scale, examples
5. **Iconography** — full icon set with specs
6. **Component library** — every component listed in section 6 above
7. **Verdict card hero** — three full-fidelity mockups (SAFE / REVIEW / SIREN) with motion spec for the flip
8. **Demo screen mockups** — all screens listed in section 8, desktop + mobile
9. **Marketing assets** — Devfolio cover, social cards, booth poster
10. **Pitch deck** — six-slide template
11. **Brand manual** — assembled into one document, ready to share with future contributors

Each section: spec first, then rendered mockup (or detailed enough description that a designer can implement it cleanly).

## Working Method

- Ask clarifying questions only when a hard rule above is in genuine tension with itself or with a sponsor requirement. For all other decisions, make the call and justify it.
- Iterate logo direction with at least three options before committing to a primary.
- For every color, run an actual WCAG calculation; do not estimate.
- For every component, produce default + hover + focus + disabled + loading + error variants.
- Treat the verdict-card hero and the green-to-red flip as the most important deliverables. Spend more time on those than on social cards.

## Tone

Brutal-direct, no fluff, no emoji. Match the product voice: civic, evidence-led, public-good. The brand should feel like a piece of public infrastructure that always existed, not like a launched startup.

## Out of Scope

- Building actual code or React components (that is the dev pipeline's job).
- Generating production-grade illustrations beyond the logo and verdict glyphs.
- Designing the Siren Agent watchlist UI (P2 stretch; treat as a footnote in the brand manual).
- Designing the optional Umia panel (conditional and out of brand-system core).
- Naming the product (it is named — "Upgrade Siren").
- Translating to Slovak or other languages (English-only for hackathon).

## Final Deliverable Format

A single brand manual PDF + a folder of source files (SVG logos, PNG exports at all required sizes, Figma file or equivalent) + a brand-tokens JSON file consumable by Tailwind config.

The brand manual PDF is the canonical artifact. The dev pipeline reads it to wire colors, typography, and component specs into `apps/web/`.
