# Design Philosophy

The visual stance for IWAC-theme. Read this before any change that affects how the
site *looks* — the register is specific and easy to violate by accident.

For the token contract shared with IwacSearch and IwacVisualizations, see
[DESIGN-SYSTEM.md](DESIGN-SYSTEM.md).

---

**Stance: a research instrument with a press-archive face.** (v2.6 redesign, June 2026)

The site is a scholarly database used by historians and political scientists doing comparative work across francophone West African press archives, with a computational pipeline (3 LLM sentiment models, LDA, embeddings, IIIF, geocoding). Users come with specific questions and want **precision and density** — and the instrument now carries the visual language of the material it preserves: the 20th-century newspaper. Masthead wordmark, uppercase section strip, thick 2px ink rules, datelines, ledger-style result rows, duotone press-collage hero.

Visual neighborhood: a modern broadsheet's digital archive run by a university press — newspaper typographic conventions executed with Linear/Stripe-press product polish. **Not** a small museum's website, not a warm editorial magazine, not a generic dashboard.

## Core Principles

1. **Density over comfort.** Researchers want to see more, not fewer, items per screen. Result lists are flat ledger rows separated by hairlines (no boxed cards); multi-value metadata flows inline with interpunct separators.
2. **Typography is the architecture; rules are the joinery.** Hierarchy comes from the three-font system plus the newspaper rule grammar: 2px ink rules open sections (`h1.title`, footer top, KPI figures) and close the header; hairlines divide rows. Boxes are a last resort, reserved for true panels (charts, the AI lede).
3. **Three-font system.** **Besley** (Clarendon: masthead, headlines, section heads, display numerals — verified to cover Arabic-transliteration diacritics), **Source Serif 4** (`--font-serif-text`: article full text, ledes, long-form reading), **Public Sans** (UI, labels, datelines). Track Besley display sizes at `-0.01em`, NOT the full `--tracking-tight` (slab serifs clog).
4. **Neutral is correct — twice.** Light surfaces stay near-white at chroma ~0.002 (no cream, no parchment). Dark mode is the **warm "lamplit reading room"** set (hue ~70–80, chroma ~0.012), deliberately not blue-cool dashboard dark.
5. **Restraint with color.** Primary appears as: focus state, current/active state (nav tab, active filter chips), dateline interpuncts, categorical dots, the duotone hero plate, key counts. Never as per-row badge fills, never on heading text, never as decorative wash or gradient.
6. **Computational honesty.** AI-generated metadata gets explicit visual treatment that signals provenance — not cosmetically blended into human-authored fields.
7. **Multilingual rigor.** FR / EN / AR transliteration get equivalent typographic treatment in every face used (test `ḥ ṣ ḍ ṭ ẓ ʿ ā ī ū` before adopting any font). Tabular figures everywhere alignment matters.

## Color Philosophy

The system is **OKLCH-based** because equal lightness steps look equal (HSL is perceptually uneven). All primary variants derive from a single `--primary-base` hex (admin-overridable) via `color-mix(in oklab, …)` so customizations cascade through every focus ring, glow, blockquote, and hover state without manual tuning. A second admin-overridable seed `--secondary-base` (slate) feeds `--secondary` — a **data-only** colour consumed by the IwacVisualizations charts (series 2 / corpus comparison), never UI chrome. See [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md).

- **Light surfaces**: `oklch(99% 0.002 60)` — near-white with imperceptible warm tint. No cream, no parchment.
- **Light inks**: cool-neutrals (`oklch(13–54% 0.008–0.012 264)`) — reads as "objective / scholarly."
- **Dark mode**: warm deep neutrals — surfaces `oklch(12–20% 0.012 ~70)`, inks `oklch(59–97% 0.006–0.010 ~75)`. The lamplit register pairs with the burnt orange and distinguishes IWAC from blue-dark dashboards.
- **Primary**: IWAC orange, slightly darkened from raw hex in light theme (`color-mix(--primary-base, black 8%)`), lightened in dark.
- **Duotone hero**: the homepage banner renders the collage as a grayscale plate multiplied over a primary ground (`_banner.scss`) — the one big color statement, automatically on-brand for any admin-configured primary.
- **Shadows**: neutral, used sparingly (panels); rows and tags use rules instead.

## Visual Guidelines

- **Masthead header** (`view/common/header.phtml` + `_header.scss` + `_navigation.scss`): wordmark row (Besley 800) + uppercase nav strip, closed by a 2px `--ink-strong` rule. Full nav is visible from `$lg` (1024px); the drawer + slim ink hamburger serve below — the drawer speaks the same register (solid `--surface`, uppercase entries on hairline rules, indented sub-entries; no glass, no pill buttons). In the masthead row only the search box flexes (it has a `min-width` floor); the icon controls never shrink, and below `$sm` the wordmark swaps to the per-site acronym (theme setting `site_title_acronym` — IWAC / CIAO; full title stays in the DOM as the link's accessible name). The active section gets a 2px primary tab on the closing rule.
- **Datelines**: `TYPE · PUBLISHER · DATE` in tracked uppercase with primary interpuncts (`.item-dateline`, built in `view/omeka/site/item/show.phtml`) — the recurring identity device.
- **Banner**: the full hero (text overlay, Ken Burns settle, LCP preload) renders on the homepage only; inner pages carry a slim `.banner--compact` band of the same duotone plate (no text, no scrim, no animation, `fetchpriority="low"`) so pages don't open on bare whitespace between the section strip and the title (`layout.phtml` + `_banner.scss`).
- **Quiet chrome.** Footer opens with the mirroring 2px ink rule; partner logos sit grayscale until hover. `backdrop-filter` is reserved for the sticky header, nowhere else — and so is `--surface-overlay` (it is translucent glass; opaque popovers/tooltips use `--surface`). A quiet outlined back-to-top control (`#back-to-top`, bottom end corner) appears after ~a viewport of scroll.
- **Tight transitions** (150–200ms). No bouncing, no elastic, no hover-triggered hero animations.
- **Visible focus states** on every interactive element. **Reduced motion respected** everywhere.

## Component Styling Approach

- **Resource show metadata** (item, media, item-set): dateline, then Besley headline, then flat rows of facts with hairline separators, uppercase labels in `--muted`, 168px label column. Selectors are child-scoped (`> dl > .property > dd`) — value-annotation tooltips nest their own `dl` inside a `dd`, and descendant selectors leak the column layout into them. Multi-value rows (subjects, spatial, languages) flow inline with primary interpuncts; descriptions/abstracts stay in the column as prose blocks (language tag inline at the head of the text); `bibo:content` breaks out full-width — label line above, `--font-serif-text` at `--measure-narrow` from the left edge. Linked-value thumbnails and the RightsStatements badge render as quiet 2.25rem inline marks, never hidden (image-only values like `dcterms:rights` would otherwise show empty rows; the badge cap needs `!important` because the module inline-styles `height:4em`). The lede (`bibo:shortDescription`, "DescriptionAI") keeps the `.property--ai` info-tinted block treatment.
- **Resource browse / search results** (IwacSearch module): ledger rows — hairline-ruled `<li>`s, dateline eyebrow, Besley title, 2-line snippet, quiet interpunct source line, outlined type chip with a categorical dot (active = primary border + wash, NOT filled orange).
- **Categorical type colors** (shared with IwacVisualizations badges): article `--primary`, publication `--secondary`, audiovisual `--info`, document `--warning`, reference `--muted`; entity Personnes `--info`, Lieux `--success`, Organisations `--warning`. Always as dots on outlined chips, never pastel fills.
- **Facets**: quiet borders, high density; active counts as primary tabular text (no filled pills); no accent rails.
- **Breadcrumbs**: plain uppercase crumb line (no chip box), current page marked with primary dot.
- **Pagination**: hairline top border, no primary tint as default.
- **KPI / summary figures** (IwacVisualizations): "almanac" entries — 2px ink rule on top, eyebrow label, Besley numeral; the featured figure's rule turns primary. No card boxes, no gradients, no hover lifts.

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
- **Uniform card treatments** that flatten information hierarchy — and cards in general where a rule would do.
- **Random per-class colors** (the old crc32-pastel resource tags) — category colors come from the fixed semantic map above.
