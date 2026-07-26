# CLAUDE.md

## What this is

IWAC-theme — an Omeka S 4.2+ theme (fork of Freedom) for the **Islam West Africa
Collection**, a francophone West African press archive at ZMO Berlin. PHP templates
(`view/`), Sass on the modern module system (`asset/sass/`), Gulp build, vanilla JS.

Live: [EN](https://islam.zmo.de/s/westafrica/) · [FR](https://islam.zmo.de/s/afrique_ouest/)

**Before any visual change, read [docs/DESIGN-PHILOSOPHY.md](docs/DESIGN-PHILOSOPHY.md).**
The register is specific — "press archive", not museum, not dashboard — and easy to
violate by accident.

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

`scripts/build-tokens.js` resolves every OKLCH token in `_colors.scss` to sRGB and writes
`tokens.json` — the light/dark values **plus** `names`, the full token vocabulary — then
syncs it into IwacSearch and IwacVisualizations, whose `check-theme-tokens` guards fail
their builds on a drifted fallback or an unknown token name.

- A wrong or invented token name is caught by `npm run check:tokens`. Run it; don't
  reason about it from memory.
- **Adding a token is a cross-repo change**: `npm run build:tokens`, then rebuild both modules.
- Never hand-edit `tokens.json` or the `<!-- BEGIN GENERATED -->` tables in
  [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md).

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

### Every `<button>` inherits the global base style

`_buttons.scss` gives all buttons a radius, `box-shadow: var(--glow-sm)`, and a hover
lift + glow. A component that overrides only `background`/`color` keeps the rounded
floating shape and the halo — reset `border-radius`, `box-shadow` and `transform`
explicitly.

### Read a module's rendered HTML before styling it

Omeka modules ship their own markup and vendor CSS (tablesaw; RightsStatements inline-styles
`height:4em`). Selectors written against assumed markup silently match nothing, and a
vendor `max-width: 100%` beats your `min-width`.

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
