'use strict';

// Browse layouts, masonry walls, the Linked resources pager, the citation
// panel and the carousel, laid out by a real engine with the real stylesheet.

const { test, expect } = require('@playwright/test');
const { openFixture, hasNoHorizontalScroll } = require('./fixtures');

/** Boxes of the visible elements matching `selector`. */
function boxes(page, selector) {
    return page.locator(selector).evaluateAll((elements) => elements
        .map((element) => element.getBoundingClientRect())
        .filter((rect) => rect.width > 0 && rect.height > 0)
        .map(({ x, y, width, height }) => ({ x, y, width, height })));
}

function overlaps(list) {
    for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
            const a = list[i];
            const b = list[j];
            if (a.x + 1 < b.x + b.width && b.x + 1 < a.x + a.width && a.y + 1 < b.y + b.height && b.y + 1 < a.y + a.height) {
                return [a, b];
            }
        }
    }
    return null;
}

test('browse: the grid is packed without overlaps, the list toggle swaps layouts in place', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openFixture(page, 'items-browse.en');
    const cards = '.resources .resource';
    const grid = page.locator('[data-view="grid"]');
    const list = page.locator('[data-view="list"]');
    await expect(grid).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.resources')).toHaveClass(/resource-grid/);

    const gridBoxes = await boxes(page, cards);
    expect(gridBoxes.length).toBeGreaterThan(1);
    expect(overlaps(gridBoxes)).toBeNull();
    // More than one column: masonry (or the CSS-columns fallback) is laid out.
    expect(new Set(gridBoxes.map((box) => Math.round(box.x))).size).toBeGreaterThan(1);

    const historyLength = await page.evaluate(() => history.length);
    await list.focus();
    await page.keyboard.press('Enter');
    await expect(list).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.resources')).toHaveClass(/resource-list/);
    await expect(list).toBeFocused();
    expect(new URL(page.url()).searchParams.get('view')).toBe('list');
    expect(await page.evaluate(() => history.length)).toBe(historyLength);
    const listBoxes = await boxes(page, cards);
    expect(overlaps(listBoxes)).toBeNull();
    // One column: every card starts at the same x.
    expect(new Set(listBoxes.map((box) => Math.round(box.x))).size).toBe(1);

    await grid.click();
    await expect(page.locator('.resources')).toHaveClass(/resource-grid/);
    expect(overlaps(await boxes(page, cards))).toBeNull();
});

test('browse fits a phone without horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await openFixture(page, 'items-browse.en');
    expect(await hasNoHorizontalScroll(page)).toBe(true);
    expect(overlaps(await boxes(page, '.resources .resource'))).toBeNull();
});

test('a masonry Media block fills its row in several columns (regression: 2.27.1 one-column strip)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openFixture(page, 'page-exhibit.en');
    const walls = page.locator('.layout-masonry');
    expect(await walls.count()).toBeGreaterThan(0);
    for (let i = 0; i < await walls.count(); i++) {
        const wall = walls.nth(i);
        const cardBoxes = await wall.locator(':scope > *').evaluateAll((elements) => elements
            .map((element) => element.getBoundingClientRect())
            .filter((rect) => rect.width > 0)
            .map(({ x, y, width, height }) => ({ x, y, width, height })));
        expect(overlaps(cardBoxes)).toBeNull();
        if (cardBoxes.length > 1) {
            expect(new Set(cardBoxes.map((box) => Math.round(box.x))).size).toBeGreaterThan(1);
        }
    }
});

test('Linked resources: an AJAX page turn keeps keyboard focus in the listing and updates the address', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openFixture(page, 'item-set.en');
    const ledger = page.locator('#item-set-resources');
    const rows = () => ledger.locator('.linked-resources-table tbody tr').evaluateAll((trs) => trs.map((tr) => tr.dataset.title));
    const before = await rows();
    // A full load would drop this; a same-document swap keeps it.
    await page.evaluate(() => { window.__sameDocument = true; });
    const sameDocument = () => page.evaluate(() => window.__sameDocument === true);

    const next = ledger.locator('.linked-footer a.pagination-nav.next');
    await next.focus();
    await page.keyboard.press('Enter');
    await expect.poll(rows).not.toEqual(before);

    // No reload: the swap happened in place, and the address names page 2.
    expect(await sameDocument()).toBe(true);
    expect(new URL(page.url()).searchParams.get('page')).toBe('2');
    // The activated link was replaced; focus resumes inside the same listing,
    // not on <body> at the top of the page.
    expect(await page.evaluate(() => {
        const root = document.getElementById('item-set-resources');
        return root.contains(document.activeElement) || root === document.activeElement;
    })).toBe(true);
    await expect(page.locator('#item-set-resources')).not.toHaveAttribute('aria-busy', 'true');

    // Back restores the first page without a reload.
    await page.goBack();
    await expect.poll(rows).toEqual(before);
    expect(await sameDocument()).toBe(true);
});

test('the citation panel: arrow keys move between styles, Copy reports its result', async ({ page, browserName }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openFixture(page, 'item.en');
    // IWAC-SEO enqueues citation.js on the live site; the fixture page does not.
    await page.addScriptTag({ url: '/themes/IWAC-theme/asset/js/dist/citation.min.js' });
    await page.evaluate(() => document.dispatchEvent(new Event('DOMContentLoaded')));

    const panel = page.locator('.citation');
    const tabs = panel.getByRole('tab');
    expect(await tabs.count()).toBeGreaterThan(1);
    const first = tabs.nth(0);
    const second = tabs.nth(1);
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await first.focus();
    await page.keyboard.press('ArrowRight');
    await expect(second).toHaveAttribute('aria-selected', 'true');
    await expect(second).toBeFocused();
    await expect(panel.locator('[data-citation-panel]:visible')).toHaveCount(1);
    await expect(panel.locator(`[data-citation-panel="${await second.getAttribute('data-citation-style')}"]`)).toBeVisible();

    if (browserName === 'chromium') {
        await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    }
    await panel.getByRole('button', { name: /Copy/ }).click();
    // Copied, or — where the clipboard is refused — the citation selected
    // with instructions. Either way the reader is told.
    await expect(panel.locator('.citation__status')).not.toHaveText('');
});

test('the carousel does not rotate on its own under reduced motion', async ({ browser }) => {
    for (const reducedMotion of ['reduce', 'no-preference']) {
        const context = await browser.newContext({ reducedMotion, viewport: { width: 390, height: 844 } });
        const page = await context.newPage();
        await openFixture(page, 'page-about.en');
        const toggle = page.locator('.carousel [data-label-play]');
        await expect(toggle).toBeVisible();
        const label = toggle.locator('.carousel__btn-label');
        if (reducedMotion === 'reduce') {
            await expect(label).toHaveText('Start automatic slideshow');
        } else {
            await expect(label).toHaveText('Stop automatic slideshow');
        }
        await context.close();
    }
});
