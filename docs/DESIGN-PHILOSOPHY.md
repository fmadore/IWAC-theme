# Design Philosophy

The visual stance for IWAC-theme. Read this before any change that affects how the
site *looks* — the register is specific and easy to violate by accident.

For the token contract shared with IwacSearch and IwacVisualizations, see
[DESIGN-SYSTEM.md](DESIGN-SYSTEM.md). The machine-readable companion for design
tooling (Impeccable skill) is the root [DESIGN.md](../DESIGN.md) with its
`.impeccable/design.json` sidecar — derived from this file plus `tokens.json`.

---

**Stance: a research instrument with a press-archive face.** (v2.6 redesign, June 2026; "ink and one spot colour", 2.33, November 2026)

The site is a scholarly database used by historians and political scientists doing comparative work across francophone West African press archives, with a computational pipeline (3 LLM sentiment models, LDA, embeddings, IIIF, geocoding). Users come with specific questions and want **precision and density** — and the instrument carries the visual language of the material it preserves: the 20th-century newspaper. Masthead wordmark, uppercase section strip, thick 2px ink rules, datelines, ledger-style result rows, a press-collage hero printed on the blue plate.

**Ink is the brand; blue is the spot colour.** A broadsheet prints in black and adds one second plate where it matters. 2.33 made that literal: square corners, no shadows, no cards — sections divided by rules on one flat page — and a deep press blue (`#1c2f9e`) used the way a second plate is used. It replaced a burnt orange on warm off-white with rounded, shadowed cards and tracked uppercase labels everywhere, which together read as a generic AI-template product rather than an archive.

Visual neighborhood: a modern broadsheet's digital archive run by a university press — newspaper typographic conventions executed with Linear/Stripe-press product polish. **Not** a small museum's website, not a warm editorial magazine, not a generic dashboard, not a SaaS card grid.

## Core Principles

1. **Density over comfort.** Researchers want to see more, not fewer, items per screen. Result lists are flat ledger rows separated by hairlines (no boxed cards); multi-value metadata flows inline with interpunct separators.
2. **Typography is the architecture; rules are the joinery.** Hierarchy comes from the three-font system plus the newspaper rule grammar: 2px ink rules open sections (`h1.title`, every page block after the first, footer top, KPI figures, "How to cite", the AI lede) and close the header; hairlines divide rows. Boxes are a last resort, reserved for true panels (charts).
3. **Square and flat.** No rounded corners (`--radius-sm/md/lg` are 0; `--radius-full` is for dots and switch thumbs) and no elevation on the page: panels, cards and buttons cast no shadow. Only what genuinely floats over the page — the drawer, menus, popovers, the typeahead — keeps one small separating shadow (`--shadow-lg`).
4. **Prose fills the width.** Never a narrow capped column with an empty half beside it. Short prose (an HTML block under ~2400 characters with no table, figure, embed or numbered list; the AI summary on an item) flows into balanced newspaper columns at wide viewports, with a hairline column rule and headings spanning all columns. Long prose stays one column at the full container width — columns taller than the viewport make the reader scroll down, up and down again. Phones get one column.
5. **Uppercase is rationed.** Tracked uppercase belongs to two places only: the nav strip (and the drawer that mirrors it) and datelines / eyebrows — the `TYPE · PUBLISHER · DATE` identity device, "ON THIS DAY", the hero eyebrow. Every other label — metadata `dt`s, breadcrumbs, table headers, filter chips, hero stat captions, pagination, form labels, buttons — is sentence case, untracked, weight 600 where it is a label.
6. **Three-font system.** **Besley** (Clarendon: masthead, headlines, section heads, display numerals — verified to cover Arabic-transliteration diacritics), **Source Serif 4** (`--font-serif-text`: article full text, ledes, long-form reading), **Public Sans** (UI, labels, datelines). Track Besley display sizes at `-0.01em`, NOT the full `--tracking-tight` (slab serifs clog).
7. **Neutral is correct — twice.** Light surfaces stay near-white at chroma ~0.002 (no cream, no parchment). Dark mode is the **warm "lamplit reading room"** set (hue ~70–80, chroma ~0.012), deliberately not blue-cool dashboard dark.
8. **Restraint with color.** The spot blue appears as: links, focus state, current/active state (nav tab, active filter chips), dateline interpuncts, categorical dots, the hero ground, the one filled button, key counts. Never as per-row badge fills, never on heading text, never as decorative wash or gradient.
9. **The quiet control is the default; the loud one opts in.** A bare `<button>` is outlined, flat, ink-on-transparent. The filled-primary treatment — a flat square of the spot colour, no halo, no lift since 2.33 — arrives only via `.btn--primary` or a submit control (the one button in a form that *is* the loud action). Until v2.10 this was inverted: the base selector painted every button filled-and-glowing, so sixteen component files reset `border-radius` / `box-shadow` / `transform` just to opt *out*, and any new component that overrode only background+color silently kept a rounded floating halo. A default is a statement about what the system thinks is normal, and restraint has to be the normal one.
10. **Computational honesty.** AI-generated metadata gets explicit visual treatment that signals provenance — not cosmetically blended into human-authored fields.
11. **Multilingual rigor.** FR / EN / AR transliteration get equivalent typographic treatment in every face used (test `ḥ ṣ ḍ ṭ ẓ ʿ ā ī ū` before adopting any font). Tabular figures everywhere alignment matters.

## Color Philosophy

The system is **OKLCH-based** because equal lightness steps look equal (HSL is perceptually uneven). All primary variants derive from a single `--primary-base` hex (admin-overridable) via `color-mix(in oklab, …)` so customizations cascade through every focus ring, blockquote, hover state and the hero ground without manual tuning. A second admin-overridable seed `--secondary-base` (claret) feeds `--secondary` — a **data-only** colour consumed by the IwacVisualizations charts (series 2 / corpus comparison), never UI chrome. See [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md).

- **Light surfaces**: `oklch(99% 0.002 60)` — near-white with imperceptible warm tint. No cream, no parchment.
- **Light inks**: cool-neutrals (`oklch(13–54% 0.008–0.012 264)`) — reads as "objective / scholarly."
- **Dark mode**: warm deep neutrals — surfaces `oklch(12–20% 0.012 ~70)`, inks `oklch(59–97% 0.006–0.010 ~75)`. The lamplit register keeps the light blue spot from turning the page into a blue dashboard.
- **Primary**: a deep press blue. Light theme: the seed darkened 8% (`#18298d`, ≥10:1 on every light surface, so it is legible as link text anywhere). Dark theme: the seed *re-lit* — its lightness pulled to ~78% while hue and chroma stay the seed's own (`#7aa2ff`) — because mixing a deep blue toward white bleaches it grey before it becomes legible.
- **Separation of hues**: the spot blue, the claret `--secondary` and the teal `--info` (AI provenance, audiovisual) are mutually distinct by hue *and* lightness, so a legend or stacked bar never shows three blues. No orange/terracotta lead and no green lead.
- **Hero**: the homepage banner prints the collage as a grayscale plate multiplied over a deep blue ground built from the raw seed (not from `--primary`, which is light in dark mode), through a fine 4px halftone dot screen (`_banner.scss`) — the one big colour statement, automatically on-brand for any admin-configured seed.
- **Shadows**: none on the page. Only overlays (drawer, menus, popovers, typeahead) keep `--shadow-lg`, a small separating shadow; rows, tags, panels and sections use rules instead.

## Visual Guidelines

- **Masthead header** (`view/common/header.phtml` + `_header.scss` + `_navigation.scss`): wordmark row (Besley 800) + uppercase nav strip, closed by a 2px `--ink-strong` rule. Full nav is visible from `$lg` (1024px); the drawer + slim ink hamburger serve below — the drawer speaks the same register (solid `--surface`, uppercase entries on hairline rules, indented sub-entries; no glass, no pill buttons). In the masthead row only the search box flexes (it has a `min-width` floor); the icon controls never shrink, and below `$sm` the wordmark swaps to the per-site acronym (theme setting `site_title_acronym` — IWAC / CIAO; full title stays in the DOM as the link's accessible name). The active section gets a 2px primary tab on the closing rule.
- **Datelines**: `TYPE · PUBLISHER · DATE` in tracked uppercase with primary interpuncts (`.item-dateline`, built in `view/omeka/site/item/show.phtml`) — the recurring identity device.
- **Banner**: the hero (text overlay, halftone plate, Ken Burns settle, LCP preload) renders on the homepage only. Inner pages carry no banner: they open straight on the breadcrumb and title under the masthead's 2px rule. (A slim `.banner--compact` duotone band sat there until 2.33 — decoration between the section strip and the content, and the LCP element of short-titled pages on phones.)
- **Page blocks are ruled sections**: on one flat `--surface`, the direct children of the page grid carry no fill, border, radius, shadow or inline padding; each section after the first opens on the 2px `--ink-strong` rule (not the one directly under a page title, whose h1 has its own). Blocks nested in a block group are one section.
- **Quiet chrome.** Footer opens with the mirroring 2px ink rule and is a colophon in three hairline-ruled bands: the wordmark and description beside the menu, partners and the once-in-a-while controls, the rights notice in two columns. The menu is a row of sections (depth 1) or a sitemap whose columns share the full width (depth 2+, a long section doubled) — never a tall column with an empty half beside it. Partner logos are shown unaltered — full colour on their own white ground, in both themes; a funder's mark is not ours to restyle. `backdrop-filter` is reserved for the sticky header, nowhere else — and so is `--surface-overlay` (it is translucent glass; opaque popovers/tooltips use `--surface`). A quiet outlined back-to-top control (`#back-to-top`, bottom end corner) appears after ~a viewport of scroll.
- **Tight transitions** (150–200ms). No bouncing, no elastic, no hover-triggered hero animations.
- **Visible focus states** on every interactive element. **Reduced motion respected** everywhere.

## Component Styling Approach

- **Resource show metadata** (item, media, item-set): dateline, then Besley headline, then flat rows of facts with hairline separators, sentence-case labels (600, `--ink`, `--text-sm`), 168px label column. Selectors are child-scoped (`> dl > .property > dd`) — value-annotation tooltips nest their own `dl` inside a `dd`, and descendant selectors leak the column layout into them. Multi-value rows (subjects, spatial, languages) flow inline with primary interpuncts; descriptions/abstracts stay in the column as prose blocks at its full width (language tag inline at the head of the text); `bibo:content` breaks out full-width — label line above, `--font-serif-text` across the whole row. Linked-value thumbnails and the RightsStatements badge render as quiet 2.25rem inline marks, never hidden (image-only values like `dcterms:rights` would otherwise show empty rows; the badge cap needs `!important` because the module inline-styles `height:4em`). The lede (`bibo:shortDescription`, "DescriptionAI") opens on the 2px ink rule with the EU "AI generated" mark on its label, and flows into balanced columns at wide viewports.
- **Resource browse / search results** (IwacSearch module): ledger rows — hairline-ruled `<li>`s, dateline eyebrow, Besley title, 2-line snippet, quiet interpunct source line, outlined square type chip with a categorical dot (active = primary border + wash, NOT filled).
- **Categorical type colors** (one map, `--type-*`, shared by IwacSearch chips and IwacVisualizations badges, nodes and legends): items — article `--primary` (blue), publication `--secondary` (claret), audiovisual `--info` (teal), document `--warning`, reference `--muted`, photograph `--success`; the five index types — Personnes `--info`, Lieux `--success`, Organisations `--warning`, Sujets purple (`--series-5`), Événements magenta (`--series-9`); labelled People, Places, Organisations, Subjects, Events in English (never "Topics" — that word belongs to the LDA models). Always as dots on outlined chips, never pastel fills, and never a slot a module picks for itself.
- **Facets**: quiet borders, high density; active counts as primary tabular text (no filled pills); no accent rails.
- **Switches**: a page-level tab set is ruled (ink text, active = `--ink-strong` + 2px primary underline); an in-panel toggle is an outlined square chip at `--radius-sm` (0; active = primary border + wash). Never a filled-primary active state, never a pill — `--radius-full` is for dots. Rules in [DESIGN-SYSTEM.md §2c](DESIGN-SYSTEM.md).
- **Section heads**: a section-level h2 opens on the 2px `--ink-strong` rule (the section-opener "How to cite" and "Linked resources" use), Besley 800 at `--text-lg`, ink — never primary.
- **Figures**: thousands grouped with a narrow no-break space in every locale; the decimal mark and percent spacing follow the page language; date-only values formatted in UTC ([DESIGN-SYSTEM.md §2c](DESIGN-SYSTEM.md)).
- **Breadcrumbs**: plain sentence-case crumb line (no chip box, no tracking), current page marked with primary dot.
- **Pagination**: hairline top border, no primary tint as default.
- **KPI / summary figures** (IwacVisualizations, and the hero's stat strip): "almanac" entries — 2px ink rule on top, Besley numeral, a sentence-case caption; the featured figure's rule turns primary. No card boxes, no gradients, no hover lifts.
- **Prose blocks**: see principle 4 — short HTML blocks in balanced columns (`helper/ProseColumns.php` decides, `components/blocks/prose-columns/` sets them), long ones single-column at full width. No `max-width` on prose.

## What to Avoid

- **Warm cream / parchment surfaces.** They read as "manuscript museum brochure," wrong register for a digital research database.
- **Atmospheric body gradients** and gradient bars — recognized CMS/AI template tells.
- **Colored side-stripes** (`border-left`/`border-inline-start` accents) on cards, callouts, or legend chips — use dots, full rules, or nothing.
- **Filled-color badges on every row.** Category is a dot, not a shout.
- **Coloring h2s in primary.** Floods long article-style pages and contradicts the "primary as accent" principle.
- **Glossy / glassmorphic effects** anywhere except the sticky header.
- **Bouncing or elastic easing.** Real objects decelerate smoothly.
- **Hover-triggered hero animations** (the one-time load Ken Burns settle is the sanctioned exception).
- **Multiple decorative effects on one component.** Pick one.
- **Cold, clinical blue-gray schemes** — including in dark mode (dark is warm here).
- **Uniform card treatments** that flatten information hierarchy — and cards in general where a rule would do. Rounded corners and drop shadows on page furniture.
- **A capped prose measure with an empty half beside it.** Fill the width; use columns for short prose.
- **Tracked uppercase as a general label voice.** It belongs to the nav strip and datelines only.
- **Random per-class colors** (the old crc32-pastel resource tags) — category colors come from the fixed semantic map above.
