'use strict';

/**
 * The hero duotone recipe, as data — read by the writer AND by the guard.
 *
 * The homepage banner is a grayscale plate multiplied over the primary seed
 * (asset/sass/components/banner/_banner.scss). The PWA manifest's `screenshots`
 * member has to show the site as it actually looks, so scripts/gen-pwa-icons.js
 * performs that same composite offline, in JavaScript, over a committed WebP.
 *
 * That makes the recipe a copy of a stylesheet — the shape of drift this repo
 * has been bitten by repeatedly (see the design-token notes in CLAUDE.md). So
 * it lives here in one place: the generator renders from these numbers, and
 * `npm run check:tokens` asserts the stylesheet still spells them, naming this
 * file when it doesn't. Change the hero's duotone and the guard tells you the
 * install-dialog screenshots are stale.
 *
 * The SCSS_* strings are compared with whitespace collapsed, so reformatting
 * the stylesheet is safe; changing a number is not.
 */

module.exports = {
    // `background: color-mix(in oklab, var(--primary) 90%, black 10%)`
    GROUND: { primaryPct: 90, blackPct: 10 },

    // `filter: grayscale(1) contrast(1.04) brightness(1.22)`, in that order.
    FILTER: { contrast: 1.04, brightness: 1.22 },

    // `mix-blend-mode: multiply` at `opacity: .9` over the ground.
    PLATE_OPACITY: 0.9,

    // Rec. 709 luma — the matrix CSS `grayscale(1)` applies, on sRGB values.
    LUMA: { r: 0.2126, g: 0.7152, b: 0.0722 },

    // What the stylesheet must still say. Kept beside the numbers above so the
    // two cannot be edited apart.
    SCSS_FILE: 'asset/sass/components/banner/_banner.scss',
    SCSS_GROUND: 'background: color-mix(in oklab, var(--primary) 90%, black 10%);',
    SCSS_FILTER: 'filter: grayscale(1) contrast(1.04) brightness(1.22);',
    SCSS_OPACITY: 'opacity: 0.9;',
};
