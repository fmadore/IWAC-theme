'use strict';

// pagination-scroll.js hands one bit across a full page reload: a pagination
// click sets a sessionStorage flag, and the next load consumes it and scrolls
// to the results. The regression it has already had is a flag set by the
// AJAX-swapped Linked-resources pager, which no reload ever consumes — so the
// NEXT unrelated page load jumped. Both halves are asserted here.

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDom, runAsset } = require('../test-support/dom');

const KEY = 'pagination-scroll';

function load(body, { flag = false } = {}) {
    const dom = createDom(`<!doctype html><body>${body}</body>`);
    if (flag) dom.window.sessionStorage.setItem(KEY, '1');
    const scrolls = [];
    dom.window.scrollTo = (options) => { scrolls.push(options); };
    runAsset(dom, 'utils.js');
    runAsset(dom, 'pagination-scroll.js');
    return { dom, doc: dom.window.document, scrolls };
}

const RESULTS = `
    <header class="main-header"></header>
    <div class="browse-controls"></div>
    <nav class="pagination"><a class="pagination-nav next" href="?page=2">Next</a>
        <form class="pager"><input name="page"></form></nav>`;

test('a pagination click leaves the flag the next load will consume', () => {
    const { dom, doc } = load(RESULTS);
    doc.querySelector('.pagination-nav').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    assert.equal(dom.window.sessionStorage.getItem(KEY), '1');
});

test('submitting the page-number form sets the flag too', () => {
    const { dom, doc } = load(RESULTS);
    doc.querySelector('.pager').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    assert.equal(dom.window.sessionStorage.getItem(KEY), '1');
});

test('the Linked-resources pager (AJAX, no reload) never sets it', () => {
    const { dom, doc } = load(`<div class="linked-resources">${RESULTS}</div>`);
    doc.querySelector('.pagination-nav').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    assert.equal(dom.window.sessionStorage.getItem(KEY), null);
});

test('a disabled pager link does not set it', () => {
    const { dom, doc } = load(`<nav class="pagination"><a class="pagination-nav disabled">Next</a></nav>`);
    doc.querySelector('.pagination-nav').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    assert.equal(dom.window.sessionStorage.getItem(KEY), null);
});

test('the next load consumes the flag and scrolls to the results', () => {
    const { dom, scrolls } = load(RESULTS, { flag: true });
    assert.equal(scrolls.length, 1);
    assert.equal(scrolls[0].behavior, 'instant');
    assert.equal(dom.window.sessionStorage.getItem(KEY), null, 'the flag is one-shot');
});

test('a load without the flag does not scroll', () => {
    const { scrolls } = load(RESULTS);
    assert.equal(scrolls.length, 0);
});
