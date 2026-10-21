'use strict';

// An exhibit page rendered from the real templates: three Media embed blocks on
// the "Masonry" block template (common/block-template/media-masonry.phtml) —
// photographs, embedded media with a YouTube player, and text-only references —
// and the references once more on core's default horizontal layout.
//
// jsdom lays nothing out and loads no stylesheet, so the wall's computed column
// width and gap are stubbed at the values the stylesheet resolves to (15rem and
// --space-6 at 16px), and MiniMasonry and ResizeObserver are recorders.

const test = require('node:test');
const assert = require('node:assert/strict');
const { runAsset } = require('../test-support/dom');
const { fixtureDom } = require('../test-support/fixtures');

function exhibitPage({ miniMasonry = true, direction = 'ltr', frames = null } = {}) {
    const dom = fixtureDom('page-exhibit.en');
    const win = dom.window;
    const built = [];
    const observers = [];
    win.IWACUtils = { onReady: (callback) => callback() };
    if (miniMasonry) {
        win.MiniMasonry = class {
            constructor(conf) {
                this.conf = conf;
                this.layouts = 0;
                built.push(this);
            }

            layout() {
                this.layouts += 1;
            }
        };
    }
    win.ResizeObserver = class {
        constructor(callback) {
            this.callback = callback;
            this.observed = [];
            observers.push(this);
        }

        observe(el) {
            this.observed.push(el);
        }
    };
    if (frames) {
        win.requestAnimationFrame = (callback) => frames.push(callback);
    }
    // What the stylesheet resolves `.media-embed.layout-masonry` to — until
    // [data-masonry-ready] switches the columns off.
    const computed = win.getComputedStyle.bind(win);
    win.getComputedStyle = (el) => (el.matches('.media-embed.layout-masonry')
        ? {
            columnWidth: el.dataset.masonryReady ? 'auto' : '240px',
            columnGap: '24px',
            direction,
        }
        : computed(el));
    return { dom, doc: win.document, built, observers };
}

test('the masonry template swaps the block layout class and loads its scripts once', () => {
    const { dom, doc } = exhibitPage();
    const walls = doc.querySelectorAll('.media-embed.layout-masonry');
    assert.equal(walls.length, 3);
    walls.forEach((wall) => {
        assert.ok(!wall.classList.contains('layout-horizontal') && !wall.classList.contains('layout-vertical'));
    });
    // Core's other classes reach the template untouched.
    assert.deepEqual([...walls].map((w) => w.classList.contains('media-display-thumbnail')), [true, false, true]);
    assert.ok(doc.querySelector('.media-embed.layout-horizontal:not(.layout-masonry)'), 'the default-template block is missing');
    const scripts = [...doc.querySelectorAll('script[src]')].map((s) => s.getAttribute('src'));
    assert.equal(scripts.filter((src) => src.endsWith('/minimasonry.min.js')).length, 1);
    assert.equal(scripts.filter((src) => src.endsWith('/media-masonry.min.js')).length, 1);
    dom.window.close();
});

test('every wall is packed with the stylesheet’s column width and gutter', () => {
    const { dom, doc, built } = exhibitPage();
    runAsset(dom, 'media-masonry.js');
    const walls = [...doc.querySelectorAll('.media-embed.layout-masonry')];
    assert.equal(built.length, walls.length);
    built.forEach((masonry, i) => {
        assert.equal(masonry.conf.container, walls[i]);
        assert.equal(masonry.conf.baseWidth, 240);
        assert.equal(masonry.conf.gutter, 24);
        assert.equal(masonry.conf.ultimateGutter, 24);
        assert.equal(masonry.conf.surroundingGutter, false);
        assert.equal(masonry.conf.direction, 'ltr');
        assert.equal(walls[i].dataset.masonryReady, 'true');
    });
    // The block on core's default template is left to its grid.
    assert.equal(doc.querySelector('.media-embed.layout-horizontal').dataset.masonryReady, undefined);
    dom.window.close();
});

test('every card is watched, and a burst of size changes re-packs its wall once a frame', () => {
    const frames = [];
    const { dom, doc, built, observers } = exhibitPage({ frames });
    runAsset(dom, 'media-masonry.js');
    const walls = [...doc.querySelectorAll('.media-embed.layout-masonry')];
    assert.deepEqual(observers.map((o) => o.observed.length), walls.map((w) => w.children.length));
    assert.deepEqual(observers.map((o) => o.observed.length), [6, 3, 5]);

    // An image loads, a webfont swaps in, the player settles: three reports.
    observers[1].callback([]);
    observers[1].callback([]);
    observers[1].callback([]);
    assert.equal(frames.length, 1);
    frames.shift()();
    assert.equal(built[1].layouts, 1);
    assert.equal(built[0].layouts, 0);
    // The next change is a new frame.
    observers[1].callback([]);
    assert.equal(frames.length, 1);
    dom.window.close();
});

test('running again builds nothing twice', () => {
    const { dom, built } = exhibitPage();
    runAsset(dom, 'media-masonry.js');
    runAsset(dom, 'media-masonry.js');
    assert.equal(built.length, 3);
    dom.window.close();
});

test('without MiniMasonry the walls stay on the stylesheet’s columns', () => {
    const { dom, doc } = exhibitPage({ miniMasonry: false });
    runAsset(dom, 'media-masonry.js');
    doc.querySelectorAll('.media-embed.layout-masonry').forEach((wall) => {
        assert.equal(wall.dataset.masonryReady, undefined);
    });
    dom.window.close();
});

test('a right-to-left page packs from the right', () => {
    const { dom, built } = exhibitPage({ direction: 'rtl' });
    runAsset(dom, 'media-masonry.js');
    built.forEach((masonry) => assert.equal(masonry.conf.direction, 'rtl'));
    dom.window.close();
});
