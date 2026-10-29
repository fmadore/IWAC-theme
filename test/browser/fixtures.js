'use strict';

/**
 * The fixture origin for the local browser suite (playwright.local.config.js).
 *
 * The pages are test/fixtures/rendered/*.html — the real templates rendered by
 * test/php/render-fixtures.php, the same pages the jsdom suite runs on — served
 * at the URL each was rendered for (manifest.json) on https://iwac.test, with
 * the theme's committed CSS, minified scripts, fonts and images. No Omeka, no
 * database, no PHP at test time: `npm run check:fixtures` keeps the pages
 * current, and this only serves files.
 *
 * Three things the renderer cannot print, supplied here:
 *   - the <meta charset> and the stylesheet. FakeView's headMeta() and
 *     headLink() print nothing, so what Omeka's would print is added: the
 *     charset first in <head> (WebKit otherwise decodes the page as
 *     windows-1252 whatever the Content-Type says), the <link> to
 *     asset/css/style.css before </head>;
 *   - AJAX answers. A request carrying X-Requested-With (linked-resources.js)
 *     is answered with the manifest's `xhr` page rendered for that exact URL,
 *     as layout.phtml's chrome-less fast path does, else with the whole page
 *     rendered for it; anything unrendered 404s (the script's idle prefetch
 *     of pages nobody rendered shows up as harmless 404s in the console);
 *   - media files (/files/…), which are a neutral placeholder image.
 *
 * Every request to another origin is aborted and recorded: the theme must
 * render without third parties, and `external` lets a spec say so.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const RENDERED = path.join(ROOT, 'test', 'fixtures', 'rendered');
const ORIGIN = 'https://iwac.test';
const THEME_PREFIX = '/themes/IWAC-theme/';

const TYPES = {
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.woff2': 'font/woff2',
    '.webmanifest': 'application/manifest+json',
};

// Media files are not in the repository; any small image keeps a card's
// image box. The theme's own 32px favicon serves.
const PLACEHOLDER = fs.readFileSync(path.join(ROOT, 'asset', 'img', 'pwa', 'favicon-32.png'));

let manifest = null;
function entries() {
    manifest ??= JSON.parse(fs.readFileSync(path.join(RENDERED, 'manifest.json'), 'utf8'));
    return manifest;
}

/** The URL a fixture was rendered for, on the fixture origin. */
function fixtureUrl(name) {
    const entry = entries()[name];
    if (!entry) throw new Error(`No rendered fixture "${name}" — see test/php/render-fixtures.php`);
    return ORIGIN + entry.url;
}

function page(name) {
    return fs.readFileSync(path.join(RENDERED, `${name}.html`), 'utf8')
        .replace(/<head>/, '<head><meta charset="utf-8">')
        .replace('</head>', `<link rel="stylesheet" href="${THEME_PREFIX}asset/css/style.css"></head>`);
}

/**
 * Route `browserPage` to the fixture origin, answer its navigation to
 * fixtureUrl(name) with that fixture, and return { url, external }.
 * `options.html` rewrites the page before it is served.
 */
async function serveFixture(browserPage, name, options = {}) {
    const external = [];
    const main = new URL(fixtureUrl(name));
    const transform = options.html || ((html) => html);
    await browserPage.route('**/*', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin !== ORIGIN) {
            external.push(url.href);
            return route.abort();
        }
        if (url.pathname.startsWith(THEME_PREFIX)) {
            const file = path.resolve(ROOT, decodeURIComponent(url.pathname.slice(THEME_PREFIX.length)));
            if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
                return route.fulfill({ status: 404, body: '' });
            }
            return route.fulfill({ contentType: TYPES[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
        }
        if (url.pathname.startsWith('/files/')) {
            return route.fulfill({ contentType: 'image/png', body: PLACEHOLDER });
        }
        const headers = await request.allHeaders();
        const isXhr = Boolean(headers['x-requested-with']);
        if (!isXhr && request.isNavigationRequest() && url.pathname + url.search === main.pathname + main.search) {
            return route.fulfill({ contentType: 'text/html; charset=utf-8', body: transform(page(name)) });
        }
        // An exact match first; an XHR for a page that was only rendered whole
        // (Back to the first page) gets the whole page — the script reads its
        // root out of either, as it does with the server's chrome-less answer.
        const here = url.pathname + url.search;
        const all = Object.entries(entries());
        const match = all.find(([, entry]) => entry.xhr === isXhr && entry.url === here)
            || (isXhr ? all.find(([, entry]) => !entry.xhr && entry.url === here) : undefined);
        if (match) {
            const body = match[1].xhr ? fs.readFileSync(path.join(RENDERED, `${match[0]}.html`), 'utf8') : page(match[0]);
            return route.fulfill({ contentType: 'text/html; charset=utf-8', body });
        }
        return route.fulfill({ status: 404, contentType: 'text/html', body: '<!doctype html><title>Not rendered</title>' });
    });
    return { url: main.href, external };
}

/** serveFixture() + goto, waiting for the page's own scripts to have run. */
async function openFixture(browserPage, name, options = {}) {
    const served = await serveFixture(browserPage, name, options);
    await browserPage.goto(served.url, { waitUntil: 'load' });
    return served;
}

/** No horizontal page scroll at the current viewport. */
async function hasNoHorizontalScroll(browserPage) {
    return browserPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

module.exports = { ORIGIN, fixtureUrl, serveFixture, openFixture, hasNoHorizontalScroll };
