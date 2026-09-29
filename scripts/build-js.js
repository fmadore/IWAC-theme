#!/usr/bin/env node
/**
 * build-js.js — minify the theme's browser scripts.
 *
 *   asset/js/<name>.js  →  asset/js/dist/<name>.min.js  (+ <name>.min.js.map)
 *
 *   npm run build:js     write them (part of `npm run build`)
 *   npm run check:js-dist  fail if a committed .min.js no longer matches its source,
 *                          or a template still loads a source instead of its twin
 *
 * WHY. Every page loaded the theme's scripts as written — comments, long
 * names, whitespace: ~74 KB raw of site-wide script before 2.22 made the plate
 * viewer and the Mirador sync conditional. The sources stay the thing that is
 * edited, reviewed and unit-tested; what a page loads is their minified twin.
 *
 * WHAT IT DOES NOT DO. No bundling and no module format: each file is a
 * classic script that shares state through `window` (IWACUtils, the PWA
 * install island, …), and esbuild's transform keeps top-level names as they
 * are when no format is set, so the globals the scripts publish and read
 * survive. `npm run test:minified` runs the whole behaviour suite against the
 * minified files to prove it, rather than trusting this paragraph.
 *
 * Vendored files that ship pre-minified (`*.min.js`, e.g. MiniMasonry) are
 * not inputs here: templates keep loading them from asset/js/ as they are.
 *
 * Source maps are linked (`//# sourceMappingURL=`), point at the sources in
 * asset/js/, and embed them, so a devtools session on the live site reads the
 * original code; the browser fetches a map only when devtools are open.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'asset', 'js');
const OUT_DIR = path.join(SRC_DIR, 'dist');
const CHECK = process.argv.includes('--check');

// The browsers the theme supports (package.json browserslist: last 2
// versions, Safari/iOS ≥ 16.2). Minification never RAISES the syntax level;
// the target only stops esbuild choosing a newer spelling than these parse.
const TARGET = ['chrome109', 'edge109', 'firefox115', 'safari16.2', 'ios16.2'];

const sources = fs.readdirSync(SRC_DIR)
    .filter((f) => f.endsWith('.js') && !f.endsWith('.min.js'))
    .sort();

function build(file) {
    const name = file.replace(/\.js$/, '');
    const result = esbuild.buildSync({
        entryPoints: [path.join(SRC_DIR, file)],
        outfile: path.join(OUT_DIR, `${name}.min.js`),
        bundle: false,
        minify: true,
        sourcemap: 'linked',
        sourcesContent: true,
        target: TARGET,
        charset: 'utf8',
        legalComments: 'none',
        write: false,
        logLevel: 'warning',
    });
    // Map `sources` are written relative to the output: "../<name>.js".
    return result.outputFiles.map((o) => ({ path: o.path, text: o.text }));
}

const outputs = sources.flatMap(build);
const expected = new Set(outputs.map((o) => o.path));
const stale = fs.existsSync(OUT_DIR)
    ? fs.readdirSync(OUT_DIR).map((f) => path.join(OUT_DIR, f)).filter((p) => !expected.has(p))
    : [];

// A template that names `js/<source>.js` ships the unminified file and nothing
// fails — the page still works. So the check reads the templates too.
function sourceReferences() {
    const names = new Set(sources);
    const found = [];
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const target = path.join(dir, entry.name);
            if (entry.isDirectory()) { walk(target); continue; }
            if (!/\.(phtml|php)$/.test(entry.name)) continue;
            const text = fs.readFileSync(target, 'utf8');
            const re = /assetUrl\(\s*['"]js\/([\w.-]+\.js)['"]\s*\)/g;
            let m;
            while ((m = re.exec(text))) {
                if (names.has(m[1])) {
                    const line = text.slice(0, m.index).split('\n').length;
                    found.push(`${path.relative(ROOT, target)}:${line} loads js/${m[1]} — use js/dist/${m[1].replace(/\.js$/, '.min.js')}`);
                }
            }
        }
    };
    walk(path.join(ROOT, 'view'));
    return found;
}

if (CHECK) {
    const problems = [];
    for (const o of outputs) {
        const current = fs.existsSync(o.path) ? fs.readFileSync(o.path, 'utf8') : null;
        if (current === null) problems.push(`missing ${path.relative(ROOT, o.path)}`);
        else if (current !== o.text) problems.push(`stale ${path.relative(ROOT, o.path)}`);
    }
    for (const p of stale) problems.push(`orphaned ${path.relative(ROOT, p)} (its source is gone)`);
    if (problems.length) {
        console.error('✗ minified scripts are out of date — run `npm run build:js` and commit asset/js/dist:');
        problems.forEach((p) => console.error('  ' + p));
    }
    const refs = sourceReferences();
    if (refs.length) {
        console.error('✗ templates load unminified theme scripts:');
        refs.forEach((r) => console.error('  ' + r));
    }
    if (problems.length || refs.length) process.exit(1);
    console.log(`✓ asset/js/dist matches its ${sources.length} sources, and templates load only the twins`);
} else {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    for (const o of outputs) fs.writeFileSync(o.path, o.text);
    for (const p of stale) fs.unlinkSync(p);
    let raw = 0, min = 0;
    for (const file of sources) {
        raw += fs.statSync(path.join(SRC_DIR, file)).size;
        min += fs.statSync(path.join(OUT_DIR, file.replace(/\.js$/, '.min.js'))).size;
    }
    console.log(`✓ minified ${sources.length} scripts: ${raw} B → ${min} B (-${Math.round((1 - min / raw) * 100)}%) in asset/js/dist/`);
}
