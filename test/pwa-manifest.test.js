'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDom, flush, runAsset } = require('../test-support/dom');

// The manifest is emitted as a JSON island and turned into a same-origin blob:
// manifest by pwa-install.js. A blob: URL has NO base, so any member left
// relative is dropped by the browser without a word — the install dialog just
// silently loses whatever it described. `screenshots` shipped in 2.18.0 and was
// missed by the absolutiser at first; this test is the reason the next
// URL-bearing member cannot repeat it.
const ISLAND = {
    id: '/s/westafrica/',
    name: 'Islam West Africa Collection',
    short_name: 'IWAC',
    start_url: '/s/westafrica/',
    scope: '/s/westafrica/',
    icons: [
        { src: '/themes/IWAC-theme/asset/img/pwa/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    screenshots: [
        { src: '/themes/IWAC-theme/asset/img/pwa/screenshot-wide.webp', sizes: '1280x720', type: 'image/webp', form_factor: 'wide' },
        { src: '/themes/IWAC-theme/asset/img/pwa/screenshot-narrow.webp', sizes: '540x960', type: 'image/webp', form_factor: 'narrow' },
    ],
    shortcuts: [
        {
            name: 'Browse items',
            url: '/s/westafrica/item',
            icons: [{ src: '/themes/IWAC-theme/asset/img/pwa/icon-192.png', sizes: '192x192', type: 'image/png' }],
        },
    ],
};

async function buildManifest() {
    const dom = createDom(`<!doctype html><html><head>
        <script type="application/json" id="iwac-pwa-manifest">${JSON.stringify(ISLAND)}</script>
        </head><body><button type="button" data-pwa-install hidden>Install</button></body></html>`);

    // jsdom has no object-URL implementation; capture the blob instead.
    let captured = null;
    dom.window.URL.createObjectURL = (blob) => { captured = blob; return 'blob:https://example.test/fake'; };
    dom.window.URL.revokeObjectURL = () => {};

    runAsset(dom, 'utils.js');
    runAsset(dom, 'pwa-install.js');
    // The script defers to IWACUtils.onReady; jsdom fires DOMContentLoaded on
    // the next tick, so nothing has run yet at this point.
    await flush();

    const link = dom.window.document.querySelector('link[rel="manifest"]');
    assert.ok(link, 'pwa-install.js appended no <link rel="manifest">');
    assert.ok(captured, 'no Blob was handed to URL.createObjectURL');
    return JSON.parse(await captured.text());
}

/** Every URL the manifest carries, flattened, with the member path that holds it. */
function urlsOf(manifest) {
    const found = [];
    for (const key of ['start_url', 'scope', 'id']) {
        if (manifest[key]) found.push([key, manifest[key]]);
    }
    (manifest.icons || []).forEach((i, n) => found.push([`icons[${n}].src`, i.src]));
    (manifest.screenshots || []).forEach((s, n) => found.push([`screenshots[${n}].src`, s.src]));
    (manifest.shortcuts || []).forEach((s, n) => {
        found.push([`shortcuts[${n}].url`, s.url]);
        (s.icons || []).forEach((i, k) => found.push([`shortcuts[${n}].icons[${k}].src`, i.src]));
    });
    return found;
}

test('every URL in the blob manifest is absolute, screenshots included', async () => {
    const manifest = await buildManifest();

    assert.equal(manifest.screenshots.length, 2, 'the screenshots member did not survive');
    const relative = urlsOf(manifest).filter(([, url]) => !/^https?:\/\//.test(url));
    assert.deepEqual(relative, [], 'these manifest URLs would be dropped by a blob: manifest');

    // The two form factors Chrome distinguishes; it wants one aspect ratio per
    // form factor, so a second `wide` entry would have to match 1280x720.
    assert.deepEqual(
        manifest.screenshots.map((s) => s.form_factor).sort(),
        ['narrow', 'wide'],
    );
});
