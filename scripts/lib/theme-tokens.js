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

const DECL_RE = /(--[a-z0-9-]+)\s*:/gi;
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

module.exports = { collectDefinedTokenNames, walk };
