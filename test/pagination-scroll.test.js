'use strict';

// pagination-scroll.js hands one bit across a full page reload: a pagination
// click sets a sessionStorage flag, and the next load consumes it and scrolls
// to the results. The regression it has already had is a flag set by the
// AJAX-swapped Linked-resources pager, which no reload ever consumes — so the
// NEXT unrelated page load jumped. Both halves are asserted here, on the item
// browse and the item-set ledger as the templates render them.

const test = require('node:test');
const assert = require('node:assert/strict');
const { runAsset } = require('../test-support/dom');
const { fixtureDom } = require('../test-support/fixtures');

const KEY = 'pagination-scroll';

function load(name, { flag = false } = {}) {
    const dom = fixtureDom(name);
    if (flag) dom.window.sessionStorage.setItem(KEY, '1');
    const scrolls = [];
    dom.window.scrollTo = (options) => { scrolls.push(options); };
    runAsset(dom, 'utils.js');
    runAsset(dom, 'pagination-scroll.js');
    return { dom, doc: dom.window.document, scrolls };
}

const click = (dom, element, init = {}) => element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, ...init }));

test('a pagination click leaves the flag the next load will consume', () => {
    const { dom, doc } = load('items-browse.en');
    click(dom, doc.querySelector('.pagination a.pagination-nav.next'));
    assert.equal(dom.window.sessionStorage.getItem(KEY), '1');
});

test('submitting the page-number form sets the flag too', () => {
    const { dom, doc } = load('items-browse.en');
    doc.querySelector('.pagination .pager').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    assert.equal(dom.window.sessionStorage.getItem(KEY), '1');
});

test('the Linked-resources pager (AJAX, no reload) never sets it', () => {
    const { dom, doc } = load('item-set.en');
    click(dom, doc.querySelector('.linked-resources .pagination a.pagination-nav.next'));
    assert.equal(dom.window.sessionStorage.getItem(KEY), null);
    doc.querySelector('.linked-resources .pagination .pager').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    assert.equal(dom.window.sessionStorage.getItem(KEY), null);
});

test('a disabled pager control does not set it', () => {
    // Page 1: "previous" is rendered disabled.
    const { dom, doc } = load('items-browse.en');
    click(dom, doc.querySelector('.pagination .pagination-nav.previous.disabled'));
    assert.equal(dom.window.sessionStorage.getItem(KEY), null);
});

test('the next load consumes the flag and scrolls to the results', () => {
    const { dom, scrolls } = load('items-browse.en', { flag: true });
    assert.equal(scrolls.length, 1);
    assert.equal(scrolls[0].behavior, 'instant');
    assert.equal(dom.window.sessionStorage.getItem(KEY), null, 'the flag is one-shot');
});

test('a load without the flag does not scroll', () => {
    const { scrolls } = load('items-browse.en');
    assert.equal(scrolls.length, 0);
});

test('a click that opens a new tab or window leaves no flag behind', () => {
    for (const init of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { button: 1 }]) {
        const { dom, doc } = load('items-browse.en');
        click(dom, doc.querySelector('.pagination a.pagination-nav.next'), init);
        assert.equal(dom.window.sessionStorage.getItem(KEY), null, JSON.stringify(init));
    }
});
