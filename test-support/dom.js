'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');

function createDom(html, url = 'https://example.test/s/westafrica/page') {
    const dom = new JSDOM(html, {
        url,
        runScripts: 'outside-only',
        pretendToBeVisual: true,
    });
    dom.window.requestAnimationFrame = (callback) => {
        callback(0);
        return 1;
    };
    dom.window.cancelAnimationFrame = () => {};
    return dom;
}

function runAsset(dom, filename) {
    const source = fs.readFileSync(path.join(ROOT, 'asset', 'js', filename), 'utf8');
    dom.window.eval(source);
}

function flush() {
    return new Promise((resolve) => setImmediate(resolve));
}

module.exports = { createDom, flush, runAsset };
