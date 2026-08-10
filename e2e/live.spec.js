'use strict';

const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test('legacy advanced search reaches IwacSearch and preserves the query', async ({ page }) => {
    await page.goto('item/search?q=togo', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/search\/everything(?:\?|$)/);
    expect(new URL(page.url()).searchParams.get('q')).toBe('togo');
});

test('hero search field and submit button fill the banner search box', async ({ page }) => {
    await page.goto('page/home', { waitUntil: 'domcontentloaded' });
    const form = page.locator('#search-form-hero');
    const input = page.locator('#fulltext-search-hero');
    const submit = page.locator('#search-submit-hero');
    await expect(form).toBeVisible();

    const [formBox, inputBox, submitBox] = await Promise.all([
        form.boundingBox(),
        input.boundingBox(),
        submit.boundingBox(),
    ]);
    expect(formBox && inputBox && submitBox).toBeTruthy();
    expect(Math.abs(inputBox.y - formBox.y)).toBeLessThanOrEqual(1);
    expect(Math.abs((inputBox.y + inputBox.height) - (formBox.y + formBox.height))).toBeLessThanOrEqual(1);
    expect(Math.abs(inputBox.height - submitBox.height)).toBeLessThanOrEqual(1);
});

test('mobile drawer restores a clean desktop state and pages do not overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('page/home', { waitUntil: 'domcontentloaded' });

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    await page.locator('.main-navigation__toggle').click();
    await expect(page.locator('#menu-drawer')).toHaveClass(/toggled/);
    await expect(page.locator('#content')).toHaveAttribute('inert', '');
    await expect(page.locator('#menu-backer')).toBeFocused();

    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.locator('#menu-drawer')).not.toHaveClass(/toggled/);
    await expect(page.locator('body')).not.toHaveClass(/menu-drawer-toggled/);
    await expect(page.locator('#content')).not.toHaveAttribute('inert', '');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('page/browse', { waitUntil: 'domcontentloaded' });
    const browseOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(browseOverflow).toBeLessThanOrEqual(1);
});

test('theme chrome has no serious WCAG A/AA violations', async ({ page }) => {
    await page.goto('page/home', { waitUntil: 'networkidle' });
    const results = await new AxeBuilder({ page })
        .include('.main-header')
        .include('.banner')
        .include('.main-footer')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
    const blocking = results.violations.filter((violation) =>
        violation.impact === 'serious' || violation.impact === 'critical'
    );
    expect(blocking).toEqual([]);
});
