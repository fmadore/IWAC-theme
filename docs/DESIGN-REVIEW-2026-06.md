# IWAC Visual Design Review & Redesign — June 2026

A full design examination of the IWAC theme + IwacSearch + IwacVisualizations
(live site, light and dark, desktop), followed by the redesign it motivated:
**"Press Archive"** — the typographic language of the 20th-century West African
newspaper, executed with contemporary product polish.

---

## 1. Examination findings (pre-redesign)

### What was already excellent
- **Token architecture**: OKLCH palette derived from two admin-overridable
  seeds via `color-mix(in oklab)`; both modules consume theme tokens at
  runtime (ECharts re-theme on toggle; Svelte components fully token-driven).
  Best-in-class for an Omeka stack — kept untouched as the foundation.
- **Editorial instincts on item pages**: flat metadata rows, uppercase labels,
  the AI-provenance lede treatment.
- Typesense speed surfaced in the UI ("12 312 results · 38 ms") — honest
  research-instrument material.
- Focus states, reduced-motion gating, three-way theme switching.

### What was holding the design back
1. **No identity.** Header was a bare site title; the only brand carrier was a
   full-saturation collage banner repeated as a 120–170px decorative strip on
   *every* page, fighting the restrained register it sat in.
2. **Redundant heading stack.** Homepage showed the site title twice (header +
   banner overlay) plus an `h1` reading "Home"; Browse/Index/References burned
   ~300px of premium viewport on a mega-`h1` repeating the nav label.
3. **Navigation hidden on desktop.** Full nav only appeared ≥1460px — nearly
   every laptop got a hamburger; the research IA (Browse, Index, References,
   Visualisations) was invisible until clicked.
4. **Box grammar.** Prose in cards, results in cards, breadcrumbs in a chip
   box, panels in cards inside block cards — the rounded-rectangle stack that
   reads as template/AI output.
5. **Density too low for researchers.** ~3 results per screen; subjects
   stacked one-per-line in metadata; oversized h1 margins.
6. **Orange misdeployed.** Loud where it was noise (filled type badge on every
   result card, fat orange hamburger, orange-washed active-filter block) and
   absent where identity lives (header, structure).
7. **Dark mode was generic.** Blue-cool near-black dashboard surfaces — no
   relationship to the archive or the brand.
8. **Off-system color.** `ResourceTags` generated pill colors by `crc32(class
   id) → hsl(n, 100%, 87.5%)` (the khaki "ARTICLE" pill); IwacVisualizations
   badges hardcoded Tailwind pastel pairs; IwacSearch badges tinted from
   status tokens — three competing badge systems.
9. **Banned patterns.** Colored `border-left` stripes on AI-model cards and
   compare-corpus figures; an accent rail on the sentiment facet group; a
   gradient wash on the "featured" KPI card.

## 2. The direction

**Press Archive.** The collection *is* newspapers; the design now borrows the
press's own conventions, executed quietly:

| Device | Where |
|--------|-------|
| Masthead wordmark (Besley 800) + uppercase section strip + 2px ink closing rule | Header, all pages |
| Datelines — `ARTICLE · FRATERNITÉ MATIN · 20 DÉCEMBRE 2017`, primary interpuncts | Item pages, result rows, hero eyebrow |
| Duotone plate — grayscale collage × primary ground | Homepage hero only (banner gone from inner pages) |
| Rules, not boxes — 2px ink rules open sections; hairlines divide ledger rows | Page titles, KPI figures, footer, result lists, metadata |
| Ledger density — flat rows, inline multi-values with interpuncts, tabular counts | Results, metadata, facets |
| Categorical dots on outlined chips (one shared map: article=primary, publication=secondary, audiovisual=info, document=warning, reference=muted) | Search badges + viz badges |

**Type system** (all verified against `ḥ ṣ ḍ ṭ ẓ ʿ ā ī ū`):
- **Besley** (Clarendon — the newspaper display letter): masthead, headlines,
  section heads, display numerals. Track display sizes at `-0.01em`.
- **Source Serif 4** (`--font-serif-text`): article full text, ledes.
- **Public Sans**: UI, labels, datelines.

**Color**: light mode kept (near-white, cool inks) with orange redeployed to
structure and state; **dark mode rebuilt warm** — "lamplit reading room"
(hue ~70–80, chroma ~0.012) — see the fallback table in
[DESIGN-SYSTEM.md](DESIGN-SYSTEM.md).

## 3. What changed (by repo)

### IWAC-theme
- `_typography.scss` — Besley stack on `--font-headings`; new
  `--font-serif-text`, `--text-5xl`; Bunny request extended in `layout.phtml`.
- `_colors.scss` — warm dark palette (surfaces/inks/borders), warm footer band.
- `header.phtml` + `_header.scss` + `_navigation.scss` — masthead +
  section strip (full nav from 1024px), slim ink hamburger below, dropdown
  panels instead of 100vw glass mega-menu, 2px ink closing rule.
- `layout.phtml` — banner (and its LCP preload) render on the homepage only.
- `banner.phtml` + `_banner.scss` — duotone hero, full-bleed, taller default,
  banked-down dark variant.
- `_titles.scss` + `_headings.scss` — compact `h1.title` section heads with
  rule-above; item headlines keep display scale; tightened margins.
- `item/show.phtml` — dateline assembled from class/publisher/date;
  `ResourceTags` pills removed there.
- `helper/ResourceTags.php` — crc32 pastel generator deleted; neutral outlined
  pills (`_resource-tag.scss`).
- `_resource-show.scss` — 168px label column, inline multi-value flow with
  primary interpuncts, reading-serif article body and lede, thumbnails hidden
  in value rows, AI-lede specificity fix.
- `_breadcrumbs.scss` — chip box removed. `_footer.scss` — 2px ink rule,
  grayscale-until-hover partner logos.

### IwacSearch (`src/svelte/**`, rebuilt `asset/dist/*`)
- `ResultItem.svelte` — card → ledger row (hover wash, newsprint thumbnails,
  dot-chip type badge, interpunct source line, Besley-friendly tracking).
- `ResultsList.svelte` — hairline-ruled list. `App.svelte` — serif ledger
  count, quiet empty state. `FacetPanel/FacetGroup` — orange wash and filled
  count pills removed, accent rail removed. `DateRangeSlider` — token shadows.

### IwacVisualizations (`asset/css/**`, `asset/js/**`, rebuilt `*.min.*`)
- KPI cards → "almanac figures" (rule-above, Besley numeral; featured rule in
  primary; gradient removed).
- Badges → shared dot-chip system; hardcoded Tailwind pastel pairs deleted.
- AI-model cards → header dot replaces `border-left` stripe; compare-corpus
  figures → swatch dots. Section headings → rule-above grammar.
- `iwac-theme.js` `FALLBACK_DARK` + radar/treemap ink fallbacks → warm set;
  "Noto Serif" fallbacks → Besley.

## 4. Verification
- `npm run build` green in all three repos; `svelte-check` 0 errors; eslint +
  prettier clean on all files touched (4 pre-existing prettier warnings at
  IwacSearch HEAD on root docs, untouched).
- Visual verification ran against the **live site** through a local reverse
  proxy serving the locally-built theme CSS + module bundles with a DOM-morph
  approximating the new templates; headless-Chrome screenshots of home / item
  / browse in both themes at 1440px (see `.claude/shots/`, git-ignored).

## 5. Deploy notes & follow-ups
- Deploy all three repos together (badge/type grammar is shared). Bump
  IwacVisualizations `module.ini` version to bust asset caches.
- Templates changed (`header`, `layout`, `banner`, `item/show`) — verify the
  menu drawer and IwacSearch header typeahead on staging after deploy.
- Charts could not render under headless virtual time; ECharts/MapLibre blocks
  re-theme from tokens automatically, but eyeball one dashboard after deploy.
- Candidates for a later pass: hero search field on the homepage, slim-on-
  scroll masthead, the Visualisations landing page content (it is page
  content, not theme), FacetedBrowse template skin to the ledger grammar.
