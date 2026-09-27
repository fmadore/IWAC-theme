'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDom, flush, runAsset } = require('../test-support/dom');

function rootMarkup(id, state, links = true) {
    return `<div id="${id}" class="linked-resources" data-page-results-text="{count} resources on this page">
        ${links ? `<a class="linked-resources__facet first" href="?state=first#${id}">First</a>
        <a class="linked-resources__facet second" href="?state=second#${id}">Second</a>` : ''}
        <div class="linked-resources__status"></div>
        <table class="linked-resources-table"><tbody><tr data-state="${state}" data-title="${state}"><td>${state}</td></tr></tbody></table>
    </div>`;
}

test('latest linked-resource request wins and history tracks every root', async () => {
    const dom = createDom(`<!doctype html><body>
        ${rootMarkup('resources-a', 'initial-a')}
        ${rootMarkup('resources-b', 'initial-b')}
    </body>`);
    const { window } = dom;
    window.IWACUtils = {
        debounce: (callback) => callback,
        onReady: (callback) => callback(),
    };

    const pending = [];
    window.fetch = (url) => new Promise((resolve) => pending.push({ url: String(url), resolve }));
    runAsset(dom, 'linked-resources.js');

    assert.deepEqual(
        Object.keys(window.history.state.linkedResources).sort(),
        ['resources-a', 'resources-b']
    );

    window.document.querySelector('#resources-a .first').click();
    window.document.querySelector('#resources-a .second').click();
    assert.equal(pending.length, 2);

    pending[1].resolve({
        ok: true,
        text: async () => rootMarkup('resources-a', 'second'),
    });
    await flush();
    await flush();
    assert.equal(
        window.document.querySelector('#resources-a tbody tr').dataset.state,
        'second'
    );

    pending[0].resolve({
        ok: true,
        text: async () => rootMarkup('resources-a', 'first'),
    });
    await flush();
    await flush();
    assert.equal(
        window.document.querySelector('#resources-a tbody tr').dataset.state,
        'second'
    );

    window.document.querySelector('#resources-b .first').click();
    pending[2].resolve({
        ok: true,
        text: async () => rootMarkup('resources-b', 'first'),
    });
    await flush();
    await flush();

    assert.match(window.history.state.linkedResources['resources-a'], /state=second/);
    assert.match(window.history.state.linkedResources['resources-b'], /state=first/);
    assert.equal(
        window.document.querySelector('#resources-a .linked-resources__status').textContent,
        '1 resources on this page'
    );

    dom.window.close();
});

function pagedRoot() {
    return `<!doctype html><body>
        <div id="resources-linked" class="linked-resources">
            <table class="linked-resources-table"><tbody><tr data-title="a"><td>a</td></tr></tbody></table>
            <div class="linked-footer"><nav class="pagination">
                <a class="pagination-nav next" href="https://example.test/s/westafrica/item/1?page=2">Next</a>
            </nav></div>
        </div>
    </body>`;
}

function prefetchRun(saveData) {
    const dom = createDom(pagedRoot());
    const { window } = dom;
    window.IWACUtils = { debounce: (callback) => callback, onReady: (callback) => callback() };
    window.requestIdleCallback = (callback) => callback();
    if (saveData !== undefined) {
        Object.defineProperty(window.navigator, 'connection', { configurable: true, value: { saveData } });
    }
    const fetched = [];
    window.fetch = (url) => {
        fetched.push(String(url));
        return new Promise(() => {});
    };
    runAsset(dom, 'linked-resources.js');
    const next = window.document.querySelector('a.next');
    next.dispatchEvent(new window.MouseEvent('mouseenter'));
    dom.window.close();
    return fetched;
}

test('the next page is warmed in idle time', () => {
    assert.deepEqual(prefetchRun(false), ['https://example.test/s/westafrica/item/1?page=2']);
    assert.deepEqual(prefetchRun(undefined), ['https://example.test/s/westafrica/item/1?page=2']);
});

test('Save-Data turns off speculative page fetches', () => {
    assert.deepEqual(prefetchRun(true), []);
});
