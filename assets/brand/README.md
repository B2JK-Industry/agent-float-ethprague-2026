# Upgrade Siren — brand assets

Self-contained brand kit derived from `brand-manual.html` (the canonical artifact). Anything in this directory must be reproducible from the manual; do not hand-edit derived files without re-deriving from the manual.

## Files

| Path | What it is | Source |
|---|---|---|
| `brand-manual.html` | Canonical brand manual v1.0. **Immutable artifact.** | Daniel via `claude.ai/design`, Direction A "Triade Stack". |
| `brand-tokens.json` | Flat key→hex map of every CSS variable in the manual's `:root` block, plus font families. | `brand-manual.html` lines 12–38. |
| `tailwind-preset.ts` | Tailwind 4 `@theme` preset. Exports `brandTheme` for `tailwind.config.ts` and `brandThemeCss` for CSS-first config. | `brand-tokens.json`. |
| `icons/*.svg` | 21 standalone icons (3 verdict glyphs + 18 UI). 1.5px stroke (verdict glyphs use 2 / 2.5 / fill per manual section 06). | `brand-manual.html` section 06. |
| `logo/*.svg` | 5 logo files: `mark-primary` (Direction A, dark), `mark-mono-dark` (white-on-dark monochrome), `mark-mono-light` (on-paper using on-light verdict tokens), `wordmark-horizontal`, `lockup-stacked`. | `brand-manual.html` section 02 + section 03. |

## Consumption from `apps/web`

`apps/web/tailwind.config.ts` imports the preset and merges it under `theme.extend`. Either import path works:

```ts
import type { Config } from "tailwindcss";
import { brandTheme } from "../../assets/brand/tailwind-preset";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: { extend: brandTheme },
};

export default config;
```

Once wired, the following utilities exist:

| Utility | CSS variable / value |
|---|---|
| `bg-verdict-safe`, `text-verdict-safe`, `border-verdict-safe` | `#00D67A` |
| `bg-verdict-review`, `text-verdict-review`, `border-verdict-review` | `#FFB020` |
| `bg-verdict-siren`, `text-verdict-siren`, `border-verdict-siren` | `#FF3B30` |
| `bg-verdict-safe-surf` etc. | `#062A1B` / `#2A1C00` / `#2D0B09` (full-bleed verdict tints) |
| `text-verdict-safe-on-light` etc. | `#00703F` / `#8E4400` / `#B9140C` (light-mode-safe ink) |
| `bg-bg`, `bg-surface`, `bg-raised` | `#0A0E10`, `#14191C`, `#1B2125` |
| `border-border`, `border-border-strong` | `#232A2F`, `#39434A` |
| `text-t1`, `text-t2`, `text-t3` | `#E8EDEF`, `#8B969C`, `#5C6770` |
| `text-accent`, `border-accent` | `#00B8D9` (ENS names + active links **only** — never another use) |
| `bg-paper`, `text-ink` | `#FAFAF8`, `#0A0E10` |
| `font-display`, `font-body`, `font-mono` | Space Grotesk / Inter / JetBrains Mono |

## Adding new icons

1. Draw the icon at 24×24 viewBox, 1.5px stroke, no fill (fills are reserved for verdict glyphs).
2. Save as `assets/brand/icons/<kebab-name>.svg` with `<svg xmlns="http://www.w3.org/2000/svg" …>` root and an `aria-label`.
3. Use `stroke="currentColor"` so callers can colour the icon via CSS.
4. Add the corresponding inline definition to `brand-manual.html` section 06 (canonical source) before merging.
5. Bump `brand-tokens.json.version` only when token values change — icons do not bump the version.

## Adding new colour tokens

Tokens enter the system via `brand-manual.html` first (the `:root` block) and are then propagated:

1. Edit `:root` in `brand-manual.html`.
2. Mirror the addition in `brand-tokens.json`.
3. Mirror the addition in `tailwind-preset.ts` (both the `brandTheme` object and the `brandThemeCss` string).
4. Bump `brand-tokens.json.version` (semver minor for additions, major for renames).

## Protected-tagline rule

> **No source, no upgrade.**

This tagline is **part of the mark**. It must not be:
- edited (no rephrasing, no shortening, no expansion),
- replaced (no alternative tagline, including in localised contexts),
- translated (English-only — Slovak / other languages explicitly disallowed for the hackathon scope; post-hack localisation requires brand review),
- omitted from any lockup that includes the tagline (stacked, horizontal, condensed — all three retain the tagline verbatim).

Every appearance of the tagline in product copy, marketing, slides, posters, video, social cards, README, or PR description must match exactly: `No source, no upgrade.` with the period and the comma, no surrounding quotes, no casing variations.

## Verdict triade — canonical primitive

| State | Hex (dark) | On-light | Surface | Glyph | Meaning |
|---|---|---|---|---|---|
| `SAFE` | `#00D67A` | `#00703F` | `#062A1B` | check (✓) | Verified upgrade, low-risk diff. |
| `REVIEW` | `#FFB020` | `#8E4400` | `#2A1C00` | three horizontal bars | May be valid; needs human review. |
| `SIREN` | `#FF3B30` | `#B9140C` | `#2D0B09` | vertical alarm bar | Do not approve, fund, or trust until fixed. |

**Color is paired with a glyph at every size.** A verdict colour without its glyph is a brand violation (per `brand-manual.html` section 04 deuteranopia/protanopia mitigation).

## Out of scope

- Production-grade illustration beyond the logo + verdict glyphs.
- Siren Agent watchlist UI (P2).
- Umia panel (P2 conditional).
- Localisation of the tagline.
- Editing the canonical `brand-manual.html`.

## Anti-patterns

The brand explicitly rejects:
- Purple-blue web3 gradients.
- Glassmorphism, 3D meshes, geometric NFT illustration.
- "Trusted by" / "audited by" / "secured by" voice.
- Magnifying-glass-over-code, robot-with-shield, AI-auditor visual cliché.
- Emoji anywhere in product copy or marketing.

See `brand-manual.html` section 12 (Voice & Tone) and section 13 (Anti-Patterns) for the full list.
