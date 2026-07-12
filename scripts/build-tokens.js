#!/usr/bin/env node
/**
 * Design-token source-of-truth generator.
 *
 * Parses the theme's canonical OKLCH token definitions in
 * `asset/sass/abstracts/variables/_colors.scss`, resolves every opaque
 * colour token to an sRGB hex (light + dark), and writes a machine-readable
 * `tokens.json`. That JSON is THE single source of truth for the design-token
 * contract documented in docs/DESIGN-SYSTEM.md and consumed by the sibling
 * modules (IwacSearch, IwacVisualizations).
 *
 * It then:
 *   1. writes tokens.json at the theme root,
 *   2. syncs a copy into each sibling module repo (so each can run its own
 *      value-checking guard offline), and
 *   3. regenerates the fallback tables in docs/DESIGN-SYSTEM.md between
 *      `<!-- BEGIN GENERATED:* -->` / `<!-- END GENERATED:* -->` markers, so
 *      the docs can't silently drift from the SCSS.
 *
 * "Generate, don't transcribe": the colour math is identical to the runtime
 * parser in IwacVisualizations/asset/js/iwac-theme.js and the Mirador regen
 * snippet in docs/MIRADOR.md, so every consumer resolves the same hex.
 *
 * Usage: node scripts/build-tokens.js   (npm run build:tokens)
 * No dependencies.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const THEME_ROOT = path.join(__dirname, '..');
const COLORS_SCSS = path.join(THEME_ROOT, 'asset', 'sass', 'abstracts', 'variables', '_colors.scss');
const TOKENS_OUT = path.join(THEME_ROOT, 'tokens.json');
const DESIGN_DOC = path.join(THEME_ROOT, 'docs', 'DESIGN-SYSTEM.md');
const SIBLINGS = ['IwacSearch', 'IwacVisualizations'];

/* ------------------------------------------------------------------ */
/*  Colour math — Oklab/OKLCH → sRGB hex (matches MIRADOR.md regen)    */
/* ------------------------------------------------------------------ */

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
const oklchToHex = (L, C, h) => oklabToHex(L, C * Math.cos(h * Math.PI / 180), C * Math.sin(h * Math.PI / 180));
const hexToOklab = (hex) => linToOklab(...hexToLin(hex));

/** Normalise #rgb / #rrggbb (drop any alpha) to lowercase 6-digit. */
function normalizeHex(hex) {
    let h = hex.replace('#', '').toLowerCase();
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (h.length === 8 || h.length === 4) h = h.slice(0, h.length === 4 ? 3 : 6);
    return '#' + h.slice(0, 6);
}

/* ------------------------------------------------------------------ */
/*  Tiny expression evaluator for the token values                    */
/* ------------------------------------------------------------------ */

/** Split a string on a delimiter, respecting parenthesis depth. */
function splitTopLevel(str, delim) {
    const out = [];
    let depth = 0, cur = '';
    for (const ch of str) {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        if (ch === delim && depth === 0) { out.push(cur); cur = ''; }
        else cur += ch;
    }
    if (cur.trim() !== '') out.push(cur);
    return out;
}

const TRANSLUCENT = Symbol('translucent');

/**
 * Resolve a token value expression to a `#rrggbb` string, or TRANSLUCENT if
 * it mixes in `transparent` (those aren't single-hex fallbacks), or null if
 * unresolvable. `scope` maps already-resolved `--name` → hex.
 */
function resolve(value, scope) {
    let v = value.trim();
    if (v === 'transparent') return TRANSLUCENT;
    if (v === 'white') return '#ffffff';
    if (v === 'black') return '#000000';
    if (v.startsWith('#')) return normalizeHex(v);

    let m = v.match(/^var\(\s*(--[\w-]+)\s*\)$/);
    if (m) return scope[m[1]] !== undefined ? scope[m[1]] : null;

    m = v.match(/^oklch\(([^)]*)\)$/i);
    if (m) {
        const parts = m[1].trim().split(/\s+/);
        const L = parts[0].endsWith('%') ? parseFloat(parts[0]) / 100 : parseFloat(parts[0]);
        const C = parseFloat(parts[1]);
        const H = parseFloat(parts[2]);
        return oklchToHex(L, C, H);
    }

    m = v.match(/^color-mix\(\s*in\s+oklab\s*,(.*)\)$/is);
    if (m) {
        const args = splitTopLevel(m[1], ',');
        if (args.length !== 2) return null;
        const parse = (arg) => {
            arg = arg.trim();
            const pm = arg.match(/^(.*?)\s+([\d.]+)%$/);
            if (pm) return { color: pm[1].trim(), pct: parseFloat(pm[2]) };
            return { color: arg, pct: null };
        };
        const a = parse(args[0]);
        const b = parse(args[1]);
        // color-mix percentage rules: a missing percentage is (100 - other).
        let pa = a.pct, pb = b.pct;
        if (pa === null && pb === null) { pa = 50; pb = 50; }
        else if (pa === null) pa = 100 - pb;
        else if (pb === null) pb = 100 - pa;
        const ca = resolve(a.color, scope);
        const cb = resolve(b.color, scope);
        if (ca === TRANSLUCENT || cb === TRANSLUCENT) return TRANSLUCENT;
        if (!ca || !cb) return null;
        const oa = hexToOklab(ca);
        const ob = hexToOklab(cb);
        const wa = pa / (pa + pb), wb = pb / (pa + pb);
        return oklabToHex(oa[0] * wa + ob[0] * wb, oa[1] * wa + ob[1] * wb, oa[2] * wa + ob[2] * wb);
    }

    return null; // unknown form (e.g. a non-colour value) — skip
}

/* ------------------------------------------------------------------ */
/*  SCSS parsing                                                      */
/* ------------------------------------------------------------------ */

function readSeed(scss, name) {
    const m = scss.match(new RegExp(name.replace(/[-]/g, '\\-') + '\\s*:\\s*(#[0-9a-fA-F]{3,8})'));
    return m ? normalizeHex(m[1]) : null;
}

/** Extract the body of `@mixin <name> { … }` by balancing braces. */
function extractMixinBody(scss, name) {
    const start = scss.indexOf(`@mixin ${name}`);
    if (start === -1) throw new Error(`mixin ${name} not found`);
    const open = scss.indexOf('{', start);
    let depth = 0, i = open;
    for (; i < scss.length; i++) {
        if (scss[i] === '{') depth++;
        else if (scss[i] === '}') { depth--; if (depth === 0) break; }
    }
    return scss.slice(open + 1, i);
}

/** Parse `--name: value;` declarations from a mixin body, in order. */
function parseDecls(body) {
    // Strip block + line comments first so they never leak into values.
    const clean = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    const decls = [];
    for (const stmt of clean.split(';')) {
        const m = stmt.match(/(--[\w-]+)\s*:\s*([\s\S]+)/);
        if (m) decls.push({ name: m[1].trim(), value: m[2].trim() });
    }
    return decls;
}

/** Resolve every declaration in order; return { '--name': '#hex' } (opaque only). */
function resolveTheme(decls, seeds) {
    const scope = Object.assign({}, seeds);
    const out = {};
    for (const { name, value } of decls) {
        const r = resolve(value, scope);
        if (typeof r === 'string') { scope[name] = r; out[name] = r; }
        else if (r === TRANSLUCENT) { /* not a hex fallback — skip */ }
        // null → leave unresolved; later var() refs to it yield null too
    }
    return out;
}

/** Map of `--type-*` → the semantic token it references (for the docs table). */
function parseTypeMap(decls) {
    const map = {};
    for (const { name, value } of decls) {
        const m = value.match(/^var\(\s*(--[\w-]+)\s*\)$/);
        if (name.startsWith('--type-') && m) map[name] = m[1];
    }
    return map;
}

/* ------------------------------------------------------------------ */
/*  Markdown table regeneration                                       */
/* ------------------------------------------------------------------ */

function replaceBetween(doc, tag, replacement) {
    const begin = `<!-- BEGIN GENERATED:${tag} -->`;
    const end = `<!-- END GENERATED:${tag} -->`;
    const i = doc.indexOf(begin);
    const j = doc.indexOf(end);
    if (i === -1 || j === -1) return { doc, ok: false };
    return {
        doc: doc.slice(0, i + begin.length) + '\n' + replacement + '\n' + doc.slice(j),
        ok: true,
    };
}

const MAIN_ORDER = [
    '--primary', '--primary-hover', '--primary-active', '--secondary',
    '--ink-strong', '--ink', '--ink-light', '--ink-subtle', '--muted', '--ink-on-pastel',
    '--surface', '--surface-raised', '--surface-sunken', '--background',
    '--border-light', '--border', '--border-strong',
    '--success', '--warning', '--error', '--info', '--white',
];

function mainTable(tokens) {
    const rows = MAIN_ORDER.map((name) => {
        const l = tokens.light[name] || '—';
        const d = tokens.dark[name] || '—';
        return `| \`${name}\` | \`${l}\` | \`${d}\` |`;
    });
    return ['| Token | Light fallback | Dark fallback |', '|-------|---------------|---------------|', ...rows].join('\n');
}

function typeTable(tokens, typeMap) {
    const rows = Object.keys(typeMap).map((name) => {
        const l = tokens.light[name] || '—';
        const d = tokens.dark[name] || '—';
        return `| \`${name}\` | \`${typeMap[name]}\` | \`${l}\` | \`${d}\` |`;
    });
    return ['| `--type-*` token | → semantic token | Light | Dark |', '|---|---|---|---|', ...rows].join('\n');
}

/* ------------------------------------------------------------------ */
/*  Run                                                               */
/* ------------------------------------------------------------------ */

function main() {
    const scss = (() => {
        if (!fs.existsSync(COLORS_SCSS)) {
            console.error('✗ ' + path.relative(THEME_ROOT, COLORS_SCSS) + ' not found — run from the theme root.');
            process.exit(1);
        }
        return fs.readFileSync(COLORS_SCSS, 'utf8');
    })();
    const seeds = {
        '--primary-base': readSeed(scss, '--primary-base'),
        '--secondary-base': readSeed(scss, '--secondary-base'),
    };
    const lightDecls = parseDecls(extractMixinBody(scss, 'iwac-light-theme'));
    const darkDecls = parseDecls(extractMixinBody(scss, 'iwac-dark-theme'));

    const tokens = {
        _comment: 'GENERATED by IWAC-theme/scripts/build-tokens.js from asset/sass/abstracts/variables/_colors.scss — do not edit by hand. Run `npm run build:tokens` in the IWAC-theme repo. Hex values are the OKLCH tokens resolved to sRGB; fallbacks (var(--t, #hex), FALLBACK_*) must equal the LIGHT value (CSS) / matching theme value (FALLBACK_*).',
        seeds,
        light: resolveTheme(lightDecls, seeds),
        dark: resolveTheme(darkDecls, seeds),
    };

    const json = JSON.stringify(tokens, null, 2) + '\n';

    // 1. theme root + 2. sibling modules
    const targets = [TOKENS_OUT];
    for (const sib of SIBLINGS) {
        const dir = path.join(THEME_ROOT, '..', sib);
        if (fs.existsSync(dir)) {
            targets.push(path.join(dir, 'tokens.json'));
        } else {
            // Loud, not silent: a checkout without the sibling repos would
            // otherwise "succeed" while the module copies quietly drift.
            console.warn('  ! sibling repo not found — tokens.json NOT synced: ../' + sib);
        }
    }
    for (const t of targets) {
        fs.writeFileSync(t, json);
        console.log('  wrote ' + path.relative(path.join(THEME_ROOT, '..'), t));
    }

    // 3. docs
    if (fs.existsSync(DESIGN_DOC)) {
        let doc = fs.readFileSync(DESIGN_DOC, 'utf8');
        const typeMap = parseTypeMap(lightDecls);
        let r = replaceBetween(doc, 'TOKEN-TABLE', mainTable(tokens));
        if (r.ok) doc = r.doc; else console.warn('  ! DESIGN-SYSTEM.md: TOKEN-TABLE markers missing');
        r = replaceBetween(doc, 'TYPE-TABLE', typeTable(tokens, typeMap));
        if (r.ok) doc = r.doc; else console.warn('  ! DESIGN-SYSTEM.md: TYPE-TABLE markers missing');
        fs.writeFileSync(DESIGN_DOC, doc);
        console.log('  regenerated docs/DESIGN-SYSTEM.md tables');
    }

    console.log(`✓ tokens.json: ${Object.keys(tokens.light).length} light / ${Object.keys(tokens.dark).length} dark tokens`);
}

main();
