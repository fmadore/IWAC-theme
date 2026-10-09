'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDom, flush, runAsset } = require('../test-support/dom');

test('Escape closes an annotation disclosure and restores trigger focus', () => {
    const dom = createDom(`<!doctype html><body>
        <div class="annotation-btn">
            <button class="annotation-trigger" aria-expanded="false">Annotation</button>
            <div class="annotation-tooltip" aria-hidden="true"><div class="annotation-tooltip__wrapper">Note</div></div>
        </div>
    </body>`);
    dom.window.matchMedia = () => ({ matches: false, addEventListener() {} });
    dom.window.IWACUtils = {
        debounce: (callback) => callback,
        onReady: (callback) => callback(),
    };

    runAsset(dom, 'script.js');
    const trigger = dom.window.document.querySelector('.annotation-trigger');
    const tooltip = dom.window.document.querySelector('.annotation-tooltip');
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
    const dom = createDom(`<!doctype html><body>
        <div class="annotation-btn">
            <button class="annotation-trigger" aria-expanded="false">Annotation</button>
            <div class="annotation-tooltip" aria-hidden="true"><div class="annotation-tooltip__wrapper">Note</div></div>
        </div>
    </body>`);
    dom.window.matchMedia = () => ({ matches: false, addEventListener() {} });
    dom.window.IWACUtils = {
        debounce: (callback) => callback,
        onReady: (callback) => callback(),
    };
    Object.defineProperty(dom.window, 'innerWidth', { configurable: true, value: 320 });
    Object.defineProperty(dom.window.document.documentElement, 'clientWidth', { configurable: true, value: 320 });

    const annotation = dom.window.document.querySelector('.annotation-btn');
    const trigger = dom.window.document.querySelector('.annotation-trigger');
    const tooltip = dom.window.document.querySelector('.annotation-tooltip');
    const wrapper = dom.window.document.querySelector('.annotation-tooltip__wrapper');
    annotation.getBoundingClientRect = () => ({ top: 300, left: 305, right: 329, bottom: 324, width: 24, height: 24 });
    Object.defineProperty(wrapper, 'offsetWidth', { configurable: true, value: 288 });
    Object.defineProperty(wrapper, 'offsetHeight', { configurable: true, value: 100 });

    runAsset(dom, 'script.js');
    trigger.click();

    assert.equal(tooltip.style.left, '-289px');
    assert.equal(305 + parseFloat(tooltip.style.left), 16);
    assert.equal(305 + parseFloat(tooltip.style.left) + wrapper.offsetWidth, 304);

    dom.window.close();
});

test('public theme API rejects unsupported modes', () => {
    const dom = createDom('<!doctype html><body><button data-theme-toggle></button></body>');
    const values = new Map();
    dom.window.matchMedia = () => ({ matches: false, addEventListener() {} });
    dom.window.IWACUtils = {
        onReady: (callback) => callback(),
        localStore: {
            get: (key) => values.get(key) || null,
            set: (key, value) => values.set(key, value),
            remove: (key) => values.delete(key),
        },
    };

    runAsset(dom, 'theme-toggle.js');
    assert.equal(dom.window.IWACTheme.set('sepia'), false);
    assert.equal(dom.window.document.body.dataset.themeMode, 'system');
    assert.equal(dom.window.IWACTheme.set('dark'), true);
    assert.equal(dom.window.document.body.dataset.themeMode, 'dark');

    dom.window.close();
});

test('the theme toggle cycles system → light → dark → system, persisting and announcing each', () => {
    const dom = createDom(`<!doctype html><body>
        <button data-theme-toggle data-label-system="SYS" data-label-light="LIGHT" data-label-dark="DARK"
            data-state-system="System theme" data-state-light="Light theme" data-state-dark="Dark theme"></button>
        <span data-theme-status role="status"></span>
    </body>`);
    const values = new Map();
    // The OS prefers dark, so "system" must resolve to dark.
    dom.window.matchMedia = () => ({ matches: true, addEventListener() {} });
    dom.window.IWACUtils = {
        onReady: (callback) => callback(),
        localStore: {
            get: (key) => values.get(key) || null,
            set: (key, value) => values.set(key, value),
            remove: (key) => values.delete(key),
        },
    };
    runAsset(dom, 'theme-toggle.js');
    const { body } = dom.window.document;
    const button = dom.window.document.querySelector('[data-theme-toggle]');
    const status = dom.window.document.querySelector('[data-theme-status]');

    // Initial load: the system mode, named on the button, announced to no one.
    assert.equal(body.dataset.themeMode, 'system');
    assert.equal(body.dataset.theme, 'dark');
    assert.equal(button.getAttribute('aria-label'), 'SYS');
    assert.equal(status.textContent, '');

    const steps = [
        ['light', 'light', 'LIGHT', 'Light theme', 'light'],
        ['dark', 'dark', 'DARK', 'Dark theme', 'dark'],
        ['system', 'dark', 'SYS', 'System theme', null],
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

test('browse layout preference does not add history entries and cleans up Masonry', () => {
    const dom = createDom(`<!doctype html><body><section>
        <div class="layout-toggle">
            <button data-view="list" aria-pressed="false">List</button>
            <button data-view="grid" aria-pressed="true">Grid</button>
        </div>
        <div class="resources resource-grid">
            <article class="resource"><div class="resource__thumbnail decoration"></div><div class="resource__meta"></div></article>
        </div>
        <nav class="pagination"><div class="pager-wrapper">
            <a class="pagination-nav next" href="https://example.test/s/westafrica/item?page=2">Next</a>
            <form class="pager"><input type="hidden" name="sort_by" value="title"><input name="page" value="1"></form>
        </div></nav>
    </section></body>`);
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

    const initialHistoryLength = dom.window.history.length;
    runAsset(dom, 'browse.js');
    // No stylesheet here, so the gutter falls back to --space-6's 24px.
    assert.equal(instances[0].options.gutter, 24);
    const listButton = dom.window.document.querySelector('[data-view="list"]');
    const gridButton = dom.window.document.querySelector('[data-view="grid"]');
    // Choosing the current layout again is a no-op.
    gridButton.click();
    assert.equal(instances[0].destroyed, false);
    assert.equal(new URL(dom.window.location.href).searchParams.get('view'), null);

    listButton.focus();
    listButton.click();

    const resources = dom.window.document.querySelector('.resources');
    // aria-pressed moves; neither button is ever disabled, so focus stays put.
    assert.equal(listButton.getAttribute('aria-pressed'), 'true');
    assert.equal(gridButton.getAttribute('aria-pressed'), 'false');
    assert.equal(listButton.disabled || gridButton.disabled, false);
    assert.equal(dom.window.document.activeElement, listButton);
    assert.equal(instances[0].destroyed, true);
    assert.equal(resources.classList.contains('resource-list'), true);
    assert.equal(dom.window.history.length, initialHistoryLength);
    assert.equal(new URL(dom.window.location.href).searchParams.get('view'), 'list');
    // Both ways to change page keep the chosen layout.
    const next = dom.window.document.querySelector('.pagination a.next');
    assert.equal(new URL(next.href).searchParams.get('view'), 'list');
    const pager = dom.window.document.querySelector('form.pager');
    assert.equal(new dom.window.URLSearchParams(new dom.window.FormData(pager)).get('view'), 'list');
    assert.equal(new dom.window.URLSearchParams(new dom.window.FormData(pager)).get('sort_by'), 'title');

    dom.window.document.querySelector('[data-view="grid"]').click();
    assert.equal(instances.length, 2);
    assert.equal(resources.classList.contains('resource-grid'), true);
    assert.equal(dom.window.history.length, initialHistoryLength);
    // Toggling back updates the input it added rather than adding a second.
    assert.equal(pager.querySelectorAll('input[name="view"]').length, 1);
    assert.equal(pager.querySelector('input[name="view"]').value, 'grid');

    dom.window.close();
});

test('carousel silences position announcements while the slideshow rotates', () => {
    const dom = createDom(`<!doctype html><body>
        <div class="carousel" data-carousel data-carousel-autoplay="5000">
            <p data-carousel-counter hidden>
                <span data-carousel-current>1</span>
                <span data-carousel-status role="status" aria-live="polite"></span>
            </p>
            <div data-carousel-nav hidden data-label-position="Slide %1$s of %2$s">
                <button type="button" data-carousel-toggle data-label-play="Start" data-label-pause="Stop"><span class="carousel__btn-label">Stop</span></button>
                <button type="button" data-carousel-prev>Previous</button>
                <button type="button" data-carousel-next>Next</button>
            </div>
            <ul data-carousel-track><li data-carousel-slide>1</li><li data-carousel-slide>2</li><li data-carousel-slide>3</li></ul>
        </div>
    </body>`);
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
        assert.equal(toggle.textContent.trim(), 'Stop');
        // The label carries the state; aria-pressed on top would contradict it.
        assert.equal(toggle.hasAttribute('aria-pressed'), false);

        // The reader takes over: rotation stops and announcements resume.
        dom.window.document.querySelector('[data-carousel-next]').click();
        assert.equal(status.getAttribute('aria-live'), 'polite');
        assert.equal(toggle.textContent.trim(), 'Start');
        assert.equal(toggle.hasAttribute('aria-pressed'), false);
    } finally {
        dom.window.close();
    }
});

test('masonry gutter comes from the stylesheet, not a number in the script', () => {
    const dom = createDom(`<!doctype html><head><style>.resource-grid { column-gap: 20px; }</style></head><body>
        <ul class="resources resource-grid"><li class="resource"></li></ul>
    </body>`);
    const instances = [];
    dom.window.IWACUtils = { onReady: (callback) => callback() };
    dom.window.MiniMasonry = class {
        constructor(options) { instances.push(options); }
        layout() {}
        destroy() {}
    };

    runAsset(dom, 'browse.js');
    assert.equal(instances[0].gutter, 20);
    assert.equal(instances[0].ultimateGutter, 20);

    dom.window.close();
});

function citationDom() {
    return createDom(`<!doctype html><body>
        <section class="citation">
            <p class="citation__text" data-citation-panel="chicago">
                Madore, Frédérick. <em>Islam in Togo</em>. Berlin: ZMO, 2020.
            </p>
            <button type="button" data-citation-copy data-copied-label="Copied"><span class="citation__copy-label">Copy</span></button>
            <p class="citation__status" role="status"></p>
        </section>
    </body>`);
}

test('citation copy writes rich text alongside plain text', async () => {
    const dom = citationDom();
    const writes = [];
    dom.window.IWACUtils = { onReady: (callback) => callback() };
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
        dom.window.document.querySelector('[data-citation-copy]').click();
        await flush();

        assert.equal(writes.length, 1);
        const html = await writes[0]['text/html'].text();
        const text = await writes[0]['text/plain'].text();
        assert.equal(html, 'Madore, Frédérick. <em>Islam in Togo</em>. Berlin: ZMO, 2020.');
        assert.equal(text, 'Madore, Frédérick. Islam in Togo. Berlin: ZMO, 2020.');
        assert.equal(dom.window.document.querySelector('.citation__status').textContent, 'Copied');
    } finally {
        dom.window.close();
    }
});

test('citation copy falls back to plain text without ClipboardItem', async () => {
    const dom = citationDom();
    const texts = [];
    dom.window.IWACUtils = { onReady: (callback) => callback() };
    Object.defineProperty(dom.window.navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async (text) => { texts.push(text); } },
    });

    try {
        runAsset(dom, 'citation.js');
        dom.window.document.querySelector('[data-citation-copy]').click();
        await flush();
        assert.deepEqual(texts, ['Madore, Frédérick. Islam in Togo. Berlin: ZMO, 2020.']);
    } finally {
        dom.window.close();
    }
});

test('a refused copy selects the citation and says how to finish', async () => {
    const dom = citationDom();
    dom.window.IWACUtils = { onReady: (callback) => callback() };
    Object.defineProperty(dom.window.navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async () => { throw new Error('denied'); } },
    });

    try {
        runAsset(dom, 'citation.js');
        dom.window.document.querySelector('[data-citation-copy]').click();
        await flush();
        const selected = dom.window.getSelection().toString().replace(/\s+/g, ' ').trim();
        assert.equal(selected, 'Madore, Frédérick. Islam in Togo. Berlin: ZMO, 2020.');
        const status = dom.window.document.querySelector('.citation__status').textContent;
        assert.match(status, /Text selected/);
        assert.match(status, /⌘C/);
        assert.equal(dom.window.document.querySelector('.citation').classList.contains('is-copied'), false);
    } finally {
        dom.window.close();
    }
});
