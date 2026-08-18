# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Historians, political scientists, and Islamic-studies scholars doing comparative research
across francophone West African press archives. They arrive with specific questions
(a person, a newspaper, a period, a theme) and value **precision and density** — more
items per screen, exact metadata, fast filtering — over browsing comfort. Secondary
audiences: students, journalists, and the interested public in West Africa and Europe.
The audience is bilingual (French-first sources, English and French site interfaces);
scholarly users routinely read Arabic-transliteration diacritics (`ḥ ṣ ḍ ṭ ẓ ʿ ā ī ū`).

## Product Purpose

IWAC-theme is the public face of the **Islam West Africa Collection** (ZMO Berlin), an
open-access digital collection of newspaper articles, Islamic publications, archival
documents, audiovisual records, photographs, and academic references on Islam and Muslim
societies in Benin, Burkina Faso, Côte d'Ivoire, Niger, Nigeria, and Togo. The theme is
an Omeka S 4.2+ theme (a substantially diverged fork of Freedom) serving two live sites:
[EN](https://islam.zmo.de/s/westafrica/) and [FR](https://islam.zmo.de/s/afrique_ouest/).
Success means researchers can locate, read, cite, and contextualize sources quickly, and
trust what they see — including knowing which metadata is AI-generated.

## Positioning

A **research instrument with a press-archive face**: the computational pipeline of a
modern corpus platform (LLM sentiment annotation, LDA topics, embeddings, IIIF,
geocoding) wearing the visual language of the 20th-century newspaper it preserves.
Neither a museum website, nor a warm editorial magazine, nor a generic dashboard — a
neighboring Omeka site could not truthfully copy the pairing of scholarly density with
the press register grounded in the collection's own material.

## Operating Context

- **Runtime:** Omeka S 4.2+, PHP templates (`view/`), Sass on the modern module system
  (`asset/sass/`), Gulp build, vanilla JS. `asset/css/` is generated.
- **Deployment:** theme changes reach the live server **only via a GitHub release** —
  the live Omeka installs the release ZIP. Pushing to `master` deploys nothing.
- **No local Omeka instance.** Visual verification runs through the machine-local
  live-preview rig in `.claude/` (gitignored): a reverse proxy of `islam.zmo.de` that
  swaps the deployed theme CSS and both modules' built assets for local builds, plus a
  headless-Chrome screenshot script (light/dark, scroll, focus states).
- **Cross-repo contract:** the theme is the single source of truth for design tokens.
  `scripts/build-tokens.js` generates `tokens.json` and syncs it into
  [IwacSearch](https://github.com/fmadore/IwacSearch) (Svelte 5 search client) and
  [IwacVisualizations](https://github.com/fmadore/IwacVisualizations) (ECharts/MapLibre
  dashboards), whose `check-theme-tokens` guards fail their builds on drift.
- **Mirador exception:** the IIIF viewer is React/MUI and cannot read CSS custom
  properties; its palette is concrete hex in module config (`docs/MIRADOR.md`).
- **Admin-configured surfaces:** resource-page block stacks, navigation, and page
  content are configured in the Omeka admin, not in code; a customised site does not
  pick up new theme defaults automatically.

## Capabilities and Constraints

- Light/dark theming (user toggle + system preference), language switcher (EN/FR),
  installable PWA, IIIF viewing (Mirador), video embeds for fileless media, web-archive
  replay, AI-provenance labelling, structured AI table-of-contents, citation panel
  (UI here, formatters in the IWAC-SEO module).
- Design decisions are **machine-checked, never hand-maintained**: `npm run
  check:tokens` fails on unresolvable `var(--…)`, absolute `font-size` literals
  (`--text-2xs` = 11px is the floor; deliberately no 14px step), and both modules
  assert fallback values and the breakpoint contract (`min-width` on a published
  breakpoint, `max-width` at breakpoint − 1).
- A bare `<button>` is quiet (outlined, flat); the filled-primary treatment opts in via
  `.btn--primary` or a submit control.
- Theme view-helper names are case-sensitive in `theme.ini`, filename, and call sites.
- AI-sentiment properties are hidden by IwacVisualizations, not the theme.
- `color-mix` is always `in oklab`; the palette is OKLCH throughout.

## Brand Commitments

- **Seed colors (admin-overridable):** primary `#E64A19` "IWAC Burnt Orange"
  (resolved light `--primary` = `#ce4115`); secondary `#394f68` slate — **data-only**,
  never UI chrome.
- **Three-font system:** Besley (Clarendon display), Source Serif 4 (long-form text),
  Public Sans (UI) — all verified for Arabic-transliteration diacritics.
- **Icons:** Bootstrap Icons (SVG via the theme's icon-mask pattern) only; FontAwesome,
  flag-icon, and Lucide are intentionally absent.
- **AI provenance:** AI-generated fields carry the official EU "AI GENERATED" mark.
- **Register:** the press-archive stance in `docs/DESIGN-PHILOSOPHY.md` is binding,
  including its anti-cliché guardrail (no warm pastiche, no cream/parchment).

## Evidence on Hand

- Two live sites (EN/FR) with the full production corpus.
- `tokens.json` (generated), `docs/DESIGN-SYSTEM.md` (token contract, generated
  tables), `docs/DESIGN-PHILOSOPHY.md` (register), `docs/MIRADOR.md`, `docs/PWA.md`.
- `.claude/` preview rig with an archive of ~200 reference screenshots.
- Playwright e2e suite (`npm run test`) locating elements by accessible name.
- No testimonials, benchmarks, or usage statistics on hand — do not fabricate any.

## Product Principles

1. **Density over comfort.** Researchers want more items per screen, not fewer.
2. **Computational honesty.** AI-generated metadata is visibly marked as such, never
   cosmetically blended into human-authored fields.
3. **Multilingual rigor.** FR / EN / Arabic transliteration get equivalent typographic
   treatment; test the diacritics string before adopting any font.
4. **Publish and assert.** Every design decision lives in a generated, guard-checked
   artifact; drift is a coverage problem, not a discipline problem.
5. **Restraint is the default.** The quiet treatment is normal; loudness opts in.

## Accessibility & Inclusion

Target: **WCAG 2.2 AA** (confirmed 2026-08-18; supersedes the README's 2.1 AA claim and
covers the German public-sector floor BITV 2.0 / EN 301 549). Standing practices:
visible focus states on every interactive element, `prefers-reduced-motion` respected
everywhere, logical properties for RTL readiness, 44px minimum hit targets on icon
controls, accessible names preserved when visual labels abbreviate (e.g. the masthead
acronym swap).
