---
target: item show /s/westafrica/item/74601 (+ 24073, 1023, 108353, 5235, FR twin)
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-24T08-21-30Z
slug: islam-zmo-de-s-westafrica-item-74601
---
Method: three isolated agents (A: design review, mode **Read** · B: detector/browser evidence · C: technical audit) against the live-proxy rig, light + dark, 1440 + emulated 375. Orchestrator adjudication ran two independent probes: one **refuted a reported P1** as a lazy-load methodology artifact, one **confirmed a reported P1** against the un-proxied live site. Audit score (C): **15/20**.

# Combined Critique — IWAC Item Show (`/s/westafrica/item/74601`, Read)

## Design Health Score — 24/40 (Fair — authored core, foreign edges)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Reader can't tell where they are in the collection; no progress cue into a 23,000px transcript |
| 2 | Match System / Real World | 2 | `FIRSTNAME` / `LASTNAME` / `GENDER` raw FOAF labels; "VALUE ANNOTATIONS" jargon; third date format in linked resources |
| 3 | User Control and Freedom | 2 | No breadcrumb, no prev/next, no back-to-results — the theme ships a complete breadcrumb component no template renders |
| 4 | Consistency and Standards | 2 | Section rules drawn at 1380px and 840px on one page; linked resources speaks table, not ledger |
| 5 | Error Prevention | 3 | Citations pre-rendered in all 3 styles (no-JS safe); AI content marked |
| 6 | Recognition Rather Than Recall | 2 | Provenance split across two affordances 200 words apart; OCR wall with no anchors |
| 7 | Flexibility and Efficiency | 3 | 3 citation styles + 4 exports, linked-resource filter/sort, IIIF deep zoom, EN/FR, dark mode |
| 8 | Aesthetic and Minimalist Design | 3 | The metadata ledger is exemplary; undercut by a stock-MUI viewer owning the fold |
| 9 | Error Recovery | 2 | Empty thumbnail cells render as blank boxes; no failure treatment on the viewer |
| 10 | Help and Documentation | 3 | The AI-sentiment panel is exemplary inline documentation; the AI-lede caveat is hover-only |
| **Total** | | **24/40** | **Fair** |

## Audit Health Score — 15/20 (Good)

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 3.0 | 20/22 rendered text pairs pass in both themes; flawless focus visibility over 55 keyboard stops — but the active linked-resources facet chip is 4.10:1 |
| 2 | Performance | 2.5 | LCP 688ms / CLS 0.0024 excellent; 2,194 KB of Mirador ESM loads eagerly on every scan-backed item (72% of 3,066 KB) |
| 3 | Responsive Design | 3.5 | Zero horizontal overflow at all 12 widths tested; but the surface uses one (`$md`) of six published breakpoints |
| 4 | Theming | 3.5 | Zero hard-coded colours across 12 component dirs, structurally enforced (components can't reach Sass colour vars); Mirador clash is the only exception |
| 5 | Implementation Integrity | 2.5 | CLAUDE.md's child-scoping rule violated in `_metadata.scss` itself; three `!important`s in `_annotation.scss` exist only to mask the leak |
| **Total** | | **15/20** | **Good** |

## Design Specificity Verdict

**Authored in the stratum that carries the scholarship; template-default in the two largest regions by area.** The dateline survives into the item page correctly localised (`ARTICLE · LE PATRIOTE · DECEMBER 28, 2017` / `Article · Le Patriote · 28 décembre 2017`) — quietly fixing the homepage pass's dateline P2 at this surface. The 168px uppercase ledger with hairline rules, interpunct-flowed multi-values, and quiet 36px linked-value thumbnails is unmistakably this project. The AI lede beat its own spec (2px ink section rule, not the info-tinted box the docs still describe), and the AI-sentiment panel — four named models on parallel scales with per-dimension `MODELS AGREE/DISAGREE` verdicts and "Show reasoning" disclosures — is the most honest computational-provenance device on any humanities collection we know of. The caveat: **the two things a reader looks at longest are not designed at all** — the IIIF viewer renders in stock Material-UI (pixel-sampled `#1967d2` light / `#4db6ac` dark), and authority records present their main content as a five-column table in a foreign typographic grammar.

**Deterministic scan (B):** detector clean over all 14 surface templates *and* the surface Sass — but only after working around a tooling gap (below). Zero console errors, zero failed requests, zero HTTP ≥400 across all seven page loads. One theme-owned console message: `Unrecognized feature: 'web-share'` from `video-embeds.phtml:101`.

## Adjudications

1. **A's P1 "a Visualisations section renders an eternal spinner on every item page" is REFUTED as a probe artifact.** The block reproduced as "Loading dashboard…" on live and proxy alike — but only in probes that never scrolled. The dashboards lazy-load on view (IntersectionObserver, the PageSpeed-40 work); an orchestrator probe that genuinely scrolled the block into a 1440×900 viewport saw **18 chart nodes resolve within 5 seconds** on the un-proxied live site. Unscrolled probes and virtual-time tall captures show the placeholder *by design*. **Tooling rule added to the roadmap: never report a spinner/skeleton as a failure without a scrolled-and-waited Playwright probe.** (Whether the item dashboard has On This Day's v1.49.0 timeout/retry treatment for *genuine* failures remains an open IwacVisualizations question — P3 below.)
2. **A's P1 "Mirador renders stock MUI, the documented palette was never applied" is CONFIRMED on the un-proxied live site**: FAB `rgb(25,103,210)` (= stock MUI blue `#1967d2`), AppBar `#f5f5f5`, dark FAB mint-teal `#4db6ac` — not one value matches `docs/MIRADOR.md`'s `#ce4115`/`#ec653f`/`#fdfcfb`/`#110c08`. The theme's `mirador-theme-sync.js` works — it is flipping between MUI's *built-in* themes. C's independent "cool-grey/mint clash" finding (F11) is the same root cause and merges into this.
3. **`_metadata.scss` child-scoping (C rated P1, B rated P2) — adjudicated P2.** The leak is real and measured (`.metadata dl>.property dt` reaches the annotation tooltip's nested `dt`; computed `float:left` on it), but no user-visible damage exists today: the row is `display:flex` (float ignored) and a dead-tie `!important` holds the width. Latent fragility with accidental guards, not a live defect. Fixing lines 24/53/76 to child combinators retires three `!important`s in `_annotation.scss:151-160`.
4. **C's "outlined quiet controls under 3:1 (1.4.11)" — adjudicated P3 advisory.** The copy button/download chips are identified by their text labels (5.07–16.7:1), and WCAG 1.4.11 does not require a 3:1 boundary when the boundary is not the sole identifier. The quiet-button grammar leans on borders users may not perceive — worth a look in Phase 3, not an AA failure.
5. **Dropped by the agents' own verification (recorded so Phase 2 doesn't rediscover them):** the EU AI mark *is* accessible (`role="img"` + `aria-label`, 9.15/9.44:1); linked-resource thumbnail duplicate links are correctly neutralised (`tabindex="-1" aria-hidden="true"`); the citation tabpanels' missing `tabindex="0"` is correct per APG (exactly one focusable child).

## Overall Impression

For its central job — *read this source, and know what you are reading* — the page is better than its score. The ledger is genuinely dense and genuinely beautiful; the AI provenance chain (EU mark → per-value annotation naming the model → four-model sentiment panel that shows its disagreements) would earn a historian's trust. What holds it back: verifying means squinting at a viewer wearing someone else's brand; citing means scrolling past up to 23,256px of unchunked OCR to reach a panel that hands over a bare URL while the item's minted persistent identifier (`iwac-article-0011309`) sits unused eleven rows above; and having arrived (usually from a search engine), the reader cannot tell where they are or get back — the theme ships a complete `_breadcrumbs.scss` that no template calls.

## What's Working (verified, not assumed)

1. **The AI-sentiment panel is a signature move** — four models named, per-dimension agreement verdicts, per-model reasoning disclosures. Model disagreement as a readable finding.
2. **The AI lede resolved "rules, not boxes" correctly and beat its own spec** — 2px `--ink-strong` section rule, transparent, Source Serif 4 at 19px capped at `--measure-narrow`.
3. **Interaction plumbing is textbook**: citation tablist fully APG-conformant (roving tabindex, ArrowKeys + Home/End), copy button with `role=status` live region, annotation trigger with correct `aria-expanded`/Escape/focus retention.
4. **The engineering floor holds**: flawless focus visibility across 55 keyboard stops (including Mirador's MUI buttons and the OSD canvas); zero horizontal overflow at all 12 widths, 320–1460; zero hard-coded colours, enforced structurally (abstracts don't forward `_colors.scss`); alt coverage 22/22; LCP 688ms, CLS 0.0024; target sizes pass everywhere measured.
5. **FR parity is strong** where the theme owns it: `lang` attributes, all 13 ledger terms, citation UI, localized landmarks. The show-page ledger's child-scoped selector chain correctly protects nested annotation `<dl>`s (measured on a real production annotation).
6. **The fileless-media contract works**: 108353 renders exactly one correct video embed (nocookie host, real accessible name, lazy, 16:9) with the empty Mirador block by design.

## Priority Issues

- **[P1] The IIIF viewer renders in stock Material-UI blue and teal — the documented palette was never applied.** Confirmed on un-proxied live (Adjudication 2). The biggest visual element on the collection's most-visited page type wears a foreign brand, in both themes; on mobile the blue FAB is the most dominant element above the fold. *Fix:* paste the JSON from `docs/MIRADOR.md` into Admin → Modules → Mirador. One paste; no code. *Route:* **admin-config-only** · `/impeccable polish`.
- **[P1] The reader has no idea where they are and no way out.** No breadcrumb (component exists, forwarded at `_components.scss:40`, documented in DESIGN.md, never rendered — `grep -rn breadcrumb view/` is empty), no prev/next, no item-set line, no back-to-results. *Fix:* render the existing component in `item/show.phtml` above the dateline; add prev/next within browse context. *Route:* theme · `/impeccable clarify`.
- **[P2] Mirador emits a second `<h1>` ("Mirador viewer") and a second `<main>` (nested, `aria-label="Workspace"`) on every file-backed item**, plus the item title twice as `<h2>` (B measured; B proposed P1). Screen-reader landmark/heading navigation gets two of everything. *Route:* third-party module (Mirador) — config or upstream; theme controls only block placement.
- **[P2] `_metadata.scss` ledger selectors are not child-scoped** — violates CLAUDE.md's own rule in the file the rule is about (Adjudication 3). `_metadata.scss:24,53,69-70,76,89`; masked by `_annotation.scss:151-152,160` `!important`s. *Route:* theme · `/impeccable harden`.
- **[P2] Active linked-resources facet chip fails AA text contrast**: 4.10:1 (`#ce4115` on `#fbeae5`, 13px/600) on `/item/1023` (C proposed P1; adjudicated P2 — single control state, token-level fix). Distinct from the deferred `--primary`-on-`--background` question. *Route:* theme · `/impeccable harden`.
- **[P2] 2,194 KB of Mirador ESM loads eagerly on every scan-backed item** — 72% of a 3,066 KB page, on the primary reading surface, for an audience on West African bandwidth; the project already lazy-loads echarts/maplibre on view. Starts after LCP, so vitals hide it. *Route:* third-party module (Mirador) · `/impeccable optimize`.
- **[P2] Heading outline breaks on items without the citation block**: 1023 outlines `h1 → h3` (no h2 on the page — `linked-resources.phtml:15` hard-codes `<h3>` while the absent citation block owns the only `<h2>`); opening a value annotation injects an orphan `<h6>` (`resource-values.phtml:195`) before the first h2. Block heading levels are hard-coded per block, so any stack permutation can skip levels — same class as the homepage's h1→h4. *Route:* theme (+ admin: consider placing the citation block on authority/reference stacks) · `/impeccable harden`.
- **[P2] "How to cite" is buried and weaker than the record it cites**: at 53% of a 6,282px page (74601), 27 viewports down on 24073; no access date; bare URL while the ledger prints minted PIDs (`iwac-article-0011309`); absent entirely on authority records. *Route:* theme (placement/anchor) + third-party (IWAC-SEO formatters) + admin-config (block stack) · `/impeccable clarify`.
- **[P2] The full text is dumped unbroken** — `bibo:content` measures 1,262px on an article and **23,256px** on a twelve-page issue, with no collapse, no per-page anchors, nothing tying text to the viewer's canvases ("1 of 12"). The ai-toc device is implemented and correct but 24073 carries no `dcterms:tableOfContents` value, so the fallback is raw OCR — the finding is the fallback, not the device. *Route:* theme (+ data coverage) · `/impeccable distill`.
- **[P2] Linked resources speaks a different design language**: 245 results as a five-column boxed table — sans-serif bold titles (not Besley), ISO dates (a third format), inconsistent type chips, empty white squares for missing thumbnails — where DESIGN.md §Ledger Row mandates the opposite on every count. *Route:* theme · `/impeccable adapt`.
- **[P2] Phone-width typography breaks at the headline and the inline value rows**: h1 wraps five lines with French spaced-colon orphaned to a line start (`" : le Chamci"`); wrapped SUBJECT/SPATIAL rows begin with a leading interpunct that reads as a bullet. *Fix:* `text-wrap: balance`, no-break space before French `:`, bind interpuncts to the preceding value. *Route:* theme · `/impeccable typeset`.
- **[P2] The viewer is all chrome and no content on a phone** — 15 affordances around a ~180px illegible scan on the second screen of every item; on desktop, portrait scans waste ~⅔ of the fixed 1380×630 frame (most of a newspaper archive is portrait). *Route:* theme + third-party (Mirador block height/aspect) · `/impeccable adapt`.
- **[P2] FR site renders the AI-sentiment block entirely in English** — headings, axis glosses, verdicts (`AI sentiment`, `Polarity`, `very negative`…). *Route:* IwacVisualizations · `/impeccable harden`.
- **[P2] All 24 `iwac:*` sentiment values are published in JSON-LD** (20,960 of 116,211 bytes, ~18% of the page) even though the rendered list correctly strips them — the `display_values` filter has no effect on serialisation. Needs an owner decision: intended open-data exposure, or leak? *Route:* IwacVisualizations (decision first).
- **[P2] `person-dashboard.min.css` is render-blocking on newspaper-article pages** that render `iwac-vis-article`, not a person dashboard (1 of 9 blocking sheets). *Route:* IwacVisualizations · `/impeccable optimize`.
- **[P2] `config/theme.ini`'s default item stack no longer describes what ships** (`theme.ini:324-331` lists mediaEmbeds/itemSets/mediaList/linkedResources; the live page renders mirador/values/citation/iwac-vis) — a fresh install gets a materially different item page. *Route:* theme defaults + docs · `/impeccable adapt`.

## Notable P3 backlog

- Empty `.block-mirador` occupies 32px of dead margin on every fileless item (1023, 5235, 108353); no `:empty` guard, though `video-embeds.phtml:40-42` shows the theme knows this failure mode. Theme.
- `.block-mirador` wrapper is anonymous (no role/label); a labelled wrapper is cheap. Theme.
- The AI mark's most important sentence — "Generated by an AI model. Verify against the original source." — lives only in a `title` attribute on a non-focusable span (`resource-values.phtml:136`): unreachable by keyboard and touch. Theme.
- Annotation popover: database vocabulary ("VALUE ANNOTATIONS"), overlays the two rows below it, sets its value in `--primary` (a use the register reserves). Theme.
- Raw FOAF labels on authority records: `FIRSTNAME`, `LASTNAME`, `GENDER`. Theme (labels come through core vocab; needs a label map).
- `TYPE` renders French vocabulary values on the EN site (`Article de presse`) while the dateline above says `ARTICLE`. Theme/data decision.
- Country flag squares: `dcterms:spatial` crops 3:2 flags through the 200×200 square derivative into abstract colour bars — the only saturated non-brand colour in the ledger, and flags were deliberately removed from the icon system. Theme.
- FR label column: `Couverture spatiale` wraps the 168px column to two lines; `Editeur` misses its accent (core catalogue, not theme fr.po). Theme/cross.
- Linked-resources table: no `<caption>`; orphan `<label>Page</label>` with no `for`. Theme.
- `citation.js` loads sync in `<head>` with no `defer` (module-appended). IWAC-SEO.
- 77 KB FontAwesome woff2 downloads for one glyph (`.o-icon-annotation`, `resource-values.phtml:191`) on a stack standardised on Bootstrap Icons. Theme.
- 3 below-fold ledger thumbnails eager; 5 images lack `width`/`height` (CLS currently 0.0024, so latent). Theme.
- The surface uses one of six published breakpoints — all 17 width queries resolve to `$md`; `.main-region` grows 708→1380px through a single unchanging rule. Theme (Phase 3 layout).
- Single-line linked-resource title links are 22.5px tall under `display: flow-root` — borderline vs 2.5.8's inline exception. Theme.
- Quiet-control borders 1.41–2.40:1 — 1.4.11-conformant via text labels but perceptually faint (Adjudication 4). Theme (Phase 3).
- Item dashboards: verify the *genuine*-failure path got On This Day's v1.49.0 timeout/retry treatment. IwacVisualizations.
- Back-to-top control overlaps the sentiment panel's `MODELS DISAGREE` badge at the right edge (scroll-position dependent). Theme.
- `allow="…web-share"` on the video iframe logs an unrecognized-feature warning in Chrome. Theme (cosmetic).
- `uri-value-link` external links carry no `rel` (Omeka core markup; browsers imply `noopener` — residual referrer leakage only). Third-party/wontfix-by-register.
- **Artifact-layer drift, provable in three places**: `docs/DESIGN-PHILOSOPHY.md:52` and `DESIGN.md` §Elevation still describe the info-tinted/shadowed AI lede the code deliberately replaced with a rule (`_resource-show.scss:331`, whose own comment says so — and whose ~line-284 comment contradicts it); `DESIGN.md` types `headline` at max 3rem while the item h1 renders 60px (`--text-4xl`). Per the publish-and-assert doctrine the fix is `/impeccable document` + the Phase-4 frontmatter guard, not prose edits.

## Deferred-decision manifestations (noted, not re-litigated)

- **Mixed measures**: the same 2px section rule is drawn at 1380px (AI lede) and 840px (citation, `--measure-base`) on one page, with the full-width sentiment panel between — three ragged right edges.
- **Boxed-body-vs-broadsheet**: the sentiment panel is a sanctioned "true panel (charts)"; the linked-resources filter box is not.

## Data conditions (not defects — demo map updated)

- `/item/24073` is on template 21 but currently carries **no `dcterms:tableOfContents`** — the ai-toc device is unexercised there; a ToC-bearing exemplar is needed to evaluate it.
- The mentions sparkline on 1023 is absent pending the `discovery:reindex` that populates `mentions_by_year_s`.

## Tooling artifacts recorded this round

1. **The CLI detector silently skips `.phtml`** (`detector/node/file-system.mjs:26-30`) — a "clean" scan over theme templates is vacuous unless each is mirrored to a byte-identical `.blade.php` copy, and the detector is proven to fire on a seeded bad line. B did both; the clean verdict is real.
2. Detector URL mode is unavailable (puppeteer not installed).
3. Tall `shot.ps1` windows inflate viewport-relative blocks (the Mirador frame read ~2,700px in a 4000px capture; it is 630px at a real 900px viewport).
4. Unscrolled probes show lazy-on-view placeholders forever (refuted a P1 — see Adjudication 1).
5. `.claude/preview-patch.js` still injects a duplicate video embed on 108353 — its guard predates the v2.11.0 deploy. Rig maintenance.
6. The proxy rewrites canonical URLs, so citations read `localhost:5179` — not a bug.
7. Headless-GPU console noise (`ReadPixels`, `powerPreference`, `No available adapters`) is not the page's.
8. Chrome serializes computed colours as `oklch()` — contrast must be measured from rendered sRGB readback, not token-hex math.

## Triage summary

| Route | Findings |
|---|---|
| **Theme** | P1 breadcrumbs/orientation; P2 metadata child-scoping, facet-chip contrast, heading outline, cite placement, OCR chunking, linked-resources grammar, mobile typography, mobile/desktop viewer framing (with Mirador config), theme.ini stack; ~15 P3s |
| **IwacSearch** | none this surface |
| **IwacVisualizations** | P2 FR sentiment block untranslated; P2 JSON-LD sentiment exposure (decision); P2 person-dashboard.css on articles; P3 failure-path parity |
| **Admin-config-only** | **P1 Mirador palette paste** (`docs/MIRADOR.md` JSON); citation block on authority/reference stacks |
| **Third-party module** | Mirador: duplicate h1/main, eager 2.2MB ESM, frame aspect; IWAC-SEO: citation access-date/PID, sync citation.js |
| **Wontfix-by-register** | `uri-value-link` rel (core markup, browsers imply noopener) |
| **Docs/artifact layer** | DESIGN.md + DESIGN-PHILOSOPHY.md drift on the AI lede + headline scale (`/impeccable document` + Phase-4 guard) |
