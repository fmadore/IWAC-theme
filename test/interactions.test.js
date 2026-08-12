'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDom, runAsset } = require('../test-support/dom');

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

test('browse layout preference does not add history entries and cleans up Masonry', () => {
    const dom = createDom(`<!doctype html><body><section>
        <div class="layout-toggle">
            <button data-view="list">List</button>
            <button data-view="grid" disabled>Grid</button>
        </div>
        <div class="resources resource-grid">
            <article class="resource"><div class="resource__thumbnail decoration"></div><div class="resource__meta"></div></article>
        </div>
    </section></body>`);
    const instances = [];
    dom.window.IWACUtils = { onReady: (callback) => callback() };
    dom.window.MiniMasonry = class {
        constructor() {
            this.destroyed = false;
            instances.push(this);
        }
        layout() {}
        destroy() { this.destroyed = true; }
    };

    const initialHistoryLength = dom.window.history.length;
    runAsset(dom, 'browse.js');
    dom.window.document.querySelector('[data-view="list"]').click();

    const resources = dom.window.document.querySelector('.resources');
    assert.equal(instances[0].destroyed, true);
    assert.equal(resources.classList.contains('resource-list'), true);
    assert.equal(dom.window.history.length, initialHistoryLength);
    assert.equal(new URL(dom.window.location.href).searchParams.get('view'), 'list');

    dom.window.document.querySelector('[data-view="grid"]').click();
    assert.equal(instances.length, 2);
    assert.equal(resources.classList.contains('resource-grid'), true);
    assert.equal(dom.window.history.length, initialHistoryLength);

    dom.window.close();
});
