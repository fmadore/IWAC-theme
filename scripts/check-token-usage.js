#!/usr/bin/env node
/**
 * check-token-usage.js — fail the build when any var(--token) used in
 * asset/sass/ doesn't resolve to a defined custom property.
 *
 * CLAUDE.md rule: "Never invent CSS custom property names — undefined
 * tokens fail silently at runtime." This makes that rule mechanical.
 *
 * A token counts as defined when it is declared:
 *  - in any SCSS file (`--name: …;`),
 *  - inline in a template (`--name:` in view/**.phtml — e.g. the brand
 *    seeds injected by layout.phtml), or
 *  - at runtime by theme JS (`setProperty('--name', …)`).
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
const failures = [];
for (const file of walk(path.join(ROOT, 'asset/sass'), ['.scss'])) {
    const src = fs.readFileSync(file, 'utf8');
    const lines = src.split('\n');
    lines.forEach((line, i) => {
        // Skip pure comment lines.
        if (/^\s*\/\//.test(line)) return;
        for (const m of line.matchAll(USE_RE)) {
            if (!defined.has(m[1])) {
                failures.push(`${path.relative(ROOT, file)}:${i + 1}  var(${m[1]}) is not defined anywhere`);
            }
        }
    });
}

if (failures.length) {
    console.error('✗ Undefined design tokens (they fail silently at runtime):');
    failures.forEach((f) => console.error('  ' + f));
    process.exit(1);
}
console.log(`✓ token usage: every var(--…) in asset/sass resolves (${defined.size} tokens defined)`);
