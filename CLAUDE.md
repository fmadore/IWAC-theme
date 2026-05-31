# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IWAC-theme is a customized Omeka S theme (fork of Freedom theme) for the Islam West Africa Collection digital archive at ZMO Berlin. It features dark/light mode toggle, multilingual support, and modern Sass architecture.

**Live site**: https://islam.zmo.de/s/westafrica/

**Visual debugging**: When diagnosing visual/layout issues on the live site, use Playwright MCP (`browser_navigate`, `browser_snapshot`, `browser_take_screenshot`, `browser_evaluate`) to inspect the rendered DOM and computed styles before proposing fixes. The site is publicly accessible at `https://islam.zmo.de/s/westafrica/` (English) or `https://islam.zmo.de/s/afrique_ouest/` (French).

**Stack**: Omeka S 4.1.0+ (PHP), Sass with modern module system, Gulp build, vanilla JavaScript

## Design Philosophy

**Stance: research instrument, not editorial product.**

The site is a scholarly database used by historians and political scientists doing comparative work across francophone West African press archives, with a computational pipeline (3 LLM sentiment models, LDA, embeddings, IIIF, geocoding). Users come with specific questions and want **precision and density**, not delight or warmth.

Visual neighborhood we want to share: MIT Press, Stripe Press, eLife, Linear docs, Are.na, serious institutional repositories. **Not** a small museum's website, not a tasteful cultural-heritage brochure, not a warm editorial magazine.

### Core Principles

1. **Density over comfort.** Researchers want to see more, not fewer, items per screen. Whitespace is a tool for hierarchy, not a default for comfort.
2. **Typography as architecture.** Hierarchy is built from type alone — size, weight, optical size, figure styles, small caps. Not from cards, gradients, or decorative rules.
3. **Neutral is correct.** Surfaces are cool-leaning near-white with imperceptible warm hint at very low chroma (~0.002). No cream, no parchment, no atmospheric washes.
4. **Restraint with color.** Primary appears in three places: focus state, current/active state, intentional accents. Never on heading text by default, never as decorative wash, never as gradient bar.
5. **Computational honesty.** AI-generated metadata gets explicit visual treatment that signals provenance — not cosmetically blended into human-authored fields.
6. **Multilingual rigor.** FR / EN / AR transliteration get equivalent typographic treatment. Tabular figures everywhere alignment matters.

### Color Philosophy

The system is **OKLCH-based** because equal lightness steps look equal (HSL is perceptually uneven). All primary variants derive from a single `--primary-base` hex (admin-overridable) via `color-mix(in oklab, …)` so customizations cascade through every focus ring, glow, blockquote, and hover state without manual tuning.

- **Surfaces**: `oklch(99% 0.002 60)` — near-white with imperceptible warm tint. No cream, no parchment.
- **Inks**: cool-neutrals (`oklch(13–54% 0.008–0.012 264)`) — reads as "objective / scholarly" rather than "warm / inviting."
- **Borders**: cool-neutral grays (`oklch(76–92% 0.005–0.009 258)`).
- **Primary**: IWAC orange, slightly darkened from raw hex toward an institutional register (`color-mix(--primary-base, black 8%)` in light theme).
- **Shadows**: neutral cool, not warm-tinted.

### Visual Guidelines

- Primary orange used **rarely**: focus rings, current-state markers, link hover, eyebrow labels, pill tags. Never as page-wide section accent.
- **Solid surfaces.** No body-level atmospheric gradients. Depth from intentional shadows on raised elements only.
- **Quiet chrome.** Footer is a navigation block, not the most-styled component. `backdrop-filter` is reserved for the sticky header (functional chrome over content), nowhere else.
- **Tight transitions** (150–200ms). No bouncing, no elastic, no hover-triggered hero animations.
- **Visible focus states** on every interactive element.
- **Reduced motion respected** for every non-essential animation.

### Component Styling Approach

- **Resource show metadata** (item, media, item-set): flat rows of facts with hairline separators, uppercase small-caps labels, no card treatment. The lede (`bibo:shortDescription`, labelled "DescriptionAI") gets the `.property--ai` treatment — info-tinted block, sparkle mark, "AI-generated" badge with explanatory tooltip — so readers can tell computational artefacts from human-authored archival metadata at a glance.
- **Resource browse**: cards are acceptable for default grid view but should be tight and dense, not airy.
- **Facets**: accent-tinted legends; quiet borders; high information density.
- **Breadcrumbs**: current page marked with primary-tinted dot.
- **Pagination**: hairline top border, no primary tint as default.

### Global Editorial Type & Tag Tokens

1. **All h1 headings** (`base/typography/_headings.scss`) use `line-height: 1.1` and `letter-spacing: -0.02em` for editorial weight on every page title.
2. **All `.resource-tag` pills** (`base/elements/_resource-tag.scss`) use `border-radius: var(--radius-full)`, `text-transform: uppercase`, and `letter-spacing: 0.06em`.
3. **h2 default color is `--ink-strong`**, not `--primary`. Brand color is reserved for accents, eyebrow labels, and state.

### Editorial Hierarchy on Resource Show Pages

The `components/resource-show/_resource-show.scss` file scopes its rules to `body.resource.show, body.item-set` — covering item show, media show, and item-set show pages.

Show pages follow a journalism-inspired flow rather than a uniform property grid:

1. **Resource tag pills** — breathing room from the banner, pill shape, uppercase
2. **Display title** — inherits global h1 editorial treatment (tight leading, negative tracking)
3. **Metadata rows** — flat rows of facts with hairline separators, uppercase small-caps labels in `--muted`, 144px label column on desktop
4. **Lede** (`bibo:shortDescription`, labelled "DescriptionAI") — `.property--ai` treatment: info-tinted block, sparkle mark, "AI-generated" badge with explanatory tooltip
5. **Full body** (`bibo:content`) — readable measure (~68ch)

The editorial treatment only applies inside `.main-region > .metadata` — sidebar regions (including the AI Sentiment Analysis block) are untouched.

### What to Avoid

- **Warm cream / parchment surfaces.** They read as "manuscript museum brochure," wrong register for a digital research database.
- **Atmospheric body gradients.** They communicate "we want you to feel welcomed." A research instrument equips, it doesn't welcome.
- **Decorative gradient bars under hero headings.** The 80px×4px brand-gradient underline is a recognized AI/CMS template tell.
- **Coloring h2s in primary.** Floods long article-style pages and contradicts the "primary as accent" principle.
- **Glossy / glassmorphic effects** anywhere except the sticky header.
- **Bouncing or elastic easing.** Real objects decelerate smoothly.
- **Hover-triggered hero animations** (Ken Burns, etc.) — on touch devices that's never; on desktop it fires at random.
- **Multiple decorative effects on one component.** Pick one. The footer used to layer seven; now it has a single hairline rule.
- **Cold, clinical blue-gray schemes** — generic-template register, equally wrong direction.
- **Uniform card treatments** that flatten information hierarchy.
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
| Colors (brand) | direct names | `--primary`, `--primary-hover`, `--primary-active`, `--white`, `--black` |
| Text sizes | `--text-{size}` | `--text-xs`, `--text-sm`, `--text-base`, `--text-lg`, `--text-2xl` |
| Font families | direct names | `--font-headings` (Source Serif 4), `--font-body` (Public Sans), `--font-mono` — exposed in `:root` so runtime consumers (IwacVisualizations, IwacSearch) inherit the theme's stacks instead of hardcoding their own |
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
| `--secondary`, `--secondary-dark`, `--secondary-contrast` | derive from `--primary` via `color-mix(in oklab, ...)` (secondary family was removed) |
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

The theme integrates with: Internationalisation (language switching), Mapping, Collecting, Faceted Browse, URI Dereferencer, Universal Viewer. Always check module availability before using their helpers.

### Faceted Browse Module (Critical Integration)

**Source:** [omeka-s-modules/FacetedBrowse](https://github.com/omeka-s-modules/FacetedBrowse)

The Faceted Browse module is heavily used on the site. It is **entirely AJAX-driven** — the page loads a skeleton, then fetches sidebar facets and browse results via AJAX. This means:
- Content inside `#section-sidebar` and `#section-content` is replaced on every filter/page change
- Inline `<script>` tags in AJAX responses execute when jQuery processes the HTML
- Tablesaw re-initializes each time column results are loaded

#### DOM Structure (Rendered Page)

```
body.faceted-browse-page.resource.browse
  #container [data-url-categories, data-url-facets, data-url-browse, data-category-id]
    button#section-sidebar-modal-toggle          (mobile only)
    #section-sidebar.mobile.modal-panel          (AJAX content)
      button#section-sidebar-modal-close.close-button
      fieldset.categories-container              (if multiple categories)
        legend
        ul#categories > li > a.category[data-category-id]
      — OR —
      a#categories-return.button                 (back to categories)
      fieldset.facets-container
        legend                                   (category name, e.g. "Bénin")
        div#facets[data-category-id, data-category-options]
          fieldset.facet[data-facet-id, data-facet-type, data-facet-data]
            legend                               (facet name, e.g. "Type")
            ul.select-list > li.select-list-item > label > input + span
            a.select-list-expand / a.select-list-collapse
            — OR —
            input.full-text[type="text"]
            — OR —
            select.value
    #section-content                             (AJAX content)
      div.browse-controls                        (pagination, permalink, sort)
      ul.resource-list > li.item.resource        (default list view)
      — OR —
      table.faceted-results.tablesaw.tablesaw-swipe  (column/table view)
      div.browse-controls                        (bottom pagination)
```

#### Template Overrides in This Theme

| Theme Path | Overrides | Purpose |
|------------|-----------|---------|
| `view/faceted-browse/site/page/browse-items-columns.phtml` | Module's table template | Wraps `<table>` in `<div class="faceted-browse-table-wrapper">` for horizontal scroll |

**IMPORTANT:** The module's original template renders the table **directly** inside `#section-content` with NO wrapper element. Without the template override, `.faceted-browse-table-wrapper` CSS targets nothing.

#### Key CSS Classes from the Module

| Class | Element | Notes |
|-------|---------|-------|
| `.faceted-browse-page` | `<body>` | Top-level page scope |
| `.block-facetedBrowsePreview` | Block wrapper | For embedded preview blocks on site pages |
| `.categories-container` | `<fieldset>` | Wraps category list |
| `.facets-container` | `<fieldset>` | Wraps all facets for current category |
| `.facet` | `<fieldset>` | Individual facet; has `data-facet-type` attribute |
| `.select-list` | `<ul>` | Facet options list; has `data-truncate-list-items` |
| `.select-list-item` | `<li>` | Individual option with label + input |
| `.select-list-expand` / `.select-list-collapse` | `<a>` | "See more" / "See less" toggle buttons |
| `.full-text` | `<input>` | Full-text search input inside a facet |
| `.faceted-results` | `<table>` | Results table (column view) |
| `.tablesaw` / `.tablesaw-swipe` | `<table>` | Tablesaw responsive table classes |
| `.resource-list` | `<ul>` | Default list view results |
| `.browse-controls` | `<div>` | Pagination + sort + permalink wrapper |
| `.permalink` | `<a>` | Copy permalink button |
| `#section-content.loading` | state | Shows spinner, hides children via CSS |

#### Facet Types and Their Input Classes

| Facet Type (`data-facet-type`) | Input Class | Modes |
|-------------------------------|-------------|-------|
| `value` | `.value` | `text_input`, `single_select`, `single_list`, `multiple_list` |
| `item_set` | `.item-set` | Select dropdown or checkbox/radio list |
| `resource_class` | `.resource-class` | Select dropdown or checkbox/radio list |
| `resource_template` | `.resource-template` | Select dropdown or checkbox/radio list |
| `full_text` | `.full-text` | Text input with 350ms debounce |

#### Tablesaw Vendor Library

The module bundles Tablesaw for responsive tables. Key points:
- Mode: `swipe` — hides columns and provides left/right navigation arrows
- Classes added by JS: `.tablesaw-swipe-cellhidden` (hidden columns), `.tablesaw-cell-persist` (pinned first column)
- Tablesaw sets `max-width: 100%` on `.tablesaw` — use our wrapper's `overflow-x: auto` instead
- Arrow buttons: `a.tablesaw-nav-btn.btn.btn-micro.left|right` — use CSS border triangles via `::before`, positioned with `position: absolute`
- Navigation container: `.tablesaw-advance` — module sets `float: right`, we override to `float: none`
- Tablesaw wraps the table in `.tablesaw-bar` at runtime

#### Module CSS Gotchas (Things That Need `!important` Overrides)

| Module Style | Issue | Theme Fix |
|-------------|-------|-----------|
| `.tablesaw { max-width: 100% }` | Prevents table from exceeding container | Wrapper with `overflow-x: auto` handles scroll |
| `.tablesaw-advance { float: right }` | Breaks flex layout | `float: none !important` |
| `.tablesaw-advance a.tablesaw-nav-btn { width: 1.8em; height: 1.8em; text-indent: -9999px }` | Tiny buttons, arrow positioning based on small size | Override dimensions and re-center `::before` arrows |
| `.tablesaw-btn` / `.btn-micro` | Generic button styles conflict | Use high-specificity selectors with `!important` |
| `#section-sidebar.open { background-color: #fff }` | Hardcoded white background | Override with `var(--surface)` for dark mode |

#### Breakpoints

- **Module CSS mobile:** `max-width: 39.9988em` (~640px) — sidebar stacks, toggle appears
- **Module JS modal:** `896px` — sidebar modal behavior
- **Theme overrides:** Uses `$xl` (1200px) for sidebar layout, `$lg` (1024px) for tablesaw columns

#### Theme SCSS Location

All faceted browse styles: `asset/sass/components/facets/_facets.scss`

Selectors are scoped under `.faceted-browse-page, .block-facetedBrowsePreview { ... }` to target both the full page and embedded block previews.

## Constraints

- Never edit files in `asset/css/` - they're auto-generated
- Never use deprecated Sass `@import` syntax
- Never hardcode colors, spacing, or other design tokens
- **Never invent CSS custom property names** - only use tokens explicitly listed in the "CSS Custom Properties" section above
- Respect `prefers-reduced-motion` for animations
- Test both light and dark modes
- Run `npm run build` after changes to verify compilation
