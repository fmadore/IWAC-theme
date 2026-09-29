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

// `npm run test:minified` sets this: every behaviour test then runs against
// the minified file a page actually loads (asset/js/dist/<name>.min.js) rather
// than the source, which is how the build proves minification changed nothing.
const MINIFIED = process.env.IWAC_TEST_MINIFIED === '1';

function runAsset(dom, filename) {
    const file = MINIFIED && !filename.endsWith('.min.js')
        ? path.join(ROOT, 'asset', 'js', 'dist', filename.replace(/\.js$/, '.min.js'))
        : path.join(ROOT, 'asset', 'js', filename);
    dom.window.eval(fs.readFileSync(file, 'utf8'));
}

function flush() {
    return new Promise((resolve) => setImmediate(resolve));
}

module.exports = { createDom, flush, runAsset };
