'use strict';

const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const WCAG_A_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// Only what would fail an audit: serious and critical findings.
function blocking(results) {
    return results.violations.filter((violation) =>
        violation.impact === 'serious' || violation.impact === 'critical'
    );
}

async function expectNoHorizontalOverflow(page) {
    const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
}

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

test('mobile pages, pagination, and popovers do not overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto('page/home', { waitUntil: 'domcontentloaded' });
    await expectNoHorizontalOverflow(page);

    await page.locator('.language-switcher__toggle').click();
    await expectNoHorizontalOverflow(page);

    await page.locator('.main-navigation__toggle').click();
    await expect(page.locator('#menu-drawer')).toHaveClass(/toggled/);
    await expect(page.locator('#content')).toHaveAttribute('inert', '');
    await expect(page.locator('#menu-backer')).toBeFocused();

    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.locator('#menu-drawer')).not.toHaveClass(/toggled/);
    await expect(page.locator('body')).not.toHaveClass(/menu-drawer-toggled/);
    await expect(page.locator('#content')).not.toHaveAttribute('inert', '');

    await page.setViewportSize({ width: 320, height: 844 });
    for (const route of ['item/browse', 'item/872', 'search/everything?q=islam']) {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await expectNoHorizontalOverflow(page);
    }

    await page.goto('item/23365', { waitUntil: 'domcontentloaded' });
    await page.locator('.annotation-trigger').first().click();
    const panel = await page.locator('.annotation-tooltip__wrapper').first().boundingBox();
    expect(panel).toBeTruthy();
    expect(panel.x).toBeGreaterThanOrEqual(15);
    expect(panel.x + panel.width).toBeLessThanOrEqual(305);
    await expectNoHorizontalOverflow(page);
});

test('theme chrome has no serious WCAG A/AA violations', async ({ page }) => {
    await page.goto('page/home', { waitUntil: 'networkidle' });
    const results = await new AxeBuilder({ page })
        .include('.main-header')
        .include('.banner')
        .include('.main-footer')
        .withTags(WCAG_A_AA)
        .analyze();
    expect(blocking(results)).toEqual([]);
});

// The dark palette is a second set of contrast pairs; the light-mode scan
// above cannot vouch for it. System mode resolves to dark here, which is
// also the path most dark-mode readers arrive by.
test('theme chrome has no serious WCAG A/AA violations in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('page/home', { waitUntil: 'networkidle' });
    await expect(page.locator('body')).toHaveAttribute('data-theme', 'dark');
    const results = await new AxeBuilder({ page })
        .include('.main-header')
        .include('.banner')
        .include('.main-footer')
        .withTags(WCAG_A_AA)
        .analyze();
    expect(blocking(results)).toEqual([]);
});

// The item page is where most readers land, and until this scan it was never
// audited: two WCAG A failures (duplicate annotation ids, the carousel's
// orphaned list items) shipped for releases with the homepage scan green.
// Module-owned embeds are excluded — Mirador, ReplayWeb.page, third-party
// iframes and the IwacVisualizations charts answer for their own markup.
test('item page content has no serious WCAG A/AA violations', async ({ page }) => {
    await page.goto('item/23365', { waitUntil: 'networkidle' });
    const results = await new AxeBuilder({ page })
        .include('#content')
        .exclude('.block-mirador')
        .exclude('replay-web-page')
        .exclude('iframe')
        .exclude('[class*="iwac-vis"]')
        .withTags(WCAG_A_AA)
        .analyze();
    expect(blocking(results)).toEqual([]);
});

// The two scans above exclude module markup on the grounds that the modules
// "answer for their own" — and neither module ran an accessibility scan
// anywhere, so the search surface and every chart panel were audited by no
// one. This suite is the only place a real, data-backed page exists, so the
// module surfaces are scanned here too: each in its own test, so a failure
// names the repository that owns the markup.

test('IwacSearch results surface has no serious WCAG A/AA violations', async ({ page }) => {
    await page.goto('search/everything?q=islam', { waitUntil: 'networkidle' });
    await expect(page.locator('.iwac-card').first()).toBeVisible();
    const results = await new AxeBuilder({ page })
        .include('[data-iwac-federated-root], [data-iwac-search-root]')
        .withTags(WCAG_A_AA)
        .analyze();
    expect(blocking(results)).toEqual([]);
});

test('IwacVisualizations item-page blocks have no serious WCAG A/AA violations', async ({ page }) => {
    await page.goto('item/23365', { waitUntil: 'networkidle' });
    const blocks = page.locator('.iwac-vis-block');
    test.skip(await blocks.count() === 0, 'no IwacVisualizations block on this item page');
    await expect(blocks.first()).toBeVisible();
    const results = await new AxeBuilder({ page })
        .include('.iwac-vis-block')
        .withTags(WCAG_A_AA)
        .analyze();
    expect(blocking(results)).toEqual([]);
});

test('each value annotation trigger controls its own panel', async ({ page }) => {
    await page.goto('item/23365', { waitUntil: 'domcontentloaded' });
    const pairs = await page.$$eval('.annotation-btn', (buttons) => buttons.map((button) => ({
        controls: button.querySelector('.annotation-trigger').getAttribute('aria-controls'),
        panel: button.querySelector('.annotation-tooltip').id,
    })));
    expect(pairs.length).toBeGreaterThan(0);
    for (const { controls, panel } of pairs) {
        expect(controls).toBe(panel);
    }
    const ids = await page.$$eval('[id^="value-annotation-"]', (nodes) => nodes.map((node) => node.id));
    expect(new Set(ids).size).toBe(ids.length);
});
