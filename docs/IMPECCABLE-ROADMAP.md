# Impeccable Evaluation Roadmap

How the [Impeccable design skill](https://github.com/anthropics) (v4.1.1+) is used to
evaluate and refine IWAC-theme and its two coupled modules, given the project's two
structural constraints: **no local Omeka S instance** and a **cross-repo design-token
contract** with [IwacSearch](https://github.com/fmadore/IwacSearch) and
[IwacVisualizations](https://github.com/fmadore/IwacVisualizations).

Status tracking lives in the companion GitHub issue; this document is the reference.

---

## 1. Artifact layer (migration — done)

The skill's current format replaced the older single-file convention. As of August 2026
the project carries:

| Artifact | Role |
|---|---|
| `PRODUCT.md` (root) | Durable product truth: users, positioning, constraints, WCAG 2.2 AA target |
| `DESIGN.md` (root) | Machine-readable design system: YAML token frontmatter + canonical sections, North Star **"The Research Broadsheet"** |
| `.impeccable/design.json` | Sidecar: dark palette, tonal ramps, shadows/motion/breakpoints, live component snippets, narrative rules |
| `docs/DESIGN-PHILOSOPHY.md` | The register (unchanged, still binding) — prose authority `DESIGN.md` derives from |
| `docs/DESIGN-SYSTEM.md` | Cross-repo token contract with generated tables (unchanged) |

**Drift rule:** `DESIGN.md`'s frontmatter mirrors `tokens.json` **light** values.
`tokens.json` is normative. Until the guard in §5 exists, any token change must be
followed by an `/impeccable document` refresh.

## 2. Testing without a local Omeka instance

There is no local/dev Omeka S. The answer to "can we test by injecting CSS/JS into the
live site?" is **yes, and the rig already exists** — safely, because nothing is written
to the server. `.claude/live-proxy.js` (machine-local, gitignored) reverse-proxies
`https://islam.zmo.de` on `localhost:5179` and rewrites responses in flight:

- **Theme CSS swap** — the deployed `style.css` is replaced by the local build
  (`asset/css/style.css`), so any Sass change renders against real production HTML.
- **Module asset swap** — `/modules/IwacSearch/asset/` and
  `/modules/IwacVisualizations/asset/` are served from the local repos, so module
  redesigns preview without a deploy (Svelte couples scoped-class hashes across JS+CSS,
  hence whole-folder mapping).
- **Control markers** — `?__theme=light|dark` seeds the theme preference,
  `__scroll=N` for sectional screenshots, `__focus=<selector>` for focus-state shots
  (transitions killed so the settled ring paints).
- **Screenshots** — `.claude/shot.ps1` drives headless Chrome at any viewport;
  `.claude/launch.json` lets the in-app browser preview attach to the proxy for
  interactive checks.
- **Harnesses** — `/__cite-harness` (citation panel without a PHP deploy) and
  `/__preview-patch.js` (DOM-morph approximating not-yet-deployed PHP template
  changes) cover the cases where CSS alone can't express a template change.

Limits to keep in mind: PHP template changes only preview via the DOM-morph
approximation (real verification lands with the release); admin-configured block stacks
can't be changed from the rig; and evaluation traffic hits the production server, so
keep screenshot batches reasonable.

**Every visual claim in an Impeccable pass must be grounded in this rig — both themes
(light + dark), and at minimum the 1440px and 375px viewports.**

## 3. Demo-page map

Known-good live pages exercising each surface. EN site shown; swap
`/s/westafrica/` ↔ `/s/afrique_ouest/` for French (item IDs are shared). Through the
proxy, prefix with `http://localhost:5179`.

| Surface / component | URL (path) | What it exercises |
|---|---|---|
| Homepage | `/s/westafrica/page/home` | Duotone hero + Ken Burns, masthead search + typeahead, two-tier stat strip, collection-overview block |
| Newspaper article | `/s/westafrica/item/67700` | Dateline, metadata ledger, AI lede + EU "AI GENERATED" mark, Mirador, citation panel, linked resources |
| Islamic publication | `/s/westafrica/item/24073` | Template 21: structured AI table of contents (`ai-toc`), Mirador multi-page |
| Fileless audiovisual | `/s/westafrica/item/108353` | `videoEmbeds` block (YouTube ingest — Mirador renders nothing here by design) |
| Index entry (person) | `/s/westafrica/item/1023` | Authority-record layout, linked resources, mentions sparkline (241 occurrences) |
| Academic reference | `/s/westafrica/item/5235` | Reference metadata layout, external links |
| Browse / search | `/s/westafrica/page/browse` | IwacSearch: ledger rows, type chips + categorical dots, facets, List↔Gallery, pagination |
| References search | `/s/westafrica/page/references` | IwacSearch scoped variant |
| Index browse | `/s/westafrica/page/index` | Entity browsing, entity type colors |
| Country page | `/s/westafrica/page/benin` | Country dashboards (IwacVisualizations) |
| Collection overview | `/s/westafrica/page/collection-overview` | ECharts KPI almanac + charts |
| Entity networks | `/s/westafrica/page/entity-networks` | Force-graph visualization |
| Places | `/s/westafrica/page/spatial-exploration` | MapLibre |
| Press attitudes (AI) | `/s/westafrica/page/sentiment-analysis` | Sentiment scales (`--iwac-vis-*` data colors) |
| Compare newspapers | `/s/westafrica/page/comparison` | `--secondary` data color in anger |
| Exhibit | `/s/westafrica/page/hajj-bf` | Long-form editorial blocks, asset captions |
| About | `/s/westafrica/page/about` | Read-mode prose, block groups |
| Ask with AI | `/s/westafrica/page/ai-access` | MCP onboarding page |
| 404 | any bad path | Error page register |

## 4. Phased roadmap

Each phase = one or a few Impeccable commands, a triage step, and a verification pass
on the rig. Modes per surface: **Operate** (browse/search, explore dashboards, index),
**Read** (item pages, about, exhibits), **Persuade** (homepage — it must earn the
first-time visitor's descent into the instrument).

### Phase 0 — Migrate the artifact layer ✅
`PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json` created; cross-references added.

### Phase 1 — Evaluate (no code changes)
1. `/impeccable critique` on each of the four core surfaces (homepage, item show,
   browse/search, one explore dashboard) — heuristic scoring in the surface's mode,
   desktop + mobile, light + dark. Output: scored findings list per surface.
2. `/impeccable audit` on the same surfaces — technical checks: WCAG 2.2 AA (contrast,
   focus, targets, reflow), performance (the PageSpeed-40 history makes this
   non-optional), responsive behavior at the six contract breakpoints.
3. Run the mechanical detector once over the theme's Sass/templates
   (`detect.mjs --json`) and record findings.
4. **Triage** every finding into: theme / IwacSearch / IwacVisualizations /
   admin-config-only / third-party module (Mirador, IWAC-SEO) / wontfix-by-register
   (violates DESIGN-PHILOSOPHY.md). This routing step is what keeps the coupling
   manageable — a finding on `/page/browse`'s facets is an IwacSearch issue even
   though it was found through a theme evaluation.

### Phase 2 — Fix (scoped refinement commands)
Work the Phase 1 backlog with the narrow commands, one concern per pass, verified on
the rig before commit: `/impeccable clarify` (UX copy, labels, empty states — both
languages), `/impeccable adapt` (breakpoint/viewport findings), `/impeccable harden`
(error states, i18n edge cases, long Arabic-transliteration strings, slow-network
states), `/impeccable optimize` (performance findings), `/impeccable polish` (final
pass per surface). Module-routed findings become PRs in IwacSearch /
IwacVisualizations using the same token vocabulary; admin-only findings become a
documented checklist for the site admin rather than code.

### Phase 3 — Enhance (optional, register-guarded)
Only after Phase 2, and always inside the anti-cliché guardrail: `/impeccable typeset`
(the three-font system's hierarchy), `/impeccable layout` (spacing rhythm),
`/impeccable animate` (the 150–300ms grammar; reduced-motion parity). `bolder` /
`delight` / `overdrive` are **out of scope by default** — the register is restraint;
any use needs an explicit brief first.

### Phase 4 — Systemize (keep it true over time)
1. **Guard the frontmatter**: extend `scripts/build-tokens.js` (or `check:tokens`) to
   assert `DESIGN.md` frontmatter values equal `tokens.json` light values — the
   repo's "publish and assert" doctrine applied to the new artifact. Until then,
   refresh `DESIGN.md` manually on any token change.
2. **Hook the detector**: `/impeccable hooks on` so UI edits get auto-scanned.
3. **Wire live mode**: point the skill's live config at the proxy (`node
   .claude/live-proxy.js`, port 5179) so `/impeccable live` variant iteration runs
   against production HTML.
4. **Refresh cadence**: re-run `/impeccable document` after any redesign that touches
   tokens or component grammar; run `/impeccable doctor` after skill upgrades.

## 5. Cross-repo protocol

- The theme owns every token; modules may own only `--iwac-vis-*` data-encoding
  colors. A finding that needs a **new** token is a cross-repo change: add in
  `asset/sass/abstracts/variables/`, `npm run build` + `npm run sync:tokens`, rebuild
  both modules against their guards.
- Mirador stays concrete-hex (`docs/MIRADOR.md`); palette findings there are module
  config edits, not theme CSS.
- Definition of done, theme-side: `npm run check:tokens` + `npm run build` clean,
  `npm run test` (Playwright) green, rig screenshots in both themes, and — since the
  live site installs release ZIPs — a `v*` release with all four version declarations
  bumped. A merged PR alone ships nothing.
