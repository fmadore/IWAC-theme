'use strict';

// Scoped axe checks (WCAG 2 A and AA) on each surface, in both themes, plus
// the two user settings a stylesheet most often breaks: forced colours and
// enlarged text. Scoped, not whole-page: a finding names the component that
// owns it, and a surface without markup in the fixture cannot pass vacuously.

const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { openFixture, hasNoHorizontalScroll } = require('./fixtures');

const SURFACES = [
    // [fixture, width, scope selectors]
    ['item.en', 1280, ['.main-header', '.main-navigation', '#content', '.main-footer']],
    ['item.fr', 390, ['.main-header', '#content']],
    ['items-browse.en', 1280, ['#content']],
    ['item-set.en', 1280, ['#linked-resources', '#item-set-resources']],
    ['page-about.en', 390, ['#content']],
    ['page-exhibit.en', 1280, ['#content']],
];

function summarize(violations) {
    return violations.map((violation) => `${violation.id} (${violation.impact}): ${violation.help}\n    `
        + violation.nodes.slice(0, 4)
            .map((node) => `${node.target.join(' ')}  ${(node.any[0] || node.all[0] || {}).message || ''}`)
            .join('\n    ')).join('\n');
}

// The dateline's middots are aria-hidden, decorative separators in the brand
// colour (~4.3:1 at 13px). WCAG 1.4.3 exempts pure decoration; WebKit's axe
// run measures them (the other engines report oklab colours as "incomplete").
const DECORATION = ['.item-dateline__sep'];

async function axe(page, include) {
    let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']);
    for (const selector of DECORATION) builder = builder.exclude(selector);
    for (const selector of include) builder = builder.include(selector);
    return (await builder.analyze()).violations;
}

for (const [name, width, include] of SURFACES) {
    for (const theme of ['light', 'dark']) {
        test(`axe: ${name} at ${width}px, ${theme}`, async ({ page }) => {
            await page.setViewportSize({ width, height: 900 });
            await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
            await openFixture(page, name);
            await expect(page.locator('body')).toHaveAttribute('data-theme', theme);
            for (const selector of include) {
                expect(await page.locator(selector).count(), `${selector} is on the page`).toBeGreaterThan(0);
            }
            const violations = await axe(page, include);
            expect(summarize(violations)).toBe('');
        });
    }
}

test('axe: the open menu drawer', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openFixture(page, 'item.en');
    await page.locator('.main-navigation__toggle').click();
    await expect(page.locator('#menu-drawer')).toHaveClass(/toggled/);
    const violations = await axe(page, ['#menu-drawer']);
    expect(summarize(violations)).toBe('');
});

test('forced colours: the focus outline survives and the icon controls keep a visible glyph', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'forced-colors emulation is Chromium-only');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ forcedColors: 'active' });
    await openFixture(page, 'item.en');
    const toggle = page.locator('[data-theme-toggle]');
    await toggle.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(toggle).toBeFocused();
    const outline = await toggle.evaluate((element) => {
        const style = getComputedStyle(element);
        return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    });
    expect(outline.style).not.toBe('none');
    expect(outline.width).toBeGreaterThan(0);
    // A Lucide mask paints with background-color; forced colours replace
    // backgrounds with Canvas unless the mixin's forced colour applies.
    const glyph = await page.locator('.theme-toggle__icon').evaluateAll((icons) => icons
        .filter((icon) => icon.getBoundingClientRect().width > 0)
        .map((icon) => ({ bg: getComputedStyle(icon).backgroundColor, canvas: getComputedStyle(document.body).backgroundColor })));
    expect(glyph.length).toBe(1);
    expect(glyph[0].bg).not.toBe(glyph[0].canvas);
});

const enlarged = (scale) => ({ html: (html) => html.replace('</head>', `<style>html{font-size:${scale}%}</style></head>`) });
const masthead = (page) => page.evaluate(() => {
    const top = (selector) => document.querySelector(selector).getBoundingClientRect().top;
    const search = document.querySelector('.main-header__search-form').getBoundingClientRect();
    return { searchBelow: search.top >= document.querySelector('.main-navigation__toggle').getBoundingClientRect().bottom, searchWidth: search.width, menuTop: top('.main-navigation__toggle') };
});

// On a phone the masthead's one row (wordmark, search, language, theme, menu)
// stopped fitting once text was enlarged: 13px of sideways scroll at 150 %,
// 131px at 200 %, and at 200 % "Ouagadougou" alone outgrew the screen as an
// h1. Where the row no longer fits, the search box takes a row of its own.
for (const [width, scale] of [[320, 125], [390, 150], [390, 200], [600, 200]]) {
    test(`${scale}% text keeps the page within the viewport at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await openFixture(page, 'item.en', enlarged(scale));
        expect(await hasNoHorizontalScroll(page)).toBe(true);
        const row = await masthead(page);
        expect(row.searchBelow).toBe(true);
        expect(row.searchWidth).toBeGreaterThan(width / 2);
    });
}

// …and only there: at the default size every phone keeps the single row.
for (const width of [320, 390]) {
    test(`default text keeps the one-row masthead at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await openFixture(page, 'item.en');
        expect((await masthead(page)).searchBelow).toBe(false);
    });
}

test('the language list opens above the page in the two-row masthead', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await openFixture(page, 'item.en', enlarged(200));
    await page.locator('.language-switcher__toggle').click();
    const item = page.locator('.language-switcher__list a, .language-switcher__list button').last();
    await expect(item).toBeVisible();
    const box = await item.boundingBox();
    const hit = await page.evaluate(([x, y]) => {
        const el = document.elementFromPoint(x, y);
        return Boolean(el && el.closest('.language-switcher__list'));
    }, [box.x + box.width / 2, box.y + box.height / 2]);
    expect(hit).toBe(true);
});

for (const width of [768, 1280]) {
    test(`200% text keeps the page within the viewport at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await openFixture(page, 'item.en', { html: (html) => html.replace('</head>', '<style>html{font-size:200%}</style></head>') });
        expect(await hasNoHorizontalScroll(page)).toBe(true);
        const title = await page.locator('h1').first().boundingBox();
        expect(title.x).toBeGreaterThanOrEqual(0);
        expect(title.x + title.width).toBeLessThanOrEqual(width + 1);
    });
}
