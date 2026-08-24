# CLAUDE.md

## What this is

IWAC-theme — an Omeka S 4.2+ theme (fork of Freedom) for the **Islam West Africa
Collection**, a francophone West African digital collection at ZMO Berlin. PHP templates
(`view/`), Sass on the modern module system (`asset/sass/`), Gulp build, vanilla JS.

Live: [EN](https://islam.zmo.de/s/westafrica/) · [FR](https://islam.zmo.de/s/afrique_ouest/)

**Before any visual change, read [docs/DESIGN-PHILOSOPHY.md](docs/DESIGN-PHILOSOPHY.md).**
The register is specific — "press archive", not museum, not dashboard — and easy to
violate by accident.

The Impeccable design skill reads its own artifact layer: `PRODUCT.md` (product truth),
root `DESIGN.md` + `.impeccable/design.json` (machine-readable design system, North Star
"The Research Broadsheet"). `DESIGN.md`'s frontmatter mirrors `tokens.json` **light**
values — `tokens.json` stays normative; when tokens change, refresh `DESIGN.md` via
`/impeccable document` rather than letting the two drift.

## Build

```bash
npm run check:tokens   # fast gate: fails if any var(--…) in asset/sass doesn't resolve
npm run build          # check:tokens → build:tokens → build:i18n → compile CSS
npm run start          # compile once, then watch .scss
```

Match the command to the change. `npm run build` regenerates `tokens.json` **and** the
i18n catalogue, so on a PHP- or JS-only edit it produces unrelated diffs — `check:tokens`
is the right gate there.

## Gotchas

### Theme view helpers: one spelling, three jobs

Omeka uses the `helpers[]` string in `config/theme.ini` as the service name, the class
name, **and** the `helper/<Name>.php` filename. Filename and service name are
case-sensitive on the Linux server; only the class name is not. So `helpers[] =
"BrowseLayout"` must be called `$this->BrowseLayout()`. A case mismatch 500s every page
that renders it — and "fixing" it by lowercasing `theme.ini` just moves the failure to a
`require_once` fatal that is invisible on a case-insensitive dev filesystem.

### Design tokens are machine-checked — never hand-maintain a list

`scripts/build-tokens.js` reads the four variable files and writes `tokens.json`, then
syncs it into IwacSearch and IwacVisualizations, whose `check-theme-tokens` guards fail
their builds on anything that disagrees with it. It publishes five things:

| Key | What |
|---|---|
| `light` / `dark` | every OKLCH colour token resolved to sRGB hex |
| `values.light` / `values.dark` | every **other** token resolved to a literal CSS value — type steps, spacing, radii, control sizes, font stacks, shadows (collapsed to `rgba()`), transitions |
| `names` | the full custom-property vocabulary |
| `breakpoints` | the six media-query widths |
| `series` | the ordered categorical chart palette (`--series-1 … --series-20`), light + dark, with the theme-driven lead slots marked |

- A wrong or invented token name is caught by `npm run check:tokens`. Run it; don't
  reason about it from memory.
- **Adding a token is a cross-repo change**: `npm run sync:tokens`, then rebuild both modules.
- Never hand-edit `tokens.json` or the `<!-- BEGIN GENERATED -->` tables in
  [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md).

`values` and `breakpoints` exist because the guards used to check colour and nothing
else: the fallback assertion was a regex matching a hex literal in the fallback slot, so
every non-colour fallback in three repos was unchecked, and roughly 290 of them had
drifted — line-heights, control sizes, type steps, font stacks (one still naming the
removed *Noto Serif*), shadows, transitions. **Drift here has never been a discipline
problem; it is a coverage problem.** Every value the generator publishes and a guard
compares has stayed correct across a major redesign. Every value left to prose moved.
So: when you add a design decision, publish it and assert it — a comment saying
`/* sm */` beside a `640px` media query is what "documented" looked like right up until
it was wrong.

### Type sizes and media widths are asserted too

`npm run check:tokens` also fails on a `font-size` set to an absolute literal (px/rem/pt)
anywhere in `asset/sass` — use a `--text-*` token; `--text-2xs` (11px) is the floor, and
there is deliberately no 14px step. Relative units (`em`, `%`) stay legal. Both modules'
guards enforce the same rule plus the breakpoint contract: `min-width` sits **on** a
published breakpoint, `max-width` at **breakpoint − 1**, so the halves of a pair never
both match.

### `asset/css/` is generated

Edit `asset/sass/`. Anything written to `asset/css/` is overwritten by the next build.

### Sass module system

`@use` / `@forward` only — never `@import`. `@forward` rules must come before any other
rule in a file, and every file using variables or mixins needs its own
`@use "../../abstracts/abstracts" as *;`.

### `color-mix` takes `in oklab`, not `in srgb`

sRGB mixing muddies mid-tones (blue + yellow → gray). The palette is OKLCH throughout;
keep the mixing perceptual.

### Resource-show metadata selectors must be child-scoped

Use `> dl > .property > dd`. Value-annotation tooltips nest their own `<dl>` inside a
`<dd>`, and a descendant selector leaks the 168px label-column layout into them.

### The `<button>` default is QUIET — the loud one opts in

Inverted in 2.10. A bare `<button>` is now an outlined flat control (ink text, hairline
border, no shadow, no lift). The filled-primary treatment — brand fill, `--glow-sm`
halo, hover lift — comes from `.btn--primary` or from being a **submit** control
(`input[type=submit]` / `button[type=submit]`), which Omeka core and module forms render
without any theme class to hook.

Before this, the base selector painted *every* button filled-and-glowing, so sixteen
component files reset `border-radius` / `box-shadow` / `transform` purely to escape the
default, and a component overriding only `background`/`color` silently kept a rounded
floating halo. Those resets are now redundant rather than load-bearing — harmless where
they remain, and safe to drop when you're already editing the file. The thing to watch
now is the reverse: **a control that needs to shout must say so**, or it will render
quiet.

### Read a module's rendered HTML before styling it

Omeka modules ship their own markup and vendor CSS (tablesaw; RightsStatements inline-styles
`height:4em`). Selectors written against assumed markup silently match nothing, and a
vendor `max-width: 100%` beats your `min-width`.

### The AI-sentiment properties are hidden by IwacVisualizations, not by the theme

The `iwac:*Centralite` / `*Polarite` / `*SubjectiviteScore` terms and their
`*Justification` siblings never reach the public value list: IwacVisualizations listens on
`rep.resource.display_values` and strips every annotator family it knows about
(`Module::SENTIMENT_MODEL_STEMS`), across both annotation generations. The theme has no
part in it — no `excludeProperties` list, no `display:none` rule, no
`components/sentiment/` partial. All three existed once and all three were dead by the
time they were removed in 2.9.14; a hardcoded list here can only fall behind the next
model rename. If a sentiment field shows up on an item page, the fix belongs in the
module's stem list.

### Mirador only shows file-backed media — everything else needs its own block

The live sites' resource-page stack uses the Mirador module's block in place of core's
`mediaEmbeds`, and Mirador builds its manifest from media that have a stored file. A media
with no file — a `youtube`-ingested one, say — yields a canvas-less manifest, so the block
renders an empty `<div class="block block-mirador">` and the item's only content is
invisible. That is what the theme's `videoEmbeds` block
([video-embeds.phtml](view/common/resource-page-block-layout/video-embeds.phtml)) exists to
cover; `webArchive` covers `.wacz`/`.warc` the same way. Both output nothing on items they
don't apply to, and both have their media excluded from `mediaEmbeds` so no source is ever
rendered twice. A new fileless ingester needs the same treatment — plus a line in
`config/theme.ini` and an admin visit to Themes → Configure resource pages, since a site
whose stack is already customised does not pick up new theme defaults.

## Cross-repo contract

This theme is the single source of truth for design tokens. Two sibling modules consume
them instead of defining their own:

| Repo | What it is |
|---|---|
| [IwacSearch](https://github.com/fmadore/IwacSearch) | Svelte 5 search / discovery client |
| [IwacVisualizations](https://github.com/fmadore/IwacVisualizations) | ECharts / MapLibre dashboards |

The full contract is [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md). Data-encoding colours
(chart series, sentiment scales) are the *only* colours a module may own, and they live
there prefixed `--iwac-vis-*`; everything else must resolve from a theme token.

**Mirador** is React/MUI and cannot read CSS custom properties, so its palette is concrete
hex in the module config — canonical values and setup in [docs/MIRADOR.md](docs/MIRADOR.md).

**The "How to cite" panel** is a resource page block owned by
[IWAC-SEO](https://github.com/fmadore/IWAC-SEO), placed via Admin → Themes → Configure
resource pages. The theme supplies only the UI (`view/common/citation.phtml`); the
formatters live in the module. Don't reimplement citation formatting here.

## Verifying visual changes

There is a local preview rig in `.claude/` (gitignored, machine-local): a reverse proxy
plus a headless-Chrome screenshot script that renders the live site against local CSS.
Prefer it over guessing, and check light **and** dark mode.
