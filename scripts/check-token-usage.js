#!/usr/bin/env node
/**
 * check-token-usage.js — three mechanical rules over the theme's sources.
 *
 * 1. NAMES. Fail when any var(--token) doesn't resolve to a defined custom
 *    property. CLAUDE.md rule: "Never invent CSS custom property names —
 *    undefined tokens fail silently at runtime."
 *
 *    A token counts as defined when it is declared:
 *     - in any SCSS file (`--name: …;`),
 *     - inline in a template (`--name:` in view/**.phtml — e.g. the brand
 *       seeds injected by layout.phtml), or
 *     - at runtime by theme JS (`setProperty('--name', …)`).
 *
 * 2. TYPE SCALE. Fail on a `font-size` set to an ABSOLUTE literal (px / rem /
 *    pt) instead of a --text-* token. The theme is the source of truth for the
 *    scale, and it was reaching around its own scale in two places while the
 *    modules did it a hundred times — "when the source of truth reaches around
 *    its own scale twice, the consumers will reach around it a hundred times"
 *    (design review 2026-08, F3). Relative units (em, %, unitless) stay legal:
 *    they scale WITH the token their parent set, so they don't fork the scale.
 *
 * 3. PWA THEME-COLOR. The two <meta name="theme-color"> values in
 *    view/layout/layout.phtml are hand-written copies of --surface, one per
 *    colour scheme. A <meta> cannot read a custom property, so the copy is
 *    unavoidable — but an unasserted copy is exactly the shape of drift this
 *    repo has been bitten by before ("drift here has never been a discipline
 *    problem; it is a coverage problem"). Compare them against the published
 *    tokens.json and fail on disagreement.
 */
'use strict';

const fs = require('fs');
const path = require('path');

// Shared with build-tokens.js, which publishes the same set as `names` in
// tokens.json so the sibling modules can run this check too.
const { collectDefinedTokenNames, walk } = require('./lib/theme-tokens');

const ROOT = path.join(__dirname, '..');

const defined = collectDefinedTokenNames(ROOT);

const USE_RE = /var\(\s*(--[a-z0-9-]+)/gi;
// Absolute font-size literals only. `em` / `%` / unitless / `0` are relative
// to whatever token the cascade already set, so they don't fork the scale.
const ABS_FONT_SIZE_RE = /font-size:\s*(-?[\d.]+(?:px|rem|pt))\b/i;
// Files that legitimately set absolute sizes: the vendored normalize reset
// (it predates the scale and its job is to neutralise UA defaults) and the
// print sheet (physical units — pt — have no screen token).
const TYPE_SCALE_EXEMPT = [
    path.join('asset', 'sass', 'generic', '_normalize.scss'),
    path.join('asset', 'sass', 'utilities', '_print.scss'),
];

const failures = [];
for (const file of walk(path.join(ROOT, 'asset/sass'), ['.scss'])) {
    const rel = path.relative(ROOT, file);
    const typeScaleExempt = TYPE_SCALE_EXEMPT.includes(rel);
    const src = fs.readFileSync(file, 'utf8');
    const lines = src.split('\n');
    lines.forEach((line, i) => {
        // Skip pure comment lines.
        if (/^\s*\/\//.test(line)) return;
        for (const m of line.matchAll(USE_RE)) {
            if (!defined.has(m[1])) {
                failures.push(`${rel}:${i + 1}  var(${m[1]}) is not defined anywhere`);
            }
        }
        if (!typeScaleExempt) {
            const m = ABS_FONT_SIZE_RE.exec(line);
            if (m) {
                failures.push(`${rel}:${i + 1}  font-size: ${m[1]} — use a --text-* token (--text-2xs is the floor)`);
            }
        }
    });
}

// ---------------------------------------------------------------------------
// 3. PWA theme-color metas must equal --surface for their scheme.
//
// Compared against tokens.json, the artifact both sibling repos already treat
// as normative. NOTE the ordering inside `npm run build`: check:tokens runs
// BEFORE build:tokens, so on the very build that changes --surface this reads
// the previous tokens.json. That's why the failure message names both sides and
// says which command refreshes the artifact — the guard is exact in steady
// state, and drift can survive at most one build.
// ---------------------------------------------------------------------------
const LAYOUT_PHTML = path.join('view', 'layout', 'layout.phtml');
const TOKENS_JSON = path.join(ROOT, 'tokens.json');
// Attribute order is fixed by the template, but don't depend on it: find any
// theme-color meta, read the scheme out of its media query and the value out of
// its content attribute.
const THEME_COLOR_RE = /<meta\s+[^>]*name="theme-color"[^>]*>/gi;
const SCHEME_RE = /prefers-color-scheme:\s*(light|dark)\s*\)/i;
const CONTENT_RE = /content="\s*(#[0-9a-f]{3,8})\s*"/i;

// tokens.json publishes 6-digit lowercase; accept shorthand in the template.
function normalizeHex(hex) {
    const h = hex.trim().toLowerCase();
    return h.length === 4
        ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]
        : h;
}

const themeColorFailures = [];
let tokens = null;
try {
    tokens = JSON.parse(fs.readFileSync(TOKENS_JSON, 'utf8'));
} catch (e) {
    themeColorFailures.push(`tokens.json is unreadable (${e.message}) — run \`npm run build:tokens\``);
}

if (tokens) {
    const layoutSrc = fs.readFileSync(path.join(ROOT, LAYOUT_PHTML), 'utf8');
    const found = new Map();
    for (const match of layoutSrc.matchAll(THEME_COLOR_RE)) {
        const tag = match[0];
        const scheme = SCHEME_RE.exec(tag);
        const content = CONTENT_RE.exec(tag);
        if (!scheme || !content) {
            themeColorFailures.push(
                `${LAYOUT_PHTML}  theme-color meta with no readable colour scheme or content: ${tag.trim()}`
            );
            continue;
        }
        found.set(scheme[1].toLowerCase(), normalizeHex(content[1]));
    }

    for (const scheme of ['light', 'dark']) {
        const expected = tokens[scheme] && tokens[scheme]['--surface'];
        const actual = found.get(scheme);
        if (!expected) {
            themeColorFailures.push(`tokens.json has no ${scheme}['--surface'] — run \`npm run build:tokens\``);
        } else if (!actual) {
            themeColorFailures.push(
                `${LAYOUT_PHTML}  missing <meta name="theme-color" media="(prefers-color-scheme: ${scheme})"> — the PWA status bar must state --surface (${expected})`
            );
        } else if (actual !== normalizeHex(expected)) {
            themeColorFailures.push(
                `${LAYOUT_PHTML}  theme-color (${scheme}) is ${actual} but tokens.json ${scheme}['--surface'] is ${normalizeHex(expected)} — update the meta, or run \`npm run build:tokens\` first if you just changed --surface`
            );
        }
    }
}

if (failures.length || themeColorFailures.length) {
    if (failures.length) {
        console.error('✗ Design-token violations in asset/sass:');
        failures.forEach((f) => console.error('  ' + f));
    }
    if (themeColorFailures.length) {
        console.error('✗ PWA theme-color metas disagree with --surface:');
        themeColorFailures.forEach((f) => console.error('  ' + f));
    }
    process.exit(1);
}
console.log(`✓ token usage: every var(--…) resolves and every font-size comes from the scale (${defined.size} tokens defined)`);
console.log('✓ PWA theme-color metas match tokens.json --surface (light + dark)');
