'use strict';
/**
 * The theme's token vocabulary — the one definition of "which custom
 * properties does this theme actually define".
 *
 * Two consumers need the same answer and must never disagree about it:
 *   - scripts/check-token-usage.js, which fails the build when the theme's
 *     own SCSS uses a var(--…) that resolves to nothing;
 *   - scripts/build-tokens.js, which publishes the list as `names` in
 *     tokens.json so the sibling modules (IwacSearch, IwacVisualizations)
 *     can run the same check against their own sources.
 *
 * It used to live only in the first script, which is why the modules could
 * never be checked: tokens.json carries resolved *colour* values, so nothing
 * downstream knew that `--space-2xs` or `--panel-border-color` aren't real.
 *
 * A token counts as defined when it is declared:
 *   - in any SCSS file under asset/sass (`--name: …;`),
 *   - inline in a template (`--name:` in view/**.phtml — e.g. the brand
 *     seeds layout.phtml injects), or
 *   - at runtime by theme JS (`setProperty('--name', …)`).
 */

const fs = require('fs');
const path = require('path');

// A custom property DECLARATION only ever opens a statement: it follows `{`,
// `;`, a quote (inline `style="--x:…"`), or nothing but whitespace on its line.
// Requiring that excludes BEM modifiers in selectors — `.cell--type::before`
// used to publish `--type` and `--date` as theme tokens, and a rule-comment
// banner of hyphens published itself as a 70-character token name. Fictional
// entries in `names` are worse than useless: they are exactly what the name
// check exists to catch, so a module could reference them and pass.
const DECL_RE = /(?:^|[{;'"]|\s)(--[a-z0-9][a-z0-9-]*)\s*:/gim;
const SET_RE = /setProperty\(\s*['"](--[a-z0-9-]+)['"]/g;

function* walk(dir, exts) {
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
        return; // an optional source root simply contributes nothing
    }
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            yield* walk(full, exts);
        } else if (exts.some((e) => entry.name.endsWith(e))) {
            yield full;
        }
    }
}

/**
 * @param {string} themeRoot absolute path to the IWAC-theme checkout
 * @returns {Set<string>} every custom-property name the theme defines
 */
function collectDefinedTokenNames(themeRoot) {
    const defined = new Set();

    const scan = (dir, exts, re) => {
        for (const file of walk(path.join(themeRoot, dir), exts)) {
            const src = fs.readFileSync(file, 'utf8');
            for (const m of src.matchAll(re)) defined.add(m[1]);
        }
    };

    scan('asset/sass', ['.scss'], DECL_RE);
    scan('view', ['.phtml'], DECL_RE);
    scan('asset/js', ['.js'], SET_RE);

    return defined;
}

/* -------------------------------------------------------------------------
 * SCSS block extraction.
 *
 * Shared for the same reason as the vocabulary above: build-tokens.js resolves
 * the light and dark cascade blocks to publish tokens.json, and
 * check-token-usage.js reads the SAME blocks to assert that no light
 * composition references a token the dark block redeclares. Two readers, one
 * parse — a guard that disagreed with the generator about where the dark block
 * starts would be checking a different file than the one that ships.
 * ---------------------------------------------------------------------- */

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

/**
 * Extract the body of the first top-level `:root { … }` block.
 *
 * Anchored on a line start, NOT `indexOf(':root')` — every one of these files
 * mentions `:root` in prose above the block it describes, and a naive search
 * lands on the comment and then balances braces from the NEXT `{` it finds,
 * which is a different block entirely.
 */
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

/** Parse `--name: value;` declarations from a block body, in source order. */
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

module.exports = {
    collectDefinedTokenNames,
    walk,
    extractMixinBody,
    extractRootBody,
    parseDecls,
};
