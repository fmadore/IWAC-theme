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

// Phones are the open finding: at 390px the masthead's tool row (search,
// language, theme, menu) needs more than the width once text is enlarged —
// 13px of horizontal scroll at 150%, 131px at 200%. Fixing it is a masthead
// design decision (docs/CROSS-THEME-ROADMAP-2026-10.md, item 8), not a test
// tweak; the fixme keeps the case written down and runnable.
test.fixme('200% text keeps the page within the viewport at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await openFixture(page, 'item.en', { html: (html) => html.replace('</head>', '<style>html{font-size:200%}</style></head>') });
    expect(await hasNoHorizontalScroll(page)).toBe(true);
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
