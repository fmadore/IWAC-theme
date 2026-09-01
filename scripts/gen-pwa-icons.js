'use strict';

/**
 * Generate the PWA / favicon icon set from the ZMO signet.
 *
 * The collection is published by the Leibniz-Zentrum Moderner Orient, and the
 * institute's mark is what a reader recognises in a tab strip or on a home
 * screen — so the app icon is the ZMO signet (the Z / M / O grid, no wordmark)
 * on the theme's paper ground. It replaced a white newspaper glyph on a
 * burnt-orange tile in 2.17.0: the tile was loud, it was not the collection's
 * identity, and it disagreed with the ZMO favicon Omeka serves from the site
 * settings — two different icons for one site.
 *
 * Geometry lives in asset/img/zmo-mark.svg (lifted from the institute's own
 * vector logo); this script only recolours and scales it into tiles.
 *
 * Output: asset/img/pwa/*.png — committed to the repo (like the banner images)
 * so the theme has no runtime image pipeline.
 *
 * Re-run after changing the mark or the tile ground:  npm run build:icons
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { mixOklab } = require('./lib/oklab');
const DUOTONE = require('./lib/hero-duotone');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'asset', 'img', 'pwa');
const MARK_FILE = path.join(ROOT, 'asset', 'img', 'zmo-mark.svg');
const BANNER_FILE = path.join(ROOT, 'asset', 'img', 'banner.webp');

// Colours come from the generated tokens.json, never from a literal here, so
// the icons' paper is the site's paper and the screenshot's ground is the
// hero's ground. The outputs are static: re-run this script after a token
// change — `npm run check:tokens` is what tells you they have drifted.
const [TILE_BG, PRIMARY] = (() => {
    const tokens = JSON.parse(fs.readFileSync(path.join(ROOT, 'tokens.json'), 'utf8'));
    return ['--surface', '--primary'].map((name) => {
        const value = tokens.light && tokens.light[name];
        if (!value) {
            throw new Error(`tokens.json carries no light ${name} — run \`npm run build:tokens\` first.`);
        }
        return value;
    });
})();

// The hero's ground: `color-mix(in oklab, var(--primary) 90%, black 10%)`,
// performed here exactly as the browser performs it in _banner.scss.
const BANNER_GROUND = mixOklab(PRIMARY, '#000000', DUOTONE.GROUND.primaryPct);

// The ZMO brand values, spelled exactly as they appear in zmo-mark.svg.
const BOX_STROKE = '#EB8241';
const LETTER_FILL = '#143C73';
const BASE_STROKE_WIDTH = '1.417';

// Parse the master: its viewBox is the signet's stroked bounding box, so the
// box dimensions below are the mark's true extent — no trimming needed.
const MARK = (() => {
    const svg = fs.readFileSync(MARK_FILE, 'utf8');
    const open = svg.match(/<svg\b[^>]*>/);
    const viewBox = svg.match(/viewBox="([^"]+)"/);
    if (!open || !viewBox) {
        throw new Error(`${path.basename(MARK_FILE)} is not an SVG with a viewBox.`);
    }
    const [x, y, width, height] = viewBox[1].trim().split(/[\s,]+/).map(Number);
    const body = svg.slice(open.index + open[0].length, svg.lastIndexOf('</svg>'));
    return { x, y, width, height, body };
})();

/**
 * Recolour the mark. Works on the presentation attributes of the two groups in
 * zmo-mark.svg rather than on a stylesheet, so the output renders identically in
 * every SVG rasteriser. Each substitution is asserted: a re-exported master that
 * inlines these per shape would otherwise silently emit the wrong colours.
 *
 * @param {object} opts
 * @param {string} opts.stroke      colour of the three boxes
 * @param {string} opts.fill        colour of the Z / M / O letters
 * @param {number} opts.strokeWidth box stroke width, in mark units
 * @param {boolean} opts.letters    keep the Z / M / O letterforms (see below)
 */
function restyle({ stroke, fill, strokeWidth, letters = true }) {
    const swaps = [
        [`stroke="${BOX_STROKE}"`, `stroke="${stroke}"`],
        [`fill="${LETTER_FILL}"`, `fill="${fill}"`],
        [`stroke-width="${BASE_STROKE_WIDTH}"`, `stroke-width="${strokeWidth}"`],
    ];
    const recoloured = swaps.reduce((svg, [from, to]) => {
        if (!svg.includes(from)) {
            throw new Error(`${path.basename(MARK_FILE)} no longer contains ${from} — see the note in that file.`);
        }
        return svg.replaceAll(from, to);
    }, MARK.body);
    if (letters) {
        return recoloured;
    }
    // 16px only: a letter is ~4px tall there, which renders as three grey
    // smudges inside the boxes and reads worse than nothing. Dropping them
    // leaves the signet's silhouette — the part that still survives at that
    // size. The 32px tile keeps the letters; nothing above it is affected.
    const lettersGroup = new RegExp(`<g fill="${fill}">[\\s\\S]*?</g>`);
    if (!lettersGroup.test(recoloured)) {
        throw new Error(`${path.basename(MARK_FILE)}: no letters group to drop — see the note in that file.`);
    }
    return recoloured.replace(lettersGroup, '');
}

/**
 * Centre the mark in a square of `size` and work out its stroke width.
 *
 * Below ~64px the logo's own 1.417-unit hairline resolves to a fraction of a
 * pixel and the grid greys out, so the stroke is hinted up to a visible
 * minimum. Large tiles keep the mark's true proportions (the floor is inert).
 */
function placement(size, markFrac, minStroke) {
    const scale = (markFrac * size) / MARK.width;
    return {
        scale,
        tx: (size - MARK.width * scale) / 2,
        ty: (size - MARK.height * scale) / 2,
        strokeWidth: Number(Math.max(Number(BASE_STROKE_WIDTH), minStroke / scale).toFixed(3)),
    };
}

const round = (n) => Number(n.toFixed(4));

const markGroup = (p, marked) =>
    `<g transform="translate(${round(p.tx)} ${round(p.ty)}) scale(${round(p.scale)})`
    + ` translate(${-MARK.x} ${-MARK.y})">${marked}</g>`;

/**
 * Compose a square tile with the signet centred.
 * @param {number} size   pixel size (square)
 * @param {object} opts
 * @param {number} opts.markFrac   mark width as a fraction of the tile
 * @param {number|null} opts.radius corner radius in px, or null for a full square
 * @param {boolean} opts.bg    draw the paper tile (false → transparent, mark only)
 * @param {boolean} opts.mono  render the mark as one flat colour (monochrome purpose)
 * @param {number} opts.minStroke  floor for the *rendered* box stroke, in px
 * @param {boolean} opts.letters   keep the Z / M / O letterforms (16px drops them)
 */
function tileSvg(size, { markFrac, radius = null, bg = true, mono = false, minStroke = 1, letters = true }) {
    const p = placement(size, markFrac, minStroke);
    const ink = mono ? '#000000' : null;
    const marked = restyle({
        stroke: ink ?? BOX_STROKE,
        fill: ink ?? LETTER_FILL,
        strokeWidth: p.strokeWidth,
        letters,
    });
    const bgRect = bg
        ? `<rect width="${size}" height="${size}"${radius != null ? ` rx="${radius}" ry="${radius}"` : ''} fill="${TILE_BG}"/>`
        : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`
        + bgRect
        + markGroup(p, marked)
        + `</svg>`;
}

/**
 * The scalable favicon — one file, one look, sharp at every size a browser
 * asks for.
 *
 * It carried a `prefers-color-scheme: dark` rule for exactly one release
 * (2.17.0, dropped in 2.17.1). The negative it switched to is ZMO's own — dark
 * ground, orange boxes, white type — and it is drawn for a poster, not for a
 * 32px tile: against dark browser chrome the ground vanished, the orange
 * hairlines were left floating, and the white letters ran into them. The logo
 * simply reads better on its paper. So the icon set is now light in both
 * schemes, and a white tile on a dark tab strip is the ordinary, legible thing.
 *
 * Keep it that way unless ZMO publishes a signet drawn *for* small dark
 * surfaces; scaling the poster negative down is what was wrong.
 *
 * Geometry is the 32px tile's, baked in: browsers rasterise this at whatever
 * size they need, and 32 device pixels is what a favicon slot asks for on a
 * HiDPI screen. Below that the hinted stroke thins out — the PNGs still cover
 * 16px for the browsers that prefer them.
 */
function faviconSvg({ size = 32, markFrac = 0.88, radius = 5, minStroke = 1 } = {}) {
    const p = placement(size, markFrac, minStroke);
    const marked = restyle({ stroke: BOX_STROKE, fill: LETTER_FILL, strokeWidth: p.strokeWidth });
    // Careful with the XML comment below: it may not contain a double hyphen,
    // which rules out spelling the custom property in it. A comment that breaks
    // the parse takes the whole favicon down and every renderer just shows a
    // broken image — assertParses() below is what caught that the first time.
    //
    // `class="tile"` styles nothing. It is the hook `npm run check:tokens`
    // reads to compare this file's ground against tokens.json; without it the
    // guard would have to guess which <rect> is the tile (the mark contributes
    // three more).
    return `<!-- GENERATED by scripts/gen-pwa-icons.js (npm run build:icons) — do not edit.\n`
        + `     Master geometry: asset/img/zmo-mark.svg. Colours: the light surface token in tokens.json. -->\n`
        + `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Leibniz-Zentrum Moderner Orient">`
        + `<rect class="tile" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${TILE_BG}"/>`
        + markGroup(p, marked)
        + `</svg>`;
}

/**
 * Rasterise one tile and assert it came out at the size the manifest promises.
 *
 * No `density` override: the tile SVG carries pixel width/height, and sharp
 * multiplies those by density/72 — a "quality" bump there emits a 2731px
 * favicon that looks perfect in every preview and is wrong in every manifest.
 * Hence the assertion rather than a comment.
 */
async function render(size, svg, file) {
    const out = path.join(OUT_DIR, file);
    const { width, height } = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
    if (width !== size || height !== size) {
        throw new Error(`${file}: rendered ${width}×${height}, expected ${size}×${size}.`);
    }
    console.log('  ✓', path.relative(path.join(__dirname, '..'), out), `(${size}px)`);
}

/**
 * Render one manifest screenshot: the hero collage, duotoned offline exactly
 * as the browser duotones it on the homepage.
 *
 * The install dialog should show the site as it looks, and the banner master is
 * a plain colour photograph — the orange is applied by CSS. So the composite is
 * redone here from the recipe in lib/hero-duotone.js:
 *
 *   grayscale(1) → contrast(1.04) → brightness(1.22), multiplied over the
 *   ground, the whole plate at 90% opacity. Which collapses, per channel, to
 *   `ground × (0.9 · plate + 0.1)`.
 *
 * The luma matrix and the two filter steps run on sRGB values, not linear
 * light, because that is what CSS filter functions do — matching the browser
 * matters more here than being colorimetrically pure.
 *
 * @param {object} crop   sharp extract region of asset/img/banner.webp
 * @param {number} width  output width
 * @param {number} height output height
 */
async function screenshot(crop, width, height, file) {
    const { LUMA, FILTER, PLATE_OPACITY } = DUOTONE;
    const ground = [1, 3, 5].map((i) => parseInt(BANNER_GROUND.slice(i, i + 2), 16));

    const { data, info } = await sharp(BANNER_FILE)
        .extract(crop)
        .resize(width, height, { fit: 'cover' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const out = Buffer.alloc(info.width * info.height * 3);
    for (let i = 0, p = 0; i < out.length; i += 3, p += info.channels) {
        let g = (LUMA.r * data[p] + LUMA.g * data[p + 1] + LUMA.b * data[p + 2]) / 255;
        g = (g - 0.5) * FILTER.contrast + 0.5;      // contrast()
        g = g * FILTER.brightness;                  // brightness()
        g = Math.max(0, Math.min(1, g));
        const k = PLATE_OPACITY * g + (1 - PLATE_OPACITY); // multiply, then plate opacity
        out[i] = Math.round(ground[0] * k);
        out[i + 1] = Math.round(ground[1] * k);
        out[i + 2] = Math.round(ground[2] * k);
    }

    const dest = path.join(OUT_DIR, file);
    await sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } })
        .webp({ quality: 72, effort: 6 })
        .toFile(dest);

    // The manifest states these dimensions in a `sizes` string it cannot
    // measure (the helper runs per request; opening the image there would be
    // waste). So the writer asserts the reader: change a size here without
    // changing the helper and the build stops, rather than shipping a manifest
    // that describes files it doesn't have.
    const helper = fs.readFileSync(path.join(ROOT, 'helper', 'PwaManifest.php'), 'utf8');
    if (!helper.includes(`'sizes' => '${width}x${height}'`)) {
        throw new Error(
            `helper/PwaManifest.php does not declare '${width}x${height}' for ${file} — update its screenshots entry.`,
        );
    }

    const kib = (fs.statSync(dest).size / 1024).toFixed(1);
    console.log('  ✓', path.relative(path.join(__dirname, '..'), dest), `(${width}×${height}, ${kib} KiB)`);
}

/**
 * Rasterise the favicon markup and throw if it does not parse.
 *
 * The PNGs are proof-read by the eye; the SVG is the one output that ships as
 * text and can be malformed while looking fine in a diff — an XML comment
 * carrying a double hyphen took it down once, and a broken favicon fails
 * silently (browsers show the fallback, or nothing). librsvg ignores the media
 * query, so this asserts the parse, not the dark palette.
 */
async function assertParses(svg) {
    try {
        await sharp(Buffer.from(svg)).png().toBuffer();
    } catch (err) {
        throw new Error(`favicon.svg is not valid SVG and was not written: ${err.message}`);
    }
}

async function main() {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    console.log('Generating PWA icons →', path.relative(process.cwd(), OUT_DIR));

    const emit = (size, opts, file) => render(size, tileSvg(size, opts), file);

    // "any" purpose: rounded-square tile (≈ iOS squircle), mark at 72%.
    // Browsers that do not mask show the rounded tile as-is.
    await emit(192, { markFrac: 0.72, radius: 192 * 0.22 }, 'icon-192.png');
    await emit(512, { markFrac: 0.72, radius: 512 * 0.22 }, 'icon-512.png');

    // "maskable" purpose: full-bleed tile, mark kept small (60% wide → a 72%
    // diagonal) so it stays inside the 80%-diameter safe zone under any platform
    // mask (circle, squircle…).
    await emit(192, { markFrac: 0.6, radius: null }, 'icon-maskable-192.png');
    await emit(512, { markFrac: 0.6, radius: null }, 'icon-maskable-512.png');

    // "monochrome" purpose (themed/monochrome surfaces): transparent bg, one ink.
    await emit(512, { markFrac: 0.78, bg: false, mono: true }, 'icon-monochrome-512.png');

    // iOS home-screen icon: iOS applies its own rounded mask and dislikes
    // transparency → full opaque square, no baked rounding.
    await emit(180, { markFrac: 0.72, radius: null }, 'apple-touch-icon.png');

    // Favicons. The mark runs nearly edge to edge and the hairline is hinted up:
    // at 32px the logo's own stroke would be half a pixel of pale orange. The
    // 16px tile keeps the boxes and drops the letters (see restyle()).
    await emit(32, { markFrac: 0.88, radius: 5, minStroke: 1 }, 'favicon-32.png');
    await emit(16, { markFrac: 0.92, radius: 2, minStroke: 1, letters: false }, 'favicon-16.png');

    // The scalable favicon. Browsers that take it never touch the PNGs; those
    // that don't (Safari, older engines) fall back to them, and both look alike.
    const svgOut = path.join(OUT_DIR, 'favicon.svg');
    const svg = faviconSvg();
    await assertParses(svg);
    fs.writeFileSync(svgOut, svg + '\n', 'utf8');
    console.log('  ✓', path.relative(path.join(__dirname, '..'), svgOut), '(scalable, one look in both schemes)');

    // Manifest `screenshots`: what turns Chrome's terse install bar into the
    // richer dialog. Chrome wants every screenshot of one form factor to share
    // an aspect ratio, each side within 320–3840px and no more than 2.3× the
    // other. The master is 1400×787 (≈16:9), so `wide` is the whole frame and
    // `narrow` a 9:16 slice of it — the collage crops without losing its sense.
    await screenshot({ left: 0, top: 0, width: 1400, height: 787 }, 1280, 720, 'screenshot-wide.webp');
    await screenshot({ left: 430, top: 0, width: 443, height: 787 }, 540, 960, 'screenshot-narrow.webp');

    console.log('Done.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
