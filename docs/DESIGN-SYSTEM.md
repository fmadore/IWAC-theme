# IWAC Design System — Shared Token Contract & Module Integration

This document is the **authoritative contract** for design tokens shared across
the IWAC front-end. It exists so the theme and its sibling modules never grow
*competing* design variables — one canonical value per design decision, defined
once, consumed everywhere.

- **Source of truth:** [`IWAC-theme`](https://github.com/fmadore/IWAC-theme) —
  tokens live in `asset/sass/abstracts/variables/` (`_colors.scss`,
  `_tokens.scss`, `_typography.scss`).
- **Consumers:**
  - [`IwacSearch`](https://github.com/fmadore/IwacSearch) — Svelte 5 discovery
    client (public search, admin, header typeahead).
  - [`IwacVisualizations`](https://github.com/fmadore/IwacVisualizations) —
    ECharts / MapLibre dashboards (vanilla JS block layouts).

Read this alongside `CLAUDE.md` (the canonical token list + common-mistake
table) and the **Design Philosophy** section there.

---

## 1. Single source of truth

Every colour, type, spacing, radius, shadow, and motion value is a CSS custom
property defined by the theme. Nothing downstream redefines them.

Two **brand seeds** are admin-configurable and injected at runtime in
[`view/layout/layout.phtml`](../view/layout/layout.phtml):

```php
$primaryColor   = $this->themeSetting('primary_color')   ?? '#e64a19';
$secondaryColor = $this->themeSetting('secondary_color') ?? '#394f68';
```

```html
<style>
  :root {
    --primary-base:   <?= $primaryColor ?>;   /* IWAC burnt orange */
    --secondary-base: <?= $secondaryColor ?>; /* slate, 2nd data colour */
  }
</style>
```

Every other brand variant is **derived** from these seeds in SCSS via
`color-mix(in oklab, …)` (see `_colors.scss`):

```scss
--primary:   color-mix(in oklab, var(--primary-base), black 8%);   // light
--secondary: var(--secondary-base);                                // light
--secondary: color-mix(in oklab, var(--secondary-base), white 30%);// dark
```

**Consequence:** when an admin changes the Primary or Secondary colour in the
theme settings, the new value cascades automatically through every focus ring,
glow, blockquote, chart series, and map swatch — in both modules, with no
rebuild. The modules read the *live* values at runtime; they never bake the
brand colour into their bundles.

> **Why OKLCH / `oklab` mixing.** Equal lightness steps look equal, and mixing
> in `oklab` keeps mid-tones vibrant instead of muddy. **Always** mix `in oklab`,
> never `in srgb` — this applies to the modules too.

---

## 2. The token contract — what modules may consume

Modules may consume **any** token below. They must reference it as
`var(--token, <fallback>)` where the fallback mirrors the theme's canonical
value (see §3). Do **not** invent token names — undefined tokens fail silently.

| Category | Tokens |
|----------|--------|
| **Brand** | `--primary`, `--primary-hover`, `--primary-active`, `--secondary`, `--white`, `--black` |
| **Ink (text)** | `--ink-strong`, `--ink`, `--ink-light`, `--ink-subtle`, `--muted`, `--ink-on-pastel` |
| **Surfaces** | `--surface`, `--surface-raised`, `--surface-sunken`, `--surface-overlay`, `--background` |
| **Borders** | `--border-light`, `--border`, `--border-strong` |
| **Status** | `--success`, `--warning`, `--error`, `--info` (+ matching `*-bg`) |
| **Focus** | `--focus-color`, `--focus-ring`, `--ring-focus`, `--ring-focus-sm` |
| **Typography** | `--font-headings`, `--font-body`, `--font-mono`; `--text-xs … --text-4xl`; `--line-height-normal`, `--line-height-relaxed`; `--tracking-tight/normal/wide/wider` |
| **Spacing** | `--space-1 … --space-40`; `--space-xs/sm/md/lg/xl/2xl/3xl` |
| **Radius** | `--radius-sm/md/lg/xl/full` |
| **Shadow / glow** | `--shadow-xs … --shadow-xl`; `--glow-xs/sm/md` |
| **Panel** | `--panel-bg`, `--panel-border`, `--panel-border-color`, `--panel-radius`, `--panel-shadow` |
| **Controls** | `--size-control-xs … --size-control-xl` |
| **Measures** | `--measure-narrow/base/wide` |
| **Motion** | `--transition-fast/base/slow`, `--ease-out-quart` |
| **Accent mix** | `--accent-mix-subtle/medium/strong`, `--accent-line-sm/md` |

The full list and the table of *non-existent* names to avoid live in
`CLAUDE.md` → "CSS Custom Properties (Design Tokens)".

### `--secondary` — read this before using it

`--secondary` (slate `#394f68`) is a **second categorical / data-series
colour**, not a second brand accent. It exists for data visualisation:

- chart series 2 (IwacVisualizations palette slot 1),
- the "corpus B" colour in the Compare-Newspapers block.

It is **never** used for chrome — no buttons, links, focus rings, or headings.
Primary is the one brand accent; secondary is a data encoding that happens to be
admin-tunable so a site can keep its two-corpus comparisons on-brand.

---

## 3. The fallback-harmonization rule

Fallbacks (`var(--token, #hex)`) only render when the IWAC theme is **not** the
active Omeka theme — i.e. never, on production. They are kept for two reasons:
graceful degradation, and as living documentation of the contract. Because of
the second reason, **a fallback must equal the theme's canonical default**.
A stale fallback (old brand orange, cream surface) is a "competing variable"
even if it never paints a pixel — fix it.

### Canonical fallback values

| Token | Light fallback | Dark fallback | Source token |
|-------|---------------|---------------|--------------|
| `--primary` | `#e64a19` | `#ec653f` | `mix(#e64a19, black 8%)` / `mix(#e64a19, white 12%)` |
| `--secondary` | `#394f68` | `#708093` | seed / `mix(#394f68, white 30%)` |
| `--ink-strong` | `#1c1f27` | — | `oklch(13% .012 264)` |
| `--ink` | `#2c2f37` | `#ebecf0` | `oklch(20% .012 264)` |
| `--ink-light` | `#535862` | `#b1b3ba` | `oklch(38% .012 260)` |
| `--muted` | `#767880` | `#84878f` | `oklch(54% .008 256)` |
| `--surface` | `#fdfdfd` | `#1f232b` | `oklch(99.2% .002 60)` |
| `--surface-raised` | `#fafaf9` | `#262a32` | `oklch(98% .003 60)` |
| `--surface-sunken` | `#f3f3f1` | — | `oklch(96% .004 60)` |
| `--background` | `#f7f7f6` | `#15181f` | `oklch(97% .003 60)` |
| `--border` | `#d4d6da` | `#3d4148` | `oklch(86% .007 258)` |
| `--border-light` | `#e6e7eb` | `#2f343c` | `oklch(92% .005 258)` |
| `--error` | `#c0392b` | — | `oklch(54% .20 25)` (red — not the orange brand!) |
| `--white` | `#fff` | `#fff` | — |

> The light cool-neutral set above is mirrored verbatim in
> `IwacVisualizations/asset/js/iwac-theme.js` (`FALLBACK_LIGHT` / `FALLBACK_DARK`),
> which is the runtime fallback object the charts use when the theme is absent.
> Treat that object and this table as the same contract.

### Removed tokens — do NOT reference them as fallbacks

These were consumed by the modules historically and have been repointed:

| Old reference | Use instead |
|---------------|-------------|
| `var(--primary-contrast, …)` | `var(--white, #fff)` |
| `var(--on-primary, …)` | `var(--white, #fff)` |
| `var(--accent, …)` | `var(--primary, …)` |
| `var(--success-strong, …)` | `color-mix(in oklab, var(--success), black 18%)` |
| `#c66` (old rose brand) | `#e64a19` (primary) / `#c0392b` (error) |

---

## 4. Sanctioned exceptions — module-owned data colours

Data encoding needs more distinct, controlled colours than a UI theme should
carry. These are the **only** colours a module is allowed to define itself.
They live in the module, are prefixed `--iwac-vis-*` (or are JS palette
constants), are documented here, and must **not** leak into UI chrome.

All of them are owned by **IwacVisualizations**:

1. **Categorical chart palette** — `iwac-theme.js` `buildPalette()`:
   `[--primary, --secondary, …PALETTE_REST]`. Slot 0 is the brand, slot 1 is
   the shared slate, and the remaining hand-picked hues (`PALETTE_REST`) are
   chosen to read in both themes and to stay distinguishable for colour-vision
   deficiencies. **New series colours go here, never into the theme.**
2. **Sentiment divergent scale** (`--iwac-vis-sent-*`, `iwac-core.css`):
   positive → neutral → negative, mapped to `--success` / `--muted` /
   `--warning` / `--error`; "strong positive" is a darkened `--success`.
3. **Sequential ramps** (`--iwac-vis-cent-*`, `--iwac-vis-subj-*`,
   `--iwac-vis-heatmap-*`): built from `--primary` faded toward `--surface`, so
   they track the brand seed automatically.
4. **AI-model accents** (`--iwac-vis-model-{gemini,chatgpt,mistral}`): three
   distinct hues so the article-dashboard sentiment radar separates the three
   models. Site-overridable.
5. **Resource-type badges** (`.iwac-vis-badge--*`): pastel category fills with
   explicit light + dark variants.

If you find yourself adding a hard-coded colour anywhere else, it belongs in
the theme as a token, or it is a bug.

---

## 5. Dark-mode contract

- The **theme** owns light/dark, three ways: `:root` (light default),
  `@media (prefers-color-scheme: dark)`, and `body[data-theme="dark"|"light"]`
  (manual toggle, persisted in `localStorage` key `iwac-theme-preference`).
- Tokens flip values across these blocks; **modules must not branch on the
  theme** in their own CSS. Consume the token and dark mode follows for free.
  (The Compare-Newspapers corpus colours, for example, dropped their manual
  `body[data-theme="dark"]` override once they consumed `--primary` /
  `--secondary`, which also fixed system-dark coverage.)
- **IwacVisualizations** charts can't inherit CSS cascade into a `<canvas>`, so
  `iwac-theme.js` reads tokens at runtime via `getComputedStyle`, converts
  `oklch()`/`oklab()`/`color(srgb …)` to legacy `rgb()` for ECharts' zrender
  parser, and re-applies via `chart.setTheme()` on theme switch. Add new
  token-driven chart colours by reading them in `readTokens()`, never by
  hard-coding.

---

## 6. Per-module integration

### IwacSearch (Svelte 5)

- **Mounts** into theme-rendered hooks: `[data-iwac-search-root]` (public
  search / browse), `[data-iwac-admin-root]` (admin), and the header search box
  (`view/common/search-form.phtml` → `data-iwac-header-search`).
- **Styling:** scoped component `<style>` blocks; consumes theme tokens via
  `var(--token, <canonical fallback>)`. No own theme system, no Sass.
- **Build:** `npm run build` → `asset/dist/iwac-search{,-admin,-header}.{js,css}`.
  Run `npm run lint && npm run check` first. Edit `src/`, never `asset/dist/`.
- The hand-written `asset/css/iwac-search.css` (layout container styles) is
  *not* produced by Vite and is edited directly.

### IwacVisualizations (vanilla JS + ECharts/MapLibre)

- **Mounts** as Omeka `BlockLayout` / `ResourcePageBlockLayout` types, rendered
  inline — inherits theme tokens through the normal cascade.
- **Styling:** plain CSS with tokens (`asset/css/iwac-core.css`, `blocks/*.css`,
  `iwac-maplibre.css`); chart colours resolved in JS via `iwac-theme.js`.
- **Build:** `npm run build:js` (terser) → sibling `*.min.js` (templates load
  the `.min.js`). CSS is hand-edited, no build step. Edit `*.js`, then rebuild
  so the `.min.js` stays in sync — never hand-edit `.min.js`.

---

## 7. Changing or adding a token

1. Edit the theme's variable files in `asset/sass/abstracts/variables/`.
2. Rebuild the theme: `npm run build`.
3. If either module carries a **fallback** for that token, update the fallback
   in the module to match the new canonical value (§3) — otherwise it drifts.
4. Never duplicate framework/UI tokens in a module; never invent names that
   aren't in the theme.

When in doubt, the rule is: **one design decision → one token in the theme →
consumed (not redefined) everywhere else.**
