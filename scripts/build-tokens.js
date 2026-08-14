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
 *   2. optionally syncs a copy into each sibling module repo when invoked
 *      with `--sync-siblings`, and
 *   3. regenerates the fallback tables in docs/DESIGN-SYSTEM.md between
 *      `<!-- BEGIN GENERATED:* -->` / `<!-- END GENERATED:* -->` markers, so
 *      the docs can't silently drift from the SCSS.
 *
 * "Generate, don't transcribe": the colour math is identical to the runtime
 * parser in IwacVisualizations/asset/js/iwac-theme.js and the Mirador regen
 * snippet in docs/MIRADOR.md, so every consumer resolves the same hex.
 *
 * Usage: node scripts/build-tokens.js [--sync-siblings]
 * No dependencies.
 */
'use strict';

const fs = require('fs');
const path = require('path');

// Shared with check-token-usage.js so the theme and the modules can never
// disagree about which token names exist.
const { collectDefinedTokenNames } = require('./lib/theme-tokens');

const THEME_ROOT = path.join(__dirname, '..');
const VARS_DIR = path.join(THEME_ROOT, 'asset', 'sass', 'abstracts', 'variables');
const COLORS_SCSS = path.join(VARS_DIR, '_colors.scss');
const TOKENS_SCSS = path.join(VARS_DIR, '_tokens.scss');
const TYPO_SCSS = path.join(VARS_DIR, '_typography.scss');
const LAYOUT_SCSS = path.join(VARS_DIR, '_layout.scss');
const BREAKPOINTS_SCSS = path.join(VARS_DIR, '_breakpoints.scss');
const TOKENS_OUT = path.join(THEME_ROOT, 'tokens.json');
const DESIGN_DOC = path.join(THEME_ROOT, 'docs', 'DESIGN-SYSTEM.md');
const SIBLINGS = ['IwacSearch', 'IwacVisualizations'];
const SYNC_SIBLINGS = process.argv.includes('--sync-siblings');

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
/*  Non-colour value resolution                                       */
/*                                                                    */
/*  `light` / `dark` above answer "what hex is this colour token?".   */
/*  They are silent about every OTHER kind of token — type sizes,     */
/*  spacing, radii, font stacks, shadows, transitions — which is      */
/*  exactly the class the fallback guards could not check, and        */
/*  exactly where the modules drifted (design review 2026-08, F1).    */
/*                                                                    */
/*  This resolver answers "what literal CSS value does this token     */
/*  compute to?" for ANY token, by substituting nested var() refs     */
/*  and collapsing colour functions to hex / rgba(). A token whose    */
/*  value cannot be made self-contained (an unresolvable var()) is    */
/*  omitted rather than published wrong.                              */
/* ------------------------------------------------------------------ */

/** `color-mix(in oklab, C p%, transparent)` → `rgba(r, g, b, a)`. */
function translucentToRgba(value, scope) {
    const m = value.trim().match(/^color-mix\(\s*in\s+oklab\s*,(.*)\)$/is);
    if (!m) return null;
    const args = splitTopLevel(m[1], ',');
    if (args.length !== 2) return null;
    const parts = args.map((a) => {
        a = a.trim();
        const pm = a.match(/^(.*?)\s+([\d.]+)%$/);
        return pm ? { color: pm[1].trim(), pct: parseFloat(pm[2]) } : { color: a, pct: null };
    });
    // Only the "colour faded to transparent" shape has a single-rgba answer.
    const ti = parts.findIndex((p) => p.color === 'transparent');
    if (ti === -1) return null;
    const ci = 1 - ti;
    let pc = parts[ci].pct;
    let pt = parts[ti].pct;
    if (pc === null && pt === null) { pc = 50; pt = 50; }
    else if (pc === null) pc = 100 - pt;
    else if (pt === null) pt = 100 - pc;
    const hex = resolve(parts[ci].color, scope);
    if (typeof hex !== 'string') return null;
    // Premultiplied mixing: `transparent` is rgb(0 0 0 / 0), so it contributes
    // nothing to the colour — the result is the opaque colour at alpha p.
    const alpha = Math.round((pc / (pc + pt)) * 1000) / 1000;
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16 & 255}, ${n >> 8 & 255}, ${n & 255}, ${alpha})`;
}

/**
 * Collapse every `color-mix(…)` / `oklch(…)` sub-expression in a value to a
 * hex or `rgba()` literal. Glows and rings embed the mix inside a shadow
 * shorthand (`0 2px 6px -1px color-mix(…)`), so an anchored whole-value match
 * would leave those half-resolved and unusable as a comparison target.
 */
function resolveEmbeddedColors(str, scope) {
    for (const fn of ['color-mix(', 'oklch(']) {
        let at;
        while ((at = str.toLowerCase().indexOf(fn)) !== -1) {
            let depth = 0, j = at + fn.length - 1;
            for (; j < str.length; j++) {
                if (str[j] === '(') depth++;
                else if (str[j] === ')') { depth--; if (depth === 0) break; }
            }
            if (j >= str.length) return str; // unbalanced — leave as-is
            const expr = str.slice(at, j + 1);
            const lit = translucentToRgba(expr, scope) ?? resolve(expr, scope);
            if (typeof lit !== 'string') return str; // unresolvable — stop
            str = str.slice(0, at) + lit + str.slice(j + 1);
        }
    }
    return str;
}

/**
 * Resolve a declaration to a self-contained CSS literal, or null.
 * `scope` maps `--name` → already-resolved literal.
 */
function resolveValue(value, scope, depth = 0) {
    if (depth > 12) return null;
    let v = value.trim().replace(/\s+/g, ' ');

    // Whole-value colour forms first, so shadows get real rgba() components.
    const rgba = translucentToRgba(v, scope);
    if (rgba) return rgba;
    if (/^(oklch\(|color-mix\()/i.test(v)) {
        const hex = resolve(v, scope);
        if (typeof hex === 'string') return hex;
    }

    // Substitute every var() reference (with or without a fallback) by the
    // token's own resolved value — a fallback in the SOURCE is documentation,
    // the token's value is the truth.
    let out = '';
    let i = 0;
    while (i < v.length) {
        const at = v.indexOf('var(', i);
        if (at === -1) { out += v.slice(i); break; }
        out += v.slice(i, at);
        // Find the matching close paren.
        let depthP = 0, j = at + 3;
        for (; j < v.length; j++) {
            if (v[j] === '(') depthP++;
            else if (v[j] === ')') { depthP--; if (depthP === 0) break; }
        }
        if (j >= v.length) return null; // unbalanced
        const inner = v.slice(at + 4, j);
        const name = splitTopLevel(inner, ',')[0].trim();
        if (!Object.prototype.hasOwnProperty.call(scope, name)) return null;
        out += scope[name];
        i = j + 1;
    }
    out = out.trim();
    if (out.includes('var(')) return resolveValue(out, scope, depth + 1);

    // Nested colour expressions may have become resolvable now that every
    // var() is substituted — including ones embedded in a shadow shorthand.
    out = resolveEmbeddedColors(out, scope);
    return out.includes('var(') || /color-mix\(|oklch\(/i.test(out) ? null : out;
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

/** Extract the body of the first top-level `:root { … }` block. */
function extractRootBody(scss) {
    const m = /(^|\n)\s*:root\s*\{/.exec(scss);
    if (!m) return '';
    const open = scss.indexOf('{', m.index);
    let depth = 0, i = open;
    for (; i < scss.length; i++) {
        if (scss[i] === '{') depth++;
        else if (scss[i] === '}') { depth--; if (depth === 0) break; }
    }
    return scss.slice(open + 1, i);
}

/** Parse `$name: value;` Sass scalars so `#{$var}` interpolation resolves. */
function parseSassVars(scss) {
    const out = {};
    const clean = scss.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    for (const m of clean.matchAll(/(\$[\w-]+)\s*:\s*([^;]+);/g)) {
        out[m[1]] = m[2].trim();
    }
    return out;
}

/**
 * Expand `#{$var}` and `#{meta.inspect($var)}` against parsed Sass scalars.
 * Both forms appear in the variable files: `_layout.scss` interpolates plain
 * lengths, `_typography.scss` runs the font stacks through meta.inspect() so
 * the quotation survives (see the long comment there — unquoted
 * `Source Serif 4` is not a valid <family-name>).
 */
function expandInterpolation(value, sassVars) {
    return value.replace(/#\{\s*(?:meta\.inspect\(\s*)?(\$[\w-]+)\s*\)?\s*\}/g, (m, name) =>
        sassVars[name] !== undefined ? sassVars[name] : m);
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

/**
 * Every token's canonical LITERAL value, light + dark.
 *
 * Assembled in cascade order across the four variable files so a shadow can
 * resolve through `--shadow-color` → `oklch(…)` → `rgba(…)`, and `--panel-radius`
 * through `--radius-md` → `0.5rem`. Anything still carrying an unresolvable
 * `var()` is dropped rather than published wrong.
 */
function collectValues(colorsScss, seeds) {
    const tokensScss = fs.readFileSync(TOKENS_SCSS, 'utf8');
    const typoScss = fs.readFileSync(TYPO_SCSS, 'utf8');
    const layoutScss = fs.readFileSync(LAYOUT_SCSS, 'utf8');

    const sassVars = Object.assign(
        {}, parseSassVars(typoScss), parseSassVars(layoutScss), parseSassVars(tokensScss),
    );

    // `:root` in _tokens.scss pulls its shadow/panel block in via @include;
    // splice the mixin body in at that point so declaration order is real.
    const rootFor = (theme) => extractRootBody(tokensScss).replace(
        /@include\s+iwac-light-tokens\s*;/,
        extractMixinBody(tokensScss, theme === 'dark' ? 'iwac-dark-tokens' : 'iwac-light-tokens'),
    );

    const build = (theme) => {
        const ordered = [
            ...parseDecls(extractMixinBody(colorsScss, `iwac-${theme}-theme`)),
            ...parseDecls(extractRootBody(typoScss)),
            ...parseDecls(extractRootBody(layoutScss)),
            ...parseDecls(rootFor(theme)),
        ];
        const scope = Object.assign({}, seeds);
        const out = {};
        for (const { name, value } of ordered) {
            const literal = resolveValue(expandInterpolation(value, sassVars), scope);
            if (literal !== null) { scope[name] = literal; out[name] = literal; }
        }
        return out;
    };

    return { light: build('light'), dark: build('dark') };
}

/** `values` minus every key the hex map already publishes. */
function omitKeys(obj, exclude) {
    const out = {};
    for (const k of Object.keys(obj).sort()) if (exclude[k] === undefined) out[k] = obj[k];
    return out;
}

/** The five responsive breakpoints, as `{ sm: '600px', … }`. */
function parseBreakpoints() {
    const vars = parseSassVars(fs.readFileSync(BREAKPOINTS_SCSS, 'utf8'));
    const out = {};
    for (const [k, v] of Object.entries(vars)) out[k.slice(1)] = v;
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

    const values = collectValues(scss, seeds);
    const breakpoints = parseBreakpoints();

    const tokens = {
        _comment: 'GENERATED by IWAC-theme/scripts/build-tokens.js from asset/sass/abstracts/variables/*.scss — do not edit by hand. Run `npm run build:tokens` in the IWAC-theme repo. `light`/`dark` are the OKLCH colour tokens resolved to sRGB hex; `values` is every token resolved to its literal CSS value (type, spacing, shadows, fonts, motion); `breakpoints` are the five media-query widths. Fallbacks (var(--t, <fallback>), FALLBACK_*) must equal the LIGHT value.',
        seeds,
        breakpoints,
        // The theme's full custom-property vocabulary — colour tokens AND
        // everything else (spacing, tracking, panel, control sizes, …).
        //
        // `light` / `dark` below carry only resolved COLOURS, which is why a
        // module could reference `--space-2xs` or `--panel-border-color` — names
        // the theme has never defined / no longer defines — and have every guard
        // pass: their hex fallbacks were fine, and nothing downstream knew the
        // names were fiction. Publishing the vocabulary lets each module's
        // check-theme-tokens.js verify names, not just values.
        names: [...collectDefinedTokenNames(THEME_ROOT)].sort(),
        light: resolveTheme(lightDecls, seeds),
        dark: resolveTheme(darkDecls, seeds),
        // Non-colour canonical values. `light`/`dark` above answer only "what
        // hex is this colour?", so the fallback guards could check colour and
        // nothing else — and every drifted fallback the 2026-08 review found
        // (line-heights, control sizes, type steps, font stacks, shadows,
        // transitions) was in the half no guard could see. Colour tokens
        // already covered by `light` are omitted so the two maps never
        // disagree about the same token.
        values: {
            light: omitKeys(values.light, resolveTheme(lightDecls, seeds)),
            dark: omitKeys(values.dark, resolveTheme(darkDecls, seeds)),
        },
    };

    const json = JSON.stringify(tokens, null, 2) + '\n';

    // 1. Theme root. Cross-repository writes are opt-in so a normal build is
    // hermetic and succeeds in CI, containers, and read-only sibling clones.
    const targets = [TOKENS_OUT];
    if (SYNC_SIBLINGS) {
        for (const sib of SIBLINGS) {
            const dir = path.join(THEME_ROOT, '..', sib);
            if (fs.existsSync(dir)) {
                targets.push(path.join(dir, 'tokens.json'));
            } else {
                console.warn('  ! sibling repo not found — tokens.json NOT synced: ../' + sib);
            }
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

    console.log(`✓ tokens.json: ${Object.keys(tokens.light).length} light / ${Object.keys(tokens.dark).length} dark tokens, ${tokens.names.length} names`);
}

main();
