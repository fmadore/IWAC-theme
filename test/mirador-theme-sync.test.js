'use strict';

// mirador-theme-sync.js carries two behaviours CLAUDE.md calls load-bearing and
// easy to drop: the dark-mode sync into Mirador's store, and the full-page lift
// for "Maximize window" (is-maximized on the container, a min-height
// placeholder on the block, the body class, and Escape to restore). Mirador
// itself is not loaded here — the script only ever talks to it through
// `window.miradors[id].store`, so a Redux-shaped fake is the real interface.

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDom, flush, runAsset } = require('../test-support/dom');

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

function mount({ theme = 'light', windows = { w1: { maximized: false } } } = {}) {
    const dom = createDom(`<!doctype html><body data-theme="${theme}">
        <div class="block block-mirador"><div id="mirador-1" class="mirador viewer"></div></div>
    </body>`);
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

test('a page without a viewer starts no polling at all', () => {
    const dom = createDom('<!doctype html><body><main>No viewer here</main></body>');
    let intervals = 0;
    dom.window.setInterval = () => { intervals++; return 0; };
    dom.window.IWACUtils = { onReady: (callback) => callback() };
    runAsset(dom, 'mirador-theme-sync.js');
    assert.equal(intervals, 0);
});
