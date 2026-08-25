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

Read this alongside [`DESIGN-PHILOSOPHY.md`](DESIGN-PHILOSOPHY.md) (the visual
stance) and `CLAUDE.md` (repo gotchas). The canonical token list is the
generated `tokens.json`, not prose.

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
| **Categorical** | `--type-*` (nine resource / entity types); `--series-1 … --series-20` (the ordered chart palette) |
| **Focus** | `--focus-outline` (default), `--ring-focus`, `--ring-focus-sm`, `--focus-color`, `--focus-ring-color` |
| **Typography** | `--font-headings`, `--font-serif-text`, `--font-body`, `--font-mono`; `--text-2xs … --text-5xl`; `--line-height-normal`, `--line-height-relaxed`; `--tracking-display/tight/normal/wide/wider` |
| **Spacing** | `--space-1 … --space-40`; `--space-xs/sm/md/lg/xl/2xl/3xl` |
| **Radius** | `--radius-sm/md/lg/full` |
| **Shadow / glow** | `--shadow-xs … --shadow-lg`; `--glow-xs/sm/md` |
| **Panel** | `--panel-bg`, `--panel-border`, `--panel-radius`, `--panel-shadow` |
| **Controls** | `--size-control-xs … --size-control-xl` |
| **Measures** | `--measure-narrow/base/wide` |
| **Motion** | `--transition-fast/base/slow`, `--ease-out-quart` |
| **Accent mix** | `--accent-mix-subtle/medium/strong`, `--accent-line-sm/md` |

The full list lives in the generated `tokens.json` (`names` publishes the
complete vocabulary). Rather than consulting a table of names to avoid, run
`npm run check:tokens` — it fails on anything that doesn't resolve.

### Type scale — the floor, and the step that deliberately isn't there

The UI tier is a 2px arithmetic progression: **11 · 13 · 15 · 17 · 19**
(`--text-2xs` … `--text-lg`), then 24 / 30 for headings and three `clamp()`ed
display steps. Only `--text-3xl/4xl/5xl` are fluid; **every UI step is fixed on
purpose**, so a 15px facet label doesn't quietly become 15.6px between
breakpoints.

- `--text-2xs` (11px) is the **floor**. Nothing in the stack may set type
  smaller. It exists because the scale used to stop at 13px while dense axis,
  legend and chip labels genuinely need less — so ~12 of them were written as
  bare `0.6875rem` literals, plus one at 9px. A step nobody can reach is a step
  everybody reaches around.
- There is **no 14px step**, and adding one would put three sizes inside 2px.
  IwacVisualizations' 12 / 14 / 18px literals came from a generic utility
  framework, not from a gap here; they migrate to 13 / 15 / 19.

Both modules' guards fail on a `font-size` set to an absolute literal. Relative
units (`em`, `%`) stay legal — they scale *with* the token the cascade already
set, so they don't fork the scale.

### Focus — one decision, two idioms, and the rule for picking

| Token | When |
|---|---|
| `--focus-outline` | **Default.** `outline: var(--focus-outline); outline-offset: 2px;` |
| `--ring-focus` | When an outline would be clipped: inside `overflow: hidden`, inside a scroll container, or flush against a panel edge. `--ring-focus-sm` is the tighter 2px version for dense controls. |
| `--focus-color` | The colour, when you're composing something custom. |
| `--focus-ring-color` | The translucent tint `--ring-focus` is built from. Consuming it directly is almost always a mistake. |

Before 2.10 there was no token for the *composed outline* — only for its
colour — and the two ring names were one transposition apart
(`--focus-ring` / `--ring-focus`). The result downstream was
`outline: 2px solid var(--focus-color, var(--primary, #ce4115))` hand-copied
44 times across IwacVisualizations' block stylesheets. The tint has been
renamed `--focus-ring-color` so no two focus tokens are near-homographs.

### `--primary` is an accent, not a text colour

**Normative.** `--primary` (`#ce4115`) as text, measured on each light surface:

| on `--surface` | on `--surface-raised` | on `--background` | on `--surface-sunken` |
|---|---|---|---|
| 4.67:1 ✅ | 4.51:1 ✅ | **4.40:1** ❌ | **4.25:1** ❌ |

It clears AA for normal text on the two lightest surfaces and misses on the
other two — which is worse than a clean fail, because it means the same
declaration passes or fails depending on which panel it lands in, and a
component does not know that. All four clear the 3:1 bar for large text
(≥ 24px, or ≥ 19px bold) and for non-text marks. The decision is therefore a
scoping rule, not a new token:

| Sanctioned | Not sanctioned |
|---|---|
| Links and link hover | Running body text on any surface |
| Buttons, controls, and their states | Paragraph, list-item or table-cell copy |
| Current / active state (nav tab, active facet, active count) | Long-form prose blocks, ledes, abstracts |
| Large display text (the 404 numeral, KPI figures) | Anything set from `--font-serif-text` |
| Pseudo-element marks: interpuncts, `::marker`, chevrons, dots | |
| Non-text: borders, fills, focus rings, the duotone plate | |

A darker primary was considered and rejected: the brand seed is
admin-configurable, so no fixed token value can guarantee 4.5:1 for a site that
sets its own — and `--primary` is already darkened 8% from the raw hex for
exactly this reason. Scoping the use is the durable answer; darkening the
colour would only move the failure to the next admin who changes it.

`npm run check:tokens` enforces the rule mechanically over the theme's Sass —
narrowly, and it says so in the script: it flags `color: var(--primary…)` only
where the same block *also* declares itself long-form reading
(`--font-serif-text`, `--line-height-relaxed`, a `--measure-*`), or where the
selector's leaf is a bare prose element (`p`, `li`, `dd`, `blockquote`, …) with
no link, control, state or pseudo-element in the chain. A prose container named
only by a class, carrying none of those markers, is invisible to it. The rule
is a floor under the policy, not a proof of it.

> **Why it is phrased positively.** Every one of the theme's ~60 current
> `color: var(--primary…)` sites is sanctioned. A rule phrased as "flag unless
> it looks interactive" would therefore have been an exemption list seeded with
> sixty entries and growing — a check that gets weaker with every component. A
> rule phrased as "flag what positively looks like prose" starts at zero and
> gets *stronger* as the prose vocabulary grows.

### Breakpoints

`tokens.json` publishes them as `breakpoints`, and both modules' guards assert
that every `@media` width is one of them:

| | `xs` | `sm` | `md` | `lg` | `xl` | `xxl` |
|---|---|---|---|---|---|---|
| | 400px | 600px | 768px | 1024px | 1200px | 1460px |

Media queries can't read custom properties, so modules necessarily restate
these as literals — which is why they were the one part of the contract held
together by a `/* sm */` comment rather than a check, and why that failed:
`blocks/laicite.css` reflowed at 640px labelled `sm` while every other block on
the same page reflowed at 600px.

**`min-width` sits ON the breakpoint; `max-width` sits at breakpoint − 1**, so
the two halves of a pair never both match. `max-width: 600px` beside
`min-width: 600px` means both rules fire in a 1px sliver, and the guard rejects
it with the correction.

**One spelling of the "below" half.** `− 0.02px` (Bootstrap's) was tolerated
here until 2.14, and the theme carried both — ten queries one way, five the
other, in files that reflow the same header. Neither is wrong alone; carrying
both is, for the reason the `/* sm */` comment failed: two answers to one
question and nothing asserting either.

Until 2.14 the contract was enforced only *downstream* — both modules'
`check-theme-tokens.js` checked their CSS, and the source of truth checked
nothing. `npm run check:tokens` now enforces it on `asset/sass` too. Note the
trap it has to avoid, if you ever port this rule: `@media (max-width: #{$md -
1px})` carries a `{` **inside** the condition, so the obvious
`@media([^{]*)\{` stops at the interpolation, hands back a condition with no
closing paren, and silently checks nothing — while the `min-width` half, which
has no interpolation, passes and looks like coverage.

`@container` queries are exempt — they measure their own container, not the
viewport.

### `--secondary` — read this before using it

`--secondary` (slate `#394f68`) is a **second categorical / data-series
colour**, not a second brand accent. It exists for data visualisation:

- the second slot of the categorical chart palette (`--series-2`, palette
  index 1),
- the "corpus B" colour in the Compare-Newspapers block.

It is **never** used for chrome — no buttons, links, focus rings, or headings.
Primary is the one brand accent; secondary is a data encoding that happens to be
admin-tunable so a site can keep its two-corpus comparisons on-brand.

---

## 2b. The token vocabulary (`tokens.json` → `names`)

`tokens.json` publishes a `names` array: **every** custom property the theme
defines — not just the colours resolved in `light` / `dark`, but spacing,
tracking, panel, control-size and measure tokens too. It is generated from the
theme's SCSS, templates and JS by `scripts/build-tokens.js`.

It exists because value-checking alone let *name* drift through unnoticed. A
module could write `var(--space-2xs, 0.25rem)` or
`var(--panel-border-color, var(--border, #ced1d6))` — names the theme has never
defined / no longer defines — and every guard would pass, because the hex
fallbacks were correct and nothing downstream knew the names were fiction. The
declarations then render from their fallback forever, silently decoupled from
the scale they appear to track.

Each module's `check-theme-tokens.js` therefore also asserts that every
`var(--…)` it finds is either:

- present in `names` (a real theme token), **or**
- prefixed `--iwac-` (module-owned: data-series colours, and runtime-set
  properties like `--iwac-drawer-width`), **or**
- defined by that module's own sources.

Anything else fails the build. When you add a token to the theme, run
`npm run build:tokens` and rebuild the modules — same workflow as a colour
change.

---

## 3. The fallback-harmonization rule

Fallbacks (`var(--token, #hex)`) only render when the IWAC theme is **not** the
active Omeka theme — i.e. never, on production. They are kept for two reasons:
graceful degradation, and as living documentation of the contract. Because of
the second reason, **a fallback must equal the theme's canonical default**.
A stale fallback (old brand orange, cream surface) is a "competing variable"
even if it never paints a pixel — fix it.

Two corollaries, both now mechanical:

**The rule is not about colour.** It applies to *every* token — type steps,
spacing, radii, control sizes, line-heights, font stacks, shadows, transitions.
`tokens.json` publishes `values.light` / `values.dark`: every non-colour token
resolved to a literal CSS value, including shadows collapsed to `rgba()`. Both
modules' guards compare against it. Until 2026-08 the assertion was a regex
that matched a hex literal in the fallback slot and nothing else, so the
contract was enforced for colour and unenforced everywhere else — which is
precisely where three repositories had drifted apart: `--line-height-relaxed`
fallback at 1.6 against a canonical 1.7, `--size-control-sm` at 2rem against
2.25rem, `--text-sm` at 14px against 15px, `--transition-base` at `200ms ease`
against `200ms var(--ease-out-quart)`, and a `--font-headings` fallback still
naming the removed **Noto Serif** — in the one property whose quoting bug had
already silently rendered ~30 declarations in the wrong face.

**A fallback must be a flat literal — no nested `var()`.**
`var(--ink-strong, var(--ink, #13161c))` renders exactly when the theme is
absent, in which case `--ink` is absent too: the chain rescues nothing, and
what it *does* do is assert that a headline ink degrades to a body ink — a
substitution the type hierarchy would not survive if it ever fired. The one
exception is a **module-owned** property, where the chain asks a scope question
rather than a theme-absent one: `var(--iwac-vis-compare-color-a,
var(--primary, #ce4115))` correctly means "outside a compare block, use the
brand".

### Canonical fallback values

> **Dark mode is the warm "lamplit reading room" set** (hue ~70–80, chroma
> ~0.012) as of theme v2.6 — the older blue-cool dark hexes (`#1f232b`,
> `#ebecf0`, …) are stale; replace them on sight.

The hex values below are **generated** from `_colors.scss` by
`scripts/build-tokens.js` (→ `tokens.json`); do not edit them by hand. CSS
`var(--token, #hex)` fallbacks must equal the **Light** column; the runtime
`FALLBACK_LIGHT` / `FALLBACK_DARK` objects must equal the matching theme
column. The OKLCH source for each value lives in `_colors.scss`.

<!-- BEGIN GENERATED:TOKEN-TABLE -->
| Token | Light fallback | Dark fallback |
|-------|---------------|---------------|
| `--primary` | `#ce4115` | `#ec653f` |
| `--primary-hover` | `#b03710` | `#f17857` |
| `--primary-active` | `#942c0c` | `#da4617` |
| `--secondary` | `#394f68` | `#708093` |
| `--ink-strong` | `#05070c` | `#f7f5f1` |
| `--ink` | `#13161c` | `#e7e4df` |
| `--ink-light` | `#3f4349` | `#b5b0aa` |
| `--ink-subtle` | `#5a5e63` | `#99948f` |
| `--muted` | `#66696e` | `#8a8580` |
| `--ink-on-pastel` | `#0d121b` | `#0f0a05` |
| `--surface` | `#fdfcfb` | `#110c08` |
| `--surface-raised` | `#faf8f6` | `#1a1510` |
| `--surface-sunken` | `#f4f1ef` | `#0b0704` |
| `--background` | `#f7f5f3` | `#080503` |
| `--border-light` | `#e2e5e8` | `#26211a` |
| `--border` | `#ced1d6` | `#352f28` |
| `--border-strong` | `#aeb1b7` | `#534c44` |
| `--success` | `#2e9052` | `#56bd78` |
| `--warning` | `#d66800` | `#f99532` |
| `--error` | `#c9222b` | `#ff645f` |
| `--info` | `#037ac0` | `#4dacf6` |
| `--white` | `#ffffff` | `—` |
<!-- END GENERATED:TOKEN-TABLE -->

> `--error` is red (`oklch(54% .20 25)`), deliberately **not** the orange
> brand. Tokens whose dark value mixes in `transparent` (the `*-bg` tints,
> `--surface-overlay`, …) are not single-hex fallbacks and so are omitted.

### Categorical type-colour map (`--type-*`)

The resource-type → colour mapping is **theme-owned**, defined in
`abstracts/variables/_colors.scss` as `--type-*` custom properties that
reference the semantic tokens — **in both the light and the dark block**.
Both modules consume `var(--type-*, <hex>)` and **must not re-encode the
mapping** — this is the fix for the map that previously drifted across the
three repos (the `document` badge fallback was `#e89c4a` in IwacSearch but
`#ea580c` in IwacVisualizations).

<!-- BEGIN GENERATED:TYPE-TABLE -->
| `--type-*` token | → semantic token | Light | Dark |
|---|---|---|---|
| `--type-article` | `--primary` | `#ce4115` | `#ec653f` |
| `--type-publication` | `--secondary` | `#394f68` | `#708093` |
| `--type-audiovisual` | `--info` | `#037ac0` | `#4dacf6` |
| `--type-document` | `--warning` | `#d66800` | `#f99532` |
| `--type-reference` | `--muted` | `#66696e` | `#8a8580` |
| `--type-photograph` | `--success` | `#2e9052` | `#56bd78` |
| `--type-entity-personnes` | `--info` | `#037ac0` | `#4dacf6` |
| `--type-entity-lieux` | `--success` | `#2e9052` | `#56bd78` |
| `--type-entity-organisations` | `--warning` | `#d66800` | `#f99532` |
<!-- END GENERATED:TYPE-TABLE -->

Each `--type-*` resolves to its semantic token, so the fallback hex equals
that token's value above (e.g. `--type-document` = `--warning`).

Consumers: `IwacSearch/src/svelte/components/ResultItem.svelte`
(`.iwac-card__type[data-type=…]` / `[data-entity-type=…]`) and
`IwacVisualizations/asset/css/iwac-core.css` (`.iwac-vis-badge--…`).

> **An alias flips only where it is declared** (fixed in 2.13; the dark
> column above was `—` before). `--type-publication: var(--secondary)` is
> substituted against the `--secondary` **on the element that declares it**,
> and the light block declares the map on `:root` while the manual toggle
> applies the dark block to `<body>`. Descendants then inherit nine
> already-substituted *light* hues. Since `layout/layout.phtml`'s pre-paint
> script writes `data-theme` on `<body>` for system-dark too, that was every
> dark session with JS enabled — the browse publication dot measured
> **2.41:1** on the dark ground (Phase-1 critique, P1). The system-preference
> `@media` block hid it in review, because there the override lands on
> `:root` and the map does flip. Declaring the map in both blocks is the fix
> — and it makes a *divergent* dark mapping a value edit rather than a
> contract change. A theme-relative alias is not automatically theme-aware:
> check which element carries the referent.

### Categorical series palette (`--series-*`)

The ordered qualitative scale charts cycle through. **Theme-owned and
published** since 2.13 — `tokens.json` carries it as `series`, so it is
guard-assertable like every other token. Before that it was a 19-entry hex
array in `IwacVisualizations/asset/js/iwac-theme.js` (`PALETTE_REST`): no
name to check, no value to compare, and slot 0 a hand-kept twin of
`--secondary` that the module sliced back off at runtime.

```jsonc
"series": {
  "leadSlots": 2,                          // slots that alias a theme token
  "leads": ["--primary", "--secondary"],   // …and which token each aliases
  "tokens": ["--series-1", …, "--series-20"],
  "light":  ["#ce4115", …],                // series.light[i] === --series-{i+1}
  "dark":   ["#ec653f", …]
}
```

Two views of one resolution pass: `light["--series-7"]` for a CSS consumer,
`series.light[6]` for a JS palette array. They cannot disagree.

- **Lead slots are read live, not baked.** `--primary` and `--secondary` come
  from the admin-tunable seeds, so a runtime consumer must resolve them from
  CSS (as `iwac-theme.js` already does); the published hexes are the canonical
  *default*, which is what fallbacks assert against. `leadSlots` is derived
  from the SCSS — however many leading slots are written as `var(--token)` —
  so moving the boundary is a token edit, not an edit plus a constant plus a
  number in this file.
- **Slots past the lead are fixed** and must be reproduced exactly.
- **Light and dark are independent per slot.** Contract v1 publishes the two
  at parity from slot 3 on: the scale was theme-blind until now, so moving it
  into the contract is deliberately separate from redesigning it. Diverging a
  slot in dark is a value edit in `_colors.scss`, invisible to consumers.
- The generator **fails the build** on a hole in the numbering, a slot missing
  from either theme, or a lead that is an alias in one theme and a literal in
  the other.

<!-- BEGIN GENERATED:SERIES-TABLE -->
| Palette index | Token | Source | Light | Dark |
|---|---|---|---|---|
| 0 | `--series-1` | `--primary` | `#ce4115` | `#ec653f` |
| 1 | `--series-2` | `--secondary` | `#394f68` | `#708093` |
| 2 | `--series-3` | fixed | `#4a8c6f` | `#4a8c6f` |
| 3 | `--series-4` | fixed | `#bb4c49` | `#bb4c49` |
| 4 | `--series-5` | fixed | `#7c5295` | `#7c5295` |
| 5 | `--series-6` | fixed | `#d4a574` | `#d4a574` |
| 6 | `--series-7` | fixed | `#2c5f7c` | `#2c5f7c` |
| 7 | `--series-8` | fixed | `#876c45` | `#876c45` |
| 8 | `--series-9` | fixed | `#5ba3a0` | `#5ba3a0` |
| 9 | `--series-10` | fixed | `#cc8963` | `#cc8963` |
| 10 | `--series-11` | fixed | `#4a8aab` | `#4a8aab` |
| 11 | `--series-12` | fixed | `#a68e6d` | `#a68e6d` |
| 12 | `--series-13` | fixed | `#d49b6a` | `#d49b6a` |
| 13 | `--series-14` | fixed | `#6fb08e` | `#6fb08e` |
| 14 | `--series-15` | fixed | `#9e7bb8` | `#9e7bb8` |
| 15 | `--series-16` | fixed | `#e0a88a` | `#e0a88a` |
| 16 | `--series-17` | fixed | `#8e7cb8` | `#8e7cb8` |
| 17 | `--series-18` | fixed | `#d87e7a` | `#d87e7a` |
| 18 | `--series-19` | fixed | `#6b5b95` | `#6b5b95` |
| 19 | `--series-20` | fixed | `#4db6ac` | `#4db6ac` |
<!-- END GENERATED:SERIES-TABLE -->

### Font tokens

| Token | Stack | Role |
|-------|-------|------|
| `--font-headings` | `"Besley", "Source Serif 4", Georgia, "Times New Roman", serif` | Masthead, headlines, section heads, display numerals (KPI figures) |
| `--font-serif-text` | `"Source Serif 4", "Source Serif Pro", Georgia, "Times New Roman", serif` | Long-form reading: article full text, ledes, blockquotes |
| `--font-body` | `"Public Sans", system-ui, …` | UI, labels, datelines |

Module fallbacks for `--font-headings` must name **Besley** (not the removed
"Noto Serif").

> **The quotes are load-bearing.** These four properties are emitted through
> `meta.inspect()` in `_typography.scss`, not bare `#{$var}` interpolation,
> because interpolation strips the quotation off every family name. Unquoted,
> `Source Serif 4` is not a valid `<family-name>` — an identifier cannot begin
> with a digit — so `font-family: var(--font-headings, …)` becomes invalid at
> computed-value time and silently falls back to the *inherited* font. The
> theme's own rules use the Sass variables directly and never saw this; it
> broke only the downstream consumers these properties exist for (fixed in
> 2.9.2, after ~30 IwacVisualizations declarations had been rendering in
> Public Sans instead of Besley). Note that `var(--token, fallback)` does not
> rescue it: the token *is* defined, just to an invalid value — so verify by
> reading the **computed** `font-family` in a browser, not by eye.

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
| `var(--focus-ring, …)` | `--focus-ring-color` (tint) — but you almost certainly want `--focus-outline` |
| `var(--radius-xl, …)` | `--radius-lg` (media) / `--radius-md` (chrome) |
| `var(--shadow-xl, …)` | `--shadow-lg` |
| `var(--iwac-vis-shadow-{subtle,soft,strong})` | `--shadow-color-subtle` / `--shadow-color` / `--shadow-color-strong` |
| `var(--iwac-vis-icon-btn{,-sm})` | `--size-control-sm` / `--size-control-xs` |
| `var(--iwac-vis-model-<release-id>)` | `--iwac-vis-model-1` … `-4` |

---

## 4. Sanctioned exceptions — the module-owned namespace

A module may define a custom property only when the theme **should not** carry
the value. That is two cases, and no others:

1. **Data-encoding colours.** Data encoding needs more distinct, controlled
   colours than a UI theme should carry. Note the limit of this: it licenses
   the module to *decide* a scale, never to leave one unpublished — the
   categorical series was owned here for exactly that reason and moved into
   the theme's published contract in 2.13.
2. **Module-local layout constants with no theme equivalent** — a thumbnail
   ramp, a toolbar reservation, a chart gutter. Values that describe *this
   module's* composition, not a shared design decision.

What the namespace is **not** is a legal home for a duplicate of a theme token.
It had become one: `--iwac-vis-icon-btn-sm: 28px` was `--size-control-xs` to
the pixel, and three shadow tints re-derived from `--ink` exactly what
`--shadow-color`, `--shadow-color-subtle` and `--shadow-color-strong` already
publish. Because the guard exempts the prefix, these were competing variables
that passed every check — so the namespace is the one place worth watching.
Both sets are gone as of module 1.48.

The prefix is **`--iwac-vis-`** (IwacVisualizations) / **`--iwac-`** for
IwacSearch's own scoped properties, and each module's guard exempts only its
own. The looser `--iwac-` form had already let `--iwac-compare-color-a/b` and
`--iwac-otd-axis-gap` drift out of the documented namespace.

Module-owned colours must **not** leak into UI chrome. The data colours below
are owned by **IwacVisualizations** — except the first, which is now the
theme's:

1. ~~**Categorical chart palette**~~ — **no longer an exception.** The
   ordered series moved into the theme in 2.13 and is published as
   `tokens.json` → `series` (see §3). `buildPalette()` still assembles the
   runtime array — the two lead slots must be read live so admin brand
   changes cascade — but it no longer *owns* any of the values, and **a new
   series colour is a theme token edit, not a module edit.**

   It was the last data colour the contract could not see, and the reason is
   worth keeping: the exception was written for colours a UI theme *should
   not* carry, and a 20-step qualitative scale genuinely is that. But
   "the theme shouldn't own the decision" was silently doing duty for
   "the theme shouldn't publish the value", and the gap showed — slot 0 was a
   hand-maintained duplicate of `--secondary` (`#394f68` twice, sliced apart
   at runtime), the scale had no dark-mode story at all, and nothing could
   assert any of it. **Sanctioned module ownership is about who decides, and
   it is not a reason to leave a value unpublished.**
2. **Sentiment divergent scale** (`--iwac-vis-sent-*`, `iwac-core.css`):
   positive → neutral → negative, mapped to `--success` / `--muted` /
   `--warning` / `--error`; "strong positive" is a darkened `--success`.
3. **Sequential ramps** (`--iwac-vis-cent-*`, `--iwac-vis-subj-*`,
   `--iwac-vis-heatmap-*`): built from `--primary` faded toward `--surface`, so
   they track the brand seed automatically.
4. **AI-model accents** (`--iwac-vis-model-1` … `-4`): four distinct hues so
   the sentiment panels separate the models. Site-overridable. Named by **role
   slot, not by model**: the names used to be the pinned release ids
   (`--iwac-vis-model-gpt-5-6-luna`, …), built at runtime from the Hugging Face
   column prefix, so every model upgrade renamed a design token and orphaned
   any rule referencing it. A version identifier is not a design decision. The
   id → slot map lives in one place, `MODEL_SLOT` in
   `charts/sentiment-atlas.js`.
5. **Resource-type badge chrome** (`.iwac-vis-badge--*`): the dot / pill SHAPE
   is module-owned, but the category COLOUR now comes from the theme's
   single-source `--type-*` map (see §3) — the module no longer owns the
   type→colour mapping, so it can't drift from IwacSearch's result chips.

If you find yourself adding a hard-coded colour anywhere else, it belongs in
the theme as a token, or it is a bug.

---

## 5. Dark-mode contract

- The **theme** owns light/dark, three ways: `:root` (light default),
  `@media (prefers-color-scheme: dark)`, and `body[data-theme="dark"|"light"]`
  (manual toggle, persisted in `localStorage` key `iwac-theme-preference`).

### Substitution scope — the rule that decides where a composed token lives

**A custom property is substituted at computed-value time on the element that
DECLARES it.** So a token declared in the light scope whose value references a
token the dark block redeclares must **itself** be redeclared in the dark
block. Otherwise the dark page inherits the light composition — permanently,
and invisibly to every generator and every guard that resolves the dark block
in isolation.

It is not an edge case here. The manual toggle applies the dark blocks to
`<body>` while `:root` keeps the light ones, and `layout/layout.phtml`'s
pre-paint script writes `data-theme` on `<body>` for *system* dark too — so
this is every dark session with JS enabled. The `@media` path hides it, because
there the override lands on `:root` and the composition does flip.

It has now bitten this repo three times:

| Fixed in | Token(s) | What dark actually painted |
|---|---|---|
| 2.13 | the nine `--type-*` | light hues; the browse publication dot at **2.41:1** |
| 2.13 | `--focus-outline`, `--ring-focus`, `--ring-focus-sm` | every dark focus ring in the **light** primary |
| 2.14 | `--panel-shadow`, `--glow-xs/sm/md` | light panel shadow; button halos from the light primary |

Every time, `tokens.json` published the correct dark value and the browser
delivered the light one. Three occurrences with the same shape is a missing
check, so `npm run check:tokens` now asserts it statically across the four
variable files: for each light-scope declaration, if its value references a
token the dark block redeclares, the declaration must be redeclared there too.
The fix is always the same — move the pair into the light/dark mixin pair.

**Corollary for a token you are adding:** if its value contains a `var()`, ask
which side of the theme boundary the referent lives on. Theme-independent
compositions (`--panel-radius: var(--radius-md)`) stay in `:root`; everything
else belongs in both mixins.

### `DESIGN.md` frontmatter is generated, and asserted

The root `DESIGN.md` (the Impeccable skill's machine-readable artifact) carries
a YAML frontmatter that restates the **light** palette plus the radius and
spacing scales. `tokens.json` is normative; the frontmatter is produced by
`/impeccable document` from the shipped tree — **never hand-edited**.

`npm run check:tokens` compares the three sections whose keys map 1:1 onto
token names — `colors:` → `light['--<key>']`, `rounded:` → `--radius-*`,
`spacing:` → `--space-*` — and fails on disagreement, naming the documenter as
the fix. The `typography:` and `components:` sections are editorial groupings
(a shortened font stack, a role name like "headline" chosen for the tooling)
with no token name to compare against, so they stay the documenter's to own;
nor is the reverse asserted — the frontmatter lists a curated subset and it is
not a bug for it to omit `--black` or the `--footer-*` family.

**Release order after a token change:** edit the variable files → `npm run
build` → `/impeccable document` → guard green. Between the second and third
step the guard is *expected* to fail; that is the artifact telling you it is
stale, which is the whole point of asserting it.
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
  *not* produced by Vite and is edited directly. It is **inside** the guard's
  walk as of 2026-08 — it was outside it before, and every colour fallback in
  it had stayed on the pre-v2.6 blue-grey palette while `src/` was spotless.
  A guard that skips a file is not a guard; it is a comment about the files it
  does read.

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
