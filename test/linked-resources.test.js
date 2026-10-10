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

    // The ledger pages on its own, leaving the block's filter as it is. Its
    // Next link was rendered before the chip was used, so the request takes
    // the filter from the address: a reload of the new URL shows both roots
    // where they stand.
    const ledgerBefore = titles(doc.getElementById('item-set-resources'));
    doc.querySelector('#item-set-resources .linked-footer a.pagination-nav.next').click();
    assert.equal(pending[2].url, fixtureUrl('item-set.xhr-page-2-subject.en'));
    respond(pending[2], 'item-set.xhr-page-2-subject.en');
    await flush();
    await flush();
    const ledger = titles(doc.getElementById('item-set-resources'));
    assert.deepEqual(ledger, titlesIn(window, 'item-set.xhr-page-2.en', 'item-set-resources'));
    assert.notDeepEqual(ledger, ledgerBefore);
    assert.deepEqual(titles(doc.getElementById('linked-resources')), subject);
    // ...and that URL renders the block as it is on screen.
    assert.deepEqual(titlesIn(window, 'item-set.xhr-page-2-subject.en', 'linked-resources'), subject);

    assert.match(window.history.state.linkedResources['linked-resources'], /resource_property=items%3A3-86%2C329/);
    assert.match(window.history.state.linkedResources['item-set-resources'], /[?&]page=2/);
    assert.equal(window.location.href, fixtureUrl('item-set.xhr-page-2-subject.en'));

    dom.window.close();
});

test("the ledger's page 2 leaves the block on its own first page (regression: one shared ?page=)", () => {
    const dom = fixtureDom('item-set.en');
    const { window } = dom;
    const first = titlesIn(window, 'item-set.en', 'linked-resources');
    assert.equal(first.length, 25, 'the block needs a page 2 for this test to mean anything');

    // Through 2.24 the block read ?page= as well, so the ledger's page 2
    // rendered the block's page 2 beside it — past the last row on most sets.
    assert.deepEqual(titlesIn(window, 'item-set.xhr-page-2.en', 'linked-resources'), first);
    // And the block's page 2 leaves the ledger on the page the address names.
    assert.notDeepEqual(titlesIn(window, 'item-set.xhr-both-page-2.en', 'linked-resources'), first);
    assert.deepEqual(
        titlesIn(window, 'item-set.xhr-both-page-2.en', 'item-set-resources'),
        titlesIn(window, 'item-set.xhr-page-2.en', 'item-set-resources')
    );

    // Each pager writes its own parameter and carries the other one along.
    const doc = new window.DOMParser().parseFromString(fixtureHtml('item-set.xhr-page-2.en'), 'text/html');
    const footer = (id) => doc.querySelector(`#${id} .linked-footer`);
    const nextQuery = (id) => new URL(
        footer(id).querySelector('a.pagination-nav.next').getAttribute('href'),
        fixtureUrl('item-set.en')
    ).searchParams;
    assert.equal(nextQuery('linked-resources').get('lr_page'), '2');
    assert.equal(nextQuery('linked-resources').get('page'), '2', "the ledger's page rides along");
    assert.equal(nextQuery('item-set-resources').get('page'), '3');
    assert.equal(nextQuery('item-set-resources').get('lr_page'), null);

    const pageField = (id) => footer(id).querySelector('form.pager input[type="text"]');
    const hidden = (id) => [...footer(id).querySelectorAll('form.pager input[type="hidden"]')]
        .map((input) => `${input.name}=${input.value}`);
    assert.deepEqual([pageField('linked-resources').name, pageField('linked-resources').value], ['lr_page', '1']);
    assert.deepEqual(hidden('linked-resources'), ['page=2']);
    assert.deepEqual([pageField('item-set-resources').name, pageField('item-set-resources').value], ['page', '2']);
    assert.deepEqual(hidden('item-set-resources'), []);

    dom.window.close();
});

test('each root pages on its own, and Back and Forward restore each', async () => {
    const dom = fixtureDom('item-set.en');
    const { window } = dom;
    const doc = window.document;
    window.IWACUtils = {
        debounce: (callback) => callback,
        onReady: (callback) => callback(),
    };
    window.requestIdleCallback = () => {};

    const pending = [];
    window.fetch = (url) => new Promise((resolve) => pending.push({ url: String(url), resolve }));
    const requested = () => pending.map((request) => request.url);
    const respond = async (name) => {
        pending.shift().resolve({ ok: true, text: async () => fixtureHtml(name) });
        await flush();
        await flush();
    };
    // History traversal runs as a task after go() returns.
    const traverse = async (delta) => {
        window.history.go(delta);
        await new Promise((resolve) => setTimeout(resolve, 20));
    };
    runAsset(dom, 'linked-resources.js');

    const block = () => titles(doc.getElementById('linked-resources'));
    const ledger = () => titles(doc.getElementById('item-set-resources'));
    const next = (id) => doc.querySelector(`#${id} .linked-footer a.pagination-nav.next`).click();
    const start = { block: block(), ledger: ledger() };
    const page2 = {
        block: titlesIn(window, 'item-set.xhr-both-page-2.en', 'linked-resources'),
        ledger: titlesIn(window, 'item-set.xhr-page-2.en', 'item-set-resources'),
    };
    const both = fixtureUrl('item-set.xhr-both-page-2.en') + '#resources-linked';

    next('item-set-resources');
    assert.deepEqual(requested(), [fixtureUrl('item-set.xhr-page-2.en')]);
    await respond('item-set.xhr-page-2.en');
    assert.deepEqual([block(), ledger()], [start.block, page2.ledger]);

    // The block's Next was rendered with the ledger on page 1; the request
    // takes the ledger's page from the address instead.
    next('linked-resources');
    assert.deepEqual(requested(), [both]);
    await respond('item-set.xhr-both-page-2.en');
    assert.deepEqual([block(), ledger()], [page2.block, page2.ledger]);
    assert.equal(window.location.href, both);

    // Back undoes one root per entry, and only that one is fetched.
    await traverse(-1);
    assert.deepEqual(requested(), [fixtureUrl('item-set.en')]);
    await respond('item-set.en');
    assert.deepEqual([block(), ledger()], [start.block, page2.ledger]);

    await traverse(-1);
    assert.deepEqual(requested(), [fixtureUrl('item-set.en')]);
    await respond('item-set.en');
    assert.deepEqual([block(), ledger()], [start.block, start.ledger]);

    // Forward redoes them in order.
    await traverse(1);
    assert.deepEqual(requested(), [fixtureUrl('item-set.xhr-page-2.en')]);
    await respond('item-set.xhr-page-2.en');
    assert.deepEqual([block(), ledger()], [start.block, page2.ledger]);

    await traverse(1);
    assert.deepEqual(requested(), [both]);
    await respond('item-set.xhr-both-page-2.en');
    assert.deepEqual([block(), ledger()], [page2.block, page2.ledger]);

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
    window.document.querySelectorAll('.linked-footer a.next').forEach((next) => {
        next.dispatchEvent(new window.MouseEvent('mouseenter'));
    });
    dom.window.close();
    return fetched;
}

test('the next page is warmed in idle time', () => {
    // Each root's, once: hovering the links afterwards reuses the warmed
    // requests. The block's next page is its own (?lr_page=), not the ledger's.
    const warmed = [
        `${fixtureUrl('item-set.en')}?lr_page=2#resources-linked`,
        fixtureUrl('item-set.xhr-page-2.en'),
    ];
    assert.deepEqual(prefetchRun(false), warmed);
    assert.deepEqual(prefetchRun(undefined), warmed);
});

test('Save-Data turns off speculative page fetches', () => {
    assert.deepEqual(prefetchRun(true), []);
});
