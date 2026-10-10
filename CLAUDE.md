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
npm run build          # check:tokens → build:tokens → build:i18n → build:js → compile CSS
npm run start          # compile once, then watch .scss and asset/js
npm run bump -- patch  # write every version declaration (patch|minor|major|X.Y.Z)
npm test               # JS behaviour (node:test + jsdom), on pages rendered from the templates
npm run test:minified  # the same suite against asset/js/dist/*.min.js
npm run test:php       # view helpers + template regressions (plain PHP, no Composer)
npm run build:fixtures # re-render test/fixtures/rendered/ after a template change (needs php)
npm run check:fixtures # fail if a committed fixture differs from a fresh render
npm run lint           # ESLint + Stylelint (correctness rules and the gotchas below)
npm run check:audit    # npm audit at high+, minus the written exceptions (see below)
phpstan analyse        # helpers at level 6 (CI installs phpstan via setup-php)
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

### An unfixable advisory gets an exception with a reason, not a weaker gate

`npm run check:audit` fails on any high or critical advisory not listed in
[scripts/lib/audit-exceptions.js](scripts/lib/audit-exceptions.js), whose entries each
say why no upgrade clears it and why the code is unreachable. It also fails when an
entry is no longer needed — npm can fix it in range, or it stopped appearing — so the
list retires itself. Don't reach for `--omit=dev` or a lower `--audit-level`: every
dependency here is a dev dependency, so either turns the gate off. And keep a fix
for an advisory separate from upgrades that change `asset/css/` — a cssnano minor
rewrote ~460 declarations of the compiled stylesheet, which deserves its own review.

### The version lives in six places — `npm run bump` is the only writer

`config/theme.ini`, `package.json`, `package-lock.json` (**twice** — root and
`packages[""]`), `CITATION.cff` and the `asset/sass/style.scss` banner. Editing them by
hand is how the same failure keeps recurring: `style.scss` drifted from 2.9.0 across
thirteen releases, and the lockfile's two copies sat at 2.10.1 across four more — both
times because the release gate asserted its own inline list of the files a human
remembered, and the writer was a human.

So the list is now data, in [scripts/lib/versions.js](scripts/lib/versions.js), read by
both sides:

- `npm run bump -- <patch|minor|major|X.Y.Z>` writes all six and stamps `date-released`.
  `package.json` + `package-lock.json` are delegated to `npm version`, which does the
  semver arithmetic and keeps the lockfile's two copies in step; the increment keywords
  work without this repo parsing semver at all.
- `npm run check:versions` asserts they agree — on every push (Quality), and against the
  tag in `release.yml`. Adding a seventh site means one entry in that file, and both the
  writer and the guard pick it up.

The release itself is still `git tag vX.Y.Z && git push origin vX.Y.Z`: pushing to
`master` deploys nothing, because the live sites install the release ZIP.

### Design tokens are machine-checked — never hand-maintain a list

`scripts/build-tokens.js` reads the variable files and writes `tokens.json`; with
`--sync-siblings` (`npm run sync:tokens`) it also copies `tokens.json` **and the guard
engine** (`scripts/lib/theme-token-guard.cjs`) into IwacSearch and IwacVisualizations,
whose `check-theme-tokens` wrappers run that engine and fail their builds on anything
that disagrees. Change a guard rule here, never in a module's copy. It publishes:

| Key | What |
|---|---|
| `light` / `dark` | every OKLCH colour token resolved to sRGB hex |
| `values.light` / `values.dark` | every **other** token resolved to a literal CSS value — type steps, spacing, radii, control sizes, font stacks, shadows (collapsed to `rgba()`), transitions |
| `names` | the full custom-property vocabulary |
| `public` | the subset modules may consume: everything declared in `abstracts/variables/` (component parameters like `--plate-*` are not) |
| `deprecated` | retired name → replacement, from `// deprecated: --x` markers on declaration lines |
| `fonts` | the weights each font token actually loads, parsed from layout.phtml's webfont URL |
| `fontsUrl` | that webfont stylesheet URL itself, for routes that render without the theme (IwacVisualizations' embeds) |
| `themed` | the tokens the dark blocks redeclare — what the guard's `scope` rule reads to decide whether a module composition must also live on `body` |
| `breakpoints` | the six media-query widths |
| `series` | the ordered categorical chart palette (`--series-1 … --series-20`), light + dark, with the theme-driven lead slots marked |
| `themeVersion` | the theme release the contract came from |

- A wrong or invented token name is caught by `npm run check:tokens`. Run it; don't
  reason about it from memory. It also refuses a deprecated name (the numeric
  `--space-N` scale is canonical; the size-name aliases are deprecated) and a font
  weight layout.phtml does not load (Besley is 500/600/800 only).
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

`npm run check:tokens` also fails on a `font-size` carrying an absolute literal
(px/rem/pt) anywhere in `asset/sass` — including **inside a `clamp()`/`min()`/`max()`**,
which was the blind spot until 2.14 (`clamp(4rem, 15vw, 8rem)` was a private 64–128px
scale the guard could not see). Use a `--text-*` token; `--text-2xs` (11px) is the floor,
and there is deliberately no 14px step. Relative units (`em`, `%`, `vw`) stay legal.

The breakpoint contract is enforced here too as of 2.14 (it was enforced only in the two
modules before): `min-width` sits **on** a published breakpoint, `max-width` at
**breakpoint − 1**, so the halves of a pair never both match. `#{$md - 1px}` is now the
only legal spelling of the "below" half — the `- 0.02px` variant is gone. The same
contract covers the literal pixel widths Sass can't name: `matchMedia()` strings in
`asset/js` and `media=""` attributes in `view/`.

### A composed token must be redeclared wherever its referent flips

A custom property is substituted **on the element that declares it**. So a light-scope
token whose value references a token the dark block redeclares must itself be redeclared
in the dark block, or dark pages inherit the light composition forever — and neither
`tokens.json` nor any value-comparing guard can see it, because the generator resolves
the dark block in isolation and the cascade does not.

This has bitten the repo three times: the `--type-*` map (2.13, browse dots at 2.41:1 on
dark), the composed focus tokens (2.13, every dark focus ring in the *light* primary),
and `--panel-shadow` + `--glow-xs/sm/md` (2.14 — the file carried a comment asserting the
glows "auto-update", which was true of the `@media` path and false of the manual toggle).
`npm run check:tokens` now asserts it statically. Practical rule: if a new token's value
contains a `var()`, put it in the light/dark **mixin pair**, not in `:root`, unless the
referent is theme-independent.

The fourth occurrence was in a module (IwacVisualizations, found in the 2026-10 review):
21 data-colour ramps composed on `:root`, so heatmaps inverted for anyone whose toggle
disagreed with their OS. The theme's own check could not see module CSS, so the rule now
lives in the shared engine as `scope`: a module custom property declared only on `:root` /
`html` that composes a token listed in `tokens.json` `themed` must also be declared on
`body` (`:root, body`). The engine's `focus-outline` rule rides along: no `outline: none|0`
anywhere except `:focus:not(:focus-visible)`, because forced-colors mode drops the
box-shadow rings that usually replace it.

### Colour, tracking and motion are asserted beyond font-size

`check:tokens` rule 2b refuses literal `letter-spacing` and transition/animation durations
in `asset/sass` (use `--tracking-*` and `--duration-fast/base/slow`; `--transition-*` are
built from the durations). Rule 9 requires every `--series-*` and `--type-*` colour to
clear 3:1 on all four surfaces in both themes — nine light series slots sat at
1.84–3.05:1 until 2026-10 and moved in lightness only. Stylelint carries the prose-only
design rules: gradients only in the allowlisted files, `backdrop-filter` only in the
header, no brand/status-coloured side stripes.

### `DESIGN.md` frontmatter is checked against `tokens.json`

Do not hand-edit it. On a token change the guard will fail until
`/impeccable document` regenerates it — that failure is the artifact telling you it is
stale. Release order: edit tokens → `npm run build` → documenter → green.

### `asset/css/` and `asset/js/dist/` are generated

Edit `asset/sass/`. Anything written to `asset/css/` is overwritten by the next build.

Likewise edit `asset/js/<name>.js`, never `asset/js/dist/<name>.min.js`:
`npm run build:js` (esbuild, part of `npm run build`) rewrites the minified twin and
its source map, and templates load only the twin — `assetUrl('js/dist/<name>.min.js')`.
A new script needs no registration (every non-`.min` file in `asset/js/` is an input),
but its template must name the `dist/` path, and the twin must be committed:
`npm run check:js-dist` fails on a missing, stale or orphaned one. Minification is a
transform, not a bundle — no module format, so top-level names (the `IWACUtils`
global the scripts share) survive; `npm run test:minified` proves it by running the
whole behaviour suite against the twins. Vendored `*.min.js` (MiniMasonry) are not
inputs and stay where they are. `citation.js` is enqueued by IWAC-SEO, not the theme,
so `layout.phtml` swaps its src for the twin in the same pass that defers it.

### The JS tests run on rendered templates — re-render after a template edit

The DOM tests in `test/*.test.js` load whole pages from `test/fixtures/rendered/`
(`fixtureDom('item.en')`, [test-support/fixtures.js](test-support/fixtures.js)), and
those pages are the real templates — `layout.phtml` around item, item-set, browse and
About-page content — rendered by
[test/php/render-fixtures.php](test/php/render-fixtures.php) through FakeView, with
[test/php/fake-omeka.php](test/php/fake-omeka.php) standing in for core and the modules.
Through 2.24 each test typed its own HTML, so a renamed `data-*` hook, class or id in
a `.phtml` passed both suites and broke the live page.

So **after any edit under `view/`, run `npm run build:fixtures` and commit the
diff** — it is the review copy of what the markup change did. A stale set fails
`npm run check:fixtures` (CI's PHP job, both PHP versions) and, wherever `php` is on
PATH, `npm test` itself. When a template needs data or a helper the fake does not
supply, the renderer throws rather than rendering a silent blank: extend
`fake-omeka.php` (keep it imitating what core or the module really prints) — never
hand-edit a fixture. Module-owned markup the theme does not render (the Mirador block)
is a copy in the renderer, and says so.

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

Its label is `--ink-on-primary`, never `--white` — here and in both modules. Dark mode
*lightens* the primary ramp, so white on a dark-mode fill is 3.23:1; the token flips to
dark ink there (6.10:1). The light-only scans stayed green on that for every submit and
IwacSearch's active tab until the token landed.

### jQuery is deferred, so every external head script must be too

`layout.phtml` defers jQuery and Omeka's `global.js` (worth ~400ms of mobile FCP). A module
script that stays synchronous then runs before jQuery exists: from 2.19 to the 2026-10
fix, the Mapping module's `mapping-show.js` threw `$ is not defined` and every place
record showed a 700px blank map, because the original measurement covered inline scripts
and never a page with an external module script. The `DeferHeadScripts` helper now defers
every external classic head script (not modules, JSON islands or `async`), which keeps
document order, so modules run after jQuery. `e2e/live.spec.js` fails on any page error
and samples a place record on both sites, which is the check that was missing.

### Icons are Lucide masks — and masks need a forced-colors colour

No icon font loads: Font Awesome went in 2026-10, after an inventory of 96 live pages found
it drawing only the two search submits. Every UI glyph is `@include icon-mask(url,
$forced)`, which paints with `background-color: currentColor` — and forced-colors mode
replaces backgrounds with `Canvas`, so a mask with no `$forced` colour vanishes. Pass
`ButtonText` inside buttons and `LinkText` inside links (`CanvasText` is the default). A
rule that sets `background-color` after the mixin re-hides the glyph; set `color` instead.

### Record language comes from `dcterms:language`

Corpus values carry no language tag, so `$value->lang()` is empty and French text on the
English site was read with English pronunciation. `ResourceLanguage` maps the record's
linked language authority (ISO code in its `dcterms:alternative`, plus a small name map
for the three without one) to a BCP-47 tag, which goes on the h1, the current crumb,
card titles and untagged full-text/description values. A multilingual record gets no tag
rather than a guess.

### Two listings on one page: separate query parameters, never core's shared pager

The item-set page paginates its ledger with `?page=`, and the Linked resources block
paged with `?page=` too, so turning the ledger moved the block onto its own (usually
empty) page 2. Core's `pagination()` is also **one shared helper per request**, holding
the paginator the browse controller configured for the page's own listing; the block
called it with its figures, so the ledger rendered after it printed the block's count and
fragment. Both were latent (the block isn't placed on item sets live) and surfaced in the
rendered fixtures. The block now reads `lr_page` through the `LinkedResourcesPaging`
helper — the one place its parameters are decided — and renders `common/pagination`
itself with `$pageParam`; `linked-resources.js` composes each request from its own root's
parameters (`data-query-params`) plus the address bar's for the other. A second paginated
listing on any page needs the same: its own parameter, and never a call to core's helper.

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

### Mirador's "Maximize window" is workspace-scoped — the full-page lift is the theme's

Mirador maximizes a window inside its own workspace (`position: absolute; inset: 0` against
`.mirador-workspace-viewport`), and the module sizes that workspace as a card
(`.mirador { height: 70vh; min-height: 600px }`). So the control did exactly what Mirador
intends and still read as broken: the window grew by the width of the workspace rail and
stopped. Mirador's actual full-page path is the *separate* "Full screen" button — an
unlabelled icon in that rail, and absent on iOS, where element fullscreen doesn't exist.

The theme now lifts the container instead: `mirador-theme-sync.js` subscribes to each
viewer's store, mirrors `state.windows[*].maximized` onto `.mirador.viewer` as
`.is-maximized`, and the stylesheet takes that container `position: fixed; inset: 0`.
Two things are load-bearing and easy to drop:

- **`.block-mirador`'s `z-index: 1` has to be lifted with it.** That containment is what
  keeps MUI's 1300-range z-indexes below the sticky header — but a fixed child resolves
  its z-index *inside* that stacking context, so the overlay paints under the header
  unless the block goes to `--z-modal` too.
- **The block gets an inline `min-height` placeholder while maximized.** The container
  leaves the flow; letting the page collapse behind the overlay clamps `scrollTop` and
  the reader lands somewhere else on the way out.

`state.windows` and the `mirador/MINIMIZE_WINDOW` action are the same
undocumented-but-stable store surface the dark-mode sync already rides on.

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
