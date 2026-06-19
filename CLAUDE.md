# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IWAC-theme is a customized Omeka S theme (fork of Freedom theme) for the Islam West Africa Collection digital archive at ZMO Berlin. It features dark/light mode toggle, multilingual support, and modern Sass architecture.

**Live site**: https://islam.zmo.de/s/westafrica/

**Visual debugging**: When diagnosing visual/layout issues on the live site, use Playwright MCP (`browser_navigate`, `browser_snapshot`, `browser_take_screenshot`, `browser_evaluate`) to inspect the rendered DOM and computed styles before proposing fixes. The site is publicly accessible at `https://islam.zmo.de/s/westafrica/` (English) or `https://islam.zmo.de/s/afrique_ouest/` (French).

**Stack**: Omeka S 4.1.0+ (PHP), Sass with modern module system, Gulp build, vanilla JavaScript

## Design Philosophy

**Stance: a research instrument with a press-archive face.** (v2.6 redesign, June 2026)

The site is a scholarly database used by historians and political scientists doing comparative work across francophone West African press archives, with a computational pipeline (3 LLM sentiment models, LDA, embeddings, IIIF, geocoding). Users come with specific questions and want **precision and density** — and the instrument now carries the visual language of the material it preserves: the 20th-century newspaper. Masthead wordmark, uppercase section strip, thick 2px ink rules, datelines, ledger-style result rows, duotone press-collage hero.

Visual neighborhood: a modern broadsheet's digital archive run by a university press — newspaper typographic conventions executed with Linear/Stripe-press product polish. **Not** a small museum's website, not a warm editorial magazine, not a generic dashboard.

### Core Principles

1. **Density over comfort.** Researchers want to see more, not fewer, items per screen. Result lists are flat ledger rows separated by hairlines (no boxed cards); multi-value metadata flows inline with interpunct separators.
2. **Typography is the architecture; rules are the joinery.** Hierarchy comes from the three-font system plus the newspaper rule grammar: 2px ink rules open sections (`h1.title`, footer top, KPI figures) and close the header; hairlines divide rows. Boxes are a last resort, reserved for true panels (charts, the AI lede).
3. **Three-font system.** **Besley** (Clarendon: masthead, headlines, section heads, display numerals — verified to cover Arabic-transliteration diacritics), **Source Serif 4** (`--font-serif-text`: article full text, ledes, long-form reading), **Public Sans** (UI, labels, datelines). Track Besley display sizes at `-0.01em`, NOT the full `--tracking-tight` (slab serifs clog).
4. **Neutral is correct — twice.** Light surfaces stay near-white at chroma ~0.002 (no cream, no parchment). Dark mode is the **warm "lamplit reading room"** set (hue ~70–80, chroma ~0.012), deliberately not blue-cool dashboard dark.
5. **Restraint with color.** Primary appears as: focus state, current/active state (nav tab, active filter chips), dateline interpuncts, categorical dots, the duotone hero plate, key counts. Never as per-row badge fills, never on heading text, never as decorative wash or gradient.
6. **Computational honesty.** AI-generated metadata gets explicit visual treatment that signals provenance — not cosmetically blended into human-authored fields.
7. **Multilingual rigor.** FR / EN / AR transliteration get equivalent typographic treatment in every face used (test `ḥ ṣ ḍ ṭ ẓ ʿ ā ī ū` before adopting any font). Tabular figures everywhere alignment matters.

### Color Philosophy

The system is **OKLCH-based** because equal lightness steps look equal (HSL is perceptually uneven). All primary variants derive from a single `--primary-base` hex (admin-overridable) via `color-mix(in oklab, …)` so customizations cascade through every focus ring, glow, blockquote, and hover state without manual tuning. A second admin-overridable seed `--secondary-base` (slate) feeds `--secondary` — a **data-only** colour consumed by the IwacVisualizations charts (series 2 / corpus comparison), never UI chrome. See [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md).

- **Light surfaces**: `oklch(99% 0.002 60)` — near-white with imperceptible warm tint. No cream, no parchment.
- **Light inks**: cool-neutrals (`oklch(13–54% 0.008–0.012 264)`) — reads as "objective / scholarly."
- **Dark mode**: warm deep neutrals — surfaces `oklch(12–20% 0.012 ~70)`, inks `oklch(59–97% 0.006–0.010 ~75)`. The lamplit register pairs with the burnt orange and distinguishes IWAC from blue-dark dashboards.
- **Primary**: IWAC orange, slightly darkened from raw hex in light theme (`color-mix(--primary-base, black 8%)`), lightened in dark.
- **Duotone hero**: the homepage banner renders the collage as a grayscale plate multiplied over a primary ground (`_banner.scss`) — the one big color statement, automatically on-brand for any admin-configured primary.
- **Shadows**: neutral, used sparingly (panels); rows and tags use rules instead.

### Visual Guidelines

- **Masthead header** (`view/common/header.phtml` + `_header.scss` + `_navigation.scss`): wordmark row (Besley 800) + uppercase nav strip, closed by a 2px `--ink-strong` rule. Full nav is visible from `$lg` (1024px); the drawer + slim ink hamburger serve below — the drawer speaks the same register (solid `--surface`, uppercase entries on hairline rules, indented sub-entries; no glass, no pill buttons). In the masthead row only the search box flexes (it has a `min-width` floor); the icon controls never shrink, and below `$sm` the wordmark swaps to the per-site acronym (theme setting `site_title_acronym` — IWAC / CIAO; full title stays in the DOM as the link's accessible name). The active section gets a 2px primary tab on the closing rule.
- **Datelines**: `TYPE · PUBLISHER · DATE` in tracked uppercase with primary interpuncts (`.item-dateline`, built in `view/omeka/site/item/show.phtml`) — the recurring identity device.
- **Banner**: the full hero (text overlay, Ken Burns settle, LCP preload) renders on the homepage only; inner pages carry a slim `.banner--compact` band of the same duotone plate (no text, no scrim, no animation, `fetchpriority="low"`) so pages don't open on bare whitespace between the section strip and the title (`layout.phtml` + `_banner.scss`).
- **Quiet chrome.** Footer opens with the mirroring 2px ink rule; partner logos sit grayscale until hover. `backdrop-filter` is reserved for the sticky header, nowhere else — and so is `--surface-overlay` (it is translucent glass; opaque popovers/tooltips use `--surface`). A quiet outlined back-to-top control (`#back-to-top`, bottom end corner) appears after ~a viewport of scroll.
- **Tight transitions** (150–200ms). No bouncing, no elastic, no hover-triggered hero animations.
- **Visible focus states** on every interactive element. **Reduced motion respected** everywhere.

### Component Styling Approach

- **Resource show metadata** (item, media, item-set): dateline, then Besley headline, then flat rows of facts with hairline separators, uppercase labels in `--muted`, 168px label column. Selectors are child-scoped (`> dl > .property > dd`) — value-annotation tooltips nest their own `dl` inside a `dd`, and descendant selectors leak the column layout into them. Multi-value rows (subjects, spatial, languages) flow inline with primary interpuncts; descriptions/abstracts stay in the column as prose blocks (language tag inline at the head of the text); `bibo:content` breaks out full-width — label line above, `--font-serif-text` at `--measure-narrow` from the left edge. Linked-value thumbnails and the RightsStatements badge render as quiet 2.25rem inline marks, never hidden (image-only values like `dcterms:rights` would otherwise show empty rows; the badge cap needs `!important` because the module inline-styles `height:4em`). The lede (`bibo:shortDescription`, "DescriptionAI") keeps the `.property--ai` info-tinted block treatment.
- **Resource browse / search results** (IwacSearch module): ledger rows — hairline-ruled `<li>`s, dateline eyebrow, Besley title, 2-line snippet, quiet interpunct source line, outlined type chip with a categorical dot (active = primary border + wash, NOT filled orange).
- **Categorical type colors** (shared with IwacVisualizations badges): article `--primary`, publication `--secondary`, audiovisual `--info`, document `--warning`, reference `--muted`; entity Personnes `--info`, Lieux `--success`, Organisations `--warning`. Always as dots on outlined chips, never pastel fills.
- **Facets**: quiet borders, high density; active counts as primary tabular text (no filled pills); no accent rails.
- **Breadcrumbs**: plain uppercase crumb line (no chip box), current page marked with primary dot.
- **Pagination**: hairline top border, no primary tint as default.
- **KPI / summary figures** (IwacVisualizations): "almanac" entries — 2px ink rule on top, eyebrow label, Besley numeral; the featured figure's rule turns primary. No card boxes, no gradients, no hover lifts.

### What to Avoid

- **Warm cream / parchment surfaces.** They read as "manuscript museum brochure," wrong register for a digital research database.
- **Atmospheric body gradients** and gradient bars — recognized CMS/AI template tells.
- **Colored side-stripes** (`border-left`/`border-inline-start` accents) on cards, callouts, or legend chips — use dots, full rules, or nothing.
- **Filled-color badges on every row.** Category is a dot, not a shout.
- **Coloring h2s in primary.** Floods long article-style pages and contradicts the "primary as accent" principle.
- **Glossy / glassmorphic effects** anywhere except the sticky header.
- **Bouncing or elastic easing.** Real objects decelerate smoothly.
- **Hover-triggered hero animations** (the one-time load Ken Burns settle is the sanctioned exception).
- **Multiple decorative effects on one component.** Pick one.
- **Cold, clinical blue-gray schemes** — including in dark mode (dark is warm here).
- **Uniform card treatments** that flatten information hierarchy — and cards in general where a rule would do.
- **Random per-class colors** (the old crc32-pastel resource tags) — category colors come from the fixed semantic map above.
- **Inventing CSS custom property names** that don't exist in the token files — they fail silently at runtime.

## Build Commands

```bash
npm install              # Install dependencies
npm run start            # Watch mode - auto-compile on .scss changes
npm run build            # One-off production build
```

## Architecture

### Directory Structure
- `asset/sass/` - **Primary editing location** for styles (SCSS source)
- `asset/css/` - Auto-generated CSS (never edit directly)
- `asset/js/` - JavaScript files
- `view/` - PHP templates (.phtml)
- `config/theme.ini` - Theme settings definitions

### Sass Module System (Critical)

**Always use `@use`/`@forward` syntax. Never use deprecated `@import`.**

```scss
// In component files, import abstracts:
@use "../../abstracts/abstracts" as *;

// In index files, forward sub-modules:
@forward "component-name/component-name";
```

Key rules:
- `@forward` rules MUST come before any other rules in a file
- Each file using variables/mixins needs its own `@use` statement

### CSS Custom Properties (Design Tokens)

**CRITICAL: Only use tokens defined in `_colors.scss`, `_tokens.scss`, `_typography.scss`. Do NOT invent token names - undefined tokens fail silently at runtime.**

| Category | Pattern | Examples |
|----------|---------|----------|
| Colors (ink scale) | direct names | `--ink-strong`, `--ink`, `--ink-light`, `--ink-subtle`, `--muted`, `--ink-on-pastel` |
| Colors (surfaces) | direct names | `--surface`, `--surface-raised`, `--surface-sunken`, `--surface-overlay`, `--background` |
| Colors (borders) | direct names | `--border-light`, `--border`, `--border-strong` |
| Colors (brand) | direct names | `--primary`, `--primary-hover`, `--primary-active`, `--secondary`, `--white`, `--black` |
| Text sizes | `--text-{size}` | `--text-xs`, `--text-sm`, `--text-base`, `--text-lg`, `--text-2xl`, … `--text-5xl` (homepage hero display) |
| Font families | direct names | `--font-headings` (Besley — masthead/headlines/display numerals), `--font-serif-text` (Source Serif 4 — long-form reading), `--font-body` (Public Sans), `--font-mono` — exposed in `:root` so runtime consumers (IwacVisualizations, IwacSearch) inherit the theme's stacks instead of hardcoding their own |
| Spacing | `--space-{n}` | `--space-1` through `--space-40` (also `--space-sm`, `--space-md`, etc.) |
| Control sizes | `--size-control-{size}` | `--size-control-xs` (28px), `--size-control-sm` (36px), `--size-control-md` (40px), `--size-control-lg` (44px), `--size-control-xl` (48px) |
| Reading measures | `--measure-{size}` | `--measure-narrow` (704px), `--measure-base` (840px), `--measure-wide` (1160px) |
| Focus rings | `--ring-focus{-size}` | `--ring-focus` (3px ring), `--ring-focus-sm` (2px ring) — use as `box-shadow` value |
| Letter spacing | `--tracking-{size}` | `--tracking-tight` (-0.02em), `--tracking-wide` (0.04em), `--tracking-wider` (0.08em) |
| Effects | `--shadow-{size}`, `--radius-{size}` | `--shadow-sm`, `--shadow-md`, `--radius-md`, `--radius-lg` |
| Accent lines | `--accent-line-{size}` | `--accent-line-sm` (2px), `--accent-line-md` (3px) |
| Transitions | `--transition-{speed}` | `--transition-fast`, `--transition-base`, `--transition-slow` |
| Line height | `--line-height-{type}` | `--line-height-normal`, `--line-height-relaxed` |
| Accent mix | `--accent-mix-{strength}` | `--accent-mix-subtle` (25%), `--accent-mix-medium` (40%), `--accent-mix-strong` (60%) |

**Common mistakes - these tokens DON'T exist:**
| Wrong | Correct |
|-------|---------|
| `--surface-alt`, `--surface-hover` | `--surface-raised` (or `--surface-sunken` for recessed) |
| `--bg-surface`, `--bg-elevated` | `--surface` (or `--surface-raised`) — alias block removed |
| `--bg-muted` | `--surface-raised` — alias removed |
| `--ink-muted`, `--text-muted`, `--text-secondary` | `--muted`, or `--ink-light`/`--ink-subtle` |
| `--text-primary` | `--ink` — alias removed |
| `--text-heading` | `--ink-strong` — alias removed |
| `--font-size-*` | `--text-*` |
| `--leading-*` | `--line-height-*` |
| `--border-color` | `--border` — alias removed |
| `--border-dark`, `--border-hover` | `--border-strong` |
| `--primary-contrast` | `--white` — alias removed; use `--white` directly for foreground over `--primary` |
| `--accent`, `--accent-dark`, `--accent-hue`, `--accent-sat` | `--primary` (entire accent family was removed) |
| `--secondary-dark`, `--secondary-contrast` | `--secondary` itself now **exists** — a 2nd categorical/data-series colour (charts only, NOT chrome; see [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md)). For variants derive via `color-mix(in oklab, ...)` |
| `--primary-hue`, `--primary-sat` | derive from `--primary` via `color-mix(in oklab, ...)` (HSL components removed; system is OKLCH-based) |
| `--gradient-primary` | removed (decorative gradient bars were a CMS-template tell) |
| `--line-height-tight` | Use `1.1` (h1) or `$font__headings-line-height` (1.25) |
| `--font-weight-*` | Use numeric values directly (400, 500, 600, 700) |

For color variations, use `color-mix(in oklab, ...)` with primary as the seed:
```scss
// Always use oklab as the mixing space — it gives perceptually uniform results
border-color: color-mix(in oklab, var(--primary) var(--accent-mix-medium), var(--border));
background:   color-mix(in oklab, var(--primary) 20%, transparent);
```

**Why `in oklab`, not `in srgb`:** sRGB mixing produces muddy mid-tones (e.g. blue + yellow → gray). Oklab mixing stays vibrant and perceptually accurate, matching how OKLCH is used for the base palette.

### Shared Mixins (`_mixins.scss`)

Use these mixins for consistent component patterns:

| Mixin | Purpose | Usage |
|-------|---------|-------|
| `@include card-hover` | Shadow + `--border-strong` on hover (no brand tint) | Resource cards, carousel slides |
| `@include focus-ring` | Consistent `focus-visible` outline | Interactive elements (buttons, links) |
| `@include pagination-container` | Shared pagination layout, hairline borders, no gradient | All pagination components |
| `@include title-link` | Consistent resource title link styling | Resource grid/list titles |
| `@include primary-button` / `@include secondary-button` | Button variants | Buttons, pagination controls |

### Dark/Light Theme System

Three-way support:
1. System preference: `@media (prefers-color-scheme: dark)`
2. Manual dark: `body[data-theme="dark"]`
3. Force light: `body[data-theme="light"]`

Theme colors defined in `_colors.scss`, persistence via `localStorage` key `iwac-theme-preference`.

### BEM Naming Convention

```scss
.block { }
.block__element { }
.block--modifier { }
```

## Adding a New Component

1. Create: `asset/sass/components/name/_name.scss`
2. Add at top: `@use "../../abstracts/abstracts" as *;`
3. Forward in: `asset/sass/components/_components.scss`
4. Run: `npm run build`

## PHP Templates

- Use `<?php ?>` tags (not short tags)
- Always escape output: `$this->escapeHtml()`, `$this->escapeHtmlAttr()`
- Translation: `$this->translate('String')`
- Access settings: `$this->themeSetting('setting_name')`
- Check module availability before using helpers:
```php
<?php if ($this->getHelperPluginManager()->has('helperName')): ?>
    <?= $this->helperName() ?>
<?php endif; ?>
```

## Key Files

| File | Purpose |
|------|---------|
| `asset/sass/style.scss` | Main Sass entry point |
| `asset/sass/abstracts/variables/_colors.scss` | Color system (light/dark) |
| `asset/sass/abstracts/variables/_tokens.scss` | Design tokens |
| `view/layout/layout.phtml` | Main HTML structure, dynamic color injection |
| `view/common/header.phtml` | Header with theme toggle, language switcher |
| `asset/js/theme-toggle.js` | Theme persistence logic |
| `config/theme.ini` | All theme settings definitions |

## Module Integrations

The theme integrates with: Internationalisation (language switching), Mapping, Collecting, URI Dereferencer, Universal Viewer, Mirador. Always check module availability before using their helpers.

**Mirador IIIF viewer.** Mirador is a React/MUI app and cannot read theme CSS tokens, so its palette is defined as concrete hex in the module config (not the theme). The **canonical, token-derived palette + setup instructions** live in [docs/MIRADOR.md](docs/MIRADOR.md) — paste it once at the module/site level, never per item. Light/dark switching is automatic via `asset/js/mirador-theme-sync.js`; `asset/sass/components/mirador/_mirador.scss` holds only z-index/reset rules (no colours). Regenerate the hex from `_colors.scss` with the script in that doc if the tokens change.

**Shared design system (IwacSearch + IwacVisualizations).** Two sibling modules — [IwacSearch](https://github.com/fmadore/IwacSearch) (Svelte search) and [IwacVisualizations](https://github.com/fmadore/IwacVisualizations) (ECharts/MapLibre dashboards) — *consume* this theme's design tokens instead of defining their own. The authoritative shared-token contract — consumable tokens, the **canonical fallback table**, dark-mode rules, and the one sanctioned exception (module-owned chart/data colours) — lives in **[docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md)**. Rules of thumb: when you change a token here, update each module's `var(--token, <fallback>)` fallback to match (or it silently drifts); data-encoding colours (chart series, sentiment scales, badges) are the *only* colours a module may own, and they live in the module prefixed `--iwac-vis-*`; everything else must resolve from a theme token.

## Constraints

- Never edit files in `asset/css/` - they're auto-generated
- Never use deprecated Sass `@import` syntax
- Never hardcode colors, spacing, or other design tokens
- **Never invent CSS custom property names** - only use tokens explicitly listed in the "CSS Custom Properties" section above
- Respect `prefers-reduced-motion` for animations
- Test both light and dark modes
- Run `npm run build` after changes to verify compilation
