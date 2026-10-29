# Changelog

All notable changes to the IWAC theme are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the theme uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Release workflow: add entries under **[Unreleased]** as you work. `npm run bump --
<major|minor|patch>` moves them into a dated section for the new version, and the
release workflow uses that section as the notes of any GitHub release it has to
create.

## [Unreleased]

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

[Unreleased]: https://github.com/fmadore/IWAC-theme/compare/v2.31.1...HEAD
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
