# Cross-theme roadmap — 2026-10

What IWAC-theme adopts from its sibling, [DRE-theme](https://github.com/AM-Digital-Research-Environment/DRE-theme)
(v2.46.0 at the time of writing), after comparing the two repositories' tooling. Both are
Omeka S 4.2.1 themes on PHP 8.5 with the same author, the same design-token approach and
the same kind of sibling modules, and DRE-theme had solved several problems IWAC-theme
still carried. Each item says what DRE-theme does and why IWAC adopts it. Ticked items
carry the commit that landed them.

Process document, not product: export-ignored like `ROADMAP.md`.

## Items

- [x] **1. Consistency fixes.** The PHP floor was stated three ways (composer.json
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

- [x] **2. `npm run verify` is the CI contract.** DRE-theme's `verify` runs locally
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

- [ ] **3. Test against the real Omeka S release.** DRE-theme downloads the official
  Omeka S 4.2.1 zip (SHA-256 verified), installs the theme and asks Omeka's own theme
  manager to discover and parse it with deprecations as errors — once on the working
  tree, and again in `release.yml` on the unpacked release zip, so an export-ignore
  mistake fails the release instead of the live site. Its PHPStan analyses the helpers
  against the real Omeka and Laminas classes. IWAC's PHPStan ran against a one-class
  stub, which is why its helpers had to type Omeka representations as `object`.

- [ ] **4. CHANGELOG.md is the release-notes source.** DRE-theme keeps a Keep a
  Changelog file, lints it, and `release.yml` publishes that version's section as the
  release notes, falling back to generated notes with a warning. IWAC's release notes
  were GitHub's generated commit list — useful to a maintainer, opaque to a site
  admin. `npm run bump` now promotes `## [Unreleased]` the same way it writes the
  version everywhere else.

- [ ] **5. Replace gulp with a plain Node build script.** DRE-theme dropped gulp in
  v2.32 for `scripts/build-css.mjs` (the `sass` JS API → PostCSS), plus a
  compiled-CSS integrity check born from a mid-file BOM that silently dropped 63
  declarations. gulp contributed only glob expansion and a watcher, and gulp-sass v6
  silently ignored `outputStyle: 'compressed'`. IWAC does the same in CommonJS, keeping
  cssnano so the output is byte-identical.

- [ ] **6. Move logic out of the heaviest templates into tested helpers.** DRE-theme
  moved resource grouping, hierarchy trees, record apparatus and card data into
  helpers with PHP tests. IWAC's `resource-values.phtml` (language filtering,
  translation pairs, AI provenance, transcript disclosure) and `hierarchy-public.phtml`
  (recursive closures, API searches, a keyword→category table) carried the same kind of
  logic in closures nobody could test.

- [ ] **7. Self-host the webfonts.** DRE-theme serves woff2 from `asset/fonts/` with
  `@font-face` in Sass and preloads the two critical faces. IWAC loaded a
  render-blocking stylesheet from fonts.bunny.net plus a preconnect: a third-party
  request on every first visit, and a privacy dependency the theme does not need.

- [ ] **8. Local browser tests (Playwright, three browsers, axe).** DRE-theme renders
  PHP partials with its committed CSS/JS on a routed fixture origin — no Omeka, no
  database — and drives them in Chromium, Firefox and WebKit with scoped axe checks.
  IWAC had jsdom unit tests (no layout, no focus, no real CSS) and a live-site e2e that
  only runs after a release is installed. It already renders real templates into
  `test/fixtures/rendered/`; the browser layer builds on those.
