---
target: explore dashboard /s/westafrica/page/collection-overview (+ /page/benin, FR /vue-d-ensemble)
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 5
timestamp: 2026-08-24T11-27-46Z
slug: islam-zmo-de-s-westafrica-page-collection-overview
---
Method: three isolated agents (A: design review, mode **Operate** · B: detector/browser evidence · C: technical audit) against the live-proxy rig (theme 2.11.0 + IwacVisualizations 1.50.0, local = deployed), light + dark, 1440 + emulated 375, every chart scrolled into view and given time to paint before any claim. Audit score (C): **15.5/20**. One inter-agent conflict adjudicated (keyboard reach of the maps), one premise corrected by API evidence (`/page/benin` carries no dashboard anywhere on either site).

# Combined Critique — IWAC Explore Dashboard (`/s/westafrica/page/collection-overview`, Operate)

## Design Health Score — 20/40 (Fair)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Newspaper coverage shows 20 of 82 rows with no "20 of 82" anywhere — only a thin off-palette slider |
| 2 | Match System / Real World | 2 | Titles name variables, never findings; treemap prints French type labels on the EN site; the partial 2026 year drawn as a full column |
| 3 | User Control and Freedom | 3 | Rich and reversible — facets, tabs, legend toggle, zoom, treemap drill + breadcrumb |
| 4 | Consistency and Standards | 1 | Four mutually contradictory colour grammars for the same six countries in one scroll; H1 + twelve H4s |
| 5 | Error Prevention | 2 | The default Gantt view actively misleads; treemap group headers invisible in default light theme |
| 6 | Recognition Rather Than Recall | 2 | Dek names all twelve panels and links none; 9,589px with no in-page nav; the lone orange Gantt bar has no legend |
| 7 | Flexibility and Efficiency | 3 | Per-panel PNG export (composited title + date + attribution) and embed codes are genuinely strong |
| 8 | Aesthetic and Minimalist Design | 2 | Panel chrome quiet and on-register; the word cloud is a 12-hue random block; dataZoom is stock ECharts periwinkle |
| 9 | Error Recovery | 2 | Proper translated `role=status` error/no-data states — but zero retry anywhere on this page |
| 10 | Help and Documentation | 1 | One of twelve panels carries a description, though the module's own slot system has a `descKey` per panel |
| **Total** | | **20/40** | **Fair** |

## Audit Health Score — 15.5/20 (Good)

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2.5 | Excellent contrast/focus/reflow; ECharts `aria` genuinely on — but selected state, chart keyboard access and description quality all fail |
| 2 | Performance | 3 | Lazy-load holds for data; CLS 0.0044 — but ~1 MB of MapLibre is downloaded *and awaited* ahead of the whole ECharts chain |
| 3 | Responsive Design | 3.5 | Zero overflow at all widths; the guard genuinely fires here (unlike IwacSearch) — one real title/toolbar collision at 320 |
| 4 | Theming | 3 | `--iwac-vis-*` contract elegant and CSS-clean (0/1,951 fallback mismatches); 57 stale hex literals hide in JS where no guard looks |
| 5 | Implementation Integrity | 3.5 | One registry, non-overlapping resize wiring, uniform `?v=`, zero asset bleed; thin teardown, ~12.6 KB dead CSS |
| **Total** | | **15.5/20** | **Good** |

## Design Specificity Verdict

**Authored content, template chart-craft.** The *questions* are unmistakably IWAC's — a Gantt of 82 press runs from *Carrefour africain* (1961) to *LeFaso.net*; a country → type → newspaper treemap bottoming out at *Sidwaya* and *An-Nasr Vendredi*; a source map plotting the Wayback Machine beside the Bibliothèque d'État de Berlin — and the panel chrome speaks the register (Besley 600 titles, tracked facet labels, primary-border active states, a PNG export that composites title + ISO date + attribution into a citable image). Inside the plot frame it is stock ECharts: no chart sets a title, labels run at the library's 12px default, the dataZoom is factory periwinkle, ten of twelve categorical colours are unpublished literals in `iwac-theme.js:78-83` — outside `tokens.json`, outside the `--iwac-vis-*` contract, outside every guard. **The broadsheet stops at the panel border.**

**Deterministic scan (B):** 47 files (10 `.phtml`, 34 `.js`, 3 `.css`) — one hit, a false positive (PHP comment scanned as markup, `layout.phtml:58`). Zero console errors, zero failed requests across five passes. But the clean sheet has a hole: **IwacVisualizations ships no `DESIGN.md`/`.impeccable/design.json`, so the detector's four design-system rules were inert on 37 of 47 files** — a probe sandbox against the theme's design system surfaced 5 real hits the commissioned scan structurally could not see (three `clamp()` font sizes that also dodge the project's own `ABS_FONT_SIZE` guard regex, an untokenised scrim, an off-ramp shadow).

## Adjudications

1. **"Eager echarts is a lazy-load regression" — REFUTED; the real defect is what loads in front of it.** The on-view loader fires at DOMContentLoaded because the block genuinely sits inside the observer's 400px rootMargin on a short page — legitimate. But the loader `await`s the MapLibre ES-module import (~1.0 MB decoded) before starting the classic-script chain, so every ECharts byte queues behind a map library needed by two panels ~4,500px down whose *data* is correctly deferred to 12.9s. The library is eager while its data is lazy. (B + C converged independently.)
2. **C's "maps are keyboard-unreachable" — REFUTED on the evidence.** C measured the `.iwac-vis-map` *wrapper* (`tabindex:-1`); B's 70-stop walk found the `.maplibregl-canvas` itself at `tabindex=0` with `role="region"`/`aria-label="Map"` — MapLibre's built-in keyboard handler (arrow pan/zoom) is active, and the globe/fullscreen/attribution controls are in the tab order. What stands is smaller: no NavigationControl zoom buttons, an unlabelled globe control, and MapLibre's default blue focus ring on one control (P3s).
3. **The item-round detector rule is amended.** Explicitly-passed `.phtml` files DO scan — only the directory walker's extension filter skips them; and mirroring templates into a scratch dir is *worse* than passing them directly, because files outside the repo root load no design system and the four `design-system-*` rules silently switch off. New rule: pass templates as explicit file arguments; never mirror out of the repo.
4. **The A/C treemap findings are one defect**: `chart-options-special.js:251/255/270/278` hardcode `upperLabel.color:'#fff'` while the tile takes `tokens.surface` — crisp in dark, near-invisible in light (C's opaque-pixel readback: 8/15 label pairs under 4.5:1, worst 2.33:1).
5. **`/page/benin` premise corrected by API evidence**: no country page on either site carries any IwacVisualizations block — all six are IwacSearch pages (verified via `/api/site_pages` on both sites). The absence of any country-scoped dashboard, when the module ships `ItemSetDashboard` ready-made and the overview proves per-country data exists, is an **admin-config** finding, not a bug.

## Overall Impression

This is a dashboard that *has* the findings and refuses to *state* them: twelve panels, 9,589px, and the only interpretive sentence on the page is "Period covered: 1961 – 2026". Colour has been allowed to mean four different things for the same six countries within one scroll — a reader who learns a legend is punished for it three times. And the whole instrument is mouse-and-sight-only: no ECharts panel is focusable, selected states live in CSS classes, and the text alternative a screen reader gets is a 2,500-character auto-recitation containing `NaN` — in English, on the French site. Underneath, the engineering is genuinely strong: all twelve panels paint, live theme-toggling re-themes every chart *and* swaps both basemaps without a remount, resize re-lays every canvas, CLS is 0.0044, overflow is zero at every width, and the FR visible UI is fully translated with correct French number formatting.

## What's Working (verified)

1. **The Newspaper coverage Gantt is a real scholarly instrument** — 82 press runs on a shared time axis is the view a press historian actually wants; its defects are all recoverable.
2. **The treemap earns its complexity** — country → type → newspaper drill with a live breadcrumb answers follow-up questions in place.
3. **Live theme toggling is done properly** — `setTheme` + render-callback re-run; verified by option colours, pixel histograms, and the `positron`→`dark-matter` basemap swap on the network. Dark load is dark-aware end to end, basemap included.
4. **Per-panel PNG export is a research affordance** — title, description, 2× raster, ISO date, attribution composited into one citable image.
5. **The engineering floor**: CLS 0.0044 via layered reserved heights; zero overflow at all widths with charts mounted; resize re-layout confirmed; one echarts instance; uniform two-axis cache-busting (`?v=` + data sync stamp); zero asset bleed between blocks (`/page/benin` pulls 0 KB of module assets); the hero's `collection-overview.json` contract intact 6/6 keys; the media-query guard *fires* in this repo (0 violations across 53 queries — the IwacSearch defect does not replicate).
6. **FR visible UI is fully localised** — titles, legends, axis categories, controls, table headers, "13 août 2026", French group separators.

## Priority Issues

- **[P1] The Newspaper coverage chart silently shows 20 of 82 newspapers, half of them unlabelled, colour-grouped with no legend.** `dataZoom.end=24.39%` → exactly 20 rows; `axisLabel.interval:'auto'` drops every other name; the default window is 19 Burkinabè papers + one Béninois. An honest reading of the default state is "IWAC holds ~12 newspapers, all Burkinabè but one." *Route:* IwacVisualizations · `/impeccable clarify`.
- **[P1] Four contradictory colour grammars for the same six countries in one scroll — and the palette lives outside every contract.** Panel 1 colours by country; panel 2 lets the same six colours fall through onto *content types*; panel 5 paints all countries uniform `--primary`; panel 8 uses a fourth assignment. Panel 2 also ignores the theme's published `--type-*` map that this module honours for badge dots. Root: 10 of 12 categorical colours are literals in `iwac-theme.js:78-83` — unpublished, unguarded. *Fix:* one country map + one type map, published as tokens, applied everywhere. *Route:* IwacVisualizations + **cross-repo contract** · `/impeccable colorize`.
- **[P1] Treemap group labels are hardcoded `#fff` — invisible in the default light theme.** 8/15 label pairs fail AA in light (worst 2.33:1); dark passes 12/12. `chart-options-special.js:251,255,270,278`. *Route:* IwacVisualizations · `/impeccable harden`.
- **[P1] The charts are mouse-and-sight-only.** No ECharts host is focusable (legend toggles, dataZoom, treemap drill, and the one click-to-navigate handler all pointer-only); 13 facet/tab controls expose no selected state (`--active` class only); both country `<select>`s have **no accessible name**; the auto-generated `aria` descriptions run to 2,506 chars, are truncated to "the first 10 items", announce literal **`NaN`** on two panels — and are **English on the French site**, where they are the only text alternative. 7 of 9 chart panels have no table or summary; the one well-formed `<figure>` fallback is destroyed on hydration. *Route:* IwacVisualizations · `/impeccable harden`.
- **[P1] ~1.0 MB of MapLibre is downloaded and awaited ahead of the entire ECharts chain** (Adjudication 1): `maplibre-gl.mjs` resolves at ~735ms, the 30-script chain starts at 790ms, for two panels whose data is correctly deferred to 6.8–12.9s. *Fix:* split the queue — start the classic chain immediately, import MapLibre when a map block approaches. *Route:* IwacVisualizations (`view/common/iwac-assets.phtml`) · `/impeccable optimize`.

### P2

- Titles name variables and eleven of twelve panels have no description — while the module's own `DL.registerMetadata` slot system (`descKey`) sits unused by this page's imperative orchestrator. IwacVisualizations · clarify.
- The EN site prints French type labels in the treemap and its breadcrumb ("Article de presse") while panel 2 translates the same values correctly; FR is unaffected. IwacVisualizations · typeset.
- Temporal honesty: the partial 2026 year drawn full-height with no marker; panel 2's category axis omits empty years so 59 sparse early years occupy a third of the width at equal spacing — on a chart titled "over time", for historians. IwacVisualizations · clarify.
- The dataZoom is stock ECharts periwinkle/salmon (the one factory chrome on the page; brightest element in dark); on mobile the vertical slider renders *inside* the grid over the bars. IwacVisualizations · colorize/adapt.
- The word cloud: 12 random hues encoding nothing (the register's explicit prohibition), `fontFamily:'sans-serif'` breaking the three-font system on the page's largest type specimen, layout re-randomising on every theme toggle (bad for a panel with a download button), stoplist leaking `aujourd`/`jusqu` fragments. IwacVisualizations · colorize.
- Exactly one of nine charts navigates on click (Most-cited entities → item), advertised only by `cursor:pointer`; every other mark is a dead end at the moment of discovery. IwacVisualizations · clarify.
- Stacked-bar tooltips list zero-value series and omit the total. IwacVisualizations · clarify.
- Panel titles occluded by the toolbar at 320px — 12/12 panels, overlap up to 72×21px; the `--iwac-vis-panel-toolbar-reserve` exists but is not in force there. IwacVisualizations · adapt.
- At 375px, *Source locations* is **7,493px tall — 48% of a 15,721px page** (13 table rows × ~517px each; 5.8× its desktop height). IwacVisualizations · adapt.
- Heading outline: H1 → twelve flat H4s, no H2/H3, EN and FR alike (the theme already styles `.iwac-vis-panel > h2`, so the level is the module's choice). IwacVisualizations · harden.
- Both data tables lack `<caption>` and `th[scope]`; *Recent additions* has an empty first `<th>`. IwacVisualizations · harden.
- 57 stale colour literals in module JS, structurally invisible to the guard (`hexCheck:false` for JS): 46 latent `tokens.x || '#hex'` defaults, 11 that genuinely paint on token-less routes — four on this page using the **seed** `#e64a19` where the resolved `--primary` is `#ce4115`. IwacVisualizations · harden.
- **IwacVisualizations has no `DESIGN.md`/`.impeccable/design.json`** — the detector's design-system rules are inert across its codebase; a sandbox probe found 3 live `clamp()` font sizes that also dodge the project's `ABS_FONT_SIZE` guard (regex requires the literal right after the colon). IwacVisualizations + cross-repo guard · harden (Phase-4 tie-in).

### Notable P3 backlog

Toolbar glyphs are literal text characters (`⭳`, `</>`) ×24 rather than the icon-mask pattern, at 36×36 vs the stated 44px icon floor; no retry on any failure state on this page (only On This Day has one) and the block passes no `noscript` key; the theme's back-to-top FAB shares the bottom-right corner with every panel toolbar (theme-routed); MapLibre UI strings untranslated on FR ("Zoom in", "Enter fullscreen" — the module can pass `locale`); `.maplibregl-ctrl-globe` unlabelled + default blue focus ring on the attribution summary (third-party, normalizable); ~12.6 KB (42%) of `iwac-core.min.css` is components this page never references; teardown thin (one real `dispose()` tree-wide; page-lifetime listeners never removed — fine until blocks mount dynamically); `--iwac-vis-model-1..4` frozen vendor hex with no dark variant — defensible, deserves an explicit ruling in DESIGN-SYSTEM.md; ECharts tooltips not dismissible/hoverable (§1.4.13 — third-party, wontfix-by-register candidate); an untokenised scrim `rgba(0,0,0,0.78)` and one off-ramp shadow (partly a token-vocabulary gap — no scrim token exists).

## Deferred-decision manifestations

- **Boxed-body-vs-broadsheet at its most acute**: thirteen rounded bordered cards on a gray field, 9,589px with not one 2px ink rule between them.
- **`--primary`-on-`--background`**: two full-width solid-primary charts plus the word cloud make three large colour statements on a page whose register grants the accent to the hero plate.

## Data/config conditions

- No country page on either site carries a dashboard block — `ItemSetDashboard` exists and is unused. **Admin-config**: compose it onto the six country pages; also consider linking the dek's twelve panel names as anchors.
- FR `vue-d-ensemble` is not in the FR top-level nav (found only via API) — worth an admin look.

## Tooling artifacts recorded this round

1. **Detector rules amended**: explicitly-passed `.phtml` files scan fine (only the directory walker skips them); mirroring templates outside the repo root silently disables the design-system rules — pass explicit paths, never mirror. PHP `//` comments are scanned as markup in `.phtml` (phantom hits). Page-level analyzers never run on `.phtml` regardless.
2. WebGL canvases have no `getImageData` readback — "pixels identical" on a map proves nothing; use network evidence (basemap style swaps) instead.
3. ECharts tooltips render into `<body>`, not the panel — probe the right container.
4. Canvas corner-sampling misreads charts with empty corners as unpainted; histogram opaque pixels across the full canvas.
5. `page.accessibility` is gone from current Playwright — take the AX tree via CDP.
6. A first-recon `MutationObserver` pageerror and all `GPU stall due to ReadPixels` warnings were probe-inflicted, not page code.

## Triage summary

| Route | Findings |
|---|---|
| **IwacVisualizations** | All five P1s; ~13 P2s; most P3s |
| **Theme** | P3 back-to-top FAB collision; scrim/shadow token-vocabulary gap (shared with module) |
| **IwacSearch** | none this surface |
| **Admin-config-only** | country pages carry no dashboard block (`ItemSetDashboard` ready); dek anchors; FR overview absent from nav |
| **Cross-repo** | the 12-slot categorical palette must enter the token contract; `clamp()` blind spot in the font-size guards; IwacVisualizations needs its own Impeccable artifact layer (or detector pointed at the theme's) |
| **Third-party** | MapLibre control labels/sizing; ECharts tooltip dismissibility (wontfix-by-register candidate) |
