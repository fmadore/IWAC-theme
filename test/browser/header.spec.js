'use strict';

// The masthead, section strip, drawer, theme toggle and language switcher, in
// a real browser with the real stylesheet: layout, focus and keyboard, which
// jsdom (test/navigation.test.js, test/interactions.test.js) cannot see.

const { test, expect } = require('@playwright/test');
const { openFixture, hasNoHorizontalScroll } = require('./fixtures');

const NARROW = [320, 390, 768];
const WIDE = [1024, 1440];

for (const width of [...NARROW, ...WIDE]) {
    test(`masthead and navigation fit at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        const { external } = await openFixture(page, 'item.en');
        expect(await hasNoHorizontalScroll(page)).toBe(true);

        const title = page.locator('.main-header__site-title a').first();
        await expect(title).toBeVisible();
        const box = await title.boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);

        const toggle = page.locator('.main-navigation__toggle');
        const strip = page.locator('.main-navigation');
        if (width < 1024) {
            // Below $lg the drawer serves the navigation; the strip collapses
            // to its hairline rule, with none of its links showing.
            await expect(toggle).toBeVisible();
            await expect(strip.getByRole('link').first()).toBeHidden();
        } else {
            await expect(toggle).toBeHidden();
            await expect(strip.getByRole('link').first()).toBeVisible();
        }
        // The theme toggle stays reachable at every width.
        await expect(page.locator('[data-theme-toggle]')).toBeVisible();
        expect(external).toEqual([]);
    });
}

test('the drawer opens, traps focus, closes on Escape and hands focus back', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openFixture(page, 'item.en');
    const toggle = page.locator('.main-navigation__toggle');
    const drawer = page.locator('#menu-drawer');

    await toggle.click();
    await expect(drawer).toHaveClass(/toggled/);
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#content')).toHaveAttribute('inert', '');
    // Focus moved into the drawer… navigation.js retries it frame by frame
    // until the visibility transition lets it land, so wait rather than read
    // it once (WebKit in CI was still a frame short).
    await expect.poll(() => page.evaluate(() => document.getElementById('menu-drawer').contains(document.activeElement))).toBe(true);
    // …and Tab cannot leave it, either way round.
    for (let i = 0; i < 40; i++) {
        await page.keyboard.press('Tab');
        expect(await page.evaluate(() => document.getElementById('menu-drawer').contains(document.activeElement))).toBe(true);
    }
    for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Shift+Tab');
        expect(await page.evaluate(() => document.getElementById('menu-drawer').contains(document.activeElement))).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(drawer).not.toHaveClass(/toggled/);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
    await expect(page.locator('#content')).not.toHaveAttribute('inert', '');
});

test('the drawer resets when the viewport reaches the desktop breakpoint', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openFixture(page, 'item.en');
    await page.locator('.main-navigation__toggle').click();
    await expect(page.locator('#menu-drawer')).toHaveClass(/toggled/);
    await page.setViewportSize({ width: 1280, height: 844 });
    await expect(page.locator('#menu-drawer')).not.toHaveClass(/toggled/);
    await expect(page.locator('#content')).not.toHaveAttribute('inert', '');
    await expect(page.locator('.main-navigation').getByRole('link').first()).toBeVisible();
});

test('navigation and search work with JavaScript disabled', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await openFixture(page, 'item.en');
    const strip = page.locator('.main-navigation');
    await expect(strip.getByRole('link').first()).toBeVisible();
    await expect(page.locator('#fulltext-search')).toBeVisible();
    expect(await hasNoHorizontalScroll(page)).toBe(true);
    await context.close();
});

test('the theme toggle cycles and persists light and dark across a reload', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await openFixture(page, 'item.en');
    const button = page.locator('[data-theme-toggle]');
    const body = page.locator('body');
    await expect(body).toHaveAttribute('data-theme-mode', 'system');
    const surface = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const lightSurface = await surface();

    await button.click();
    await expect(body).toHaveAttribute('data-theme-mode', 'light');
    await button.click();
    await expect(body).toHaveAttribute('data-theme-mode', 'dark');
    await expect(body).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('[data-theme-status]')).not.toHaveText('');
    expect(await page.evaluate(() => localStorage.getItem('iwac-theme-preference'))).toBe('dark');
    const darkSurface = await surface();
    expect(darkSurface).not.toBe(lightSurface);

    // The head script applies the stored preference before first paint.
    await page.reload();
    await expect(body).toHaveAttribute('data-theme', 'dark');
    expect(await surface()).toBe(darkSurface);

    await button.click();
    await expect(body).toHaveAttribute('data-theme-mode', 'system');
    expect(await page.evaluate(() => localStorage.getItem('iwac-theme-preference'))).toBe(null);
});

test('the theme toggle still works when storage is blocked', async ({ page }) => {
    // What a private window or blocked site data does: every access throws.
    await page.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await openFixture(page, 'item.en');
    const body = page.locator('body');
    await page.locator('[data-theme-toggle]').click();
    await expect(body).toHaveAttribute('data-theme-mode', 'light');
    await page.locator('[data-theme-toggle]').click();
    await expect(body).toHaveAttribute('data-theme', 'dark');
    expect(errors).toEqual([]);
});

test('the language switcher is a disclosure: click, Escape, focus back', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openFixture(page, 'item.en');
    const toggle = page.locator('.language-switcher__toggle');
    const list = page.locator('.language-switcher__list');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(list).toBeHidden();

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(list).toBeVisible();
    const french = list.getByRole('link');
    await expect(french).toHaveAttribute('hreflang', /^fr/);

    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(list).toBeHidden();
    await expect(toggle).toBeFocused();
});
