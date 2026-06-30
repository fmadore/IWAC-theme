# Progressive Web App (PWA)

The theme makes each Omeka S site **installable** as an app — "Add to Home
Screen" on mobile, "Install" in the desktop browser — with a brand icon and a
quiet install button in the masthead. There is **no auto-popup**: the button
only appears when the browser can actually install the site.

## What ships

| Piece | File |
|-------|------|
| Per-site web-app manifest (built at runtime) | `view/layout/layout.phtml` (JSON island) + `asset/js/pwa-install.js` |
| Install button + iOS hint | `view/common/header.phtml`, `asset/sass/components/header/_pwa-install.scss` |
| Icons (app / maskable / monochrome / Apple / favicons) | `asset/img/pwa/*.png` |
| Icon generator | `scripts/gen-pwa-icons.js` (`npm run build:icons`) |
| Enable/disable toggle | `config/theme.ini` → **General Settings → Enable PWA** (default on) |

## How it behaves

- **Chromium (desktop + Android).** The browser fires `beforeinstallprompt`;
  the script suppresses the default mini-infobar and reveals the masthead
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

## Regenerating the icons

The icons are the masthead "newspaper" glyph in white on the brand burnt-orange
tile (the same color statement as the duotone hero). They're committed PNGs —
there's no runtime image pipeline. After changing the brand color or glyph in
`scripts/gen-pwa-icons.js`:

```bash
npm run build:icons
```

> Note: the PNGs are static, so an admin override of **Primary Color** does not
> re-tint them. Re-run the script if you want the icon to match a custom brand
> color. A `screenshots` manifest member (for the richer desktop install
> dialog) is intentionally omitted — add per-site screenshots later if desired.
