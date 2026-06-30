'use strict';

/**
 * Generate the PWA / favicon icon set from the theme's "newspaper" brand glyph.
 *
 * The IWAC identity is "a research instrument with a press-archive face", so the
 * app icon is the masthead newspaper mark in white on the brand burnt-orange
 * tile — the one big colour statement, mirroring the duotone hero. The mark is
 * neutral across sites (IWAC / CIAO share it); a text monogram would not be.
 *
 * Output: asset/img/pwa/*.png — committed to the repo (like the banner images)
 * so the theme has no runtime image pipeline.
 *
 * Re-run after changing the brand colour or glyph:  node scripts/gen-pwa-icons.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Brand burnt-orange (IWAC default primary). Kept in sync with
// config/theme.ini `primary_color`. The PNGs are static, so an admin override
// of primary_color does not re-tint them — re-run this script to match.
const BRAND = '#E64A19';
const GLYPH_FILL = '#ffffff';

// Bootstrap-Icons "newspaper" path (asset/img/newspaper.svg), 16×16 viewBox.
const GLYPH = 'M0 2.5A1.5 1.5 0 0 1 1.5 1h11A1.5 1.5 0 0 1 14 2.5v10.528c0 .3-.05.654-.238.972h.738a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 1 1 0v9a1.5 1.5 0 0 1-1.5 1.5H1.497A1.497 1.497 0 0 1 0 13.5zM12 14c.37 0 .654-.211.853-.441.092-.106.147-.279.147-.531V2.5a.5.5 0 0 0-.5-.5h-11a.5.5 0 0 0-.5.5v11c0 .278.223.5.497.5zM2 3h10v2H2zm0 3h4v3H2zm0 4h4v1H2zm0 2h4v1H2zm5-6h2v1H7zm3 0h2v1h-2zM7 8h2v1H7zm3 0h2v1h-2zm-3 2h5v1H7zm0 2h5v1H7z';

const OUT_DIR = path.join(__dirname, '..', 'asset', 'img', 'pwa');

/**
 * Compose an SVG tile.
 * @param {number} size   pixel size (square)
 * @param {object} opts
 * @param {number} opts.glyphFrac  glyph size as fraction of the tile
 * @param {number|null} opts.radius corner radius in px, or null for a full square
 * @param {boolean} opts.bg   draw the orange tile (false → transparent, glyph only)
 * @param {string} opts.fill  glyph colour
 */
function tileSvg(size, { glyphFrac, radius = null, bg = true, fill = GLYPH_FILL }) {
    const scale = (glyphFrac * size) / 16;
    const offset = (size - 16 * scale) / 2;
    const bgRect = bg
        ? `<rect width="${size}" height="${size}"${radius != null ? ` rx="${radius}" ry="${radius}"` : ''} fill="${BRAND}"/>`
        : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`
        + bgRect
        + `<g transform="translate(${offset} ${offset}) scale(${scale})" fill="${fill}">`
        + `<path d="${GLYPH}"/></g></svg>`;
}

async function render(svg, file) {
    const out = path.join(OUT_DIR, file);
    await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
    console.log('  ✓', path.relative(path.join(__dirname, '..'), out));
}

async function main() {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    console.log('Generating PWA icons →', path.relative(process.cwd(), OUT_DIR));

    // "any" purpose: rounded-square tile (≈ iOS squircle), glyph at 56%.
    // Browsers that do not mask show the rounded tile as-is.
    await render(tileSvg(192, { glyphFrac: 0.56, radius: 192 * 0.22 }), 'icon-192.png');
    await render(tileSvg(512, { glyphFrac: 0.56, radius: 512 * 0.22 }), 'icon-512.png');

    // "maskable" purpose: full-bleed tile, glyph kept small (46%) so it stays
    // inside the 80%-diameter safe zone under any platform mask (circle, squircle…).
    await render(tileSvg(192, { glyphFrac: 0.46, radius: null }), 'icon-maskable-192.png');
    await render(tileSvg(512, { glyphFrac: 0.46, radius: null }), 'icon-maskable-512.png');

    // "monochrome" purpose (themed/monochrome surfaces): transparent bg, glyph only.
    await render(tileSvg(512, { glyphFrac: 0.7, bg: false, fill: '#000000' }), 'icon-monochrome-512.png');

    // iOS home-screen icon: iOS applies its own rounded mask and dislikes
    // transparency → full opaque square, no baked rounding.
    await render(tileSvg(180, { glyphFrac: 0.56, radius: null }), 'apple-touch-icon.png');

    // Favicons.
    await render(tileSvg(32, { glyphFrac: 0.66, radius: 6 }), 'favicon-32.png');
    await render(tileSvg(16, { glyphFrac: 0.7, radius: 3 }), 'favicon-16.png');

    console.log('Done.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
