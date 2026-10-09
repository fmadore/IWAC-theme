'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDom, runAsset } = require('../test-support/dom');

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

test('mobile drawer owns focus and resets cleanly at the desktop breakpoint', () => {
    const dom = createDom(`<!doctype html><body>
        <header class="main-header">
            <div class="main-header__site-title"><a href="/">IWAC</a></div>
            <div class="main-header__search-form"><input></div>
            <div class="main-header__utilities"><button>Theme</button></div>
            <button class="main-navigation__toggle" aria-expanded="false">
                <span class="sr-only">Open menu</span><span></span><span></span><span></span>
            </button>
            <nav class="main-navigation"><ul id="main-menu"><li><a href="/one">One</a><ul><li><a href="/child">Child</a></li></ul></li></ul></nav>
            <nav class="main-navigation"></nav>
            <nav class="section-tabs"><a href="/tab">Tab</a></nav>
        </header>
        <nav id="menu-drawer" inert aria-hidden="true" data-close-text="Close"><button id="menu-backer" tabindex="-1">Close</button><div id="menu-clones"></div></nav>
        <main id="content"><a href="/content">Content</a></main>
        <footer class="main-footer" inert>Footer</footer>
    </body>`);
    const media = installMatchMedia(dom.window);

    runAsset(dom, 'navigation.js');
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

    const document = dom.window.document;
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

function drawerFixture() {
    return createDom(`<!doctype html><body>
        <header class="main-header">
            <div class="main-header__site-title"><a href="/">IWAC</a></div>
            <button class="main-navigation__toggle" aria-expanded="false">
                <span class="sr-only">Open menu</span><span></span><span></span><span></span>
            </button>
            <nav class="main-navigation"><ul id="main-menu">
                <li><a href="/browse">Browse</a><ul><li><a href="/items">Items</a></li></ul></li>
                <li><a href="/about">About</a><ul><li><a href="/team">Team</a></li></ul></li>
            </ul></nav>
        </header>
        <nav id="menu-drawer" inert aria-hidden="true" data-close-text="Close"
            data-show-submenu-text="show submenu for “%s”"><button id="menu-backer" tabindex="-1">Close</button><div id="menu-clones"></div></nav>
        <main id="content"><a href="/content">Content</a></main>
    </body>`);
}

test('every submenu toggle is named after its own entry, desktop and drawer alike', () => {
    const dom = drawerFixture();
    installMatchMedia(dom.window);
    runAsset(dom, 'navigation.js');
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    const document = dom.window.document;

    const drawerNames = [...document.querySelectorAll('#menu-drawer .mobile-dropdown-toggle')]
        .map((button) => button.getAttribute('aria-label'));
    assert.deepEqual(drawerNames, ['show submenu for “Browse”', 'show submenu for “About”']);
    const desktopNames = [...document.querySelectorAll('.main-navigation .submenu-btn')]
        .map((button) => button.textContent.trim());
    assert.deepEqual(desktopNames, drawerNames);

    dom.window.close();
});

test('the open drawer traps Tab and Shift+Tab, and Escape hands focus back to the toggle', () => {
    const dom = drawerFixture();
    installMatchMedia(dom.window);
    // jsdom does no layout, so every offsetParent is null and the trap would
    // see nothing focusable; stand in "attached" for "rendered".
    Object.defineProperty(dom.window.HTMLElement.prototype, 'offsetParent', {
        configurable: true,
        get() { return this.isConnected ? this.parentNode : null; },
    });
    runAsset(dom, 'navigation.js');
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    const document = dom.window.document;
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
