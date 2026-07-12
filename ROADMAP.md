# IWAC-theme — Audit Roadmap (2026-07)

Consolidated roadmap from the July 2026 five-track audit (PHP templates, Sass/design
tokens, JavaScript, build & config, accessibility & performance). Items are grouped
into phases ordered by user impact and risk. Each phase is one commit on
`claude/omeka-s-theme-review-rvv8kj`.

Legend: `[x]` done · `[ ]` open · `[~]` deferred (rationale inline).

---

## Phase 1 — Correctness bugs (user-visible breakage)

- [x] **B1** `asset/js/browse.js` — grid/list toggle derives the URL `view` param from the
  *translated* `aria-label`, so the French site writes `?view=grille|liste` which the
  server never matches. Read a `data-view` attribute instead (added to the four
  templates that render the toggle).
- [x] **B2** `view/common/block-layout/item-with-metadata.phtml` — fatal `->lang()` call on
  `null` when an attached item has no title value; title echoed unescaped (XSS).
- [x] **B3** `view/common/block-layout/item-showcase.phtml` + `file.phtml` — unescaped
  `displayTitle()` and a null-media fatal when `showTitleOption === 'file_name'`.
- [x] **B4** `view/omeka/site/media/browse.phtml` — wrong sort-config key `'medias'`
  (→ `'media'`); copy-pasted `class="item-set resource"` on media rows (→ `media resource`).
- [x] **B5** `view/omeka/site/item/browse.phtml` — the item-set branch hard-codes a full
  second copy of the linked-resources ledger (duplicate IDs + duplicate top-level
  `const` → SyntaxError when the Linked-resources page block is also present). Extract
  one shared partial `view/common/linked-resources-table.phtml`; pass JS strings via
  `data-*` attributes, not global `const`s.
- [x] **B6** `asset/js/pagination-scroll.js` — clicks on AJAX-handled linked-resources
  pagination set a sessionStorage scroll flag that is never consumed, so the *next*
  full page load auto-scrolls past the masthead. Ignore clicks inside `#linked-resources`.
- [x] **B7** `asset/js/pwa-install.js` — re-arms the same `BeforeInstallPromptEvent` after
  dismissal; second `prompt()` throws `InvalidStateError` synchronously. Null the
  deferred prompt, guard `prompt()` with try/catch, wait for the browser to re-fire.
- [x] **B8** `asset/js/linked-resources.js` — Back button can't return to the initial page
  (`replaceState` the entry point); AJAX swap drops keyboard focus (focus the region,
  announce "Page N"); wrap the whole file in an IIFE (currently 20+ globals).
- [x] **B9** `asset/js/browse.js` — unguarded `querySelector('button:disabled')`
  dereference; cached images (`img.complete`) never fire `load` so masonry can lay out
  with 0-height tiles.
- [x] **B10** `asset/js/script.js` — annotation tooltip positioning dereferences
  `.main-header` unguarded.
- [x] **B11** `asset/js/theme-toggle.js` + `pagination-scroll.js` — unguarded
  `localStorage`/`sessionStorage` access kills the whole feature where storage access
  throws (blocked cookies / private mode). Add a `safeStorage` helper to `utils.js`.
- [x] **B12** `view/common/block-layout/file.phtml` — exception message references
  undefined `$linkType` (variable is `$link`).
- [x] **B13** `view/common/resource-values.phtml` — guard possibly-null `valueResource()`.

## Phase 2 — Accessibility

- [x] **A1** Menu-drawer focus containment: the trap is scoped to `.main-header__main-bar`
  but the drawer renders *outside* `<header>`, so Tab escapes the open drawer
  (WCAG 2.4.3). Trap across toggle + drawer and set `inert` on page content while open.
- [x] **A2** `view/common/search-form.phtml` — remove the self-referential
  `aria-labelledby` (it makes AT announce the input's own value as its name); give the
  hero variant a distinct landmark label.
- [x] **A3** `view/common/language-switcher.phtml` — replace the broken
  `listbox`/`option` roles (links inside options, no keyboard contract) with a plain
  disclosure of links; `aria-current` on the active language; drop non-mb-safe `ucwords()`.
- [x] **A4** `asset/js/navigation.js` — hardcoded English a11y strings ("Toggle
  submenu", "show submenu for …"); move drawer strings from global `const`s to
  `data-*` attributes and translate the new ones.
- [x] **A5** `view/common/resource-values.phtml` — don't emit `lang=""` (resets language
  to *unknown* on most metadata values); add `dir="auto"` for values with a language tag.
- [x] **A6** Heading & landmark structure: browse pages get `pageTitle(…, 1)`; item-set
  "Items" heading h3 → h2; `<div role="main">` → `<main>`; drop invalid `aria-title`
  in numeric partials.
- [x] **A7** `view/common/menu-drawer.phtml` — close control is `<a href=".">`; make it a
  `<button>`.
- [x] **A8** Skip link contrast: literal `white` on `--primary` is exactly ~4.5:1 and
  fails when an admin picks a lighter primary → use `--primary-active` ground.
- [x] **A9** Hero label contrast: raise `.banner__eyebrow` / `__stat-label` /
  `__substat-label` alphas to ≥ 0.92 over the duotone plate.
- [x] **A10** `view/omeka/site/index/search.phtml` — thumbnail link has no accessible
  name when media lacks alt text; use the redundant-link pattern (`alt=""` +
  `aria-hidden` + `tabindex="-1"`) since the title link is adjacent.
- [x] **A11** `asset/js/navigation.js` — `aria-expanded` belongs on the toggle button
  only, not the sibling link.
- [x] **A12** `view/common/advanced-search/properties.phtml` — `label for` points at
  element *names* not ids; wrap-label instead. Translate the literal "Logical operator".
- [x] **A13** Dark-banner media query targets `:root:not([data-theme=…])` but
  `data-theme` lives on `body` — forced-light users on OS-dark still get the dark
  plate. Mirror the `_colors.scss` pattern.

## Phase 3 — i18n catalog

- [x] **I1** Regenerate `language/template.pot` from the actual templates + JS-consumed
  strings (drop dead msgids: old theme-toggle labels).
- [x] **I2** Update `language/fr.po` — translate the current theme-toggle states, PWA
  install strings, "Change language", nav submenu strings; recompile `fr.mo`.
- [x] **I3** Add `npm run build:i18n` (node script — no gettext binaries needed) so the
  catalog can't silently drift again.

## Phase 4 — Design-system compliance (theme violating its own rules)

- [x] **D1** `_linked-resources.scss` — active facet chips are filled orange; restyle as
  primary border + oklab wash + primary text (the documented chip spec). Replace
  literal `white` with `var(--white)`.
- [x] **D2** Swap `--tracking-tight` → `--tracking-display` on all seven Besley display
  sites (masthead wordmark, h2, h3, `h1.title`, hero heading, citation head, hierarchy
  label).
- [x] **D3** `_block-group.scss` — remove the "likely a date header" primary-colored h3
  heuristic (violates "never primary on heading text").
- [x] **D4** Adopt the documented-but-unused mixins: `card-hover` at the 9 hand-copied
  sites; `primary-button`/`secondary-button` in `_error-page.scss`.
- [x] **D5** Resolve the two conflicting global box-sizing resets (keep the
  border-box reset in `_theme.scss`, delete `generic/_box-sizing.scss`).
- [x] **D6** De-duplicate the global reduced-motion kill block (keep the utilities copy);
  remove the dead `scroll-padding-top: 5rem`.
- [x] **D7** Wire up defined-but-unused tokens at their obvious consumers:
  `--sidebar-width` (regions), `--accent-line-md` (blockquote), `--size-control-xl`
  (48px linked-resources thumbs); replace hardcoded `0.04em`/`0.08em` letter-spacing
  with `--tracking-wide`/`--tracking-wider`.
- [x] **D8** Delete dead code: `$space-*`/`$radius-*`/`$transition-*` alias block in
  `_tokens.scss`, `--panel-border-color` (3 declarations, 0 uses), `.slide-text`
  vestige, dead hamburger `transform` transition, `transition: all` in carousel.
- [x] **D9** Add `@mixin visually-hidden` and replace the five hand-copied SR-only blocks.
- [x] **D10** Extract an icon-button mixin for `.theme-toggle` / `.pwa-install` (~45
  duplicated lines).
- [x] **D11** Fix stale headers/comments: `style.scss` version 2.4.2 → current, stale
  "linear-gradient" mixin description, `_abstracts.scss` comment.

## Phase 5 — Template refactoring & dead PHP

- [x] **R1** Shared `view/common/resource-card.phtml` partial + alt-text derivation
  helper — currently quadruplicated across item/item-set/media browse and
  browse-preview (alt-text logic appears 5×). Includes the browse-controls markup.
- [x] **R2** Extract the dateline builder from `item/show.phtml` into
  `view/common/item-dateline.phtml`; reuse on `media/show.phtml` (which still shows
  legacy ResourceTags pills and no dateline); drop ResourceTags there.
- [x] **R3** Delete `helper/ShadeColor.php` + `helper/ContrastColor.php` (registered,
  zero call sites) and their `theme.ini` registrations.
- [x] **R4** Delete `asset/js/accordion.js` + `_accordion.scss` (never enqueued — any
  accordion markup currently gets no JS) — or wire them up if a block needs them.
  Decision: delete; restore from git if a future block layout needs an accordion.
- [x] **R5** `view/hierarchy/...` — memoize grouping resolution and batch item-set reads
  (N+1: up to 2 API reads per card); guard the fragile regex count-parse.
- [x] **R6** Split `_advanced-search.scss` (1,042 lines) into form / Chosen-vendor /
  native-select partials; de-duplicate the twice-declared input block and `.field-meta`;
  tokenize `0.04em`, `38px`/`28px` control heights; comment the vendor z-index.
- [x] **R7** Attribute-context escaping consistency: `escapeHtmlAttr` for attributes in
  `menu-drawer`, `pagination`, `asset.phtml`, `item/search.phtml`, `resource-values`.
  Cast nullable values before escaping (PHP 8.1 deprecations) in `search-form`, `ids.phtml`.
- [x] **R8** `view/common/pagination.phtml` — dead `readonly` ternary; suffix-parameterize
  the input id so two paginations can coexist.
- [x] **R9** `$_GET['view']` → `$this->params()->fromQuery('view')` in the three browse
  templates; hoist per-loop `siteSetting()` calls in `item-with-metadata.phtml`;
  de-duplicate `themeSetting('nav_depth')` in `header.phtml`.
- [x] **R10** `helper/ResourceTags.php` — drop dead `id` map entries and redundant
  `$resourceClassId` fetch.
- [x] **R11** XHR fast path (`layout.phtml`, `item/show.phtml`) — emit
  `Vary: X-Requested-With` so proxies never cache the chrome-less fragment for
  normal visitors.

## Phase 6 — Performance

- [x] **P1** Browse/search thumbnails: pass `loading="lazy"`, `decoding="async"` through
  the thumbnail helper; keep first-row images eager. (Folded into the R1 partial.)
- [x] **P2** Compact banner: stop shipping the hero-sized image to every inner page —
  cap the compact variant's srcset at the small candidates via `sizes`.
- [x] **P3** Custom-banner path: emit the same homepage LCP preload for admin-uploaded
  banners (currently only the default banner is preloaded).
- [x] **P4** Gate `mirador-theme-sync.js`: bail immediately when no Mirador mount point
  exists instead of polling 50 timers on every page.
- [x] **P5** Body-end scripts: resolved by correcting the comments instead of adding
  `defer` — at body end `defer` gains nothing, and it would force defer onto every
  module-enqueued script to preserve `IWACUtils` ordering.
- [x] **P6** `advanced-search.js` — debounce the raw `resize` listener with the existing
  `IWACUtils.debounce`.
- [~] **P7** Self-host the three font families (removes the render-blocking third-party
  origin — the single largest critical-path win). *Deferred to its own PR*: needs
  font subsetting + licensing review of committed binaries + verification of the
  Arabic-transliteration diacritics coverage per face. Interim mitigation shipped:
  correct `preconnect`, `display=swap` already present.
- [~] **P8** Cache the three homepage COUNT queries. *Deferred*: needs an
  infra decision (APCu availability on the ZMO host); the queries are indexed and
  failure-guarded today.

## Phase 7 — Build, config & guardrails

- [x] **C1** Align the Omeka version floor everywhere at `^4.2.0` (theme.ini already
  enforces it; `values.phtml` relies on a 4.2-only `displayValues` option) —
  composer.json, README, CLAUDE.md, `style.scss` header.
- [x] **C2** composer.json: drop the unresolvable `require: omeka/omeka-s`; align the
  SPDX license id with package.json (`GPL-3.0-or-later`).
- [x] **C3** Gulp: `default`/`start` compile before watching; watch regenerates tokens
  when `_colors.scss` changes; remove the no-op `includePaths`.
- [x] **C4** `package-lock.json` metadata resync (stuck at 2.6.7).
- [x] **C5** browserslist honesty: raise the floor to match the CSS reality
  (`oklch()`/`color-mix()` ⇒ Safari ≥ 16.2).
- [x] **C6** README drift: remove ghost Logo/Footer-Logo settings, add Bluesky, mention
  Besley, correct the build-task descriptions (`build:tokens`, `build:images`,
  `build:icons`).
- [x] **C7** CI workflow: `npm ci && npm run build && git diff --exit-code` — mechanically
  prevents every stale-generated-artifact class (CSS, tokens.json, doc tables).
- [x] **C8** Token-usage guard: `scripts/check-token-usage.js` — fails the build when any
  `var(--…)` in `asset/sass/` doesn't resolve to a defined token (turns the CLAUDE.md
  rule from prose into an invariant). Wire into `npm run build` + CI.
- [x] **C9** `.editorconfig`; `.gitattributes` `linguist-generated` for `style.css` /
  `tokens.json`; drop the stale `.tx/` export-ignore.
- [~] **C10** `theme.jpg`: regenerate the admin/README screenshot from the current (v2.6+)
  design. *Deferred*: this session's network policy blocks `islam.zmo.de`, so a live
  screenshot can't be captured here. One-liner to run locally, then commit the result:
  `chromium --headless --screenshot=theme.jpg --window-size=1280,800 https://islam.zmo.de/s/westafrica/`
  (any 1280×800-ish JPEG of the homepage works — Omeka shows it in Admin → Themes and
  README.md embeds it).
- [x] **C11** `scripts/build-tokens.js` — loud warning (not silence) when sibling module
  repos are absent; friendly error when `_colors.scss` is missing.
- [x] **C12** `scripts/gen-pwa-icons.js` — read the brand color from `config/theme.ini`
  instead of a hardcoded duplicate hex.

---

## Verification per phase

Every phase: `npm run build` must pass with a clean `git status` on generated files
(only intentional regenerations committed). Template changes: PHP lint
(`php -l`) on every touched `.phtml`. JS changes: `node --check` on every touched file.
Visual-risk changes (Phase 4): light + dark screenshot pass.
