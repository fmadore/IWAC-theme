# Mirador viewer — theming

The [Mirador module](https://omeka.org/s/modules/Mirador/) embeds a Mirador 4
IIIF viewer. Mirador is a React / Material-UI app: it renders its **own** MUI
theme and does **not** read the page's CSS custom properties. So the theme
tokens (`--primary`, `--surface`, …) cannot reach it as `var(--token)` — MUI
needs concrete colours and chokes on `oklch()` / `color-mix()`.

This file is the **single source of truth** for the Mirador palette. The values
below are the theme's OKLCH tokens converted to sRGB hex (see _Regenerating_).
Light/dark switching at runtime is handled automatically by the theme — see
_How the toggle works_.

## Where to set it

The module merges config from three levels (lowest → highest precedence):

1. **Global default** — _Admin → Modules → Mirador_ (applies to every site).
2. **Per-site JSON** — _Site settings → Mirador_ (a JSON object merged over the default).
3. **Per-item** — the `Mirador (v4): Config (item)` property, merged per resource.

**Set the palette once at the highest shared level you can** — the global
default config (covers `westafrica` + `afrique_ouest` in one place) or, failing
that, the per-site JSON on each site. Do **not** paste it per item: that is the
fragile pattern this file replaces. Remove any per-item `Config (item)` palettes
once the shared config is in place; keep per-item config only for genuine
one-off overrides.

## Config (paste this)

```json
{
  "osdConfig": {
    "maxZoomPixelRatio": 10
  },
  "selectedTheme": "light",
  "themes": {
    "light": {
      "palette": {
        "mode": "light",
        "primary":    { "main": "#ce4115" },
        "secondary":  { "main": "#ce4115" },
        "shades":     { "dark": "#f4f1ef", "main": "#fdfcfb", "light": "#ffffff" },
        "background": { "default": "#f7f5f3", "paper": "#fdfcfb" },
        "text":       { "primary": "#13161c", "secondary": "#3f4349" },
        "divider":    "#ced1d6"
      }
    },
    "dark": {
      "palette": {
        "mode": "dark",
        "primary":    { "main": "#ec653f" },
        "secondary":  { "main": "#ec653f" },
        "shades":     { "dark": "#080503", "main": "#110c08", "light": "#1a1510" },
        "background": { "default": "#080503", "paper": "#1a1510" },
        "text":       { "primary": "#e7e4df", "secondary": "#b5b0aa" },
        "divider":    "#352f28"
      }
    }
  }
}
```

`selectedTheme` is just the first-paint default; the theme JS overrides it with
the visitor's actual light/dark choice on load (see below).

## How the toggle works

`asset/js/mirador-theme-sync.js` watches `body[data-theme]` (and the system
preference) and dispatches `mirador/UPDATE_CONFIG` with `{ selectedTheme }` to
every viewer's Redux store, flipping Mirador between the `light` and `dark`
palettes above. **No per-page wiring is needed** — defining both palettes in the
shared config is enough; the JS does the rest. `asset/sass/components/mirador/_mirador.scss`
only contains z-index containment and resets for theme styles that leak into
MUI panels — no colour overrides.

## Token → palette mapping

Both Mirador palettes are derived from the theme's colour tokens
(`asset/sass/abstracts/variables/_colors.scss`), so the viewer reads as part of
the page rather than a bolted-on widget.

| MUI palette key                  | Light token → hex            | Dark token → hex             |
| -------------------------------- | ---------------------------- | ---------------------------- |
| `primary.main` / `secondary.main`| `--primary` `#ce4115`        | `--primary` `#ec653f`        |
| `shades.dark`                    | `--surface-sunken` `#f4f1ef` | `--background` `#080503`      |
| `shades.main`                    | `--surface` `#fdfcfb`        | `--surface` `#110c08`        |
| `shades.light`                   | `--white` `#ffffff`          | `--surface-raised` `#1a1510` |
| `background.default`             | `--background` `#f7f5f3`     | `--background` `#080503`     |
| `background.paper`               | `--surface` `#fdfcfb`        | `--surface-raised` `#1a1510` |
| `text.primary`                   | `--ink` `#13161c`            | `--ink` `#e7e4df`            |
| `text.secondary`                 | `--ink-light` `#3f4349`      | `--ink-light` `#b5b0aa`      |
| `divider`                        | `--border` `#ced1d6`         | `--border` `#352f28`         |

`secondary` is set to `--primary` (orange), not the theme's `--secondary` slate:
slate is a **data-only** series colour (charts), never UI chrome, and Mirador's
`secondary` is chrome.

## Regenerating after a token change

If the surface/ink/primary tokens in `_colors.scss` change, recompute the hex
with this self-contained script (no deps) and update the table + config above:

```js
// node regen-mirador-palette.js
const srgbToLin=c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4;
const linToSrgb=c=>{c=Math.max(0,Math.min(1,c));return c<=0.0031308?12.92*c:1.055*c**(1/2.4)-0.055;};
const hexToLin=h=>{const n=parseInt(h.slice(1),16);return[srgbToLin((n>>16&255)/255),srgbToLin((n>>8&255)/255),srgbToLin((n&255)/255)];};
const linToOklab=(r,g,b)=>{const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);return[.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];};
const oklabToLin=(L,a,b)=>{const p=L+.3963377774*a+.2158037573*b,q=L-.1055613458*a-.0638541728*b,t=L-.0894841775*a-1.291485548*b,l=p**3,m=q**3,s=t**3;return[4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s];};
const toHex=(L,a,b)=>{const[r,g,bl]=oklabToLin(L,a,b),f=x=>Math.round(linToSrgb(x)*255).toString(16).padStart(2,'0');return'#'+f(r)+f(g)+f(bl);};
const oklch=(L,C,h)=>toHex(L,C*Math.cos(h*Math.PI/180),C*Math.sin(h*Math.PI/180));
// color-mix(in oklab, base, black|white p%)
const mix=(hex,to,p)=>{const[r,g,b]=hexToLin(hex),A=linToOklab(r,g,b);return toHex(A[0]*(1-p)+to[0]*p,A[1]*(1-p)+to[1]*p,A[2]*(1-p)+to[2]*p);};
const BLACK=[0,0,0],WHITE=[1,0,0];
console.log('light --primary', mix('#e64a19',BLACK,0.08));  // #ce4115
console.log('dark  --primary', mix('#e64a19',WHITE,0.12));  // #ec653f
console.log('light surface  ', oklch(0.992,0.002,60));      // #fdfcfb
console.log('dark  surface  ', oklch(0.16,0.012,70));       // #110c08
// …repeat oklch(L,C,h) for each token in _colors.scss
```
