---
target: browse/search /s/westafrica/page/browse (+ /references, /index, FR /parcourir)
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 9
timestamp: 2026-08-24T08-51-24Z
slug: islam-zmo-de-s-westafrica-page-browse
---
Method: three isolated agents (A: design review, mode **Operate** · B: detector/browser evidence · C: technical audit) against the live-proxy rig (theme 2.11.0 + IwacSearch 3.13.1, local = deployed), light + dark, 1440 + emulated 375, with real interaction flows (query, facets, view toggle, pagination, empty states, keyboard-only passes). Both P0s were independently reproduced by two agents and/or **confirmed by an orchestrator probe against the un-proxied live site**. Audit score (C): **11.5/20** — the weakest dimension score of Phase 1 so far.

# Combined Critique — IWAC Browse/Search (`/s/westafrica/page/browse`, Operate)

## Design Health Score — 22/40 (Fair)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Status is *wrong* twice: "sorted by Relevance" over date-sorted results; 100 vector-only hits shown as ordinary results |
| 2 | Match System / Real World | 3 | Locale-honest dates and vocabulary; but "Relevance" names a sort that isn't, and `b1306.q=` leaks a DB block id into citable URLs |
| 3 | User Control and Freedom | 3 | Deep URL state, chips, Clear all — but a heuristic silently overrides the view mode and the override never reaches the shared link |
| 4 | Consistency and Standards | 2 | Two focus vocabularies in one module; centred gallery metadata under left-aligned datelines; EN defaults "Newest first", FR "Pertinence" |
| 5 | Error Prevention | 1 | A no-match query manufactures 100 plausible results; facet counts under-promise what they deliver |
| 6 | Recognition Rather Than Recall | 3 | Recent searches, counts, "matched in" strong; year facet renders 0 histogram bars at landing; quote/`-` syntax taught nowhere |
| 7 | Flexibility and Efficiency | 2 | ~100–150 Tab stops to the first result; 10 per page across 302 pages, no page-size, no jump |
| 8 | Aesthetic and Minimalist Design | 2 | The ledger row is superb — and absent from the default landing, whose first viewport holds zero results on desktop *and* phone |
| 9 | Error Recovery | 2 | A well-built scope-aware empty state that the hybrid fallback routes around; no reset affordance when only the query constrains |
| 10 | Help and Documentation | 2 | The only help is a generic box that costs the whole opening viewport and teaches nothing operable |
| **Total** | | **22/40** | **Fair** |

## Audit Health Score — 11.5/20 (Fair)

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 1.5 | Focus halo 1.54:1 light / 1.32:1 dark on ~18 of 19 control types; current pager page has **no** indicator; 98–153 Tabs to reach controls |
| 2 | Performance | 2.5 | CLS 0.002 and a correct debounce (4 keystrokes → 2 requests) — but Gallery pulls 320–404 KB `large` derivatives into 190px tiles |
| 3 | Responsive Design | 3.0 | Zero overflow at all 8 widths in both modes — but 11/11 width media queries violate the breakpoint contract and the guard can't see them |
| 4 | Theming | 2.5 | No unsanctioned hex; 273 fallbacks all match `tokens.light` — but `--type-*` has no dark override at all (publication dot 2.41:1) |
| 5 | Implementation Integrity | 2.0 | Helper casing clean 5/5; URL-state hardening genuinely good — but EN links to the FR site and the token guard has structural blind spots |
| **Total** | | **11.5/20** | **Fair** |

## Design Specificity Verdict

**Authored — and in the result unit itself, exceptionally so.** The ledger row is a faithful build of DESIGN.md §Ledger Row (hairline-ruled `<li>`, categorical dot on an outlined type chip, interpunct dateline eyebrow, Besley title, term-highlighted snippet, every metadata value a live facet toggle). The Index rows — Besley mention numeral + inline sparkline + year-range dateline — are stronger still, and **sparklines render** (the `mentions_by_year_s` reindex caveat no longer applies). `16,544 results · 16 ms` states its own latency. The caveat: **the frame is the least authored layer and it is what a scholar meets first** — a rounded instruction box on a grey field, above a default landing that renders as a four-column video-still grid, which is precisely what a stock search template looks like. The identity is inside the component; the page grammar around it is generic.

**Deterministic scan (B):** zero true detector findings across 43 mirrored theme `.phtml`, 6 module `.phtml`, 21 `.svelte` + TS + CSS (canary-verified on both formats; one FP: `broken-image` on a PHP srcset string at `layout.phtml:58`). Zero console errors/warnings/failed requests across ~20 loads and every interaction. **Token contract fully honoured**: the module owns no colour on this surface — `--iwac-type-dot` is a local alias resolving to the theme's nine published `--type-*` hues; all 273 `var()` fallbacks match `tokens.light` exactly.

## Adjudications

1. **P0 "EN site links every result to the FR site" — CONFIRMED on the un-proxied live site** by an orchestrator probe: all title/thumbnail links on `https://islam.zmo.de/s/westafrica/page/browse` point at `https://islam.zmo.de/s/afrique_ouest/item/…`. Cause chain (C): the indexer writes the FR slug into `omeka_url` (`SiteUrls.php:22`), whose docblock promises "the English UI swaps afrique_ouest → westafrica in the theme" — **a mechanism that does not exist in either repo**; the client uses the value verbatim and its own fallback is also FR (`resultCard.svelte.ts:138`).
2. **P0 "fabricated results" — independently reproduced by A and B**: two different nonsense strings each return exactly 100 results with the identical first hit, in EN and FR; `query_by` always includes `embedding` (`queryBuilders.ts:16`), so the vector leg's fixed top-k floor fills the list when the keyword leg finds zero. The `role=status` empty state and the `did_you_mean` spell-correction chips are dead code on the free-text path (reachable only via quote/`-` syntax advertised nowhere); the declared-but-unused `text_match` field is the detection signal.
3. **C's P0 rating of the focus-indicator failure — adjudicated P1.** Real and systemic (~20 `outline: none` + `--ring-focus` halo rules; 1.54:1 light / 1.32:1 dark / 1.01:1 on the dark slider thumb; the current pager page has **no indicator at all** — the one outright 2.4.7 failure), and it contradicts DESIGN.md's own "Focus (all): 2px primary outline". Ranked below the two trust/function P0s. Note the theme publishes both `--focus-outline` (strong) and `--ring-focus` (weak) — the module consistently chose the weak one; a token-level decision is part of the fix.
4. **Tooling artifacts the agents caught in their own work, recorded as method rules**: naive parsing of Chrome's `oklch()`/`oklab()` computed colours produced garbage ratios twice (canvas-readback is mandatory — rule reaffirmed); the rig's `__focus` marker uses programmatic `.focus()` which does **not** trigger `:focus-visible` — focus-ring evidence must come from real Tab keypresses; Chromium resumes sequential focus traversal after `blur()` (invalidates naive tab counts); overwriting `className` strips Svelte's scope hash and kills scoped rules.

## Overall Impression

A fast, deeply stateful, genuinely well-engineered search client wearing an outstanding result unit — undermined by two honesty failures at the exact point of trust. A researcher who mistypes a name is told "100 results" with confident facet counts and no signal that nothing matched; and having clicked any result on the English site, they are handed to the French edition. Between those and the frame problems (an opening viewport with zero results; a video-still grid hiding the signature ledger; a keyboard gauntlet ~100 stops deep; a focus ring that fades to 1.3:1 in dark mode), the floor engineering is excellent: URL state that survives reloads and validates hostile input with a real prototype-pollution defence, a correct debounce with cancellation, CLS of 0.002, zero overflow anywhere, complete FR localisation, and perfect token-contract compliance.

## What's Working (verified)

1. **The ResultSummary strip** — count, latency, scope chips with per-chip removal, clear-all and sort readout in one hairline-ruled line.
2. **State completeness**: query/facets/sort/page in the URL; reload restores exactly; `pushState` vs `replaceState` used correctly; hostile input clamped by allowlists (`?view=banana`→list, `?page=1e9`→10000, `Object.hasOwn` against prototype pollution).
3. **One ledger grammar serves three scopes** (content, bibliographic, entity rows) without strain; entity rows pair mention numerals with live sparklines.
4. **Engineering floor**: CLS 0.002 via a server-rendered fixed-height skeleton; 4 keystrokes → 2 requests with `AbortController` on all three main channels; no FOUC; zero horizontal overflow at 320–1460 in both view modes with the drawer open; facet checkboxes are real inputs with labels concatenating value + count.
5. **FR localisation is complete** across every reachable string, and dates are locale-honest (`14 AOÛT 2026`).
6. **Contract compliance**: no module-owned colour, all fallbacks match `tokens.light`, detector-clean, helper casing clean 5/5.

## Priority Issues

- **[P0] Every result link on the English site points at the French site.** Confirmed live (Adjudication 1). First click from the primary Operate surface abandons the user's chosen language; affects result titles, thumbnails, and typeahead suggestions. *Fix:* implement the promised slug swap (client-side site-context mapping, or index both URLs). *Route:* **IwacSearch** · `/impeccable harden`.
- **[P0] A query matching nothing returns 100 fabricated results, presented as findings** (Adjudication 2) — while the typeahead six pixels above says "No matches." *Fix:* when no hit carries a keyword match (`text_match` is already on the wire), route to the existing scope-aware `ResultsEmpty` and offer the semantic set behind an explicit "Show N semantically related items" opt-in. *Route:* **IwacSearch** · `/impeccable harden`.
- **[P1] The mobile Filters drawer is `aria-modal="true"` with no focus trap, no focus-in on open, no restore on close** — six of six Tab presses land in content that is visually behind the backdrop *and* hidden from AT; the drawer's 70 checkboxes are unreachable without first tabbing the whole results column. *Route:* IwacSearch (`svelte-shared/components/Drawer.svelte`) · `/impeccable harden`.
- **[P1] Module-wide focus indicator is the weak halo; the current pager page has none at all** (Adjudication 3). *Fix:* switch the ~20 rules to `--focus-outline` (or strengthen `--ring-focus` at the token level — theme decision); delete `Pagination.svelte:172-176`'s `box-shadow: none` override. *Route:* IwacSearch + theme (token) · `/impeccable harden`.
- **[P1] The opening viewport of the primary Operate surface contains no results — desktop and phone.** First result at y 691 of a 900px viewport; below the fold entirely at 375×812, where the ~289px instruction box eats 36% of the first screen. The FR site already ships **without** the box — the two live editions disagree, and FR proves the fix. *Route:* **admin-config** (drop/condense the EN block) + theme (consider suppressing `.banner--compact` on search pages) · `/impeccable distill`.
- **[P1] A heuristic replaces the signature ledger with a video-still grid on the default landing, and the override never reaches shared links.** `autoSuggest()` flips to gallery when >60% of the *current ten hits* are image-bearing — with `date:desc`, page 1 is always recent YouTube uploads, though the corpus is 75% news articles. Explicitly choosing List writes no `view=` param (`urlState.ts:206`), so a copied link re-trips the flip for the recipient. `/references` correctly stays List, confirming the mechanism. *Route:* IwacSearch · `/impeccable clarify`.
- **[P1] The nine `--type-*` categorical hues have no dark-mode definition** — `tokens.json` `dark` carries zero `--type-*` keys; `--type-publication` (#394f68) renders **2.41:1** on the dark ground, and `--type-document` passes light mode by 0.01. *Route:* **theme (tokens — cross-repo change: build → sync → both modules' guards)** · `/impeccable harden`.
- **[P1] Gallery requests the `large` derivative for 190×142 tiles** — 320–404 KB per photograph/document tile, ~1.48 MB for four visible; no `srcset`, no `width`/`height`, no `decoding`. `thumbnail.ts:12-13`'s "medium would upscale" rationale holds for 480×360 video stills, not 2000px scans. *Route:* IwacSearch · `/impeccable optimize`.
- **[P1] Result updates and page changes are never announced.** The polite region is torn down for the skeleton and re-mounted already-populated (never announced); no `aria-atomic`; pagination's only live text change is the millisecond figure; no visually-hidden utility class exists in the module to build a persistent region with. *Route:* IwacSearch · `/impeccable harden`.
- **[P1] The keyboard gauntlet: ~97 consecutive facet stops; first result at Tab 104–122; pagination at 153.** No skip-to-results affordance; the theme's skipnav lands *before* the facet column. Focus is additionally dropped to `<body>` on pagination. All three agents hit this independently. *Route:* IwacSearch · `/impeccable adapt`.
- **[P1] All 11 width media queries violate the breakpoint contract — and the guard is structurally blind to them.** Two sit exactly ON 768px (`max-width: 48rem`, observably taking the narrow branch at the 768 viewport); seven use a private 416/480/512 scale `tokens.json` has never heard of; the 768 boundary is also duplicated in TS (`filterDrawer.svelte.ts:38`) where no guard reaches. `check-theme-tokens.js:115`'s `MEDIA_WIDTH` regex requires literal `px`; every module query is `rem`/`em`, so the rule matches nothing and exits green. The `rem` choice may be deliberately right (user font-size respect) — this is a **contract decision** (teach the guard to convert, or publish rem breakpoints), not just a lint fix. *Route:* IwacSearch + cross-repo contract · `/impeccable harden`.

### P2

- "Sorted by Relevance" over date-sorted results — `resolveSortBy()` substitutes `date:desc` in browse mode but `ResultSummary` labels from the unresolved state; the resting state of `/references` and FR `/parcourir` (whose admin `default_sort` also diverges from EN: `_text_match:desc` vs `date:desc`). IwacSearch (label) + admin-config (divergence).
- The facet count you click is not the count you get: `Côte d'Ivoire 3,010` delivers `3,015 results`, deterministically, in the same authoritative lining figures as the exact count. IwacSearch.
- Pagination: 302 pages × 10, no page-size control, no jump-to-page. IwacSearch.
- The typeahead panel occludes the toolbar/summary/first result and doesn't self-dismiss after the debounced search commits (Escape works). IwacSearch.
- Target sizes: card facet-chips 20–21px tall at 375; facet group headings 261×20.8; date-slider thumbs 20×20 (`role=slider` — no 2.5.8 exception applies). IwacSearch.
- Focus dropped to `<body>` when a filter chip is removed. IwacSearch.
- Gallery (the browse default) renders a bare `<div>` of `<article>`s — no list semantics or count for AT; List is a correct `<ol>`. IwacSearch.
- `<html lang="en-US">` over overwhelmingly French result titles with no per-result `lang` — English-voice screen-reader pronunciation. IwacSearch (`ResultItem`).
- The results region has no heading: the page's only `h2` is "Filters", so every result `h3` nests under the filter sidebar (all four pages). IwacSearch.
- Dangling `aria-labelledby` (`iwac-search-block.phtml:21-29`): the referenced heading only renders when the optional block title is set — the search region has no accessible name on `/references` and `/index`. IwacSearch (one-liner).
- `sort` is the one URL param unvalidated on decode → any `?sort=junk` 422s into a full-surface error, while the valid option set is already in hand client-side. IwacSearch.
- The token guard cannot see `rgb()/rgba()/hsl()`: 8 raw neutral-black shadows/scrims pass silently, including one forked shadow copy-pasted in three files where the theme's warm `--shadow-md` exists. IwacSearch.
- Active-state text contrast fails one theme each: dark pager current page 3.23:1; light active view-toggle 3.72:1. IwacSearch.
- The SSR search result is embedded in the page as JSON but never reaches first paint — 153.5 KB JS must execute first while AT sees an `aria-hidden` skeleton. IwacSearch · optimize.
- `ViewToggle` should be a radiogroup (the sibling `FederatedApp` implements the correct pattern). IwacSearch.
- `MapView` hardcodes `#ce4115` ×2 and `#ffffff` ×3 (no dark equivalent; read once at mount so theme switches never update it) — MapLibre genuinely can't read `var()`, but the literals are unguarded. IwacSearch.

### Notable P3 backlog

Unnamed `<form role="search">` + two *nested* `<aside aria-label="Filters">`; the year facet renders 0 histogram bars at landing (66 with any query); gallery cards centre their source lines under left-aligned datelines; the entity colour map covers 3 of 6 index types (Topics falls to `--muted`, chromatically identical to references) and `Sparkline.svelte` is `aria-hidden` with no text alternative; citable URLs namespaced to an Omeka block id (`b1306.q=`); the summary live region re-announces all 78 chars whenever the ms figure changes; typeahead debounces are chained (250+120 = 370ms real latency vs the masthead's 140ms); inverted date ranges (`from=2010&to=1990`) accepted into a never-matching filter; `searchFacetValues`/`fetchForMap`/`fetchForExport` lack AbortControllers and `SeqGuard` is defined-but-never-instantiated; guard blind spots (multi-line `var()` skipped, dark values never compared, missing tokens.json exits 0, docblocks say five breakpoints/seven literals — six of each); Omeka core injects 139 KB FontAwesome + 86 KB jQuery onto a Bootstrap-Icons SVG surface; `.iwac-header-suggest` cross-repo selector coupling has no build-time guard; no breadcrumb on a deep content route (cross-ref: item-show P1).

## Deferred-decision manifestations

- **Boxed body vs broadsheet**: the instruction box is the direct cause of a P1 here — its cost is measurable in pixels of lost results.
- **Mixed measures**: intro box runs to the 1300px cap while the search field sits ~100px inset — two visible left edges above the fold.
- **`--primary` on `--background` 4.40:1**: instantiated by `Show 42 more` (×6) and `Clear all`.

## Verified good (no action)

URL/localStorage hardening (incl. prototype-pollution defence); debounce/cancellation; CLS 0.002; overflow-free at all widths/modes/drawer states; facet checkbox semantics and names; complete FR localisation; token-contract compliance (no module-owned colour); detector-clean (canary-verified); helper casing 5/5 across all four axes; skeleton correctly `aria-hidden` and replaced on mount; sparklines live on `/index`.

## Tooling artifacts recorded this round

1. `__focus` uses programmatic `.focus()` and does **not** trigger `:focus-visible` — focus-ring evidence requires real Tab keypresses (roadmap rule added).
2. Two agents' first contrast passes parsed `oklch()`/`oklab()` strings as sRGB and produced garbage — canvas readback reaffirmed as the only valid method.
3. Chromium resumes sequential focus traversal from the last focused element after `blur()` — naive tab-count probes undercount.
4. Overwriting `className` strips Svelte's scope hash (evidence for the whole-folder proxy mapping).
5. The rig serves the unminified local theme CSS (161 KB) and does not gzip — byte figures are not production figures.
6. Playwright scrolls controls into view before clicking — `scrollY` deltas during interactions are harness behavior.

## Triage summary

| Route | Findings |
|---|---|
| **IwacSearch** | Both P0s; P1 drawer, focus indicators, gallery auto-flip + lossy URL, `large` derivatives, announcements, keyboard gauntlet, breakpoint contract (with cross-repo decision); ~16 P2s; ~10 P3s |
| **Theme** | P1 `--type-*` dark variants (cross-repo token change); compact-banner suppression on search pages (partial); `--ring-focus` vs `--focus-outline` token decision; header-suggest coupling guard; breadcrumbs (cross-ref item pass) |
| **IwacVisualizations** | none this surface |
| **Admin-config-only** | EN instruction block (FR proves the fix); EN/FR `default_sort` divergence |
| **Third-party** | Omeka core FontAwesome/jQuery weight |
| **Wontfix-by-register** | none |
