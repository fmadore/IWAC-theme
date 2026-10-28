#!/usr/bin/env node
/**
 * Compiled-CSS integrity — the artifact checks, not the source checks.
 *
 *     node scripts/check-compiled-css.js            (npm run check:css; part of npm run build)
 *     node scripts/check-compiled-css.js --root=<dir>
 *
 * check-token-usage.js reads asset/sass. A defect can be absent from every
 * Sass source and still ship, because the BUILD introduced it — this reads
 * the built asset/css/*.css and nothing else. Modelled on DRE-theme's
 * scripts/check-compiled-css.mjs, which exists because of a real one:
 *
 *   Dart Sass announces a non-ASCII stylesheet with `@charset "UTF-8";` in
 *   expanded output but with a bare U+FEFF BOM in compressed output. DRE's
 *   header step only recognised the @charset form, so the BOM landed
 *   mid-file, welded to the first selector — `<U+FEFF>:root{…}` matches no
 *   element, and 63 declarations (the whole spacing scale) evaluated to
 *   nothing. One invisible character; not one Sass file was wrong.
 *
 * Checks, per asset/css/<entry>.css (one per asset/sass entry point):
 *   1. it exists and has rules
 *   2. it starts with `@charset "UTF-8";`, and that is the only @charset
 *   3. no U+FEFF anywhere
 *   4. the entry's theme header comment follows, and its Version is
 *      config/theme.ini's — a stylesheet not rebuilt after `npm run bump`
 *   5. no selector carries a BOM or a control character (it can never match)
 *   6. every var(--x) without a fallback is defined somewhere in the file
 *      (an undefined one computes to nothing and drops its declaration)
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const rootArg = process.argv.find((arg) => arg.startsWith('--root='));
const ROOT = rootArg ? path.resolve(rootArg.slice('--root='.length)) : path.join(__dirname, '..');

// Tokens a stylesheet may reference without defining, because the page
// defines them at runtime. Keep it short and say why. (None today: the
// admin colour settings are written over tokens the stylesheet defines.)
const RUNTIME_TOKENS = new Set([]);

function lineOf(css, index) {
    return css.slice(0, index).split('\n').length;
}

function check(name, css, themeVersion) {
    const findings = [];
    if (!css.trim()) return [`${name}: empty`];

    // 2. @charset first, exactly once.
    if (!css.startsWith('@charset "UTF-8";')) {
        findings.push(`${name}: does not start with @charset "UTF-8"; — it starts ${JSON.stringify(css.slice(0, 30))}`);
    }
    for (const match of css.matchAll(/@charset/gi)) {
        if (match.index !== 0) findings.push(`${name}:${lineOf(css, match.index)}  @charset after the start of the file — browsers ignore it there`);
    }

    // 3. BOM anywhere.
    const bom = css.indexOf('\uFEFF');
    if (bom !== -1) {
        findings.push(`${name}:${lineOf(css, bom)}  U+FEFF BOM at offset ${bom} — Sass emits one instead of @charset in `
            + `compressed output, and anywhere but byte 0 it kills the rule it lands on. `
            + `Context: ${JSON.stringify(css.slice(bom, bom + 40))}`);
    }

    // 4. The header, current.
    const header = css.match(/^@charset "UTF-8";\n(\/\*[\s\S]*?\*\/)\n/);
    if (!header || !/^Theme Name: /m.test(header[1])) {
        findings.push(`${name}: the theme header comment (Theme Name, Version, …) does not follow @charset`);
    } else {
        const version = header[1].match(/^Version: (.+)$/m)?.[1];
        if (themeVersion && version !== themeVersion) {
            findings.push(`${name}: header says Version ${version}, config/theme.ini says ${themeVersion} — run \`npm run build\``);
        }
    }

    // 1. Rules after the header.
    const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
    if (!/\{[^}]*\}/.test(noComments)) findings.push(`${name}: no rules`);

    // 5. Selectors that can never match.
    for (const match of noComments.matchAll(/(^|[};])\s*([^{};]+)\{/g)) {
        const selector = match[2];
        if (/^\s*@/.test(selector)) continue;
        const bad = [...selector].find((ch) => {
            const c = ch.charCodeAt(0);
            return c === 0xfeff || (c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) || (c >= 0x7f && c <= 0x9f);
        });
        if (bad) {
            findings.push(`${name}: selector contains U+${bad.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')} `
                + `and can never match: ${JSON.stringify(selector.slice(0, 60))}`);
        }
    }

    // 6. var() references nothing defines.
    const defined = new Set();
    for (const match of noComments.matchAll(/[{;]\s*(--[\w-]+)\s*:/g)) defined.add(match[1]);
    const withoutFallback = new Set();
    for (const match of noComments.matchAll(/var\(\s*(--[\w-]+)\s*([,)])/g)) {
        if (match[2] === ')') withoutFallback.add(match[1]);
    }
    for (const token of withoutFallback) {
        if (!defined.has(token) && !RUNTIME_TOKENS.has(token)) {
            findings.push(`${name}: var(${token}) has no definition and no fallback — it computes to nothing`);
        }
    }
    return findings;
}

const sassDir = path.join(ROOT, 'asset', 'sass');
const names = fs.readdirSync(sassDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.scss') && !entry.name.startsWith('_'))
    .map((entry) => entry.name.replace(/\.scss$/, '.css'))
    .sort();
const iniPath = path.join(ROOT, 'config', 'theme.ini');
const themeVersion = fs.existsSync(iniPath)
    ? fs.readFileSync(iniPath, 'utf8').match(/^version\s*=\s*"([^"]+)"/m)?.[1] ?? null
    : null;

const findings = [];
for (const name of names) {
    const file = path.join(ROOT, 'asset', 'css', name);
    if (!fs.existsSync(file)) {
        findings.push(`${name}: missing — run \`npm run build:css\``);
        continue;
    }
    findings.push(...check(name, fs.readFileSync(file, 'utf8'), themeVersion));
}

if (findings.length) {
    console.error(`✗ compiled CSS integrity: ${findings.length} finding(s)\n`);
    for (const finding of findings) console.error(`  ${finding}`);
    process.exit(1);
}
console.log(`✓ compiled CSS integrity: ${names.join(', ')} — @charset first, header current, no BOM, no dead selector, no unresolvable var()`);
