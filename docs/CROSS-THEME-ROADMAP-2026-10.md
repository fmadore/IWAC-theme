# Cross-theme roadmap — 2026-10

What IWAC-theme adopts from its sibling, [DRE-theme](https://github.com/AM-Digital-Research-Environment/DRE-theme)
(v2.46.0 at the time of writing), after comparing the two repositories' tooling. Both are
Omeka S 4.2.1 themes on PHP 8.5 with the same author, the same design-token approach and
the same kind of sibling modules, and DRE-theme had solved several problems IWAC-theme
still carried. Each item says what DRE-theme does and why IWAC adopts it. Ticked items
carry the commit(s) that landed them (roadmap commit: 64fe59a). Nothing here is
released yet: the CHANGELOG's [Unreleased] section describes it for the next bump.

Known gaps left for review:

- **Commit 8c5a8f2 (item 3) is not green on its own:** adding a `use` line to
  `helper/PwaManifest.php` moved a line reference in the translation catalogue, and
  that commit did not rebuild it, so `npm test` / `check:generated` fail at exactly
  that commit; 5b12e47 rebuilds it. The full `npm run verify` ran before 3ed2873,
  eef9916, 270e735, c6b5b06, fd4beb8 and 1118855; the other commits ran the checks
  covering what they touched.
- **Masthead at enlarged text on phones** (item 8 finding) — fixed after 2.31.1: the
  header is a size container, and below 17rem (acronym wordmark) / 20rem (full title)
  the search box takes its own row; headings break an over-long word. The `fixme`
  became six tests in `a11y.spec.js`.
- **Module follow-up for the fonts** (item 7) — done in IwacVisualizations 72bbdffe
  and IwacSearch 847ad08 (token sync), not yet released. Bunny stays only as the
  module's fallback, so `fontsUrl` / `LEGACY_FONTS_URL` stay until that fallback goes.

Process document, not product: export-ignored like `ROADMAP.md`.

## Items

- [x] **1. Consistency fixes.** (8157e48) The PHP floor was stated three ways (composer.json
  `^8.4`, the stylesheet banner `^8.1`, CI testing 8.4/8.5); the Omeka constraint said
  `^4.2.0` while both installs run 4.2.1; the workflows pinned two different
  `actions/setup-node` releases and an old `setup-php`. DRE-theme pins every action to
  one SHA everywhere and checks Dependabot weekly with a cooldown on npm, so a
  compromised or broken publish has time to be yanked before it is proposed. IWAC
  states one PHP floor, one Omeka floor and one pin per action, and adopts the same
  Dependabot schedule.
  *Landed:* banner `Requires PHP: ^8.4` (composer.json and CI already said 8.4/8.5);
  `omeka_version_constraint = "^4.2.1"` in theme.ini, the banner and README; every
  action pinned to its latest release by SHA (checkout v7.0.1, setup-node v7.1.0,
  setup-php 2.40.0, upload-artifact v7.0.2, download-artifact v8.0.2); Dependabot
  weekly, 5-day npm cooldown, grouped actions.

- [x] **2. `npm run verify` is the CI contract.** (3ed2873) DRE-theme's `verify` runs locally
  exactly what its CSS job runs, and its CI job calls `npm run verify` instead of
  restating a step list, so "it passed locally" and "it passed in CI" mean the same
  thing. Its stale-CSS check tells a contributor which generated file is stale (and
  only warns while the matching inputs are still uncommitted), and its PHP check skips
  with a clear message when no `php` is on PATH but is fatal under `--require` in CI.
  IWAC's Quality job was a nine-step list that nobody ran locally as a unit.
  *Landed:* `npm run verify` (package.json) chains the frontend job's steps;
  `scripts/check-generated.js` replaces `git diff --exit-code` (names the stale artifact
  and its rebuild command; strict under `CI`/`GITHUB_ACTIONS`, a reminder locally when
  the artifact's inputs are uncommitted too); `scripts/check-php.js` runs `php -l`, the
  theme.ini parse, `test:php` and `check:fixtures`, skipping without PHP unless
  `--require`. build.yml's frontend job runs `npm run verify` (with `IWAC_SKIP_PHP=1`:
  the runner's preinstalled PHP is below the floor) and its PHP matrix job runs
  `check-php.js --require`.

- [x] **3. Test against the real Omeka S release.** (8c5a8f2) DRE-theme downloads the official
  Omeka S 4.2.1 zip (SHA-256 verified), installs the theme and asks Omeka's own theme
  manager to discover and parse it with deprecations as errors — once on the working
  tree, and again in `release.yml` on the unpacked release zip, so an export-ignore
  mistake fails the release instead of the live site. Its PHPStan analyses the helpers
  against the real Omeka and Laminas classes. IWAC's PHPStan ran against a one-class
  stub, which is why its helpers had to type Omeka representations as `object`.
  *Landed:* `test/php/omeka-compatibility.php` (DRE's discovery test plus what
  `MvcListeners` does at render time: each `helpers[]` file exists with theme.ini's
  exact spelling, defines `OmekaTheme\Helper\<Name>`, is a Laminas helper) and
  `test/php/phpstan-bootstrap.php`; build.yml's `omeka-compatibility` job (Omeka 4.2.1
  zip, SHA-256 checked, installed as `themes/IWAC-theme`, PHP 8.5, PHPStan 2.3.3);
  release.yml repeats discovery on the unpacked ZIP; live-smoke warns on a newer Omeka.
  PHPStan runs at **level 7** (6 → 7 clean once the helpers' PHPDoc names
  `SiteRepresentation`, `SitePageRepresentation`, `AbstractResourceEntityRepresentation`,
  `ValueRepresentation`). Native types stay `object`: the PHP tests pass fakes, so
  `treatPhpDocTypesAsCertain: false` keeps the defensive guards from reading as dead
  code. Level 8 fails only on `getView()` being nullable (~20 call sites) — left.
  Verified locally: Omeka 4.2.1 zip (digest OK) + phpstan.phar 2.3.3 (release digest
  OK): `[OK] No errors`; discovery test 48 checks passed, and fails as expected on a
  `^4.3.0` constraint and a lowercased helper filename.

- [x] **4. CHANGELOG.md is the release-notes source.** (3057bc4) DRE-theme keeps a Keep a
  Changelog file, lints it, and `release.yml` publishes that version's section as the
  release notes, falling back to generated notes with a warning. IWAC's release notes
  were GitHub's generated commit list — useful to a maintainer, opaque to a site
  admin. `npm run bump` now promotes `## [Unreleased]` the same way it writes the
  version everywhere else.
  *Landed:* CHANGELOG.md backfilled for 2.25.0–2.30.1 from the commits (the GitHub
  notes for those tags were generated and say nothing), older history pointed at GitHub
  Releases; `scripts/lib/changelog.js` + `scripts/changelog-section.js` (port of DRE's
  `changelog-section.mjs`) and `test/changelog.test.js`; `npm run bump` promotes
  `[Unreleased]`; `check:versions` warns when the current version has no section;
  `release.yml` extracts the notes in the read-only build job and publishes them with
  `--notes-file`, falling back to `--generate-notes` with a warning; CHANGELOG.md is on
  the archive's root allowlist and required-files list.

- [x] **5. Replace gulp with a plain Node build script.** (eef9916, 270e735) DRE-theme dropped gulp in
  v2.32 for `scripts/build-css.mjs` (the `sass` JS API → PostCSS), plus a
  compiled-CSS integrity check born from a mid-file BOM that silently dropped 63
  declarations. gulp contributed only glob expansion and a watcher, and gulp-sass v6
  silently ignored `outputStyle: 'compressed'`. IWAC does the same in CommonJS, keeping
  cssnano so the output is byte-identical.
  *Landed:* `scripts/build-css.js` (+ `--watch`) and `test/build-css.test.js`; gulp,
  gulp-sass, gulp-postcss removed, postcss a direct dependency. The stylesheet was
  byte-identical (`cmp`) to the gulp build. One deliberate change in a second commit:
  cssnano had always stripped `style.scss`'s header, so the shipped CSS carried no
  version; the build now prepends it after `@charset` (+611 bytes, rules unchanged), and
  `scripts/check-compiled-css.js` (`npm run check:css`, end of `npm run build`) asserts
  `@charset` first and once, no BOM, the header present and current, no dead selector,
  no unresolvable `var()`.

- [x] **6. Move logic out of the heaviest templates into tested helpers.** (5b12e47, c6b5b06) DRE-theme
  moved resource grouping, hierarchy trees, record apparatus and card data into
  helpers with PHP tests. IWAC's `resource-values.phtml` (language filtering,
  translation pairs, AI provenance, transcript disclosure) and `hierarchy-public.phtml`
  (recursive closures, API searches, a keyword→category table) carried the same kind of
  logic in closures nobody could test.
  *Landed:* `ResourceValues` (language matching by primary subtag, translation-pair
  narrowing, AI label, language chip, record-prose `lang`, transcript fold, medium
  thumbnail swap) and `HierarchyTree` (id collection for two batched API reads,
  node resolution with privacy/site membership/links, count parsing, category table,
  cover) — both registered in theme.ini with exact casing, templates reduced to markup.
  Of the other three: `linked-resources.phtml`'s chip merging and page clamp went to
  `LinkedResourcesPaging::facetChips()` / `pageCount()`; the CSS-length guard that
  `banner.phtml` and `layout.phtml` each carried became the `CssLength` helper.
  `item-carousel.phtml` was left: its slide building is presentation (title option,
  caption, image), with no rule worth a unit test. 13 new PHP tests (42 → 55). The
  17 rendered fixtures pass without regeneration; the hierarchy template, which no
  fixture renders, was compared byte-for-byte before/after through a new FakeView
  harness (identical modulo the working copy's CRLF line endings) that is now a
  template test. PHPStan level 7 clean; Omeka discovery 60 checks.
  Found on the way: Omeka loads theme helpers on demand, so static calls on helper
  classes are only safe after the helper was fetched — documented in CLAUDE.md.

- [x] **7. Self-host the webfonts.** (fd4beb8, 9c61a05) DRE-theme serves woff2 from `asset/fonts/` with
  `@font-face` in Sass and preloads the two critical faces. IWAC loaded a
  render-blocking stylesheet from fonts.bunny.net plus a preconnect: a third-party
  request on every first visit, and a privacy dependency the theme does not need.
  *Landed:* 14 woff2 files (latin + latin-ext) in `asset/fonts/` from the npm registry
  — `@fontsource/besley` 5.3.0 (static 500/600/800), `@fontsource-variable/public-sans`
  5.3.0 (wght, normal + italic), `@fontsource-variable/source-serif-4` 5.3.1 (the
  `opsz` files, which carry wght + opsz) — tarball integrity checked against the
  registry's sha512; OFL texts as `asset/fonts/OFL-*.txt`. `@font-face` in
  `asset/sass/base/_fonts.scss` with the exact descriptors the Bunny request loaded
  (Public Sans 400–700 + italic 400, Source Serif 4 400–600 + italic 400, Besley
  500/600/800), `font-display: swap`. `layout.phtml` drops the Bunny stylesheet and
  preconnect and preloads Public Sans latin normal + Besley latin 800 (masthead), with
  `crossorigin` and un-versioned `assetUrl()`. `build-tokens.js` derives `fonts` from
  the `@font-face` rules (output unchanged); `tokens.json` gains
  `fontsCss: "asset/css/fonts.css"` (compiled from `asset/sass/fonts.scss`, the same
  partial alone) and keeps `fontsUrl` (the Bunny URL, deprecated) because
  IwacVisualizations reads it; the build fails if that URL stops matching the
  `@font-face` set. `style.css` changed only by the 14 `@font-face` rules (checked).
  Verified in headless Chromium on two rendered fixture pages with the theme served on
  a routed origin: no request leaves the origin, `document.fonts` reports Besley
  600/800, Public Sans 400–700 (+ italic on the About page) and Source Serif 4 loaded,
  each preloaded file fetched once (the preload matched), and computed font-family /
  weight / style of body, h1, masthead and metadata values identical to before.
  `npm run sync:tokens` was NOT run (it writes into the module repos).

  **Module follow-up (IwacVisualizations)** — done 2026-10-29 in 72bbdffe, as
  `EmbedBrand::themeFontsAsset()`: the layout links the site theme's own
  `asset/css/fonts.css` through `assetUrl()` when the file exists on disk, and keeps
  the Bunny preconnect + request only for a site on another theme or an IWAC-theme
  older than 2.31. No preload was added. IwacSearch took the sync only (847ad08).
  The plan as written:
  1. `src/Site/EmbedBrand.php`: add a `webfontStylesheet()` that prefers
     `config/theme-seeds.php` `fontsCss` (a theme-relative path, validated as
     `^asset/css/[a-z-]+\.css$`) resolved against the IWAC theme's base URL — e.g.
     `$view->assetUrl('css/fonts.css')` when the embed's site uses IWAC-theme, or
     `$basePath . '/themes/IWAC-theme/' . $fontsCss` — and falls back to `fontsUrl`
     / `WEBFONT_URL` only when the theme path is unavailable.
  2. `view/iwac-visualizations/layout/embed.phtml` (lines ~93–94): emit
     `<link rel="stylesheet" href="…fonts.css">` and drop the
     `<link rel="preconnect" href="https://fonts.bunny.net" crossorigin>` once (1)
     returns a same-origin URL; optionally preload `fonts/besley-latin-800-normal.woff2`
     un-versioned with `crossorigin`.
  3. `scripts/build-embed-tokens.js`: copy `tokens.fontsCss` into
     `config/theme-seeds.php` beside `fontsUrl` (validate the path shape).
  4. Tests: `tests/js/embed-brand.test.js` (assert the seeds file carries `fontsCss`
     equal to `tokens.json`'s) and `tests/php/run.php` ~line 699 (assert the
     stylesheet URL ends in `/asset/css/fonts.css`, not that it starts with
     fonts.bunny.net).
  5. Then `npm run sync:tokens` from IWAC-theme and rebuild both modules. IwacSearch
     reads no font URL (grep: no `fontsUrl`/`fonts.bunny` outside its synced
     `tokens.json` and guard copy) — nothing to change there beyond the sync.
  Once no module reads `fontsUrl`, delete `LEGACY_FONTS_URL` in build-tokens.js.

- [x] **8. Local browser tests (Playwright, three browsers, axe).** (1118855; fixes e98fe2b, a4282a5) DRE-theme renders
  PHP partials with its committed CSS/JS on a routed fixture origin — no Omeka, no
  database — and drives them in Chromium, Firefox and WebKit with scoped axe checks.
  IWAC had jsdom unit tests (no layout, no focus, no real CSS) and a live-site e2e that
  only runs after a release is installed. It already renders real templates into
  `test/fixtures/rendered/`; the browser layer builds on those.
  *Landed:* `playwright.local.config.js` (Chromium, Firefox, WebKit;
  `IWAC_BROWSER_CHANNEL=msedge|chrome` for the Chromium project), `npm run test:browser`,
  `test/browser/fixtures.js` (routed `https://iwac.test` origin serving the rendered pages
  at their manifest URLs + committed `asset/`, AJAX answers from the `xhr` fixtures,
  third-party requests aborted and recorded) and three specs — `header.spec.js`,
  `pages.spec.js`, `a11y.spec.js` — covering every surface in the brief. CI job
  `local-browsers` (browser cache per Playwright version, `test-results/local` uploaded
  on failure). `docs/TESTING.md`. Locally: 97 passed, 5 skipped in all three engines
  (three consecutive green runs), and the Chromium project green on installed Edge too.
  Skips: forced colours in Firefox/WebKit (Chromium-only emulation) and the 390px
  200%-text case, a `test.fixme` for an **open finding**: the masthead's tool row
  (search min-width 144px, language, theme, menu) overflows a 390px phone by 13px at
  150% text and 131px at 200%. Fixing it is a masthead design decision, left for review.
  Real bugs found and fixed in their own commits: the theme toggle stuck on light when
  storage is unavailable; Media-block thumbnail links with no accessible name (the
  fixture renderer's `thumbnail()` also printed no alt, unlike core — corrected).
  Not bugs, fixed in the fixture origin: WebKit decoded the charset-less fixture pages
  as windows-1252, and Back to an unrendered AJAX URL 404'd.
