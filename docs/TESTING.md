# Testing

How the theme is tested, from the fastest check to the slowest. `npm run verify` runs
everything the Quality workflow's frontend job runs; the sections below say what each
layer can and cannot see. Process document: export-ignored, not shipped.

| Layer | Command | Runs on | Needs |
|---|---|---|---|
| Static guards | `npm run lint`, `check:tokens`, `check:versions`, `check:css`, … | sources and artifacts | Node |
| PHP helpers and templates | `npm run test:php`, `check:fixtures` (`check:php` runs both) | FakeView | PHP 8.4+ |
| Omeka compatibility, PHPStan | `test/php/omeka-compatibility.php`, `phpstan analyse` | the official Omeka S 4.2.1 release | PHP, `OMEKA_PATH` (CLAUDE.md, Build) |
| JS behaviour | `npm test`, `test:minified` | jsdom on the rendered fixtures | Node |
| **Local browsers** | `npm run test:browser` | Chromium, Firefox, WebKit on the rendered fixtures | Playwright browsers |
| Live sites | `npm run test:live`, `test:live:lighthouse` | islam.zmo.de, after a release | network |

## Rendered fixtures

`test/php/render-fixtures.php` renders `layout.phtml` around the real content templates
through FakeView into `test/fixtures/rendered/*.html` (+ `manifest.json`: each page's URL,
language, whether it is an AJAX answer, and the templates it used). They are committed;
`npm run check:fixtures` fails when a template changed without `npm run build:fixtures`.
The jsdom suite and the browser suite both run on these pages, so a renamed hook in a
`.phtml` fails a test instead of the live site.

## Local browser regressions

`npm run test:browser` (`playwright.local.config.js`, specs in `test/browser/`) serves
the rendered pages at their own URLs on a routed origin, `https://iwac.test`, together
with the theme's committed `asset/` — the compiled CSS, the minified scripts the
templates load, the self-hosted fonts — and drives them in Chromium, Firefox and WebKit.
No Omeka, no database, no PHP at test time, no network: every request to another origin
is aborted and recorded (`test/browser/fixtures.js`).

What the origin adds, because FakeView prints no `headMeta()`/`headLink()`: a
`<meta charset="utf-8">` (WebKit otherwise decodes the page as windows-1252) and the
`<link>` to `asset/css/style.css`. AJAX requests (`X-Requested-With`) are answered with
the fixture rendered for that exact URL as an AJAX answer, else with the whole page
rendered for it; anything else 404s, which is why the console shows a few 404s from
`linked-resources.js` warming pages nobody rendered. Media files are a placeholder
image.

What it covers:

- **Masthead and navigation** at 320, 390, 768, 1024 and 1440px: no horizontal scroll,
  wordmark inside the viewport, the drawer toggle below 1024px and the section strip
  from 1024px, no third-party request.
- **Menu drawer:** opens, moves focus in, traps Tab and Shift+Tab, makes the page inert,
  closes on Escape and hands focus back to the toggle; resets when the viewport crosses
  the desktop breakpoint.
- **No JavaScript:** the section strip and the search field still work.
- **Theme toggle:** system → light → dark, persisted across a reload (the head script
  paints the stored theme first), back to system clears it; still cycles with storage
  blocked.
- **Language switcher:** a disclosure — click, Escape, focus back to the button.
- **Browse:** the masonry grid packs without overlaps in several columns; the list
  toggle swaps layouts in place, keeps focus and adds no history entry; a phone has no
  horizontal scroll. The exhibit page's masonry Media blocks fill their row (the 2.27.1
  regression).
- **Linked resources:** an AJAX page turn by keyboard swaps the rows in place, updates
  the address, keeps focus inside the listing, and Back restores the first page without
  a reload.
- **Citation panel:** arrow keys move between styles (roving tabindex); Copy always
  reports a result (copied, or the text selected with instructions).
- **Reduced motion:** the carousel does not start its slideshow.
- **Accessibility:** axe (`wcag2a`, `wcag2aa`), scoped to the header, navigation,
  content, footer, linked-resources roots and open drawer, in light and dark. Each scope
  must exist on the page, so a surface cannot pass by being absent. The dateline's
  decorative middots are excluded (WCAG 1.4.3 exempts pure decoration; WebKit's run is
  the one that measures `oklab()` colours — the others report them as "incomplete", so
  colour contrast is really asserted by `check:tokens` rule 9 and by WebKit here).
- **Forced colours** (Chromium only — the emulation is Chromium's): the focus outline
  survives, and the theme toggle's Lucide mask keeps a visible glyph.
- **200% text** at 768 and 1280px: no horizontal scroll, the h1 inside the viewport.
  At 390px it is a known failure, kept as `test.fixme`: the masthead's tool row needs
  more than a phone's width once text is enlarged (13px over at 150%, 131px at 200%).

Running it:

```bash
npx playwright install chromium firefox webkit   # once per @playwright/test version
npm run test:browser                              # all three engines
npm run test:browser -- --project=chromium        # one engine
npm run test:browser -- test/browser/header.spec.js -g drawer
IWAC_BROWSER_CHANNEL=msedge npm run test:browser -- --project=chromium   # an installed Edge
```

Failures keep a trace and a screenshot under `test-results/local/`
(`npx playwright show-trace <trace.zip>`). CI's `local-browsers` job (build.yml) runs the
suite on every push and pull request, caches the browsers per Playwright version, and
uploads `test-results/local` when it fails.

Writing a spec: open a fixture with `openFixture(page, 'item.en')`, find controls the way
a reader does (role and name) where the markup allows, and assert what a reader would
notice — position, focus, visibility, the address — rather than class names alone. A page
the suite needs and the renderer does not make yet is a new entry in
`test/php/render-fixtures.php`, never hand-written HTML.
