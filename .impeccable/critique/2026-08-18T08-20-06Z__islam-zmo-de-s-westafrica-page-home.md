---
target: homepage /s/westafrica/page/home
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-18T08-20-06Z
slug: islam-zmo-de-s-westafrica-page-home
---
Method: dual-agent (A: design review · B: detector/browser evidence) + parallel technical audit (C). One P0 from Assessment A was adjudicated with an independent Playwright 375px-viewport probe and **refuted as a tooling artifact** (see Adjudication).

# Combined Critique — IWAC Homepage (`/s/westafrica/page/home`, Persuade)

## Design Health Score — 28/40 (Good)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | On This Day's only status is a spinner — no progress, no failure state |
| 2 | Match System / Real World | 3 | US-numeric `08/18/1976` inside the dateline device on the EN site; unglossed INDEX vs REFERENCES |
| 3 | User Control and Freedom | 3 | Nothing traps; toggles reversible |
| 4 | Consistency and Standards | 3 | Boxed body blocks vs the rules-not-boxes doctrine; two identical "Search" placeholders in one viewport |
| 5 | Error Prevention | 3 | Little to get wrong; solid |
| 6 | Recognition Rather Than Recall | 2 | Three unexplained doors (BROWSE/INDEX/EXPLORE); inert stat figures look tappable |
| 7 | Flexibility and Efficiency | 3 | Typeahead ×2, EN/FR, theme toggle, PWA, no-JS GET fallback |
| 8 | Aesthetic and Minimalist Design | 3 | Hero + On This Day excellent; the ~30-link About wall is the exception |
| 9 | Error Recovery | 2 | On This Day fails to an indefinite spinner |
| 10 | Help and Documentation | 3 | About/Docs exist but prose-shaped; no contextual gloss at the jargon |
| **Total** | | **28/40** | **Good** |

## Audit Health Score — 18.5/20 (Excellent)

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 3.5 | Language-switcher state bug (P2); otherwise exemplary plumbing |
| 2 | Performance | 3.5 | LCP/lazy/on-view protections all intact; render-blocking jQuery is an accepted platform constraint |
| 3 | Responsive Design | 3.5 | No overflow at any real viewport; mixed `bp−1px`/`bp−0.02px` idioms |
| 4 | Theming | 4 | Zero hard-coded color in homepage templates; dark mode coherent end-to-end |
| 5 | Implementation Integrity | 4 | CLI detector clean over 7 templates (1 match = prose in a PHP comment); in-page hits were artifacts on non-rendered/hidden nodes |
| **Total** | | **18.5/20** | **Excellent** |

## Design Specificity Verdict

**Authored — decisively, in the strata that matter.** The masthead-over-section-strip, duotone press-collage hero with Besley `lnum` counters ruled like an almanac, the dateline device, and above all **On This Day pairing the Gregorian date with "5 Rabiʿ I 1448"** and fanning clippings across five decades — no neighboring Omeka site could truthfully copy this page. The register survives the dark toggle intact (genuinely warm lamplit surfaces, not an inversion).

The caveat: the **middle stratum is the least authored** — between hero and footer the body is two large rounded white cards floating on a gray field, a generic CMS silhouette the "rules-not-boxes" doctrine warns against. The identity lives inside the boxes, not in the page grammar.

**Deterministic scan (B):** 7 homepage templates clean under the CLI detector (exit 2 from a single false positive: `<img>` as prose inside a PHP comment, layout.phtml:58). Zero console errors, zero failed network requests. In-page detector: 17 hits, of which 9 target non-rendered nodes (script/style/noscript), 7 hidden closed dropdowns; the 1 visible hit (skip-link contrast) is real and listed below.

**Visual overlays:** injection succeeded, but the preview pane renders hidden (0×0 viewport), so no user-visible overlay was reliable; findings were read from the console.

## Adjudication: the mobile-overflow P0 is refuted

Assessment A reported page-wide horizontal overflow below ~482px with the hamburger/theme-toggle/search-submit off-screen at phone widths. Assessment C independently identified the cause as tooling: headless Chrome clamps the OS window to ~500px on Windows, so sub-500 "mobile" captures are ~482px layouts cropped to the requested width. A Playwright probe with a genuinely emulated 375×812 viewport settles it: `scrollWidth` 375 = `innerWidth` 375 (no overflow), hamburger visible at x 316–360 (44px), theme toggle 276–312, hero submit 299–358, and the screenshot shows a clean two-column stat strip and intact masthead. **Tooling rule going forward: never accept sub-500px findings from `shot.ps1`; use Playwright viewport emulation for narrow screens.**

## Overall Impression

A genuinely authored research instrument with an outstanding signature module and an engineering floor most sites never reach (reduced-motion done right twice over, engineered contrast math, LCP discipline). Its weaknesses are editorial, not structural: the page proves *scale* but never states *what it is*, buries its best evidence beneath a prose wall, and lets a stale hand-written count contradict its own live counter. One real interaction bug (language switcher) and a set of small WCAG 2.2 edges make up the technical backlog.

## What's Working

1. **On This Day is a signature move, not a widget** — dual-calendar dating, decade-spread ledger rows with real scans, honest disclosure ("33 more items carry this date"). The single best persuasion device on the page; scholarship-specific in a way no template could fake.
2. **The hero argues with evidence, not adjectives** — the two-tier almanac strip makes the scale claim in the collection's own typographic register; the duotone One-Plate collage is literally made of the archive's pages.
3. **Dark mode is authored, not derived** — warm umber surfaces, scans held as light plates; verified coherent end-to-end in full-page captures.
4. **The engineering floor**: Ken Burns gated behind `prefers-reduced-motion: no-preference` with visible base states plus a global kill that jumps to end-states; contrast engineered with documented AA math; LCP preload/srcset discipline and PageSpeed-40 protections all intact; skip link → labelled landmarks → focus-trapped inert drawer; zero `will-change`; one sanctioned backdrop-filter.

## Priority Issues

- **[P1] The hero proves scale but never says what the thing is; its numbers are dead ends.** No tagline/dek renders (admin field empty, no theme default); the only one-sentence value proposition sits in the footer. The four tier-1 figures are inert `<li>`s — "6 COUNTRIES" is painted on the hero and refused as a door. *Fix:* theme-default dek under the heading; link the four figures (Items → search, Index → index, References → references, Countries → country browse). *Command:* `/impeccable clarify` (theme: banner.phtml).
- **[P1] The About wall — five paragraphs, ~30 links, no heading, and a count that contradicts the hero.** "Over 14,700 items" two screens below a live counter reading 15 647; document outline jumps past it (no h2). Precision is the brand promise; a self-contradicting count is the wrong flaw for a research instrument. *Fix:* distill to two short paragraphs under an eyebrow heading + "More about IWAC →"; drop or live-bind the count. *Command:* `/impeccable distill` (admin block copy + theme heading styles).
- **[P2] Language switcher opens on focus while announced collapsed; Escape can't visually close it.** `:focus-within` reveal (`_language-switcher.scss:94-99`) fights the JS path (`script.js:325-336`): `aria-expanded` stays "false" on a visibly open menu, and Escape refocuses the toggle inside the component so `:focus-within` keeps it open. WCAG 4.1.2. *Fix:* scope the CSS reveal to a no-JS marker class; let `.is-open` be the only reveal when JS runs. *Command:* `/impeccable harden` (theme).
- **[P2] On This Day has no failure or no-JS state.** Fully client-rendered; the only fallback is an eternal spinner — on slow links the page's emotional peak never arrives. *Fix:* server-rendered minimal fallback + timeout state with retry. *Command:* `/impeccable harden` (IwacVisualizations).
- **[P2] US-numeric dates inside the signature dateline device.** `● ARTICLE · EHUZU · 08/18/1976` on the EN site — ambiguous to the non-US scholarly audience, and the register violated at its most-repeated point. *Fix:* locale-honest "18 Aug 1976" / "18 août 1976". *Command:* `/impeccable typeset` (IwacVisualizations).

## Notable P3 backlog

- Skip link contrast fails AA **in dark mode only**: white on `#da4617` (dark `--primary-active`) = 4.3:1; light mode passes at 8.0:1. (B's in-page scan ran dark; C computed light — they agree once theme context is added.)
- Footer sub-menu links ≈23.5px tall, zero gap — under WCAG 2.2 §2.5.8's 24px floor (`_footer.scss:246-252`).
- `--primary` as text on `--background` is 4.40:1 — a token landmine for future blocks (4.67:1 on `--surface` passes). Token change would be cross-repo.
- Hero search focus ring is primary-on-primary against the plate (~1.1:1 outer edge; survives via its inner edge) — a double ring (`0 0 0 2px var(--surface), 0 0 0 4px var(--primary)`) would read on the busy hero.
- Heading hierarchy jumps h1 → h4 (On This Day's heading; module-side option to emit h2).
- Active nav section has no `aria-current` (visual 2px tab only).
- PWA `theme-color` metas are hand-maintained copies of `--surface` (layout.phtml:186-187) — currently in sync, nothing asserts it.
- Two max-width idioms coexist (`bp−1px` vs `bp−0.02px`); pick one (suggest −0.02px, gap-free), align the `respond-below` helper, publish in DESIGN-SYSTEM.md.

## Persona Red Flags

**Jordan (first-timer):** three unexplained doors (BROWSE/INDEX/EXPLORE, plus REFERENCES-vs-INDEX inside knowledge); first click is a coin toss; the hero numbers look like the most tappable things on the page and do nothing; the unlabeled `</>` glyph on On This Day is a cryptic dead pixel.
**Casey (distracted mobile, slow connection):** layout is fine at 375px (adjudicated) — her real enemies are the eternal spinner where the page's best content should be, and 700px of prose homework before any content. Masthead search works (the one mercy).
**Riley (stress tester):** rapid HIJRI/GREGORIAN + view-chip toggling probes the module's re-render debouncing; empty search submit GETs to the search page with no query; the duplicate-ID trap between the two search forms is correctly defused (`-hero` suffixes) — grudging respect.
**Dr. Aminata (comparative historian):** masthead typeahead serves her opening move; corpus-depth figures speak her language. But her fastest entry — country — has no door in the page body; `08/18/1999` makes her double-take on every date she'd cite; provenance assurances (ZMO, Wayback, open access) are buried mid-paragraph; the 28px grayscale partner logos under-certify institutional backing.

## Minor Observations

- Two visible search fields with the identical placeholder "Search"; the hero variant could carry scope ("Search 15,647 items — people, places, newspapers…") given its own msgid.
- Footer prints childless nav headers (References, Index, Ask with AI) as empty columns.
- EXHIBITS hides four strong curated stories behind a generic label; the homepage body never surfaces them — an unexploited Persuade asset.
- The Hijri line is a signature detail at the page's quietest size; could stand half a step louder.
- Acronym wordmark swap on mobile keeps the full accessible name — done right.

## Triage (Phase 1 routing)

| Route | Findings |
|---|---|
| **Theme** | P1 hero dek + linked stats; P2 language switcher; P3 skip-link dark contrast, footer targets, focus ring, `aria-current`, theme-color guard, max-width idiom |
| **IwacVisualizations** | P2 On This Day fallback; P2 dateline date format; P3 h1→h4 heading |
| **Admin config** | About block copy (distill + live/no count); hero dek content (theme provides default); footer childless nav headers |
| **Cross-repo** | `--primary`-on-`--background` token decision |
| **Wontfix-by-register** | none this round |

## Questions to Consider

1. If the homepage's job is to earn the descent, why does its best evidence — the dated clippings — sit beneath 700px of prose homework? What breaks if On This Day *is* the second viewport and About becomes a two-line dek?
2. The hero proves *scale*, but scholars stay for *precision*. What would a precision-first hero look like — a single live example query ("Tabaski coverage in Ehuzu, 1976–1999 → 214 items") beside the almanac?
3. The register is "press archive," yet the page body is two rounded cards on a gray field. Would the homepage become more itself if the boxes dissolved and the broadsheet grammar (2px rules, hairlines, full-measure columns) ran the whole page?
