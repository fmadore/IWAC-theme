'use strict';

// The two `.linked-resources` roots linked-resources.js keeps apart, as the
// item-set page renders them (test/php/render-fixtures.php): the set's own
// Linked resources block (#linked-resources — facet chips, one page) above
// the ledger of its items (#item-set-resources — five a page, with a pager).
// Every AJAX response is that page rendered for the request the script sends
// (X-Requested-With: fetch, so layout.phtml's chrome-less fast path), at the
// URL the clicked control names.

const test = require('node:test');
const assert = require('node:assert/strict');
const { flush, runAsset } = require('../test-support/dom');
const { fixtureDom, fixtureHtml, fixtureUrl } = require('../test-support/fixtures');

/** The row titles a root lists, in order. */
function titles(root) {
    return [...root.querySelectorAll('.linked-resources-table tbody tr')].map((row) => row.dataset.title);
}

/** The row titles root #id lists in a rendered response. */
function titlesIn(window, name, id) {
    const doc = new window.DOMParser().parseFromString(fixtureHtml(name), 'text/html');
    return titles(doc.getElementById(id));
}

test('latest linked-resource request wins and history tracks every root', async () => {
    const dom = fixtureDom('item-set.en');
    const { window } = dom;
    const doc = window.document;
    window.IWACUtils = {
        debounce: (callback) => callback,
        onReady: (callback) => callback(),
    };
    // The ledger's idle warm-up of its next page has its own tests below.
    window.requestIdleCallback = () => {};

    const pending = [];
    window.fetch = (url) => new Promise((resolve) => pending.push({ url: String(url), resolve }));
    const respond = (request, name) => request.resolve({ ok: true, text: async () => fixtureHtml(name) });
    runAsset(dom, 'linked-resources.js');

    assert.deepEqual(
        Object.keys(window.history.state.linkedResources).sort(),
        ['item-set-resources', 'linked-resources']
    );

    const chip = (label) => [...doc.querySelectorAll('#linked-resources .linked-resources__facet')]
        .find((a) => a.querySelector('.linked-resources__facet-label').textContent.trim() === label);
    chip('Publisher').click();
    chip('Subject').click();
    assert.deepEqual(pending.map((request) => request.url), [
        fixtureUrl('item-set.xhr-publisher.en') + '#resources-linked',
        fixtureUrl('item-set.xhr-subject.en') + '#resources-linked',
    ]);

    const subject = titlesIn(window, 'item-set.xhr-subject.en', 'linked-resources');
    const publisher = titlesIn(window, 'item-set.xhr-publisher.en', 'linked-resources');
    assert.notDeepEqual(subject, publisher, 'the two filters must list different rows for this test to mean anything');

    respond(pending[1], 'item-set.xhr-subject.en');
    await flush();
    await flush();
    assert.deepEqual(titles(doc.getElementById('linked-resources')), subject);

    // The earlier request answers late: it must not overwrite the later one.
    respond(pending[0], 'item-set.xhr-publisher.en');
    await flush();
    await flush();
    assert.deepEqual(titles(doc.getElementById('linked-resources')), subject);
    assert.equal(
        doc.querySelector('#linked-resources .linked-resources__status').textContent,
        `${subject.length} resources on this page`
    );

    // The ledger pages on its own, leaving the block's filter as it is.
    const ledgerBefore = titles(doc.getElementById('item-set-resources'));
    doc.querySelector('#item-set-resources .linked-footer a.pagination-nav.next').click();
    assert.equal(pending[2].url, fixtureUrl('item-set.xhr-page-2.en'));
    respond(pending[2], 'item-set.xhr-page-2.en');
    await flush();
    await flush();
    const ledger = titles(doc.getElementById('item-set-resources'));
    assert.deepEqual(ledger, titlesIn(window, 'item-set.xhr-page-2.en', 'item-set-resources'));
    assert.notDeepEqual(ledger, ledgerBefore);
    assert.deepEqual(titles(doc.getElementById('linked-resources')), subject);

    assert.match(window.history.state.linkedResources['linked-resources'], /resource_property=items%3A3-86%2C329/);
    assert.match(window.history.state.linkedResources['item-set-resources'], /page=2/);

    dom.window.close();
});

function prefetchRun(saveData) {
    const dom = fixtureDom('item-set.en');
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
    const next = window.document.querySelector('#item-set-resources .linked-footer a.next');
    next.dispatchEvent(new window.MouseEvent('mouseenter'));
    dom.window.close();
    return fetched;
}

test('the next page is warmed in idle time', () => {
    // Once: hovering the link afterwards reuses the warmed request.
    assert.deepEqual(prefetchRun(false), [fixtureUrl('item-set.xhr-page-2.en')]);
    assert.deepEqual(prefetchRun(undefined), [fixtureUrl('item-set.xhr-page-2.en')]);
});

test('Save-Data turns off speculative page fetches', () => {
    assert.deepEqual(prefetchRun(true), []);
});
