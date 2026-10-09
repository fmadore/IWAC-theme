'use strict';

// Every page here is rendered from the real templates (test-support/fixtures.js):
// the annotation disclosure and the citation panel from the item page, the
// theme toggle from the masthead, the layout toggle from the item browse, the
// carousel from the About page.

const test = require('node:test');
const assert = require('node:assert/strict');
const { flush, runAsset } = require('../test-support/dom');
const { fixtureDom } = require('../test-support/fixtures');

/** The item page with script.js running: its annotation disclosures bound. */
function annotatedItem(prepare = () => {}) {
    const dom = fixtureDom('item.en');
    dom.window.matchMedia = () => ({ matches: false, addEventListener() {} });
    dom.window.IWACUtils = {
        debounce: (callback) => callback,
        onReady: (callback) => callback(),
    };
    prepare(dom);
    runAsset(dom, 'script.js');
    return dom;
}

test('Escape closes an annotation disclosure and restores trigger focus', () => {
    // The AI summary's model note (common/resource-values.phtml).
    const dom = annotatedItem();
    const trigger = dom.window.document.querySelector('.annotation-trigger');
    const tooltip = dom.window.document.getElementById(trigger.getAttribute('aria-controls'));
    trigger.click();
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');
    assert.equal(tooltip.getAttribute('aria-hidden'), 'false');

    dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape' }));
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    assert.equal(tooltip.getAttribute('aria-hidden'), 'true');
    assert.equal(dom.window.document.activeElement, trigger);

    dom.window.close();
});

test('annotation disclosure stays inside a narrow viewport', () => {
    const dom = annotatedItem((dom) => {
        Object.defineProperty(dom.window, 'innerWidth', { configurable: true, value: 320 });
        Object.defineProperty(dom.window.document.documentElement, 'clientWidth', { configurable: true, value: 320 });
        // jsdom does no layout: place the trigger near the right edge by hand.
        const annotation = dom.window.document.querySelector('.annotation-btn');
        const wrapper = annotation.querySelector('.annotation-tooltip__wrapper');
        annotation.getBoundingClientRect = () => ({ top: 300, left: 305, right: 329, bottom: 324, width: 24, height: 24 });
        Object.defineProperty(wrapper, 'offsetWidth', { configurable: true, value: 288 });
        Object.defineProperty(wrapper, 'offsetHeight', { configurable: true, value: 100 });
    });
    const annotation = dom.window.document.querySelector('.annotation-btn');
    const tooltip = annotation.querySelector('.annotation-tooltip');
    const wrapper = annotation.querySelector('.annotation-tooltip__wrapper');
    annotation.querySelector('.annotation-trigger').click();

    assert.equal(tooltip.style.left, '-289px');
    assert.equal(305 + parseFloat(tooltip.style.left), 16);
    assert.equal(305 + parseFloat(tooltip.style.left) + wrapper.offsetWidth, 304);

    dom.window.close();
});

/** A rendered page with theme-toggle.js running against an in-memory store. */
function themed(name, { prefersDark = false } = {}) {
    const dom = fixtureDom(name);
    const values = new Map();
    dom.window.matchMedia = () => ({ matches: prefersDark, addEventListener() {} });
    dom.window.IWACUtils = {
        onReady: (callback) => callback(),
        localStore: {
            get: (key) => values.get(key) || null,
            set: (key, value) => values.set(key, value),
            remove: (key) => values.delete(key),
        },
    };
    runAsset(dom, 'theme-toggle.js');
    return { dom, values };
}

test('public theme API rejects unsupported modes', () => {
    const { dom } = themed('item.en');
    assert.equal(dom.window.IWACTheme.set('sepia'), false);
    assert.equal(dom.window.document.body.dataset.themeMode, 'system');
    assert.equal(dom.window.IWACTheme.set('dark'), true);
    assert.equal(dom.window.document.body.dataset.themeMode, 'dark');

    dom.window.close();
});

test('the theme toggle cycles system → light → dark → system, persisting and announcing each', () => {
    // The French masthead: the English labels are also the script's
    // fallbacks, so only translated ones prove the button's own are read.
    // The OS prefers dark, so "system" must resolve to dark.
    const { dom, values } = themed('item.fr', { prefersDark: true });
    const { body } = dom.window.document;
    const button = dom.window.document.querySelector('[data-theme-toggle]');
    const status = dom.window.document.querySelector('[data-theme-status]');

    // Initial load: the system mode, named on the button, announced to no one.
    assert.equal(body.dataset.themeMode, 'system');
    assert.equal(body.dataset.theme, 'dark');
    assert.equal(button.getAttribute('aria-label'), 'Thème système actif. Activer pour passer au mode clair.');
    assert.equal(status.textContent, '');

    const steps = [
        ['light', 'light', 'Thème clair actif. Activer pour passer au mode sombre.', 'Thème clair', 'light'],
        ['dark', 'dark', 'Thème sombre actif. Activer pour passer au thème système.', 'Thème sombre', 'dark'],
        ['system', 'dark', 'Thème système actif. Activer pour passer au mode clair.', 'Thème système', null],
    ];
    for (const [mode, theme, label, announced, stored] of steps) {
        button.click();
        assert.equal(body.dataset.themeMode, mode);
        assert.equal(body.dataset.theme, theme);
        assert.equal(button.getAttribute('aria-label'), label);
        assert.equal(status.textContent, announced);
        // "system" is the absence of a stored preference.
        assert.equal(values.get('iwac-theme-preference') || null, stored);
    }

    dom.window.close();
});

/** The item browse (grid by default, ?sort_by=title) with browse.js and a fake MiniMasonry. */
function browsed(prepare = () => {}) {
    const dom = fixtureDom('items-browse.en');
    const instances = [];
    dom.window.IWACUtils = { onReady: (callback) => callback() };
    dom.window.MiniMasonry = class {
        constructor(options) {
            this.options = options;
            this.destroyed = false;
            instances.push(this);
        }
        layout() {}
        destroy() { this.destroyed = true; }
    };
    prepare(dom);
    runAsset(dom, 'browse.js');
    return { dom, instances };
}

test('browse layout preference does not add history entries and cleans up Masonry', () => {
    let initialHistoryLength;
    const { dom, instances } = browsed((dom) => { initialHistoryLength = dom.window.history.length; });
    const document = dom.window.document;
    // No stylesheet here, so the gutter falls back to --space-6's 24px.
    assert.equal(instances[0].options.gutter, 24);
    const listButton = document.querySelector('[data-view="list"]');
    const gridButton = document.querySelector('[data-view="grid"]');
    // Choosing the current layout again is a no-op.
    gridButton.click();
    assert.equal(instances[0].destroyed, false);
    assert.equal(new URL(dom.window.location.href).searchParams.get('view'), null);

    listButton.focus();
    listButton.click();

    const resources = document.querySelector('.resources');
    // aria-pressed moves; neither button is ever disabled, so focus stays put.
    assert.equal(listButton.getAttribute('aria-pressed'), 'true');
    assert.equal(gridButton.getAttribute('aria-pressed'), 'false');
    assert.equal(listButton.disabled || gridButton.disabled, false);
    assert.equal(document.activeElement, listButton);
    assert.equal(instances[0].destroyed, true);
    assert.equal(resources.classList.contains('resource-list'), true);
    assert.ok([...resources.querySelectorAll('.resource')].every((card) => card.classList.contains('media-object')));
    assert.equal(dom.window.history.length, initialHistoryLength);
    assert.equal(new URL(dom.window.location.href).searchParams.get('view'), 'list');
    // Both ways to change page keep the chosen layout — and the sort.
    const next = document.querySelector('.pagination a.next');
    assert.equal(new URL(next.href).searchParams.get('view'), 'list');
    assert.equal(new URL(next.href).searchParams.get('sort_by'), 'title');
    const pager = document.querySelector('.pagination form.pager');
    assert.equal(new dom.window.URLSearchParams(new dom.window.FormData(pager)).get('view'), 'list');
    assert.equal(new dom.window.URLSearchParams(new dom.window.FormData(pager)).get('sort_by'), 'title');

    gridButton.click();
    assert.equal(instances.length, 2);
    assert.equal(resources.classList.contains('resource-grid'), true);
    assert.equal(dom.window.history.length, initialHistoryLength);
    // Toggling back updates the input it added rather than adding a second.
    assert.equal(pager.querySelectorAll('input[name="view"]').length, 1);
    assert.equal(pager.querySelector('input[name="view"]').value, 'grid');

    dom.window.close();
});

test('carousel silences position announcements while the slideshow rotates', () => {
    // The About page's conference carousel, which auto-advances every 5s.
    const dom = fixtureDom('page-about.en');
    dom.window.matchMedia = () => ({ matches: false, addEventListener() {} });
    dom.window.IWACUtils = { onReady: (callback) => callback(), debounce: (callback) => callback };
    dom.window.Element.prototype.scrollIntoView = function () {};
    const track = dom.window.document.querySelector('[data-carousel-track]');
    Object.defineProperty(track, 'scrollWidth', { configurable: true, value: 1200 });
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 400 });

    // The autoplay interval would keep node alive past a failed assertion;
    // close the window (which clears it) whatever happens.
    try {
        runAsset(dom, 'carousel.js');
        const status = dom.window.document.querySelector('[data-carousel-status]');
        const toggle = dom.window.document.querySelector('[data-carousel-toggle]');

        // Rotating: the run is moving itself, so the region must not narrate it.
        assert.equal(status.getAttribute('aria-live'), 'off');
        assert.equal(toggle.textContent.trim(), 'Stop automatic slideshow');
        // The label carries the state; aria-pressed on top would contradict it.
        assert.equal(toggle.hasAttribute('aria-pressed'), false);

        // The reader takes over: rotation stops and announcements resume.
        dom.window.document.querySelector('[data-carousel-next]').click();
        assert.equal(status.getAttribute('aria-live'), 'polite');
        assert.equal(toggle.textContent.trim(), 'Start automatic slideshow');
        assert.equal(toggle.hasAttribute('aria-pressed'), false);
    } finally {
        dom.window.close();
    }
});

test('masonry gutter comes from the stylesheet, not a number in the script', () => {
    const { dom, instances } = browsed((dom) => {
        const style = dom.window.document.createElement('style');
        style.textContent = '.resource-grid { column-gap: 20px; }';
        dom.window.document.head.append(style);
    });
    assert.equal(instances[0].options.gutter, 20);
    assert.equal(instances[0].options.ultimateGutter, 20);

    dom.window.close();
});

// Item 8558's "How to cite" panel; Chicago is the style shown by default.
const CHICAGO_HTML = '“La Tabaski à Ouagadougou.” <em>Carrefour africain</em>, April 9, 1966. '
    + '<a href="https://islam.zmo.de/s/westafrica/item/8558">https://islam.zmo.de/s/westafrica/item/8558</a>.';
const CHICAGO_TEXT = '“La Tabaski à Ouagadougou.” Carrefour africain, April 9, 1966. https://islam.zmo.de/s/westafrica/item/8558.';

/**
 * The panel's Copy button, found the way a reader finds it — by its name —
 * not by the data-citation-copy hook citation.js binds. Rename the hook in
 * citation.phtml and the button is still found, the script no longer binds
 * it, and the assertions below say so.
 */
function copyButton(dom) {
    const button = [...dom.window.document.querySelectorAll('.citation button')]
        .find((candidate) => candidate.textContent.trim() === 'Copy');
    assert.ok(button, 'no Copy button in the citation panel');
    return button;
}

function citationDom() {
    const dom = fixtureDom('item.en');
    dom.window.IWACUtils = { onReady: (callback) => callback() };
    return dom;
}

test('citation copy writes rich text alongside plain text', async () => {
    const dom = citationDom();
    const writes = [];
    dom.window.ClipboardItem = class {
        constructor(items) { this.items = items; }
    };
    Object.defineProperty(dom.window.navigator, 'clipboard', {
        configurable: true,
        value: {
            write: async (items) => { writes.push(items[0].items); },
            writeText: async () => { throw new Error('plain path should not run'); },
        },
    });

    try {
        runAsset(dom, 'citation.js');
        copyButton(dom).click();
        await flush();

        assert.equal(writes.length, 1);
        const html = await writes[0]['text/html'].text();
        const text = await writes[0]['text/plain'].text();
        assert.equal(html, CHICAGO_HTML);
        assert.equal(text, CHICAGO_TEXT);
        assert.equal(dom.window.document.querySelector('.citation__status').textContent, 'Copied');
    } finally {
        dom.window.close();
    }
});

test('citation copy falls back to plain text without ClipboardItem', async () => {
    const dom = citationDom();
    const texts = [];
    Object.defineProperty(dom.window.navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async (text) => { texts.push(text); } },
    });

    try {
        runAsset(dom, 'citation.js');
        copyButton(dom).click();
        await flush();
        assert.deepEqual(texts, [CHICAGO_TEXT]);
    } finally {
        dom.window.close();
    }
});

test('a refused copy selects the citation and says how to finish', async () => {
    const dom = citationDom();
    Object.defineProperty(dom.window.navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async () => { throw new Error('denied'); } },
    });

    try {
        runAsset(dom, 'citation.js');
        copyButton(dom).click();
        await flush();
        const selected = dom.window.getSelection().toString().replace(/\s+/g, ' ').trim();
        assert.equal(selected, CHICAGO_TEXT);
        const status = dom.window.document.querySelector('.citation__status').textContent;
        assert.match(status, /Text selected/);
        assert.match(status, /⌘C/);
        assert.equal(dom.window.document.querySelector('.citation').classList.contains('is-copied'), false);
    } finally {
        dom.window.close();
    }
});
