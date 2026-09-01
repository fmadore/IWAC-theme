'use strict';

/**
 * Oklab / OKLCH ↔ sRGB, shared by the scripts that have to resolve a colour the
 * browser would compute.
 *
 * This lived inside build-tokens.js until the PWA screenshot generator needed
 * the same `color-mix(in oklab, …)` the hero's stylesheet performs. Two copies
 * of colour maths is exactly the drift this repo keeps getting bitten by, so
 * the maths moved here rather than being pasted — same reason versions.js and
 * theme-tokens.js exist. The constants are the standard Oklab matrices
 * (Björn Ottosson); `npm run build:tokens` regenerating tokens.json byte for
 * byte is the test that the move was faithful.
 *
 * Colours are '#rrggbb' strings on the way in and out.
 */

const srgbToLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

const linToSrgb = (c) => {
    c = Math.max(0, Math.min(1, c));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
};

const hexToLin = (h) => {
    const n = parseInt(h.slice(1), 16);
    return [srgbToLin((n >> 16 & 255) / 255), srgbToLin((n >> 8 & 255) / 255), srgbToLin((n & 255) / 255)];
};

const linToOklab = (r, g, b) => {
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
        0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
};

const oklabToLin = (L, a, b) => {
    const p = L + 0.3963377774 * a + 0.2158037573 * b;
    const q = L - 0.1055613458 * a - 0.0638541728 * b;
    const t = L - 0.0894841775 * a - 1.291485548 * b;
    const l = p ** 3, m = q ** 3, s = t ** 3;
    return [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
};

const oklabToHex = (L, a, b) => {
    const [r, g, bl] = oklabToLin(L, a, b);
    const f = (x) => Math.round(linToSrgb(x) * 255).toString(16).padStart(2, '0');
    return '#' + f(r) + f(g) + f(bl);
};

const oklchToHex = (L, C, h) =>
    oklabToHex(L, C * Math.cos(h * Math.PI / 180), C * Math.sin(h * Math.PI / 180));

const hexToOklab = (hex) => linToOklab(...hexToLin(hex));

/**
 * `color-mix(in oklab, a <pctA>%, b <100-pctA>%)`, for the simple two-colour,
 * fully-opaque case. build-tokens.js keeps its own resolver for the general
 * form (omitted percentages, nested `var()`, `transparent`); this is the
 * shorthand for callers that already hold two hex literals.
 */
const mixOklab = (hexA, hexB, pctA) => {
    const wa = pctA / 100;
    const [la, aa, ba] = hexToOklab(hexA);
    const [lb, ab, bb] = hexToOklab(hexB);
    return oklabToHex(la * wa + lb * (1 - wa), aa * wa + ab * (1 - wa), ba * wa + bb * (1 - wa));
};

module.exports = {
    srgbToLin,
    linToSrgb,
    hexToLin,
    linToOklab,
    oklabToLin,
    oklabToHex,
    oklchToHex,
    hexToOklab,
    mixOklab,
};
