'use strict';

// The module guard engine (scripts/lib/theme-token-guard.cjs) is synced into
// both modules beside tokens.json, so a rule that silently stops matching here
// stops matching in two repositories at once. Each rule gets a case that must
// fire and a case that must not, against the real tokens.json — the contract
// the modules actually check against.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { runGuard } = require('../scripts/lib/theme-token-guard.cjs');
const tokens = require(path.join(__dirname, '..', 'tokens.json'));

const OWN = /^--iwac-test-/;

/** Run the guard over one in-memory file; return the rules that fired. */
function rulesFor(rel, text) {
    return runGuard({ files: [{ rel, text }], tokens, ownPrefix: OWN }).map((v) => v.rule);
}

function fires(rel, text, rule) {
    assert.ok(rulesFor(rel, text).includes(rule), `expected [${rule}] on: ${text}`);
}

function clean(rel, text) {
    const hits = runGuard({ files: [{ rel, text }], tokens, ownPrefix: OWN });
    assert.deepEqual(hits.map((v) => `${v.rule}: ${v.msg}`), [], `expected no violation on: ${text}`);
}

test('names: public, own-namespace and module-declared tokens pass', () => {
    clean('a.css', '.a { color: var(--ink, #13161c); padding: var(--space-4, 1rem); }');
    clean('a.css', '.a { --iwac-test-gap: 3px; margin: var(--iwac-test-gap); }');
    clean('a.css', '.a { --local-w: 3px; } .b { width: var(--local-w); }');
});

test('names: unknown, theme-internal and deprecated tokens fail with the fix named', () => {
    fires('a.css', '.a { margin: var(--space-2xs); }', 'names');
    fires('a.css', '.a { background: var(--plate-scrim); }', 'names');
    const [hit] = runGuard({ files: [{ rel: 'a.css', text: '.a { gap: var(--space-md, 1rem); }' }], tokens, ownPrefix: OWN });
    assert.match(hit.msg, /deprecated — use --space-4/);
});

test('override: re-declaring a theme token fails unless marked', () => {
    fires('a.css', '.a { --primary: red; }', 'override');
    fires('a.js', "el.style.setProperty('--surface', '#fff');", 'override');
    clean('a.css', '.a { --primary: var(--iwac-test-accent); } /* allow-override */');
});

test('fallback: hex, non-colour and chained fallbacks equal the canonical light value', () => {
    clean('a.css', '.a { color: var(--primary, #ce4115); border-radius: var(--panel-radius, 0.5rem); }');
    fires('a.css', '.a { color: var(--primary, #e64a19); }', 'fallback');
    fires('a.css', '.a { line-height: var(--line-height-relaxed, 1.6); }', 'fallback');
    clean('a.css', '.a { background: var(--panel-bg, var(--surface, #fdfcfb)); }');
    fires('a.css', '.a { color: var(--ink-strong, var(--ink, #13161c)); }', 'fallback');
    clean('a.css', '.a { outline: var(--focus-outline, 2px solid var(--focus-color, #ce4115)); }');
});

test('raw-colour: every notation is caught outside a fallback, in CSS only', () => {
    for (const lit of ['#fff', 'rgba(0, 0, 0, 0.5)', 'hsl(10 50% 50%)', 'oklch(60% 0.1 40)', 'lab(50% 20 20)', 'color(srgb 1 0 0)']) {
        fires('a.css', `.a { color: ${lit}; }`, 'raw-colour');
    }
    clean('a.css', '.a { box-shadow: var(--shadow-sm, 0 1px 3px 0 rgba(9, 11, 15, 0.12), 0 1px 2px -1px rgba(20, 22, 27, 0.06)); }');
    clean('a.css', '.a { color: #fff; } /* allow-hex */');
    clean('a.js', "const accent = '#abcdef';");
});

test('raw-colour: a declaration wrapped over several lines is read as one', () => {
    clean('a.css', '.a {\n  box-shadow: var(\n    --shadow-sm,\n    0 1px 3px 0 rgba(9, 11, 15, 0.12),\n    0 1px 2px -1px rgba(20, 22, 27, 0.06)\n  );\n}');
});

test('colour mixing: oklab only, and never toward black or white', () => {
    fires('a.css', '.a { color: color-mix(in srgb, var(--primary) 50%, transparent); }', 'srgb-mix');
    fires('a.css', '.a { color: color-mix(in oklab, var(--primary), black 10%); }', 'absolute-mix');
    fires('a.css', '.a { color: color-mix(in oklab, var(--black) 30%, transparent); }', 'absolute-mix');
    clean('a.css', '.a { color: color-mix(in oklab, var(--primary), var(--surface) 30%); }');
    clean('a.css', '.a { color: color-mix(in oklab, var(--primary), white 12%); /* allow-absolute-mix */ }');
});

test('media: px on the published breakpoints, max at − 1, no retired spellings', () => {
    clean('a.css', '@media (min-width: 768px) { .a { color: inherit; } }');
    clean('a.css', '@media (max-width: 767px) { .a { color: inherit; } }');
    fires('a.css', '@media (max-width: 768px) { .a { color: inherit; } }', 'media');
    fires('a.css', '@media (max-width: 767.98px) { .a { color: inherit; } }', 'media');
    fires('a.css', '@media (min-width: 640px) { .a { color: inherit; } }', 'media');
    fires('a.css', '@media (max-width: 48rem) { .a { color: inherit; } }', 'media');
    clean('a.css', '@container card (max-width: 900px) { .a { color: inherit; } }');
});

test('media-string: a width in a script is held to the same contract', () => {
    clean('a.ts', "const mq = window.matchMedia('(max-width: 767px)');");
    fires('a.ts', "attach(breakpoint = '(max-width: 768px)') {}", 'media-string');
    fires('a.svelte', "<script>const m = matchMedia('(min-width: 900px)');</script>", 'media-string');
});

test('font-size: absolute lengths fail, including inside math functions', () => {
    fires('a.css', '.a { font-size: 14px; }', 'font-size');
    fires('a.css', '.a { font-size: clamp(0.9375rem, 2vw, 1.1875rem); }', 'font-size');
    clean('a.css', '.a { font-size: var(--text-sm, 0.9375rem); }');
    clean('a.css', '.a { font-size: calc(var(--text-sm, 0.9375rem) * 1.1); }');
    clean('a.css', '.a { font-size: 0.9em; }');
});

test('font-weight: a weight the theme does not load fails', () => {
    fires('a.css', '.a { font-family: var(--font-headings); font-weight: 700; }', 'font-weight');
    clean('a.css', '.a { font-family: var(--font-headings); font-weight: 800; }');
    clean('a.css', '.a { font-family: var(--font-body); font-weight: 700; }');
    fires('a.css', '.a { font-family: var(--font-headings); font-style: italic; }', 'font-weight');
    fires('a.svelte', '<div></div>\n<style>\n  .a {\n    font-family: var(--font-serif-text);\n    font-weight: 700;\n  }\n</style>', 'font-weight');
});

test('script-fallback: runtime colour fallbacks equal the light value', () => {
    clean('a.ts', "const p = readColor('--primary', '#ce4115');");
    fires('a.ts', "const p = readColor('--primary', '#e64a19');", 'script-fallback');
});

test('fallback-object: FALLBACK_* tables and the series palette match tokens.json', () => {
    fires('a.js', "var FALLBACK_LIGHT = {\n  ink: '#000000'\n};", 'fallback-object');
    // A colour token published under `values` (declared outside _colors.scss)
    // is pinned too — --panel-bg is --surface in light, --surface-raised in dark.
    fires('a.js', "var FALLBACK_DARK = {\n  panelBg: '#110c08'\n};", 'fallback-object');
    clean('a.js', `var FALLBACK_DARK = {\n  panelBg: '${tokens.values.dark['--panel-bg']}'\n};`);
    clean('a.js', `var FALLBACK_DARK = {\n  surface: '${tokens.dark['--surface']}'\n};`);
    const series = (arr) => arr.map((h) => `'${h}'`).join(', ');
    clean('a.js', `var SERIES_LEAD_SLOTS = ${tokens.series.leadSlots};\nvar SERIES_LIGHT = [${series(tokens.series.light)}];\nvar SERIES_DARK = [${series(tokens.series.dark)}];`);
    const wrong = tokens.series.light.slice();
    wrong[5] = '#000000';
    fires('a.js', `var SERIES_LEAD_SLOTS = ${tokens.series.leadSlots};\nvar SERIES_LIGHT = [${series(wrong)}];\nvar SERIES_DARK = [${series(tokens.series.dark)}];`, 'fallback-object');
});

test('comments are not code, but opt-out markers inside them still count', () => {
    clean('a.css', '/* the old accent was #e64a19 and var(--accent) */ .a { color: inherit; }');
    clean('a.js', "// var(--space-md) was retired\nconst x = 1;");
    clean('a.svelte', '<!-- var(--plate-scrim) -->\n<style>.a { color: #fff; /* allow-hex */ }</style>');
});

test('freshness: current passes, ahead is reported, behind or diverged fails', () => {
    const { freshnessVerdict } = require('../scripts/lib/theme-token-guard.cjs');
    const t = (v, extra = '') => JSON.stringify({ themeVersion: v, extra });
    const pair = (local, remote, guardLocal = 'g', guardRemote = 'g') => [
        { rel: 'tokens.json', local, remote },
        { rel: 'scripts/theme-token-guard.cjs', local: guardLocal, remote: guardRemote },
    ];
    assert.equal(freshnessVerdict(pair(t('2.22.0'), t('2.22.0'))).code, 0);
    assert.equal(freshnessVerdict(pair(t('2.23.0'), t('2.22.0'))).code, 0, 'ahead of master: an unmerged theme change');
    assert.equal(freshnessVerdict(pair(t('2.21.0'), t('2.22.0'))).code, 1, 'behind master');
    assert.equal(freshnessVerdict(pair(t('2.22.0', 'a'), t('2.22.0', 'b'))).code, 1, 'same version, different contract');
    assert.equal(freshnessVerdict(pair(t('2.22.0'), t('2.22.0'), 'old rules', 'new rules')).code, 1, 'engine drifted');
});

test('scope: a :root-only composition of a themed token fails; :root, body passes', () => {
    const ramp = 'color-mix(in oklab, var(--primary, #ce4115) 8%, var(--surface, #fdfcfb))';
    fires('a.css', `:root { --iwac-test-ramp: ${ramp}; }`, 'scope');
    fires('a.css', `html { --iwac-test-ramp: ${ramp}; }`, 'scope');
    fires('a.css', `:root:not([data-x]) { --iwac-test-ramp: ${ramp}; }`, 'scope');
    fires('a.svelte', `<style>\n  :global(:root) { --iwac-test-ramp: ${ramp}; }\n</style>`, 'scope');
    clean('a.css', `:root,\nbody { --iwac-test-ramp: ${ramp}; }`);
    // Repaired by a body declaration in another sheet.
    const hits = runGuard({
        files: [
            { rel: 'a.css', text: `:root { --iwac-test-ramp: ${ramp}; }` },
            { rel: 'b.css', text: `body { --iwac-test-ramp: ${ramp}; }` },
        ],
        tokens,
        ownPrefix: OWN,
    });
    assert.deepEqual(hits.map((v) => v.rule), []);
    // Theme-independent values and component-scoped compositions are fine.
    clean('a.css', ':root { --iwac-test-gap: 3px; --iwac-test-r: var(--radius-md, 0.5rem); }');
    clean('a.css', `.iwac-test-block { --iwac-test-ramp: ${ramp}; }`);
});

test('scope: a composition of a module property that flips is caught too', () => {
    fires('a.css', ':root, body { --iwac-test-a: var(--primary, #ce4115); }\n:root { --iwac-test-b: var(--iwac-test-a); }', 'scope');
    clean('a.css', ':root, body { --iwac-test-a: var(--primary, #ce4115); --iwac-test-b: var(--iwac-test-a); }');
});

test('focus-outline: dropping the outline anywhere but :focus:not(:focus-visible) fails', () => {
    fires('a.css', '.a:focus { outline: none; }', 'focus-outline');
    fires('a.css', '.a:focus-visible { outline: 0; }', 'focus-outline');
    fires('a.css', '.a:hover,\n.a:focus-within { outline: none !important; }', 'focus-outline');
    fires('a.css', '.a:focus-visible { outline-style: none; }', 'focus-outline');
    fires('a.svelte', '<style>\n  .a:global(:focus-visible) { outline: none; }\n</style>', 'focus-outline');
    // A base rule takes the outline away from every state that does not
    // restore one — and a box-shadow ring on :focus-visible does not.
    fires('a.css', '.slider { outline: none; }\n.slider:focus-visible { box-shadow: var(--ring-focus, 0 0 0 3px rgba(206, 65, 21, 0.3)); }', 'focus-outline');
    // One sanctioned selector does not excuse its neighbour in the list.
    fires('a.css', '.a:focus:not(:focus-visible),\n.b:focus { outline: none; }', 'focus-outline');
});

test('focus-outline: the sanctioned exception and real outlines pass', () => {
    clean('a.css', '.a:focus:not(:focus-visible) { outline: none; }');
    clean('a.svelte', '<style>\n  .a:focus:not(:focus-visible) { outline: none; }\n</style>');
    clean('a.css', '.a:focus-visible { outline: var(--focus-outline, 2px solid #ce4115); outline-offset: 2px; }');
    clean('a.css', '.a:focus-visible { outline: 2px solid transparent; box-shadow: var(--ring-focus, 0 0 0 3px rgba(206, 65, 21, 0.3)); }');
    clean('a.css', '.a:hover { outline-offset: 4px; }');
});

test('removed tokens are refused', () => {
    fires('a.css', '.a { color: hsl(var(--primary-hue) 50% 50%); }', 'removed');
});
