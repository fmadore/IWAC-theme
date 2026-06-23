/**
 * Generate responsive WebP variants of the default hero banner.
 *
 * The banner is the homepage LCP element and is served full-bleed (sizes=100vw),
 * so we emit a width-descriptor srcset and let the browser pick. Source of truth
 * is asset/img/banner.webp (the largest, 1400w). Re-run after replacing it:
 *
 *   npm run build:images
 *
 * banner.webp itself is the hand-optimized master and is left untouched (it is
 * already smaller than a fresh re-encode). Only the smaller variants are emitted:
 *
 * Outputs (asset/img/): banner-{480,768,1024,1280}.webp
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const imgDir = path.resolve(__dirname, '..', 'asset', 'img');
const master = path.join(imgDir, 'banner.webp');
const WIDTHS = [480, 768, 1024, 1280];
// The hero is a duotone background (aria-hidden, grayscale plate multiplied over
// the primary ground in CSS), so it tolerates aggressive WebP compression with no
// perceptible loss — q62 roughly halves each variant vs q80 and shrinks the LCP.
const QUALITY = 62;

(async () => {
  const source = await fs.promises.readFile(master);
  const meta = await sharp(source).metadata();
  console.log(`Master banner.webp: ${meta.width}x${meta.height}, ${(source.length / 1024).toFixed(1)} KiB (left as-is)`);

  for (const w of WIDTHS) {
    if (w >= meta.width) continue; // never upscale; the master covers the top width
    const out = path.join(imgDir, `banner-${w}.webp`);
    const buf = await sharp(source)
      .resize({ width: w })
      .webp({ quality: QUALITY, effort: 6 })
      .toBuffer();
    await fs.promises.writeFile(out, buf);
    console.log(`  ${path.basename(out)}: ${w}px, ${(buf.length / 1024).toFixed(1)} KiB`);
  }
  console.log('Done.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
