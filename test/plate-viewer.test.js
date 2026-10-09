'use strict';

// The French About page, rendered from the real templates: three Asset blocks
// (common/block-layout/asset.phtml) — one image named by its caption, one by
// its alt text, one linked to a page — inside core's page-block grid. French,
// so every string the viewer shows is one the template's island supplied, not
// the script's English fallback.

const test = require('node:test');
const assert = require('node:assert/strict');
const { runAsset } = require('../test-support/dom');
const { fixtureDom } = require('../test-support/fixtures');

// jsdom ships no <dialog> behaviour, no Web Animations and no scrollIntoView.
// The script guards `animate` itself (that guard is what makes it degrade on an
// older engine), so only the other two are stubbed — and showModal/close are
// stubbed as the real thing behaves: toggling `open`.
function prepare(dom) {
    dom.window.matchMedia = () => ({ matches: false, addEventListener() {} });
    dom.window.IWACUtils = {
        debounce: (callback) => callback,
        onReady: (callback) => callback(),
    };
    const dialogProto = dom.window.HTMLDialogElement.prototype;
    dialogProto.showModal = function showModal() { this.open = true; };
    dialogProto.close = function close() { this.open = false; };
    dom.window.Element.prototype.scrollIntoView = function scrollIntoView() {};
}

function aboutPage(edit = () => {}) {
    const dom = fixtureDom('page-about.fr');
    prepare(dom);
    edit(dom.window.document);
    runAsset(dom, 'plate-viewer.js');
    return { dom, doc: dom.window.document };
}

test('an asset that links to a page keeps its link and is not enhanced', () => {
    const { dom, doc } = aboutPage();
    assert.equal(doc.querySelectorAll('.plate-trigger').length, 2);
    const linked = doc.querySelector('.block-asset .asset a img');
    assert.ok(linked, 'the page-linked asset is missing from the fixture');
    assert.equal(linked.closest('.plate-trigger'), null);
    dom.window.close();
});

test('triggers take their translated name from the caption, falling back to alt', () => {
    const { dom, doc } = aboutPage();
    const triggers = doc.querySelectorAll('.plate-trigger');
    assert.equal(triggers[0].getAttribute('aria-label'), 'Afficher en plein écran : Bibliothèque nationale du Togo');
    assert.equal(triggers[1].getAttribute('aria-label'), 'Afficher en plein écran : Frédérick Madore');
    assert.equal(triggers[0].getAttribute('aria-haspopup'), 'dialog');
    // The image itself is preserved, not replaced.
    assert.equal(triggers[0].querySelector('img').getAttribute('alt'), 'Bibliothèque nationale du Togo');
    dom.window.close();
});

test('the series steps, bounds its ends, and announces position', () => {
    const { dom, doc } = aboutPage();
    doc.querySelectorAll('.plate-trigger')[0].click();

    const dialog = doc.querySelector('dialog.plate-viewer');
    const status = dialog.querySelector('[role="status"]');
    const prev = dialog.querySelector('.plate-viewer__step--prev');
    const next = dialog.querySelector('.plate-viewer__step--next');

    assert.equal(dialog.open, true);
    assert.equal(dialog.getAttribute('aria-label'), 'Visionneuse d’images');
    assert.equal(prev.getAttribute('aria-label'), 'Image précédente');
    assert.equal(prev.disabled, true);
    assert.equal(next.disabled, false);
    assert.equal(status.textContent, 'Image 1 sur 2. Bibliothèque nationale du Togo');
    assert.equal(dialog.querySelector('.plate-viewer__counter').textContent, '12');

    next.click();
    assert.equal(status.textContent, 'Image 2 sur 2');
    assert.equal(prev.disabled, false);
    assert.equal(next.disabled, true);
    // No caption on the second asset — the line is removed, not left blank.
    assert.equal(dialog.querySelector('.plate-viewer__caption').hidden, true);
    dom.window.close();
});

// Regression: the close flight fills forwards, so the next open cancels it to
// clear the transform. An un-guarded oncancel handler ran finish() there and
// closed the dialog milliseconds after showModal() opened it.
test('the viewer survives repeated open/close cycles', async () => {
    const { dom, doc } = aboutPage();
    const trigger = doc.querySelectorAll('.plate-trigger')[0];

    for (let pass = 0; pass < 3; pass += 1) {
        trigger.click();
        const dialog = doc.querySelector('dialog.plate-viewer');
        assert.equal(dialog.open, true, `pass ${pass}: dialog opened`);

        dialog.dispatchEvent(new dom.window.Event('cancel', { cancelable: true }));
        await new Promise((resolve) => { dom.window.setTimeout(resolve, 350); });
        assert.equal(dialog.open, false, `pass ${pass}: dialog closed`);
        assert.equal(doc.documentElement.classList.contains('has-plate-viewer'), false);
        assert.equal(doc.activeElement, trigger, `pass ${pass}: focus returned`);
    }
    dom.window.close();
});

test('English fallbacks apply when the template has not shipped its string island', () => {
    // Today's asset.phtml always ships the island; an older deployed one did
    // not. Take today's page back to that: strip the island, and keep only
    // the first image.
    const { dom, doc } = aboutPage((doc) => {
        doc.querySelectorAll('.assets').forEach((assets) => {
            [...assets.attributes].filter((a) => a.name.startsWith('data-plate-')).forEach((a) => assets.removeAttribute(a.name));
        });
        doc.querySelectorAll('.block-asset').forEach((block, index) => { if (index > 0) block.remove(); });
    });

    assert.equal(
        doc.querySelector('.plate-trigger').getAttribute('aria-label'),
        'View full screen: Bibliothèque nationale du Togo',
    );
    doc.querySelector('.plate-trigger').click();
    const dialog = doc.querySelector('dialog.plate-viewer');
    // A single plate is not a series: no counter, no step controls.
    assert.ok(dialog.classList.contains('plate-viewer--single'));
    assert.equal(dialog.querySelector('[role="status"]').textContent, 'Image 1 of 1. Bibliothèque nationale du Togo');
    dom.window.close();
});
