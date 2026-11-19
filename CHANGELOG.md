# Changelog

All notable changes to the IWAC theme are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the theme uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Release workflow: add entries under **[Unreleased]** as you work. `npm run bump --
<major|minor|patch>` moves them into a dated section for the new version, and the
release workflow uses that section as the notes of any GitHub release it has to
create.

## [Unreleased]

## [2.36.0] - 2026-11-19

### Added

- **An upgrade worklist for the theme's copies of Omeka core templates.** `test/php/core-overrides.json` records the 25 core templates the theme overrides, with a hash of each at Omeka S 4.2.1. When CI moves to a newer Omeka S, the compatibility check now names every one of those templates that changed upstream, so the maintainer knows which theme copies to compare and update; `--write-overrides` refreshes the record afterwards.

### Removed

- **Seven unused social-network icons.** The Facebook, X, LinkedIn, Instagram, YouTube, Mastodon and Bluesky SVG files in `asset/img/` were never loaded: the footer draws its own social icons. The Social Media settings and the footer links are unchanged.

## [2.35.0] - 2026-11-18

### Added

- **A condensed sans for the nav strip and datelines.** Fira Sans Condensed (500 and 600, self-hosted like the other faces) now sets the section menu and the menu drawer. It also sets the item dateline, the hero eyebrow, carousel datelines and news date headers. It is the narrow "press" gothic that goes with Besley headlines, and it covers every Arabic-transliteration letter, including `ʿ`, which Public Sans lacks. Modules can use it through the new `--font-condensed` token.

## [2.34.2] - 2026-11-18

### Fixed

- **The plate page head sits flush under the menu on every page.** On a page using Omeka's "normal" layout (rather than the grid), a 16px strip of white showed between the header and the blue band.

## [2.34.1] - 2026-11-17

### Fixed

- **2.34.0 was tagged but never published; this release carries its changes.** The release check that analyses the theme's PHP against Omeka S refused the new page-head helper, so no 2.34.0 ZIP was built. Nothing was wrong on a running site: Omeka S documents one of its own methods with the wrong return type, and the check now carries a correction for it. See 2.34.0 below for what changed on the site.

## [2.34.0] - 2026-11-17

### Changed

- **Section pages open on a printed title band.** A site page whose first block is a page title (Explore, Browse, Index, References, About and their sub-pages) now opens on a slim blue band under the menu, printed like the homepage hero (the same press collage, blue ground and dot screen) with the page title in large white type. On a sub-page, the breadcrumb ("Explore / Collection overview") sits in the band above the title instead of on its own line above it. Phones get the blue band without the photograph, so they download no extra image. A custom banner image uploaded under *Themes → Configure* appears in the band too. Pages whose first block is something else, page-title blocks placed further down a page, item, media and item-set pages, and the homepage are unchanged. Printed pages show the title in ink, without the band.

## [2.33.1] - 2026-11-16

### Changed

- **More short texts are set in newspaper columns, and step-by-step instructions never are.** The length up to which an HTML block flows into two columns goes from about 1,800 to about 2,400 characters, so the French homepage's "À propos" (2,300 characters) is set in columns like its English twin, and so are the history sections of the About page. A block containing a numbered list stays in one column: on the AI access page, setup steps were split between two columns, with step 1 at the bottom of one and steps 2 and 3 at the top of the next. Bulleted lists still flow.

## [2.33.0] - 2026-11-15

**Upgrade note.** The default primary colour is now a press blue (`#1C2F9E`) instead of burnt orange, and the default secondary (chart) colour is claret (`#85253A`) instead of slate. Most sites saved the old defaults the first time an admin pressed Save in the theme settings; the theme now reads exactly `#E64A19` and `#394F68` as "not set", so those sites switch to the new colours without any action. A site that chose any other colour keeps it. To keep the orange on purpose, store a neighbouring value such as `#E64A1A` under *Themes → Configure → Theme's Primary Color*. The Mirador viewer's colours are set in the Mirador module, not by the theme: paste the new values from `docs/MIRADOR.md` into its settings. Sites with a customised resource-page or page layout need no other change.

### Changed

- **A new look: ink and one spot colour.** The site now prints like a two-colour newspaper. Ink carries the masthead, headlines and the thick section rules; a deep blue is the one accent, used for links, the current page, focus and the single filled button. It replaces the burnt orange on warm off-white. In dark mode the blue is automatically lightened (keeping its hue) so it stays legible on the dark page, and any colour an admin sets in the theme settings follows the same rule.
- **Square and flat.** Corners are square everywhere (buttons, fields, chips, panels, images) and nothing on the page casts a shadow; the filled button no longer glows or lifts on hover. Only things that float over the page, such as menus, the mobile drawer and search suggestions, keep a small shadow.
- **Page sections are ruled, not boxed.** Text blocks and block groups on site pages are no longer white cards on a grey page. The page is one flat surface, and each section after the first opens on a thick ink rule, the way the "How to cite" and "Linked resources" sections already did.
- **Short texts are set in newspaper columns.** A short HTML block (up to about 1,800 characters, with no table, image, embed or quotation in it), such as "About the collection" on the homepage, now flows into two balanced columns on wide screens instead of a narrow column with empty space beside it. Headings span both columns, and phones still get a single column. Long texts fill the full page width in one column. The same goes for the AI-generated summary on item pages, and descriptions, full texts and the citation panel no longer stop at a fixed reading width.
- **Fewer capital letters.** Spaced-out capitals are kept for the main menu and for datelines and small headers ("ARTICLE · LA NATION · 15 NOV 1991", "ON THIS DAY"). Field labels on item pages, breadcrumbs, table headers, the Linked resources filters and sort, the citation styles, the homepage figures' captions and other labels are now written in normal sentence case.
- **The homepage banner** now prints the collage of newspaper covers in black on the blue, through a fine halftone dot screen, like a newspaper photograph. The banner keeps the same deep blue in dark mode.
- **Colours in charts and legends.** Because the accent is now blue, the colours that mark resource types were re-chosen so that no two look alike: Islamic periodicals are claret, audiovisual items (and People) teal, and Events magenta; AI-generated content is marked in teal too. Four chart series colours were changed for the same reason. The app screenshots shown when installing the site as an app were redrawn to match.

- **A shorter, fuller footer.** The footer is now three ruled bands: the site title and description beside the menu, the partner logos (larger) with the social links and the install button, and the rights notice in two columns on wide screens. With **Footer Menu Depth** set to 1 (the theme default) the menu is a single row of the main sections; with 2 or more, each section's sub-pages sit in columns under it that share the full width, and a long section is set in two columns. Before, a sixth section dropped onto a row of its own and the longest list set the height of all the others, leaving most of a very tall footer empty on desktop. On the IWAC sites the footer goes from about 1,125px tall to about 580px with sub-pages, or 360px with sections only. To show sections only, set *Themes → Configure → Footer → Footer Menu Depth* to 1. The menu is also announced to screen readers as a "Footer" navigation region, and the footer is left-aligned on phones instead of centred. The partner logos are now shown as the partners supply them, in full colour on a white ground in both light and dark mode; they used to be greyed out until hovered.

- **Design-token contract (for the IwacSearch and IwacVisualizations modules).** No token was removed or renamed, but several changed value: `--primary`, `--secondary`, `--info` and the resource-type and chart-series colours above; `--radius-sm/md/lg` and `--panel-radius` are now `0`; `--shadow-xs/sm/md`, `--panel-shadow` and `--glow-xs/sm/md` are now flat (a transparent zero shadow), `--shadow-lg` is smaller, and the dark `--panel-bg` is `--surface`. The dark `--primary` is derived differently (lightness only, see `docs/DESIGN-SYSTEM.md` §1), which an embed that recomputes it must mirror. Both modules need their fallbacks updated after `npm run sync:tokens`.

### Removed

- **The thin image strip at the top of inner pages.** Pages other than the homepage now open directly on their breadcrumb and title under the menu, which also loads one image less on every page.

### Security

- **minimatch 11 in the build toolchain.** An npm `overrides` entry pins minimatch to 11.0.5, clearing a moderate denial-of-service advisory in minimatch below 11.0.1 ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)), which ESLint 10 still reaches through its own minimatch 10 requirement. ESLint lints the same files with the same results on minimatch 11. It is a development dependency: nothing changes in the release ZIP or on the sites. IwacSearch already carries the same override.

## [2.32.1] - 2026-11-06

### Fixed

- **The main menu no longer jumps on every page load.** The section strip first appeared without the dropdown arrows, then every entry after a section with a submenu slid sideways when the script added them, which read as the whole menu flashing after each click. The stylesheet now reserves the arrows' space from the first paint, so nothing moves.

## [2.32.0] - 2026-11-04

### Removed

- **`fontsUrl` in `tokens.json`.** The design-token contract no longer publishes the Bunny Fonts request the theme used before it self-hosted its webfonts in 2.31. Its replacement, `fontsCss` (`asset/css/fonts.css`), is unchanged. Its last reader, the IwacVisualizations embed fallback, went in that module's 1.98.0. Nothing changes on the sites, since modules read the contract when they are built, not from the installed theme. The contract loses a key, hence a minor version.

## [2.31.2] - 2026-10-29

### Fixed

- **Enlarged text on phones.** At 150 % text and above the masthead row (wordmark, search, language, theme, menu) no longer fitted a phone, and the page scrolled sideways by up to 131px. Where the row stops fitting, the search box now takes a full-width row of its own under the other controls; the masthead follows the text size, not just the screen width, so at the default size every phone keeps the single row. Headings also break a word longer than the line: at 200 % "Ouagadougou" alone was wider than the screen.

## [2.31.1] - 2026-10-29

### Fixed

- **Source Serif 4 licence.** The OFL text shipped beside the font attributed its copyright to "Google Inc."; it now names the Source Serif 4 Project Authors, as the Google Fonts distribution of the family does.

## [2.31.0] - 2026-10-29

### Changed

- **Requirements.** The theme now declares Omeka S 4.2.1 as its minimum (it was 4.2.0); both IWAC sites run 4.2.1. The stylesheet header states the same PHP floor as `composer.json`, PHP 8.4.
- **Development.** `npm run verify` runs locally exactly what the Quality workflow's frontend job runs, and the workflow now calls it. A stale generated file is reported by name with the command that rebuilds it. `npm run check:php` runs the PHP syntax, `theme.ini`, helper-test and fixture checks, and says so when it has to skip for want of a `php` binary.
- **CI.** Every GitHub Action is pinned to its latest release by commit SHA, with one pin per action across all workflows. Dependabot proposes updates weekly, holds new npm releases back for five days, and groups action updates into one pull request.
- **Build.** Gulp is gone: `scripts/build-css.js` compiles the stylesheet through Sass, autoprefixer and cssnano directly, and `npm run start` watches without it. The compiled stylesheet's rules are byte-for-byte the same; it now opens with the theme header (name, version, Omeka and PHP requirements), which the old build stripped, and `npm run build` checks the compiled file for a stray byte-order mark, a misplaced `@charset`, a stale version and undefined custom properties.
- **Compatibility testing.** CI installs the theme into the official Omeka S 4.2.1 release and has Omeka's own theme manager discover it and load its view helpers on PHP 8.5, with every deprecation treated as an error; the release workflow does the same with the release ZIP itself. PHPStan now checks the helpers against the real Omeka classes, at level 7 instead of 6.
- **Webfonts are self-hosted.** Besley, Public Sans and Source Serif 4 are served from the theme's own `asset/fonts/` (the same families, weights, styles and optical-size axis as before, latin and latin-ext) instead of a render-blocking stylesheet from fonts.bunny.net. Pages make no third-party request for fonts, and the two faces above the fold (body text and the masthead) are preloaded. The SIL Open Font Licence texts ship beside the files. `asset/css/fonts.css` holds the same `@font-face` rules on their own, for pages that render without the theme (published in `tokens.json` as `fontsCss`; the Bunny URL stays in `fontsUrl`, deprecated).
- **Browser tests.** `npm run test:browser` runs the theme's rendered pages, with its real stylesheet and scripts, in Chromium, Firefox and WebKit: header and navigation at five widths, the menu drawer's focus handling, browsing without JavaScript, the theme toggle, the language switcher, browse layouts and masonry, Linked resources paging, the citation panel, reduced motion, forced colours, enlarged text and accessibility checks in both themes. CI runs it on every push.

### Added

- **This changelog.** It ships in the theme ZIP, and a release's GitHub notes are now its section here instead of a generated list of pull requests. `npm run bump` dates the *Unreleased* notes for the new version.

### Fixed

- With browser storage unavailable (a private window, blocked site data), the theme button went from system to light and then stayed on light; it now cycles through light, dark and system as usual for the rest of the visit.
- On a page's Media block showing thumbnails, an image without alt text made its link nameless for screen readers. When the title below links to the same item, the image link is now skipped by keyboard and screen readers (it only duplicates the title); otherwise it is named after what it opens.

## [2.30.1] - 2026-10-27

### Changed

- The DOI and Wikidata marks beside reconciled identifiers are now the schemes' official artwork in their own colours (the DOI's yellow disc, Wikidata's red, green and blue barcode) instead of single-colour glyphs. They stay visible in Windows high-contrast mode. IwacSearch draws the same files.

## [2.30.0] - 2026-10-26

### Changed

- **Requirements.** The theme declares PHP 8.4 as its minimum, matching what CI tests.
- Development dependencies updated in range, including cssnano 9.9.0, whose merging of media blocks rewrote the compiled stylesheet without changing any computed style. The `braces` audit exception is retired.

## [2.29.0] - 2026-10-23

### Added

- IWAC-SEO's *How to cite this page* block now renders through the theme's citation panel, so an online exhibit gets the same style tabs, copy button and downloads as an item. Its heading reads "How to cite this page" / "Comment citer cette page".

## [2.28.0] - 2026-10-23

### Added

- DOIs and Wikidata identifiers on a record are shown with the scheme's mark, the bare identifier and an outbound link to its canonical address, whichever spelling (`http://`, `dx.doi.org`, `/entity/`) the record stored. The mark is the link's accessible name ("Wikidata Q141697087"). Every other value keeps core's markup. New helper `ExternalIdentifier`, registered in `theme.ini`.

## [2.27.1] - 2026-10-23

### Fixed

- A masonry wall in a block aligned left, centre or right collapsed to a single narrow column (the Hajj exhibit's *Further references*). A block holding a masonry wall now always spans its row, and inside a block group it no longer doubles the group's bottom padding. `docs/PAGE-BLOCKS.md` tells editors that Masonry ignores Alignment.

## [2.27.0] - 2026-10-21

### Changed

- The last eleven interface icons still drawn from Bootstrap Icons (quote, clipboard, check, book, bookmark, camera, newspaper, file, external link, sort arrows) are now Lucide, so every interface icon matches the ones IwacSearch and IwacVisualizations draw. Brand marks and the EU AI label are unchanged.

## [2.26.0] - 2026-10-21

### Added

- A *Masonry* template for the Media embed block (Omeka S 4.2 block templates): each card goes under the shortest column, so mixed portrait and landscape images and captions of different lengths leave no gaps. It works without JavaScript as CSS columns and re-packs when an image or player changes size. `docs/PAGE-BLOCKS.md` explains which page-block options to use.

### Fixed

- Block groups stack on screens narrower than 768px. On the About page a photograph beside text had shrunk to 70px with its caption clipped.

## [2.25.1] - 2026-10-21

### Fixed

- Two image values that wrap onto consecutive lines (an item set with two sources, on a phone) no longer touch: stacked logos are spaced by the text line's leading.

## [2.25.0] - 2026-10-19

### Added

- When IwacSearch's index covers an item set, the item-set page lists its items through IwacSearch (full-text search, facets, sort and paging over the whole set) instead of the ledger. Whenever the module should not stand in, the page shows the ledger as before.

### Changed

- The *Linked resources* block's title search, sort and pager now run over every linked item on the server instead of rearranging the 25 rows on screen. Both its search and the item set's ledger search are plain forms that work without JavaScript; with it, results update as you type without losing focus. The empty state is a line of muted text instead of a boxed panel.

## Earlier releases

Releases before 2.25.0 are described in their
[GitHub release notes](https://github.com/fmadore/IWAC-theme/releases) and the commit
history.

[Unreleased]: https://github.com/fmadore/IWAC-theme/compare/v2.36.0...HEAD
[2.36.0]: https://github.com/fmadore/IWAC-theme/compare/v2.35.0...v2.36.0
[2.35.0]: https://github.com/fmadore/IWAC-theme/compare/v2.34.2...v2.35.0
[2.34.2]: https://github.com/fmadore/IWAC-theme/compare/v2.34.1...v2.34.2
[2.34.1]: https://github.com/fmadore/IWAC-theme/compare/v2.34.0...v2.34.1
[2.34.0]: https://github.com/fmadore/IWAC-theme/compare/v2.33.1...v2.34.0
[2.33.1]: https://github.com/fmadore/IWAC-theme/compare/v2.33.0...v2.33.1
[2.33.0]: https://github.com/fmadore/IWAC-theme/compare/v2.32.1...v2.33.0
[2.32.1]: https://github.com/fmadore/IWAC-theme/compare/v2.32.0...v2.32.1
[2.32.0]: https://github.com/fmadore/IWAC-theme/compare/v2.31.2...v2.32.0
[2.31.2]: https://github.com/fmadore/IWAC-theme/compare/v2.31.1...v2.31.2
[2.31.1]: https://github.com/fmadore/IWAC-theme/compare/v2.31.0...v2.31.1
[2.31.0]: https://github.com/fmadore/IWAC-theme/compare/v2.30.1...v2.31.0
[2.30.1]: https://github.com/fmadore/IWAC-theme/compare/v2.30.0...v2.30.1
[2.30.0]: https://github.com/fmadore/IWAC-theme/compare/v2.29.0...v2.30.0
[2.29.0]: https://github.com/fmadore/IWAC-theme/compare/v2.28.0...v2.29.0
[2.28.0]: https://github.com/fmadore/IWAC-theme/compare/v2.27.1...v2.28.0
[2.27.1]: https://github.com/fmadore/IWAC-theme/compare/v2.27.0...v2.27.1
[2.27.0]: https://github.com/fmadore/IWAC-theme/compare/v2.26.0...v2.27.0
[2.26.0]: https://github.com/fmadore/IWAC-theme/compare/v2.25.1...v2.26.0
[2.25.1]: https://github.com/fmadore/IWAC-theme/compare/v2.25.0...v2.25.1
[2.25.0]: https://github.com/fmadore/IWAC-theme/compare/v2.24.2...v2.25.0
