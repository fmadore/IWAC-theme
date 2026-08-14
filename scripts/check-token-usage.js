#!/usr/bin/env node
/**
 * check-token-usage.js — two mechanical rules over asset/sass/.
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

if (failures.length) {
    console.error('✗ Design-token violations in asset/sass:');
    failures.forEach((f) => console.error('  ' + f));
    process.exit(1);
}
console.log(`✓ token usage: every var(--…) resolves and every font-size comes from the scale (${defined.size} tokens defined)`);
