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

/** A page with the island and the footer install button, pwa-install.js running. */
async function installDom({ userAgent } = {}) {
    const dom = createDom(`<!doctype html><html><head>
        <script type="application/json" id="iwac-pwa-manifest">${JSON.stringify(ISLAND)}</script>
        </head><body><div class="main-footer__install"><button type="button" data-pwa-install hidden
            data-label-ios="How to install this app" data-hint-ios="Tap Share, then Add to Home Screen.">Install</button></div></body></html>`);
    dom.window.URL.createObjectURL = () => 'blob:https://example.test/fake';
    dom.window.URL.revokeObjectURL = () => {};
    dom.window.matchMedia = () => ({ matches: false, addEventListener() {} });
    if (userAgent) {
        Object.defineProperty(dom.window.navigator, 'userAgent', { configurable: true, value: userAgent });
    }
    runAsset(dom, 'utils.js');
    runAsset(dom, 'pwa-install.js');
    await flush();
    return dom;
}

test('the install button appears on beforeinstallprompt and spends the prompt once', async () => {
    const dom = await installDom();
    const button = dom.window.document.querySelector('[data-pwa-install]');
    try {
        assert.equal(button.hidden, true, 'hidden until the browser says it can install');

        let prompts = 0;
        let resolveChoice;
        const event = new dom.window.Event('beforeinstallprompt', { cancelable: true });
        event.prompt = () => { prompts += 1; };
        event.userChoice = new Promise((resolve) => { resolveChoice = resolve; });
        dom.window.dispatchEvent(event);
        assert.equal(event.defaultPrevented, true, "the browser's own infobar is suppressed");
        assert.equal(button.hidden, false);

        button.click();
        button.click(); // a second click must not call prompt() on the spent event
        assert.equal(prompts, 1);
        resolveChoice({ outcome: 'dismissed' });
        await flush();
        assert.equal(button.hidden, true, 'hidden after a dismissal until the browser re-offers');

        dom.window.dispatchEvent(event);
        assert.equal(button.hidden, false, 're-offered');
        dom.window.dispatchEvent(new dom.window.Event('appinstalled'));
        assert.equal(button.hidden, true, 'installed: nothing left to offer');
    } finally {
        dom.window.close();
    }
});

test('on iOS the install button opens and closes the Add to Home Screen hint', async () => {
    const dom = await installDom({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' });
    const { document } = dom.window;
    const button = document.querySelector('[data-pwa-install]');
    try {
        assert.equal(button.hidden, false);
        assert.equal(button.getAttribute('aria-expanded'), 'false');

        button.click();
        const hint = document.querySelector('.pwa-install__hint');
        assert.ok(hint, 'hint opened');
        assert.equal(hint.getAttribute('role'), 'dialog');
        assert.equal(hint.textContent, 'Tap Share, then Add to Home Screen.');
        assert.equal(button.getAttribute('aria-expanded'), 'true');

        await new Promise((resolve) => setTimeout(resolve, 5));
        document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        assert.equal(document.querySelector('.pwa-install__hint'), null, 'Escape closes the hint');
        assert.equal(button.getAttribute('aria-expanded'), 'false');
    } finally {
        dom.window.close();
    }
});
