/**
 * Generate responsive WebP variants of the default hero banner.
 *
 * The banner is the homepage LCP element and is served full-bleed (sizes=100vw),
 * so we emit a width-descriptor srcset and let the browser pick. Source of truth
 * is asset/img/banner.webp (the largest, 1400w). Re-run after replacing it:
 *
 *   npm run build:images
 *
 * Every emitted variant is GRAYSCALE. _banner.scss paints the plate with
 * `filter: grayscale(1)` in both colour schemes, and the banner is hidden
 * entirely in print, so the colour channels in these files can never reach a
 * screen — they were 21-28% of each file being downloaded to be discarded at
 * paint. The master stays in colour: it is the source of truth for regeneration
 * AND the input scripts/gen-pwa-icons.js replays the duotone from, and it is
 * never served.
 *
 * Outputs (asset/img/): banner-{480,768,1024,1280,1400}.webp
 *
 * Plus the COMPACT STRIP variants used by the inner-page band
 * (.banner--compact, a full-bleed 72-112px tall strip). Those pages used to
 * reuse banner-768.webp -- a 768x432, 58 KiB image for a box rendered at
 * 375x72 CSS px, of which object-fit:cover throws away ~85% of the pixels.
 * On mobile that strip is an LCP *candidate* (it outranks any item title
 * shorter than ~2.5 lines), so those wasted bytes were landing directly on
 * Core Web Vitals. A pre-cropped centre band at the strip's own aspect ratio
 * carries the same texture in roughly a fifth of the bytes.
 *
 * Outputs (asset/img/): banner-strip-{768,1400}.webp
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const imgDir = path.resolve(__dirname, '..', 'asset', 'img');
const master = path.join(imgDir, 'banner.webp');
const WIDTHS = [480, 768, 1024, 1280, 1400];
// The hero is a duotone background (aria-hidden, grayscale plate multiplied over
// the primary ground in CSS), so it tolerates aggressive WebP compression with no
// perceptible loss — q62 roughly halves each variant vs q80 and shrinks the LCP.
const QUALITY = 62;

// Compact inner-page strip: a centre band cropped to ~6.25:1, close enough to
// the rendered box that object-fit:cover discards almost nothing. 768w covers a
// 375px phone at 2x DPR; 1400w (the master's full width -- never upscale) covers
// desktop.
const STRIP_WIDTHS = [768, 1400];
const STRIP_ASPECT = 6.25;

(async () => {
  const source = await fs.promises.readFile(master);
  const meta = await sharp(source).metadata();
  console.log(`Master banner.webp: ${meta.width}x${meta.height}, ${(source.length / 1024).toFixed(1)} KiB (left as-is)`);

  for (const w of WIDTHS) {
    if (w > meta.width) continue; // never upscale
    const out = path.join(imgDir, `banner-${w}.webp`);
    const buf = await sharp(source)
      .resize({ width: w })
      .grayscale()
      .webp({ quality: QUALITY, effort: 6 })
      .toBuffer();
    await fs.promises.writeFile(out, buf);
    console.log(`  ${path.basename(out)}: ${w}px, ${(buf.length / 1024).toFixed(1)} KiB`);
  }
  // Centre band for the compact strip.
  const bandHeight = Math.round(meta.width / STRIP_ASPECT);
  const bandTop = Math.round((meta.height - bandHeight) / 2);
  const band = await sharp(source)
    .extract({ left: 0, top: bandTop, width: meta.width, height: bandHeight })
    .toBuffer();

  for (const w of STRIP_WIDTHS) {
    if (w > meta.width) continue;
    const out = path.join(imgDir, `banner-strip-${w}.webp`);
    const buf = await sharp(band)
      .resize({ width: w })
      .grayscale()
      .webp({ quality: QUALITY, effort: 6 })
      .toBuffer();
    await fs.promises.writeFile(out, buf);
    console.log(`  ${path.basename(out)}: ${w}x${Math.round(w / STRIP_ASPECT)}, ${(buf.length / 1024).toFixed(1)} KiB`);
  }

  console.log('Done.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
