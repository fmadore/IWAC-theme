'use strict';
/**
 * theme-token-guard.cjs — the rule engine behind every IWAC module's
 * `scripts/check-theme-tokens.js`.
 *
 * SOURCE OF TRUTH: IWAC-theme/scripts/lib/theme-token-guard.cjs. The copies at
 * IwacSearch/scripts/ and IwacVisualizations/scripts/ are WRITTEN by
 * `npm run sync:tokens` in the theme, in the same run that writes their
 * tokens.json. Edit the theme's copy, re-sync; never edit a module's copy.
 *
 * WHY ONE ENGINE. Until theme 2.22 each module carried its own fork of this
 * guard (621 and 701 lines), and the forks had drifted the way every
 * hand-kept copy in this project drifts:
 *   - one could not see a media query written in rem, the other could;
 *   - one read a declaration wrapped over four lines as four unrelated lines;
 *   - one recognised `oklch()` / `lab()` / `color()` as raw colour, the other
 *     only `rgb()` / `hsl()`;
 *   - both still accepted `max-width: 767.98px`, a spelling the theme itself
 *     retired in 2.14;
 *   - one exempted from the raw-colour rule any line mentioning a namespace
 *     that module does not even use.
 * A module now declares only what is genuinely its own — where its sources
 * live and which namespace it owns — and every rule is the stricter of the
 * two forks, or new.
 *
 * THE RULES (each exists because the thing it checks had already broken):
 *
 *   names       Every `var(--x)` names a PUBLIC theme token (tokens.json
 *               `public`), a property the module declares itself, or one in
 *               the module's own namespace. Also refused, with the fix named:
 *               a theme-INTERNAL token (`names` minus `public`: component
 *               parameters like --plate-scrim the theme may rewrite at will)
 *               and a DEPRECATED one (tokens.json `deprecated`).
 *   override    A module never re-declares a theme token (`--primary: …`) —
 *               "nothing downstream redefines them" is §1 of the contract and
 *               was, until this rule, the one part of it nothing checked.
 *               A deliberate override (an embed's brand accent) carries
 *               `/* allow-override *\/` on the line.
 *   fallback    `var(--token, <fallback>)` — the fallback equals the token's
 *               canonical LIGHT value: hex against `light`, everything else
 *               against `values.light`. A nested chain must RESOLVE to that
 *               value (`var(--panel-bg, var(--surface, #fdfcfb))` is legal;
 *               `var(--ink-strong, var(--ink, …))` is a lie).
 *   raw-colour  (CSS only) No colour literal outside a var() fallback slot,
 *               in any notation: hex, rgb(), hsl(), hwb(), lab(), lch(),
 *               oklab(), oklch(), color(). `/* allow-hex *\/` opts a line out.
 *   srgb-mix    No `color-mix(in srgb …)` — the contract mixes in oklab.
 *   absolute-mix No `color-mix()` toward black/white (literal or token): they
 *               do not flip with the theme, so the ramp inverts in dark.
 *               `/* allow-absolute-mix *\/` inside a theme-pinned block.
 *   media       `@media` widths are px, `min-width` ON a published
 *               breakpoint, `max-width` at breakpoint − 1 (nothing else —
 *               the − 0.02px spelling is retired). `@container` is exempt.
 *   media-string The same contract for a width written in a SCRIPT — a
 *               matchMedia() string or a default parameter feeding one — the
 *               half of a duplicated boundary that used to be "checked by eye".
 *   font-size   (CSS only) No absolute length in a font-size, including one
 *               inside clamp() / calc() / min() / max(). --text-2xs is the
 *               floor. Relative units stay legal.
 *   font-weight (CSS only) In a block that sets a theme font family and a
 *               numeric weight, the weight is one the theme LOADS (tokens.json
 *               `fonts`); an italic is one it loads too.
 *   script-fallback A colour fallback handed to a runtime reader as a
 *               (`'--token', '#hex'`) argument pair equals the light value —
 *               those are fallbacks the `var()` rule cannot see.
 *   fallback-object FALLBACK_LIGHT / FALLBACK_DARK objects equal `light` /
 *               `dark`; SERIES_LIGHT / SERIES_DARK / SERIES_LEAD_SLOTS equal
 *               tokens.json `series`.
 *   removed     `--primary-hue` / `--primary-sat` (removed in theme 2.0).
 *   scope       (CSS only) A custom property declared on a selector that can
 *               only match the ROOT element (`:root`, `html`,
 *               `:root:not(…)`), whose value var()s a token that flips with
 *               the theme (tokens.json `themed`, or a module property composed
 *               from one), is also declared on a selector that matches
 *               `<body>` — `:root, body` is the idiom. A custom property is
 *               substituted on the element that DECLARES it, and the theme's
 *               manual toggle redeclares its tokens on <body>: on :root alone
 *               the composition freezes at the OS-scheme value and every dark
 *               page inherits the light ramp (V-01; the theme's own
 *               check:tokens rule 5 has caught the same shape three times).
 *   focus-outline (CSS only) No `outline: none | 0` (nor `outline-style:
 *               none`, `outline-width: 0`) except under
 *               `:focus:not(:focus-visible)` — a pointer or programmatic focus
 *               the browser would not ring anyway. On a selector that targets
 *               :focus / :focus-visible / :focus-within it deletes the
 *               indicator outright; on a base rule it deletes it wherever no
 *               later rule restores an outline (a box-shadow ring does not
 *               count: forced-colors mode drops it). Use var(--focus-outline),
 *               or `outline: 2px solid transparent` beside a --ring-focus
 *               box-shadow. Until this rule the ban lived in the theme's
 *               Stylelint only (X-10).
 *
 * SCANNING UNIT. CSS is read as LOGICAL lines — source lines joined while
 * their parentheses are unbalanced (at most 12) — because a declaration the
 * formatter wrapped is one declaration. Scripts are read line by line.
 * Comments are blanked first (line numbers preserved), except comments that
 * carry an opt-out marker. `.svelte`, `.phtml` and `.html` files are split:
 * their `<style>` regions are CSS, the rest is script-like (markup + code).
 *
 * If tokens.json is absent the value rules are skipped with a warning, so a
 * fresh checkout still builds; the shape rules always run.
 */

const fs = require('fs');
const path = require('path');

const MARKERS = /allow-hex|allow-absolute-mix|allow-override/;
const MAX_JOIN = 12;

const REMOVED_TOKEN = /--primary-(hue|sat)\b/;
const SRGB_MIX = /color-mix\(\s*in\s+srgb\b/i;
const ABSOLUTE_MIX = /color-mix\([^;]*\b(?:black|white)\b/i;
const HEX = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3}(?:[0-9a-fA-F]{2})?)?\b/g;
// `color-mix(` is deliberately NOT matched: the `\b…\(` anchor needs the paren
// straight after the function name, and color-mix puts a hyphen there.
const RAW_COLOR_FN = /\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi;
const VAR_FALLBACK_HEX = /var\(\s*(--[\w-]+)\s*,\s*(#[0-9a-fA-F]{3,8})\b/g;
const VAR_USE = /var\(\s*(--[\w-]+)/g;
const DECL = /(?:^|[{;\s'"`])(--[\w-]+)\s*:(?!:)/g;
const SET_PROPERTY = /setProperty\(\s*['"`](--[\w-]+)['"`]/g;
const WIDTH_PX = /\((min|max)-width\s*:\s*([\d.]+)px\s*\)/g;
const WIDTH_OTHER_UNIT = /\((min|max)-width\s*:\s*[\d.]+(?!px)([a-z%]+)\s*\)/gi;
const FONT_SIZE_DECL = /font-size\s*:\s*([^;}]+)/i;
const ABS_LENGTH = /(?<![\w.-])(-?\d*\.?\d+)(px|rem|pt|cm|mm|in|pc|q)\b/i;
const SCRIPT_COLOUR_PAIR = /(['"`])(--[\w-]+)\1\s*,\s*(['"`])(#[0-9a-fA-F]{3,8})\3/g;

/* ------------------------------------------------------------------ */
/*  Small helpers                                                      */
/* ------------------------------------------------------------------ */

function normHex(hex) {
    let h = hex.replace('#', '').toLowerCase();
    if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split('').map((c) => c + c).join('');
    return '#' + h.slice(0, 6);
}

/** Compare CSS values ignoring case, spacing, quote style and leading zeros. */
function normValue(s) {
    return String(s).trim().toLowerCase().replace(/'/g, '"').replace(/\s+/g, ' ')
        .replace(/\s*,\s*/g, ',').replace(/(^|[\s,(])\.(\d)/g, '$10.$2');
}

/** Index of the matching `)` for the `(` at `open`, or -1. */
function closeParen(s, open) {
    let depth = 0;
    for (let j = open; j < s.length; j++) {
        if (s[j] === '(') depth++;
        else if (s[j] === ')') { depth--; if (depth === 0) return j; }
    }
    return -1;
}

/** Index of the first comma at paren depth 0, or -1. */
function topLevelComma(s) {
    let depth = 0;
    for (let i = 0; i < s.length; i++) {
        if (s[i] === '(') depth++;
        else if (s[i] === ')') depth--;
        else if (s[i] === ',' && depth === 0) return i;
    }
    return -1;
}

/** Every `var(--name, fallback)` on a line (fallback extracted with balanced parens). */
function varFallbacks(line) {
    const out = [];
    for (let i = 0; (i = line.indexOf('var(', i)) !== -1;) {
        const j = closeParen(line, i + 3);
        if (j === -1) break;
        const inner = line.slice(i + 4, j);
        const comma = topLevelComma(inner);
        if (comma !== -1) out.push({ name: inner.slice(0, comma).trim(), fallback: inner.slice(comma + 1).trim() });
        i = j + 1;
    }
    return out;
}

/** Replace every var() fallback slot with spaces, preserving offsets. */
function blankVarFallbacks(expr) {
    const chars = [...expr];
    for (let i = 0; (i = expr.indexOf('var(', i)) !== -1;) {
        let j = closeParen(expr, i + 3);
        if (j === -1) j = expr.length;
        const comma = topLevelComma(expr.slice(i + 4, j));
        if (comma !== -1) for (let k = i + 4 + comma; k < j; k++) chars[k] = ' ';
        i = j + 1;
    }
    return chars.join('');
}

/**
 * Is the position after `before` inside the fallback slot of an open `var()`?
 * A fallback is a whole CSS value, so `var(--panel-border, 1px solid #ced1d6)`
 * puts the hex three tokens past the comma.
 */
function isInVarFallback(before) {
    let depth = 0, varDepth = -1, sawComma = false;
    for (let i = 0; i < before.length; i++) {
        if (before[i] === '(') {
            if (before.slice(Math.max(0, i - 3), i) === 'var' && varDepth === -1) {
                varDepth = depth;
                sawComma = false;
            }
            depth++;
        } else if (before[i] === ')') {
            depth--;
            if (varDepth !== -1 && depth <= varDepth) varDepth = -1;
        } else if (before[i] === ',' && varDepth !== -1 && depth === varDepth + 1) {
            sawComma = true;
        }
    }
    return varDepth !== -1 && sawComma;
}

function lineOf(src, index) {
    return src.slice(0, Math.max(0, index)).split('\n').length;
}

/* ------------------------------------------------------------------ */
/*  Reading files into scan units                                      */
/* ------------------------------------------------------------------ */

/** Blank `/* … *\/` and `<!-- … -->` comments (keeping markers) and whole-line `//` comments. */
function blankComments(text) {
    const blank = (m) => m.replace(/[^\n]/g, ' ');
    return text
        .replace(/\/\*[\s\S]*?\*\//g, (m) => (MARKERS.test(m) ? m : blank(m)))
        .replace(/<!--[\s\S]*?-->/g, (m) => (MARKERS.test(m) ? m : blank(m)))
        .replace(/^([ \t]*)(\/\/[^\n]*)/gm, (m, lead, c) => lead + (MARKERS.test(c) ? c : blank(c)));
}

/** Join lines while parentheses are unbalanced — one CSS declaration, one unit. */
function logicalLines(numbered) {
    const out = [];
    const delta = (s) => { let d = 0; for (const c of s) { if (c === '(') d++; else if (c === ')') d--; } return d; };
    for (let i = 0; i < numbered.length; i++) {
        let [n, text] = numbered[i];
        let depth = delta(text);
        let joined = 0;
        while (depth > 0 && i + 1 < numbered.length && joined < MAX_JOIN) {
            i++;
            joined++;
            text += ' ' + numbered[i][1].trim();
            depth += delta(numbered[i][1]);
        }
        out.push({ n, text, css: true });
    }
    return out;
}

/**
 * Split a source file into scan units: `{ n, text, css }`, plus the CSS
 * regions as text (for the block-level font-weight rule).
 */
function unitsOf(rel, raw) {
    const text = blankComments(raw);
    const ext = path.extname(rel);
    const lines = text.split('\n');
    if (ext === '.css') {
        return { units: logicalLines(lines.map((t, i) => [i + 1, t])), cssRegions: [{ start: 1, text }] };
    }
    if (ext === '.svelte' || ext === '.phtml' || ext === '.html') {
        const units = [];
        const cssRegions = [];
        const inStyle = new Array(lines.length).fill(false);
        const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
        let m;
        while ((m = re.exec(text)) !== null) {
            const bodyStart = m.index + m[0].indexOf('>') + 1;
            const first = lineOf(text, bodyStart);
            const body = m[1];
            cssRegions.push({ start: first, text: body });
            const bodyLines = body.split('\n');
            bodyLines.forEach((_, k) => { inStyle[first - 1 + k] = true; });
            units.push(...logicalLines(bodyLines.map((t, k) => [first + k, t])));
        }
        lines.forEach((t, i) => { if (!inStyle[i]) units.push({ n: i + 1, text: t, css: false }); });
        units.sort((a, b) => a.n - b.n);
        return { units, cssRegions };
    }
    return { units: lines.map((t, i) => ({ n: i + 1, text: t, css: false })), cssRegions: [] };
}

/**
 * CSS rule blocks with their declarations — enough structure for the
 * block-level rule (font-family + font-weight in one block). Nested at-rules
 * simply open another block.
 */
function cssBlocks(region, { dropComments = false } = {}) {
    const blocks = [];
    const stack = [];
    let frame = '';
    let line = region.start;
    // Opt-out marker comments survive blankComments(), so they can sit at the
    // head of the next selector or declaration. The scope / focus rules ask
    // for them to be dropped; the font-weight rule keeps its original reading.
    const clean = (s) => (dropComments ? s.replace(/\/\*[\s\S]*?\*\//g, ' ') : s).trim();
    for (const ch of region.text) {
        if (ch === '\n') { line++; frame += ' '; continue; }
        if (ch === '{') {
            const block = { selector: clean(frame), decls: [] };
            blocks.push(block);
            stack.push(block);
            frame = '';
        } else if (ch === '}' || ch === ';') {
            const decl = clean(frame);
            const m = /^([\w-]+)\s*:\s*([\s\S]+)$/.exec(decl);
            if (m && stack.length) stack[stack.length - 1].decls.push({ prop: m[1].toLowerCase(), value: m[2].trim(), line });
            if (ch === '}') stack.pop();
            frame = '';
        } else {
            frame += ch;
        }
    }
    return blocks;
}

/* ------------------------------------------------------------------ */
/*  Selector reading — just enough for the scope and focus rules        */
/* ------------------------------------------------------------------ */

/** Split on `sep` at paren / bracket depth 0. */
function splitTop(s, sep) {
    const out = [];
    let depth = 0, cur = '';
    for (const ch of s) {
        if (ch === '(' || ch === '[') depth++;
        else if (ch === ')' || ch === ']') depth--;
        if (ch === sep && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
    }
    out.push(cur);
    return out.map((x) => x.trim()).filter(Boolean);
}

/** `:global(x)` → `x` (Svelte), with balanced parens. */
function unwrapGlobal(sel) {
    let out = sel;
    for (let i; (i = out.indexOf(':global(')) !== -1;) {
        const j = closeParen(out, i + 7);
        if (j === -1) break;
        out = out.slice(0, i) + out.slice(i + 8, j) + out.slice(j + 1);
    }
    return out;
}

/** The complex selectors of a selector list, `:global()` unwrapped. */
function complexSelectors(selectorList) {
    return splitTop(selectorList, ',').map(unwrapGlobal);
}

/** The compound selector a complex selector's declarations apply to. */
function subjectCompound(complex) {
    let depth = 0, start = 0;
    for (let i = 0; i < complex.length; i++) {
        const ch = complex[i];
        if (ch === '(' || ch === '[') depth++;
        else if (ch === ')' || ch === ']') depth--;
        else if (depth === 0 && /[\s>+~]/.test(ch)) start = i + 1;
    }
    return complex.slice(start).trim();
}

const ROOT_ONLY = /^(?::root|html)(?![\w-])/i;
const MATCHES_BODY = /^(?:body|\*)(?![\w-])/i;

/** The sanctioned home of `outline: none`: a focus that is NOT focus-visible. */
const NOT_FOCUS_VISIBLE = /:not\(\s*:focus-visible\s*\)/i;

/** Does this complex selector target a focus state (outside any :not())? */
function targetsFocus(complex) {
    let s = complex;
    for (let i; (i = s.indexOf(':not(')) !== -1;) {
        const j = closeParen(s, i + 4);
        s = s.slice(0, i) + (j === -1 ? '' : s.slice(j + 1));
        if (j === -1) break;
    }
    return /:focus(?:-visible|-within)?(?![\w-])/i.test(s);
}

const OUTLINE_REMOVED = (prop, value) => {
    const v = value.replace(/\s*!important\s*$/i, '').trim().toLowerCase();
    if (prop === 'outline') return /^(?:none|0(?:px)?)(?:\s+(?:none|0(?:px)?))*$/.test(v);
    if (prop === 'outline-style') return v === 'none';
    if (prop === 'outline-width') return /^0(?:px)?$/.test(v);
    return false;
};

/** Walk `roots` ([[dir, exts]]) under `root`, returning `{ rel, text }`. */
function collectFiles(root, roots, skip) {
    const out = [];
    const walk = (dir, exts) => {
        let entries;
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full, exts);
            else if (exts.some((e) => entry.name.endsWith(e))) {
                const rel = path.relative(root, full).split(path.sep).join('/');
                if (!skip || !skip(rel)) out.push({ rel, text: fs.readFileSync(full, 'utf8') });
            }
        }
    };
    for (const [dir, exts] of roots) walk(path.join(root, dir), exts);
    return out.sort((a, b) => a.rel.localeCompare(b.rel));
}

/* ------------------------------------------------------------------ */
/*  The guard                                                          */
/* ------------------------------------------------------------------ */

/**
 * @param {object} config
 * @param {{rel: string, text: string}[]} config.files   sources to scan
 * @param {object|null} config.tokens                   parsed tokens.json
 * @param {RegExp} config.ownPrefix                     the module's namespace
 * @returns {{file: string, line: number, rule: string, msg: string, snippet: string}[]}
 */
function runGuard({ files, tokens, ownPrefix }) {
    const violations = [];
    const flag = (file, line, rule, msg, snippet) => violations.push({
        file, line, rule, msg, snippet: String(snippet).replace(/\s+/g, ' ').trim().slice(0, 240),
    });

    const T = tokens || null;
    const names = new Set(T && Array.isArray(T.names) ? T.names : []);
    const publicNames = new Set(T && Array.isArray(T.public) ? T.public : (T && T.names) || []);
    const deprecated = (T && T.deprecated) || {};
    const fonts = (T && T.fonts) || {};
    const light = (T && T.light) || {};
    const valuesLight = (T && T.values && T.values.light) || {};
    const canonicalOf = (name) => (light[name] !== undefined ? light[name] : valuesLight[name]);

    const parsed = files.map((f) => ({ ...f, ...unitsOf(f.rel, f.text) }));

    // The module's own vocabulary, collected before anything is scanned — a
    // property declared in one file is legitimately consumed from another.
    const moduleOwned = new Set();
    for (const f of parsed) {
        for (const u of f.units) {
            for (const m of u.text.matchAll(DECL)) moduleOwned.add(m[1]);
            for (const m of u.text.matchAll(SET_PROPERTY)) moduleOwned.add(m[1]);
        }
    }

    /** `var(--X, Y)` resolved with coarser theme tokens substituted. */
    const resolveFallbackExpr = (expr) => {
        let out = '';
        let i = 0;
        while (i < expr.length) {
            const at = expr.indexOf('var(', i);
            if (at === -1) { out += expr.slice(i); break; }
            out += expr.slice(i, at);
            const j = closeParen(expr, at + 3);
            if (j === -1) { out += expr.slice(at); break; }
            const inner = expr.slice(at + 4, j);
            const comma = topLevelComma(inner);
            const tok = (comma === -1 ? inner : inner.slice(0, comma)).trim();
            const rest = comma === -1 ? '' : inner.slice(comma + 1).trim();
            const canon = canonicalOf(tok);
            out += canon !== undefined ? canon : resolveFallbackExpr(rest);
            i = j + 1;
        }
        return out;
    };

    const bps = T && T.breakpoints ? Object.values(T.breakpoints).map(parseFloat) : [];
    const bpNames = T && T.breakpoints
        ? Object.entries(T.breakpoints).map(([k, v]) => `${k} ${v}`).join(', ') : '';
    const minOk = new Set(bps);
    const maxOk = new Set(bps.map((v) => v - 1));
    const checkWidths = (file, u, rule) => {
        for (const w of u.text.matchAll(WIDTH_OTHER_UNIT)) {
            flag(file, u.n, rule, `${w[1]}-width in ${w[2]}, not px — the breakpoint contract is published in px (${bpNames}), and a non-px width is invisible to it`, u.text);
        }
        for (const w of u.text.matchAll(WIDTH_PX)) {
            const v = parseFloat(w[2]);
            if (w[1] === 'min' ? minOk.has(v) : maxOk.has(v)) continue;
            const hint = w[1] === 'max' && minOk.has(v) ? ` — use ${v - 1}px so it doesn't overlap min-width: ${v}px`
                : w[1] === 'max' && minOk.has(Math.round(v)) ? ` — use ${Math.round(v) - 1}px (the − 0.02px spelling was retired in theme 2.14)` : '';
            flag(file, u.n, rule, `${w[1]}-width: ${w[2]}px is not on the theme's breakpoint contract (${bpNames}; min ON, max at − 1)${hint}`, u.text);
        }
    };

    for (const f of parsed) {
        const file = f.rel;
        for (const u of f.units) {
            const raw = u.text;
            if (!raw.trim()) continue;
            const exempt = /allow-hex/.test(raw);

            if (REMOVED_TOKEN.test(raw)) {
                flag(file, u.n, 'removed', 'removed token --primary-hue/--primary-sat (derive variants via color-mix from --primary)', raw);
            }
            if (SRGB_MIX.test(raw)) flag(file, u.n, 'srgb-mix', 'color-mix(in srgb …) — the contract mixes `in oklab`', raw);
            if (ABSOLUTE_MIX.test(raw) && !/allow-absolute-mix/.test(raw)) {
                flag(file, u.n, 'absolute-mix', 'color-mix toward black/white — they do not flip with the theme; mix toward --surface or --ink (or mark /* allow-absolute-mix */ inside a theme-pinned block)', raw);
            }

            // names
            if (T) {
                for (const m of raw.matchAll(VAR_USE)) {
                    const name = m[1];
                    if (ownPrefix.test(name)) continue;
                    if (deprecated[name]) {
                        flag(file, u.n, 'names', `${name} is deprecated — use ${deprecated[name]} (same value)`, raw);
                    } else if (publicNames.has(name)) {
                        continue;
                    } else if (names.has(name)) {
                        flag(file, u.n, 'names', `${name} is theme-internal (a component parameter, not part of the public contract — tokens.json \`public\`)`, raw);
                    } else if (!moduleOwned.has(name)) {
                        flag(file, u.n, 'names', `unknown token ${name} — not a public theme token, not declared by this module, not in its own namespace`, raw);
                    }
                }
            }

            // override
            if (T && !/allow-override/.test(raw)) {
                const declared = [
                    ...(u.css ? [...raw.matchAll(DECL)].map((m) => m[1]) : []),
                    ...[...raw.matchAll(SET_PROPERTY)].map((m) => m[1]),
                ];
                for (const name of declared) {
                    if (names.has(name) && !ownPrefix.test(name)) {
                        flag(file, u.n, 'override', `re-declares the theme token ${name} — modules consume theme tokens, they never redefine them (mark /* allow-override */ if this is a deliberate, scoped override)`, raw);
                    }
                }
            }

            // fallback — hex half, non-colour half, chains
            if (T && !exempt) {
                for (const m of raw.matchAll(VAR_FALLBACK_HEX)) {
                    const canon = light[m[1]];
                    if (canon && normHex(m[2]) !== canon.toLowerCase()) {
                        flag(file, u.n, 'fallback', `fallback ${m[2]} for ${m[1]} ≠ canonical light ${canon} (tokens.json)`, raw);
                    }
                }
                for (const { name, fallback } of varFallbacks(raw)) {
                    if (fallback.includes('var(')) {
                        const want = canonicalOf(name);
                        if (want === undefined) continue;
                        const got = resolveFallbackExpr(fallback);
                        if (!got.includes('var(') && normValue(got) !== normValue(want)) {
                            flag(file, u.n, 'fallback', `fallback chain for ${name} resolves to "${got.trim()}" ≠ canonical ${want} (tokens.json)`, raw);
                        }
                    } else if (!fallback.startsWith('#')) {
                        const canon = valuesLight[name];
                        if (canon && normValue(fallback) !== normValue(canon)) {
                            flag(file, u.n, 'fallback', `fallback "${fallback}" for ${name} ≠ canonical ${canon} (tokens.json values.light)`, raw);
                        }
                    }
                }
            }

            if (u.css) {
                // raw-colour
                if (!exempt) {
                    let reported = false;
                    for (const m of raw.matchAll(HEX)) {
                        if (!isInVarFallback(raw.slice(0, m.index))) {
                            flag(file, u.n, 'raw-colour', `raw colour ${m[0]} outside a var() fallback (use a theme token, or mark /* allow-hex */)`, raw);
                            reported = true;
                            break;
                        }
                    }
                    if (!reported) {
                        for (const m of raw.matchAll(RAW_COLOR_FN)) {
                            if (!isInVarFallback(raw.slice(0, m.index))) {
                                flag(file, u.n, 'raw-colour', `raw colour ${m[1]}() outside a var() fallback (use a theme token, color-mix from one, or mark /* allow-hex */)`, raw);
                                break;
                            }
                        }
                    }
                }
                // font-size
                const fs_ = FONT_SIZE_DECL.exec(raw);
                if (fs_) {
                    const hit = ABS_LENGTH.exec(blankVarFallbacks(fs_[1]));
                    if (hit) {
                        flag(file, u.n, 'font-size', `font-size carries the absolute literal ${hit[0]} — use a --text-* token (--text-2xs is the floor); em/%/vw stay legal`, raw);
                    }
                }
                // media
                if (T && T.breakpoints && /@media\b/.test(raw)) checkWidths(file, u, 'media');
            } else if (T && T.breakpoints && !/@container\b/.test(raw)) {
                // media-string: a width in a script is a media query too.
                checkWidths(file, u, 'media-string');
            }

            // script-fallback
            if (T && !u.css && !exempt) {
                for (const m of raw.matchAll(SCRIPT_COLOUR_PAIR)) {
                    const canon = light[m[2]];
                    if (canon && normHex(m[4]) !== canon.toLowerCase()) {
                        flag(file, u.n, 'script-fallback', `runtime fallback ${m[4]} for ${m[2]} ≠ canonical light ${canon} (tokens.json)`, raw);
                    }
                }
            }
        }

        // font-weight (block level)
        if (T) {
            for (const region of f.cssRegions) {
                for (const block of cssBlocks(region)) {
                    const family = block.decls.find((d) => d.prop === 'font-family');
                    const fam = family && /var\(\s*(--font-[\w-]+)/.exec(family.value);
                    const spec = fam && fonts[fam[1]];
                    if (!spec) continue;
                    const italic = block.decls.some((d) => d.prop === 'font-style' && /\bitalic\b/.test(d.value));
                    const style = italic ? 'italic' : 'normal';
                    const weight = block.decls.find((d) => d.prop === 'font-weight' && /^\d{3}\b/.test(d.value));
                    const ranges = spec[style] || [];
                    const loaded = (w) => ranges.some(([lo, hi]) => w >= lo && w <= hi);
                    const describe = ranges.map(([a, b]) => (a === b ? a : `${a}–${b}`)).join('/') || 'none';
                    if (weight && !loaded(parseInt(weight.value, 10))) {
                        flag(file, weight.line, 'font-weight', `font-weight: ${weight.value} on ${fam[1]} (${spec.family}) is not a loaded ${style} weight (${describe}) — the browser substitutes the nearest face`, `${block.selector} { font-weight: ${weight.value} }`);
                    } else if (italic && !ranges.length) {
                        flag(file, family.line, 'font-weight', `italic ${fam[1]} (${spec.family}) — no italic is loaded, so it is synthesised`, block.selector);
                    }
                }
            }
        }

        // fallback-object (file level, scripts only)
        if (T && /\.(js|ts|mjs|cjs)$/.test(file)) checkRuntimeTables(f.text, file, T, flag);
    }

    // The two block-level rules below read every CSS region at once: a
    // composition on :root in one sheet is repaired by a `body` declaration in
    // another, and the property it composes from may live in a third.
    const allBlocks = [];
    for (const f of parsed) {
        for (const region of f.cssRegions) {
            for (const block of cssBlocks(region, { dropComments: true })) {
                if (!block.selector || block.selector.startsWith('@')) continue;
                allBlocks.push({ file: f.rel, block, complex: complexSelectors(block.selector) });
            }
        }
    }

    // focus-outline
    for (const { file, block, complex } of allBlocks) {
        const offending = complex.filter((c) => !NOT_FOCUS_VISIBLE.test(c));
        if (!offending.length) continue;
        const where = offending.some(targetsFocus)
            ? 'on a focus selector deletes the focus indicator'
            : 'on a base rule deletes the focus indicator wherever no later rule restores an outline';
        for (const d of block.decls) {
            if (OUTLINE_REMOVED(d.prop, d.value)) {
                flag(file, d.line, 'focus-outline', `${d.prop}: ${d.value} ${where} — use var(--focus-outline), or \`outline: 2px solid transparent\` beside a --ring-focus box-shadow (forced-colors drops the shadow); only \`:focus:not(:focus-visible)\` may drop the outline`, `${block.selector} { ${d.prop}: ${d.value} }`);
            }
        }
    }

    // scope
    if (T) {
        const themed = new Set(Array.isArray(T.themed) ? T.themed : Object.keys(T.dark || {}));
        const refs = (value) => [...value.matchAll(VAR_USE)].map((m) => m[1]);
        const customDecls = allBlocks.flatMap(({ file, block, complex }) => block.decls
            .filter((d) => d.prop.startsWith('--'))
            .map((d) => ({ file, d, complex, selector: block.selector })));
        // A module property composed from a themed token flips too — and so
        // does one composed from THAT, so close over the module's own vocabulary.
        for (let grew = true; grew;) {
            grew = false;
            for (const { d } of customDecls) {
                if (!themed.has(d.prop) && refs(d.value).some((r) => themed.has(r))) {
                    themed.add(d.prop);
                    grew = true;
                }
            }
        }
        const onBody = new Set(customDecls
            .filter(({ complex }) => complex.some((c) => MATCHES_BODY.test(subjectCompound(c))))
            .map(({ d }) => d.prop));
        for (const { file, d, complex, selector } of customDecls) {
            if (!complex.some((c) => ROOT_ONLY.test(subjectCompound(c)))) continue;
            if (onBody.has(d.prop)) continue;
            const flips = [...new Set(refs(d.value).filter((r) => themed.has(r)))];
            if (!flips.length) continue;
            flag(file, d.line, 'scope', `${d.prop} composes ${flips.join(', ')}, which flip${flips.length === 1 ? 's' : ''} with the theme, but is declared only on \`${selector}\` — the manual toggle redeclares theme tokens on <body>, so this freezes at the OS-scheme value. Declare it on \`:root, body\``, `${selector} { ${d.prop}: ${d.value} }`);
        }
    }

    violations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
    return violations;
}

/** FALLBACK_LIGHT / FALLBACK_DARK and the SERIES_* palette arrays. */
function checkRuntimeTables(src, file, T, flag) {
    const camelToVar = (k) => '--' + k.replace(/([A-Z])/g, '-$1').toLowerCase();
    for (const [objName, theme] of [['FALLBACK_LIGHT', 'light'], ['FALLBACK_DARK', 'dark']]) {
        const block = new RegExp(objName + '\\s*=\\s*\\{([\\s\\S]*?)\\}').exec(src);
        if (!block) continue;
        const startLine = lineOf(src, block.index);
        for (const e of block[1].matchAll(/(\w+)\s*:\s*'(#[0-9a-fA-F]{3,8})'/g)) {
            const name = camelToVar(e[1]);
            // Colour tokens declared outside _colors.scss (--panel-bg lives
            // in _tokens.scss) are published under `values`, not the hex map.
            const canon = (T[theme] && T[theme][name])
                || (T.values && T.values[theme] && T.values[theme][name]);
            if (canon && normHex(e[2]) !== canon.toLowerCase()) {
                flag(file, startLine + lineOf(block[1], e.index) - 1, 'fallback-object',
                    `${objName}.${e[1]} ${e[2]} ≠ canonical ${theme} ${canon} (${name})`, e[0]);
            }
        }
    }

    const series = T.series;
    if (!series || !/SERIES_LIGHT\s*=/.test(src)) return;
    const readArray = (name) => {
        const m = new RegExp(name + '\\s*=\\s*\\[([\\s\\S]*?)\\]').exec(src);
        return m ? (m[1].match(/#[0-9a-fA-F]{3,8}/g) || []) : [];
    };
    const leadMatch = /SERIES_LEAD_SLOTS\s*=\s*(\d+)/.exec(src);
    const lead = leadMatch ? Number(leadMatch[1]) : undefined;
    if (lead !== series.leadSlots) {
        flag(file, lineOf(src, leadMatch ? leadMatch.index : 0), 'fallback-object',
            `SERIES_LEAD_SLOTS ${lead} ≠ tokens.json series.leadSlots ${series.leadSlots}`, 'SERIES_LEAD_SLOTS');
    }
    for (const [arr, theme] of [['SERIES_LIGHT', 'light'], ['SERIES_DARK', 'dark']]) {
        const got = readArray(arr);
        const want = series[theme] || [];
        const line = lineOf(src, src.indexOf(arr));
        if (got.length !== want.length) {
            flag(file, line, 'fallback-object', `${arr} has ${got.length} slots, tokens.json series.${theme} has ${want.length}`, arr);
            continue;
        }
        want.forEach((hex, i) => {
            if (normHex(got[i]) !== hex.toLowerCase()) {
                flag(file, line, 'fallback-object', `${arr}[${i}] ${got[i]} ≠ tokens.json series.${theme}[${i}] ${hex} (--series-${i + 1})`, arr);
            }
        });
    }
}

/**
 * Command-line entry point for a module's check-theme-tokens.js.
 *
 * @param {object} config
 * @param {string} config.root          module root (absolute)
 * @param {Array<[string, string[]]>} config.roots   [dir, extensions] pairs
 * @param {(rel: string) => boolean} [config.skip]  generated / vendored files
 * @param {RegExp} config.ownPrefix     the module's custom-property namespace
 * @param {string} [config.docs]        where a failing contributor should read
 */
function cli(config) {
    if (process.argv.includes('--against-theme-master')) {
        compareWithTheme(config.root).then((code) => process.exit(code), (e) => {
            console.error(`✗ could not reach IWAC-theme master: ${e.message}`);
            process.exit(1);
        });
        return;
    }
    const tokensPath = path.join(config.root, 'tokens.json');
    let tokens = null;
    if (fs.existsSync(tokensPath)) {
        try {
            tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
        } catch (e) {
            console.warn('  ! tokens.json present but unparseable — value checks skipped\n');
        }
    } else {
        console.warn('  ! tokens.json not found — value checks skipped (run `npm run sync:tokens` in IWAC-theme)\n');
    }
    const files = collectFiles(config.root, config.roots, config.skip);
    const violations = runGuard({ files, tokens, ownPrefix: config.ownPrefix });
    const contract = tokens && tokens.themeVersion ? `IWAC-theme ${tokens.themeVersion} contract` : 'tokens.json contract';
    if (violations.length) {
        console.error(`\n✗ theme-token guard: ${violations.length} violation(s) against the ${contract}\n`);
        for (const v of violations) {
            console.error(`  ${v.file}:${v.line}  [${v.rule}] ${v.msg}`);
            console.error(`      ${v.snippet}`);
        }
        console.error('\nSee IWAC-theme/docs/DESIGN-SYSTEM.md' + (config.docs ? ` and ${config.docs}` : '') + '.');
        console.error('Canonical values: tokens.json (refresh with `npm run sync:tokens` in IWAC-theme).\n');
        process.exit(1);
    }
    console.log(`✓ theme-token guard: ${files.length} files clean against the ${contract}`);
}

/* ------------------------------------------------------------------ */
/*  Freshness: is this module's copy of the contract the theme's?      */
/* ------------------------------------------------------------------ */

const THEME_RAW = 'https://raw.githubusercontent.com/fmadore/IWAC-theme/master/';
const SYNCED = [
    ['tokens.json', 'tokens.json'],
    ['scripts/theme-token-guard.cjs', 'scripts/lib/theme-token-guard.cjs'],
];

/** -1 / 0 / 1 for dotted numeric versions ("2.22.0"). */
function compareVersions(a, b) {
    const pa = String(a || '0').split('.').map(Number);
    const pb = String(b || '0').split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const d = (pa[i] || 0) - (pb[i] || 0);
        if (d) return d < 0 ? -1 : 1;
    }
    return 0;
}

/**
 * Pure verdict on a module's synced files against the theme's.
 *
 * Every rule in this file passes against whatever contract it is handed, so
 * a module whose tokens.json was never re-synced checks itself against an old
 * contract and reports green. This is the one check that can tell: run weekly
 * by each module's `theme-contract` workflow. A copy AHEAD of master (the
 * theme change it came from is not merged yet) is reported, not failed; a
 * copy BEHIND, or different at the same version, fails.
 *
 * @param {{rel: string, local: string, remote: string}[]} files
 * @returns {{code: number, lines: string[]}}
 */
function freshnessVerdict(files) {
    const version = (text) => { try { return JSON.parse(text).themeVersion; } catch (e) { return undefined; } };
    const tokens = files.find((f) => f.rel === 'tokens.json');
    const localV = tokens && version(tokens.local);
    const remoteV = tokens && version(tokens.remote);
    const stale = files.filter((f) => f.local !== f.remote);
    if (!stale.length) {
        return { code: 0, lines: [`✓ theme contract current: IWAC-theme ${remoteV} (${files.map((f) => f.rel).join(', ')})`] };
    }
    const order = compareVersions(localV, remoteV);
    const names = stale.map((f) => f.rel).join(', ');
    if (order > 0) {
        return { code: 0, lines: [
            `ℹ ${names} are AHEAD of IWAC-theme master (local ${localV}, master ${remoteV || "unversioned"}):`,
            '  the theme change they were synced from is not merged yet. Merge it, then re-sync if it changed.',
        ] };
    }
    return { code: 1, lines: [
        `✗ ${names} differ from IWAC-theme master (local ${localV || 'unversioned'}, master ${remoteV}).`,
        '  Every guard rule passes against whatever contract it is given, so a stale copy checks this',
        '  module against an old contract and stays green. In IWAC-theme: `npm run sync:tokens`,',
        '  then rebuild this module and commit both files.',
    ] };
}

async function compareWithTheme(root) {
    const files = [];
    for (const [rel, themePath] of SYNCED) {
        const res = await fetch(THEME_RAW + themePath);
        // A file master does not have yet (404) is a difference like any
        // other — the version comparison decides whether this copy is ahead.
        if (!res.ok && res.status !== 404) throw new Error(`${themePath}: HTTP ${res.status}`);
        const localPath = path.join(root, rel);
        files.push({
            rel,
            local: fs.existsSync(localPath) ? fs.readFileSync(localPath, 'utf8') : '',
            remote: res.ok ? await res.text() : '',
        });
    }
    const { code, lines } = freshnessVerdict(files);
    (code ? console.error : console.log)(lines.join('\n'));
    return code;
}

module.exports = { runGuard, cli, collectFiles, unitsOf, freshnessVerdict };
