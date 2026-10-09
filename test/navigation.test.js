'use strict';

// The masthead, section strip and drawer are the real ones: common/header.phtml
// and common/menu-drawer.phtml inside layout.phtml, around a site navigation
// rendered the way Laminas renders it (test-support/fixtures.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { runAsset } = require('../test-support/dom');
const { fixtureDom } = require('../test-support/fixtures');

function installMatchMedia(window) {
    const listeners = new Set();
    const query = {
        matches: false,
        media: '(min-width: 1024px)',
        addEventListener(type, listener) {
            if (type === 'change') listeners.add(listener);
        },
        removeEventListener(type, listener) {
            if (type === 'change') listeners.delete(listener);
        },
        setMatches(matches) {
            this.matches = matches;
            listeners.forEach((listener) => listener({ matches, media: this.media }));
        },
    };
    window.matchMedia = () => query;
    return query;
}

/** A rendered page with navigation.js running at phone width. */
function navigated(name, prepare = () => {}) {
    const dom = fixtureDom(name);
    const media = installMatchMedia(dom.window);
    prepare(dom);
    runAsset(dom, 'navigation.js');
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    return { dom, media, document: dom.window.document };
}

test('mobile drawer owns focus and resets cleanly at the desktop breakpoint', () => {
    const { dom, media, document } = navigated('item.en', (dom) => {
        // Inert state that predates the drawer (another modal's, say).
        dom.window.document.querySelector('.main-footer').setAttribute('inert', '');
    });

    const toggle = document.querySelector('.main-navigation__toggle');
    const drawer = document.getElementById('menu-drawer');
    const backer = document.getElementById('menu-backer');
    const desktopSubmenuButton = document.querySelector('.main-navigation .submenu-btn');

    assert.equal(desktopSubmenuButton.type, 'button');
    assert.equal(document.querySelector('.mobile-dropdown-toggle').type, 'button');

    desktopSubmenuButton.click();
    assert.equal(desktopSubmenuButton.nextElementSibling.style.opacity, '1');
    desktopSubmenuButton.click();
    assert.equal(desktopSubmenuButton.nextElementSibling.style.opacity, '0');

    toggle.click();
    assert.equal(drawer.classList.contains('toggled'), true);
    assert.equal(document.activeElement, backer);
    assert.equal(document.getElementById('content').hasAttribute('inert'), true);
    assert.equal(document.querySelector('.main-header__search-form').hasAttribute('inert'), true);

    media.setMatches(true);
    assert.equal(drawer.classList.contains('toggled'), false);
    assert.equal(document.body.classList.contains('menu-drawer-toggled'), false);
    assert.equal(document.getElementById('content').hasAttribute('inert'), false);
    assert.equal(document.querySelector('.main-header__search-form').hasAttribute('inert'), false);
    // Inert state that predated the drawer remains untouched.
    assert.equal(document.querySelector('.main-footer').hasAttribute('inert'), true);

    dom.window.close();
});

test('every submenu toggle is named after its own entry, desktop and drawer alike', () => {
    // The French site: the English name pattern is also the script's
    // fallback, so only a translated one proves the drawer's own is read.
    const { dom, document } = navigated('item.fr');

    const drawerNames = [...document.querySelectorAll('#menu-drawer .mobile-dropdown-toggle')]
        .map((button) => button.getAttribute('aria-label'));
    assert.deepEqual(drawerNames, [
        'afficher le sous-menu de « Parcourir »',
        'afficher le sous-menu de « Expositions »',
        'afficher le sous-menu de « À propos »',
    ]);
    const desktopNames = [...document.querySelectorAll('.main-navigation .submenu-btn')]
        .map((button) => button.textContent.trim());
    assert.deepEqual(desktopNames, drawerNames);

    dom.window.close();
});

test('the open drawer traps Tab and Shift+Tab, and Escape hands focus back to the toggle', () => {
    const { dom, document } = navigated('item.en', (dom) => {
        // jsdom does no layout, so every offsetParent is null and the trap would
        // see nothing focusable; stand in "attached" for "rendered".
        Object.defineProperty(dom.window.HTMLElement.prototype, 'offsetParent', {
            configurable: true,
            get() { return this.isConnected ? this.parentNode : null; },
        });
    });
    const toggle = document.querySelector('.main-navigation__toggle');
    const backer = document.getElementById('menu-backer');
    const press = (key, shiftKey = false) => document.dispatchEvent(
        new dom.window.KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true })
    );

    toggle.click();
    backer.focus();
    assert.equal(document.activeElement, backer);
    const focusable = [...document.querySelectorAll('#menu-drawer a, #menu-drawer button')]
        .filter((el) => !el.closest('[inert]') && el.tabIndex >= 0);
    const last = focusable[focusable.length - 1];

    // Shift+Tab on the first control wraps to the last…
    press('Tab', true);
    assert.equal(document.activeElement, last);
    // …and Tab on the last wraps to the first.
    press('Tab');
    assert.equal(document.activeElement, backer);

    press('Escape');
    assert.equal(document.getElementById('menu-drawer').classList.contains('toggled'), false);
    assert.equal(document.activeElement, toggle);
    assert.equal(document.getElementById('content').hasAttribute('inert'), false);

    dom.window.close();
});
