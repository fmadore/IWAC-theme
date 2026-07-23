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

const ROOT = path.join(__dirname, '..');

function* walk(dir, exts) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            yield* walk(full, exts);
        } else if (exts.some((e) => entry.name.endsWith(e))) {
            yield full;
        }
    }
}

const defined = new Set();
const DECL_RE = /(--[a-z0-9-]+)\s*:/gi;
const SET_RE = /setProperty\(\s*['"](--[a-z0-9-]+)['"]/g;

for (const file of walk(path.join(ROOT, 'asset/sass'), ['.scss'])) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(DECL_RE)) defined.add(m[1]);
}
for (const file of walk(path.join(ROOT, 'view'), ['.phtml'])) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(DECL_RE)) defined.add(m[1]);
}
for (const file of walk(path.join(ROOT, 'asset/js'), ['.js'])) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(SET_RE)) defined.add(m[1]);
}

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
