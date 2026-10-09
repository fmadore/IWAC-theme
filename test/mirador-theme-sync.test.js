'use strict';

// mirador-theme-sync.js carries two behaviours CLAUDE.md calls load-bearing and
// easy to drop: the dark-mode sync into Mirador's store, and the full-page lift
// for "Maximize window" (is-maximized on the container, a min-height
// placeholder on the block, the body class, and Escape to restore). Mirador
// itself is not loaded here — the script only ever talks to it through
// `window.miradors[id].store`, so a Redux-shaped fake is the real interface.
//
// The page is the rendered item page (test-support/fixtures.js). Its viewer
// block is the one piece no theme template renders: the Mirador module prints
// it, so the fixture carries a copy of the live markup (miradorBlock() in
// test/php/render-fixtures.php). What sits inside it — Mirador's <main> and
// <h1> — is React's, mounted at runtime, and is mounted here the same way.

const test = require('node:test');
const assert = require('node:assert/strict');
const { flush, runAsset } = require('../test-support/dom');
const { fixtureDom } = require('../test-support/fixtures');

function fakeStore(windows) {
    const listeners = [];
    const dispatched = [];
    const state = { windows };
    return {
        dispatched,
        getState: () => state,
        subscribe(listener) {
            listeners.push(listener);
            return () => {};
        },
        dispatch(action) {
            dispatched.push(action);
            if (action.type === 'mirador/MINIMIZE_WINDOW') {
                state.windows[action.windowId].maximized = false;
                listeners.forEach((listener) => listener());
            }
        },
        notify() {
            listeners.forEach((listener) => listener());
        },
    };
}

/** The item page, its body themed as layout.phtml's inline script leaves it. */
function itemPage(theme = 'light') {
    const dom = fixtureDom('item.en');
    dom.window.document.body.setAttribute('data-theme', theme);
    return dom;
}

function mount({ theme = 'light', windows = { w1: { maximized: false } } } = {}) {
    const dom = itemPage(theme);
    dom.window.matchMedia = () => ({ matches: false, addEventListener() {} });
    const store = fakeStore(windows);
    dom.window.miradors = { 'mirador-1': { store } };
    // jsdom is still `loading` here, so the real onReady would defer init to
    // DOMContentLoaded; run it now, as the plate-viewer tests do.
    dom.window.IWACUtils = { onReady: (callback) => callback() };
    runAsset(dom, 'mirador-theme-sync.js');
    return { dom, store, doc: dom.window.document };
}

test('the site theme reaches Mirador on load and on every toggle', async () => {
    const { store, doc } = mount({ theme: 'dark' });
    // Actions are built inside the jsdom realm, so compare their shape, not
    // their prototypes.
    const plain = (action) => JSON.parse(JSON.stringify(action));
    assert.deepEqual(plain(store.dispatched[0]), { type: 'mirador/UPDATE_CONFIG', config: { selectedTheme: 'dark' } });

    doc.body.setAttribute('data-theme', 'light');
    await flush();
    const last = store.dispatched[store.dispatched.length - 1];
    assert.deepEqual(plain(last), { type: 'mirador/UPDATE_CONFIG', config: { selectedTheme: 'light' } });
});

test('maximizing a window lifts the container and holds the page open behind it', () => {
    const windows = { w1: { maximized: false } };
    const { store, doc } = mount({ windows });
    const container = doc.getElementById('mirador-1');
    const block = doc.querySelector('.block-mirador');

    windows.w1.maximized = true;
    store.notify();
    assert.ok(container.classList.contains('is-maximized'));
    assert.ok(doc.body.classList.contains('mirador-maximized'));
    assert.match(block.style.minHeight, /px$/, 'the block keeps a placeholder height while the viewer is fixed');

    windows.w1.maximized = false;
    store.notify();
    assert.ok(!container.classList.contains('is-maximized'));
    assert.ok(!doc.body.classList.contains('mirador-maximized'));
    assert.equal(block.style.minHeight, '');
});

test('Escape restores a maximized window, and only while one is maximized', () => {
    const windows = { w1: { maximized: true } };
    const { dom, store, doc } = mount({ windows });
    assert.ok(doc.body.classList.contains('mirador-maximized'));

    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    assert.ok(store.dispatched.some((a) => a.type === 'mirador/MINIMIZE_WINDOW' && a.windowId === 'w1'));
    assert.ok(!doc.body.classList.contains('mirador-maximized'));

    const before = store.dispatched.length;
    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    assert.equal(store.dispatched.length, before, 'a second Escape has nothing to restore');
});

test("Mirador's main and h1 are demoted to a region and an h2, and stay so across re-renders", async () => {
    const dom = itemPage();
    // What Mirador mounts into the module's container.
    dom.window.document.getElementById('mirador-1').innerHTML = `
        <main class="mirador-viewer" aria-label="Workspace">
            <div class="mirador-workspace-viewport"><h1 style="position:absolute">Mirador viewer</h1><div class="window"></div></div>
        </main>`;
    dom.window.matchMedia = () => ({ matches: false, addEventListener() {} });
    dom.window.miradors = { 'mirador-1': { store: fakeStore({ w1: { maximized: false } }) } };
    dom.window.IWACUtils = { onReady: (callback) => callback() };
    runAsset(dom, 'mirador-theme-sync.js');
    const doc = dom.window.document;

    const viewerMain = doc.querySelector('main.mirador-viewer');
    assert.equal(viewerMain.getAttribute('role'), 'region');
    assert.equal(viewerMain.getAttribute('aria-label'), 'Workspace', 'the region keeps its name');
    const heading = doc.querySelector('.mirador-workspace-viewport > h1');
    assert.equal(heading.getAttribute('role'), 'heading');
    assert.equal(heading.getAttribute('aria-level'), '2');
    // The page's own h1 — the record's headline — is untouched.
    assert.equal(doc.querySelector('#content > h1').textContent.trim(), 'La Tabaski à Ouagadougou');
    assert.equal(doc.querySelector('#content > h1').hasAttribute('role'), false);

    // React remounts the workspace: a fresh h1 must be demoted too.
    const viewport = doc.querySelector('.mirador-workspace-viewport');
    viewport.innerHTML = '<h1>Mirador viewer</h1><div class="window"></div>';
    await flush();
    const remounted = doc.querySelector('.mirador-workspace-viewport > h1');
    assert.equal(remounted.getAttribute('role'), 'heading');
    assert.equal(remounted.getAttribute('aria-level'), '2');

    dom.window.close();
});

test('waiting for a viewer that never registers stops after 30 seconds', () => {
    const dom = itemPage();
    dom.window.matchMedia = () => ({ matches: false, addEventListener() {} });
    // A config with no store yet: the module's raw entry before the viewer starts.
    dom.window.miradors = { 'mirador-1': { id: 'mirador-1' } };
    const timeouts = [];
    const cleared = [];
    dom.window.setInterval = () => 7;
    dom.window.clearInterval = (id) => { cleared.push(id); };
    dom.window.setTimeout = (callback, ms) => { timeouts.push({ callback, ms }); return 9; };
    dom.window.IWACUtils = { onReady: (callback) => callback() };
    runAsset(dom, 'mirador-theme-sync.js');

    const limit = timeouts.find((t) => t.ms === 30000);
    assert.ok(limit, 'no time limit on the wait');
    limit.callback();
    assert.deepEqual(cleared, [7], 'the 250ms check keeps running past the limit');
    dom.window.close();
});

test('a page without a viewer starts no polling at all', () => {
    const dom = fixtureDom('items-browse.en');
    let intervals = 0;
    dom.window.setInterval = () => { intervals++; return 0; };
    dom.window.IWACUtils = { onReady: (callback) => callback() };
    runAsset(dom, 'mirador-theme-sync.js');
    assert.equal(intervals, 0);
});
