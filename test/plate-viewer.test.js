'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDom, runAsset } = require('../test-support/dom');

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

function page(extra = '') {
    return `<!doctype html><body>
        <div class="block block-asset"><div class="assets"
            data-plate-open="Voir en plein écran"
            data-plate-open-named="Voir en plein écran : %s"
            data-plate-viewer="Visionneuse"
            data-plate-close="Fermer"
            data-plate-previous="Précédente"
            data-plate-next="Suivante"
            data-plate-zoom-in="Agrandir"
            data-plate-zoom-out="Ajuster"
            data-plate-tap="Toucher pour agrandir"
            data-plate-position="Image %1 sur %2">
            <div class="asset"><img alt="Premier écran" src="/files/asset/a.webp">
                <div class="caption">Premier écran</div></div>
        </div></div>
        <div class="block block-asset"><div class="assets">
            <div class="asset"><img alt="Second" src="/files/asset/b.webp"></div>
        </div></div>
        ${extra}
    </body>`;
}

test('an asset that links to a page keeps its link and is not enhanced', () => {
    const dom = createDom(page(`
        <div class="block block-asset"><div class="assets">
            <div class="asset"><a href="/s/x/page/y"><img alt="Linked" src="/files/asset/c.webp"></a>
                <span class="link-title">Linked page</span></div>
        </div></div>`));
    prepare(dom);
    runAsset(dom, 'plate-viewer.js');

    const doc = dom.window.document;
    assert.equal(doc.querySelectorAll('.plate-trigger').length, 2);
    assert.equal(doc.querySelector('.asset a img').closest('.plate-trigger'), null);
    dom.window.close();
});

test('triggers take their translated name from the caption, falling back to alt', () => {
    const dom = createDom(page());
    prepare(dom);
    runAsset(dom, 'plate-viewer.js');

    const triggers = dom.window.document.querySelectorAll('.plate-trigger');
    assert.equal(triggers[0].getAttribute('aria-label'), 'Voir en plein écran : Premier écran');
    assert.equal(triggers[1].getAttribute('aria-label'), 'Voir en plein écran : Second');
    assert.equal(triggers[0].getAttribute('aria-haspopup'), 'dialog');
    // The image itself is preserved, not replaced.
    assert.equal(triggers[0].querySelector('img').getAttribute('alt'), 'Premier écran');
    dom.window.close();
});

test('the series steps, bounds its ends, and announces position', () => {
    const dom = createDom(page());
    prepare(dom);
    runAsset(dom, 'plate-viewer.js');

    const doc = dom.window.document;
    doc.querySelectorAll('.plate-trigger')[0].click();

    const dialog = doc.querySelector('dialog.plate-viewer');
    const status = dialog.querySelector('[role="status"]');
    const prev = dialog.querySelector('.plate-viewer__step--prev');
    const next = dialog.querySelector('.plate-viewer__step--next');

    assert.equal(dialog.open, true);
    assert.equal(dialog.getAttribute('aria-label'), 'Visionneuse');
    assert.equal(prev.getAttribute('aria-label'), 'Précédente');
    assert.equal(prev.disabled, true);
    assert.equal(next.disabled, false);
    assert.equal(status.textContent, 'Image 1 sur 2. Premier écran');
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
    const dom = createDom(page());
    prepare(dom);
    runAsset(dom, 'plate-viewer.js');

    const doc = dom.window.document;
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
    const dom = createDom(`<!doctype html><body>
        <div class="block block-asset"><div class="assets">
            <div class="asset"><img alt="Only" src="/files/asset/a.webp"></div>
        </div></div></body>`);
    prepare(dom);
    runAsset(dom, 'plate-viewer.js');

    const doc = dom.window.document;
    assert.equal(
        doc.querySelector('.plate-trigger').getAttribute('aria-label'),
        'View full screen: Only',
    );
    doc.querySelector('.plate-trigger').click();
    const dialog = doc.querySelector('dialog.plate-viewer');
    // A single plate is not a series: no counter, no step controls.
    assert.ok(dialog.classList.contains('plate-viewer--single'));
    assert.equal(dialog.querySelector('[role="status"]').textContent, 'Image 1 of 1');
    dom.window.close();
});
