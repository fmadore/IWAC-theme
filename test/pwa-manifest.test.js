'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { flush, runAsset } = require('../test-support/dom');
const { fixtureDom } = require('../test-support/fixtures');

// The manifest is emitted as a JSON island by layout.phtml (helper/PwaManifest
// builds it) and turned into a same-origin blob: manifest by pwa-install.js.
// A blob: URL has NO base, so any member left relative is dropped by the
// browser without a word — the install dialog just silently loses whatever it
// described. `screenshots` shipped in 2.18.0 and was missed by the absolutiser
// at first. The island here is the one the helper actually emits, and every
// string in the result is checked, so the next URL-bearing member is covered
// the day it is added rather than the day someone remembers this test.

async function buildManifest() {
    const dom = fixtureDom('item.en');

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
    dom.window.close();
    return JSON.parse(await captured.text());
}

/** Every string in the manifest that is a URL or a path, with the member path that holds it. */
function urlsOf(value, at = '') {
    if (typeof value === 'string') {
        return /^(https?:\/\/|\/|\.\.?\/)/.test(value) ? [[at, value]] : [];
    }
    if (value && typeof value === 'object') {
        return Object.entries(value).flatMap(([key, child]) => urlsOf(child, Array.isArray(value) ? `${at}[${key}]` : (at ? `${at}.${key}` : key)));
    }
    return [];
}

test('every URL in the blob manifest is absolute, screenshots included', async () => {
    const manifest = await buildManifest();

    assert.equal(manifest.screenshots.length, 2, 'the screenshots member did not survive');
    const urls = urlsOf(manifest);
    // Not vacuous: the members this has gone wrong for before are in the walk.
    for (const member of ['start_url', 'scope', 'id', 'icons[0].src', 'screenshots[0].src', 'shortcuts[0].url', 'shortcuts[0].icons[0].src']) {
        assert.ok(urls.some(([at]) => at === member), `${member} missing from the manifest`);
    }
    const relative = urls.filter(([, url]) => !/^https?:\/\//.test(url));
    assert.deepEqual(relative, [], 'these manifest URLs would be dropped by a blob: manifest');

    // The two form factors Chrome distinguishes; it wants one aspect ratio per
    // form factor, so a second `wide` entry would have to match 1280x720.
    assert.deepEqual(
        manifest.screenshots.map((s) => s.form_factor).sort(),
        ['narrow', 'wide'],
    );
});

/** A rendered page with pwa-install.js running and its footer install button. */
async function installDom(name, { userAgent } = {}) {
    const dom = fixtureDom(name);
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
    const dom = await installDom('item.en');
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
    // The French footer: the English hint is also the script's fallback.
    const dom = await installDom('item.fr', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' });
    const { document } = dom.window;
    const button = document.querySelector('[data-pwa-install]');
    try {
        assert.equal(button.hidden, false);
        assert.equal(button.getAttribute('aria-expanded'), 'false');

        button.click();
        const hint = document.querySelector('.pwa-install__hint');
        assert.ok(hint, 'hint opened');
        assert.equal(hint.getAttribute('role'), 'dialog');
        assert.equal(hint.getAttribute('aria-label'), 'Comment installer cette application');
        assert.equal(hint.textContent, 'Touchez l’icône Partager, puis « Sur l’écran d’accueil ».');
        assert.equal(button.getAttribute('aria-expanded'), 'true');

        await new Promise((resolve) => setTimeout(resolve, 5));
        document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        assert.equal(document.querySelector('.pwa-install__hint'), null, 'Escape closes the hint');
        assert.equal(button.getAttribute('aria-expanded'), 'false');
    } finally {
        dom.window.close();
    }
});
