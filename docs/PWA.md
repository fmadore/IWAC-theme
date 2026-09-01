# Progressive Web App (PWA)

The theme makes each Omeka S site **installable** as an app — "Add to Home
Screen" on mobile, "Install" in the desktop browser — with a brand icon and a
quiet install button in the footer. There is **no auto-popup**: the button
only appears when the browser can actually install the site.

The button sat in the masthead until it was moved. On a 375px phone that row already
carries search, language, theme and the hamburger, and a fifth control squeezed
the wordmark to "IW…". Installing is a once-ever action, so it moved to the
footer bottom bar beside the social links, where there is room to label it
rather than leave a bare download glyph to be guessed at.

## What ships

| Piece | File |
|-------|------|
| Per-site web-app manifest (built at runtime) | `view/layout/layout.phtml` (JSON island) + `asset/js/pwa-install.js` |
| Install button + iOS hint | `view/common/footer.phtml`, `asset/sass/components/footer/_pwa-install.scss` |
| Icons (app / maskable / monochrome / Apple / favicons) | `asset/img/pwa/*.png` |
| Scalable favicon (generated — do not hand-edit) | `asset/img/pwa/favicon.svg` |
| Icon master (ZMO signet, vector) | `asset/img/zmo-mark.svg` |
| Icon generator | `scripts/gen-pwa-icons.js` (`npm run build:icons`) |
| Enable/disable toggle | `config/theme.ini` → **General Settings → Enable PWA** (default on) |

## How it behaves

- **Chromium (desktop + Android).** The browser fires `beforeinstallprompt`;
  the script suppresses the default mini-infobar and reveals the footer
  install button instead. Clicking it shows the native install prompt.
- **iOS Safari.** No programmatic install exists, so the same button reveals a
  short, dismissible "Share → Add to Home Screen" hint (still click-only).
- **Already installed / unsupported browsers.** The button stays hidden — no
  dead control.

The manifest carries the per-site `name`/`short_name` (site title + masthead
acronym), `start_url`, `scope`, `theme_color`, icons, categories, and Browse /
Search shortcuts. `lang`/`dir` follow the current locale.

## Two design decisions worth knowing

**Why a `blob:` manifest, not a static file or `data:` URL.** A manifest's
`start_url`/`scope` must be *same-origin* with the manifest URL. A `data:` URL
has an opaque origin, so Chrome rejects it. A static `.webmanifest` file in the
theme can't carry per-site values (the theme serves multiple sites) and themes
can't register an Omeka route to generate one. So `layout.phtml` emits the
manifest as a JSON island and `pwa-install.js` turns it into a same-origin
`blob:` URL (a blob inherits the document origin), resolving every URL to
absolute first.

**Why no service worker.** Omeka serves theme assets from
`/themes/<theme>/asset/`, which is **not** a parent path of a site
(`/s/<slug>/`). A service worker's scope is capped at the path it's served
from, so a theme-shipped SW could only ever control its own asset folder —
useless for offline navigation. Broadening it requires the
`Service-Worker-Allowed` response header, i.e. server config the theme can't
set. Chrome and Edge **dropped the service-worker requirement for
installability** (Chrome 108 mobile / 112 desktop), so the manifest alone makes
the site installable. If offline caching is ever wanted, it belongs at the
server level (a root-scoped SW), not in the theme.

## The icon is the ZMO signet

Every icon in the set — app, maskable, monochrome, Apple, both favicons — is the
Z / M / O grid of the Leibniz-Zentrum Moderner Orient logo on the theme's paper
ground (the light `--surface`, read from `tokens.json`). The geometry is the institute's
own vector logo, cropped to the signet and committed as
[`asset/img/zmo-mark.svg`](../asset/img/zmo-mark.svg); the generator only
recolours and scales it.

Three things this settles, and they are the reasons not to redesign it away:

- **One site, one icon.** Omeka serves the ZMO logo as the site favicon from
  **Admin → Settings → Favicon**, and core emits that `<link rel="icon">` through
  `headLink()` — *next to* the theme's own sized favicon links. Until 2.17.0 the
  two disagreed (ZMO logo vs. a white newspaper glyph on a burnt-orange tile) and
  which one a given surface showed — tab, bookmark, link preview — was down to
  each browser's icon-picking heuristics. They now agree, so the answer no longer
  matters. Keep it that way: an icon change here needs the admin asset changed
  too, or the disagreement comes back.
- **The wordmark is deliberately dropped.** "LEIBNIZ ZENTRUM MODERNER ORIENT" is
  four lines of type; it is unreadable at 192px and a grey smear at 32. The
  signet is the part of the logo that scales.
- **The two favicons are optically hinted, not just scaled down.** The logo's
  1.417-unit box stroke resolves to under half a pixel on a 32px tile, which
  renders as pale orange mush, so `minStroke` floors the *rendered* stroke at
  ~1px there (the large tiles keep the mark's true proportions — the floor is
  inert). At 16px a letter is about four pixels tall and turns into three grey
  smudges, so `letters: false` drops them and keeps the boxes: the silhouette is
  what still reads at that size. Both are deliberate; a "fix" that scales one
  master to every size brings the mush back.

### One look in both colour schemes — the dark variant was tried and dropped

`favicon.svg` is listed **first** in `<head>` and is the same light icon
whatever the browser's theme. It is there for sharpness, not for theming:
engines that support SVG icons rasterise it at whatever size they need, and
Safari and older engines ignore an `image/svg+xml` icon and fall through to the
PNGs, which look the same.

**2.17.0 shipped a `@media (prefers-color-scheme: dark)` rule in this file and
2.17.1 removed it.** The variant was faithful — ZMO's own negative keeps the
boxes orange and turns only the type white — and it still read badly at icon
size: against dark browser chrome the dark ground disappeared, leaving orange
hairlines floating with white letters running into them. A poster negative does
not survive being scaled to 32px. A white tile on a dark tab strip is the
ordinary, legible thing, and the logo belongs on its paper.

So `npm run check:tokens` now fails on a `prefers-color-scheme` string anywhere
in the generated favicon: re-adding one is a regression, not an upgrade. It
would take a signet ZMO drew *for* small dark surfaces to change that.

Two constraints stay baked into the generated file, both learned the hard way:

- **The tile colour is a presentation attribute, not CSS.** A renderer with no
  stylesheet support still paints the right icon rather than an unstyled black
  square. Same reason there is no `var()` in there.
- **An XML comment cannot contain a double hyphen.** The generated header
  comment therefore can't name the custom property it reads. A malformed favicon
  fails *silently* — every browser just shows the fallback — so the generator
  rasterises the markup before writing it and refuses to emit a file that does
  not parse.

`npm run check:tokens` asserts the tile colour against `tokens.json` light
`--surface`. The PNGs hold the same colour in pixels where nothing can compare
it, so when the SVG is stale the whole set is.

### Regenerating

They're committed files — there's no runtime image pipeline. After changing the
mark or the tile ground:

```bash
npm run build:icons
```

> Note: the outputs are static, so neither an admin override of **Primary Color**
> (which no longer tints them at all) nor a token change re-renders them — re-run
> the script. Note too that `npm run build` does **not** call it: the guard above
> is what tells you the set has drifted. A `screenshots` manifest member (for the
> richer desktop install dialog) is intentionally omitted — add per-site
> screenshots later if desired.
