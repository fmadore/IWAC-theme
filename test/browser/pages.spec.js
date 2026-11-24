'use strict';

// Browse layouts, masonry walls, the Linked resources pager, the citation
// panel and the carousel, laid out by a real engine with the real stylesheet.

const { test, expect } = require('@playwright/test');
const { openFixture, serveFixture, hasNoHorizontalScroll } = require('./fixtures');

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

test('browse card titles are the cards\' heading: larger than the description, aligned with the tags (regression: styled through a .title that is never printed)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openFixture(page, 'items-browse.en');
    for (const view of ['grid', 'list']) {
        if (view === 'list') {
            await page.locator('[data-view="list"]').click();
            await expect(page.locator('.resources')).toHaveClass(/resource-list/);
        }
        const cards = await page.locator('.resources .resource:has(.resource__meta > .description)').evaluateAll((elements) => elements.map((card) => {
            const title = card.querySelector('.resource__meta > a');
            const description = card.querySelector('.resource__meta > .description');
            const tags = card.querySelector('.resource__content > :first-child:not(.resource__meta)');
            return {
                title: parseFloat(getComputedStyle(title).fontSize),
                description: parseFloat(getComputedStyle(description).fontSize),
                titleX: Math.round(title.getBoundingClientRect().left),
                tagsX: tags ? Math.round(tags.getBoundingClientRect().left) : null,
            };
        }));
        expect(cards.length, view).toBeGreaterThan(0);
        for (const card of cards) {
            expect(card.title, view).toBeGreaterThan(card.description);
            if (card.tagsX !== null) expect(card.titleX, view).toBe(card.tagsX);
        }
    }
});

test('browse grid cards do not overlap when the masonry script is blocked', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const served = await serveFixture(page, 'items-browse.en');
    // Registered after serveFixture's catch-all, so it wins for this file.
    await page.route('**/minimasonry.min.js', (route) => route.abort());
    await page.goto(served.url, { waitUntil: 'load' });
    const resources = page.locator('.resources');
    await expect(resources).toHaveClass(/resource-grid/);
    expect(await resources.getAttribute('data-masonry-ready')).toBeNull();
    const gridBoxes = await boxes(page, '.resources .resource');
    expect(gridBoxes.length).toBeGreaterThan(1);
    expect(overlaps(gridBoxes)).toBeNull();
    expect(new Set(gridBoxes.map((box) => Math.round(box.x))).size).toBeGreaterThan(1);
    // The list toggle still works without it, and back.
    await page.locator('[data-view="list"]').click();
    await expect(resources).toHaveClass(/resource-list/);
    expect(new Set((await boxes(page, '.resources .resource')).map((box) => Math.round(box.x))).size).toBe(1);
    await page.locator('[data-view="grid"]').click();
    await expect(resources).toHaveClass(/resource-grid/);
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

test('Linked resources: the search glyph takes the text colour in dark mode (regression: a black <img>)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ colorScheme: 'dark' });
    await openFixture(page, 'item-set.en');
    const icon = page.locator('#item-set-resources .linked-resources__search-icon');
    await expect(icon).toHaveAttribute('aria-hidden', 'true');
    const { tag, mask, ink, muted } = await icon.evaluate((element) => {
        const style = getComputedStyle(element);
        const probe = document.createElement('i');
        probe.style.color = 'var(--muted)';
        document.body.append(probe);
        return {
            tag: element.tagName,
            mask: style.maskImage || style.webkitMaskImage,
            ink: style.backgroundColor,
            muted: getComputedStyle(probe).color,
        };
    });
    expect(tag).toBe('SPAN');
    expect(mask).toContain('search.svg');
    expect(ink).toBe(muted);
});

test('Linked resources on a phone: meta lines carry no orphan dot, empty cells take no row', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openFixture(page, 'item-set.en');
    const cells = await page.locator('#item-set-resources .linked-resources-table__cell--type, #item-set-resources .linked-resources-table__cell--date')
        .evaluateAll((list) => list.map((cell) => ({
            before: getComputedStyle(cell, '::before').content,
            empty: cell.children.length === 0,
            display: getComputedStyle(cell).display,
        })));
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
        expect(cell.before).toBe('none');
        if (cell.empty) expect(cell.display).toBe('none');
    }
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

test('an autoplay tick moves the carousel track, never the page (regression: #37)', async ({ page }) => {
    // The fixture rotates every 5s; Playwright's clock fires the tick without
    // waiting it out. The smooth scroll itself still runs in real time.
    await page.clock.install();
    await page.setViewportSize({ width: 390, height: 600 });
    await openFixture(page, 'page-about.en');
    const toggle = page.locator('.carousel [data-label-play] .carousel__btn-label');
    await expect(toggle).toHaveText('Stop automatic slideshow');
    const track = page.locator('[data-carousel-track]');
    expect(await track.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    expect(await track.evaluate((element) => element.scrollLeft)).toBe(0);

    // Read past the carousel: its bottom edge above the top of the viewport.
    // The fixture ends soon after it, so give the page room to scroll.
    await page.evaluate(() => { document.body.style.paddingBottom = '200vh'; });
    const below = await track.evaluate((element) => element.getBoundingClientRect().bottom + window.scrollY + 200);
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), below);
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);
    expect(await track.evaluate((element) => element.getBoundingClientRect().bottom)).toBeLessThan(0);

    await page.clock.runFor(5000);
    await expect.poll(() => track.evaluate((element) => Math.abs(element.scrollLeft))).toBeGreaterThan(0);
    // Let the smooth scroll finish before reading the page position.
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
});

// ---- 2.33: ruled sections, prose columns, no compact band ----------------------

/** Distinct left edges of the visible lines' boxes — one per column. */
const columnLefts = (page, selector) => page.locator(selector).evaluateAll((elements) => {
    const lefts = new Set();
    for (const element of elements) {
        for (const rect of element.getClientRects()) {
            if (rect.width > 0) lefts.add(Math.round(rect.left));
        }
    }
    return [...lefts];
});

test('short prose flows into balanced columns at a wide viewport and stays one column on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openFixture(page, 'page-home.en');
    const prose = page.locator('.block-html .prose-columns');
    await expect(prose).toHaveCount(1);
    const wide = await prose.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const heading = element.querySelector('h2').getBoundingClientRect();
        const block = element.closest('.blocks-inner').getBoundingClientRect();
        return { width: box.width, height: box.height, blockWidth: block.width, headingWidth: heading.width, rule: getComputedStyle(element).columnRuleStyle };
    });
    // Two columns of the 1300px container, under a heading that spans both,
    // and the prose fills the column: no capped measure beside an empty half.
    expect(await columnLefts(page, '.prose-columns p')).toHaveLength(2);
    expect(wide.headingWidth).toBeGreaterThan(wide.width * 0.95);
    expect(wide.width).toBeGreaterThan(wide.blockWidth * 0.95);
    expect(wide.rule).toBe('solid');
    // Balanced and short: the whole story inside one laptop viewport.
    expect(wide.height).toBeLessThan(900);
    // The kicker link is never the first line of a column.
    const kicker = await page.locator('.prose-columns p:last-child:has(> a:only-child)').last().boundingBox();
    const tops = await page.locator('.prose-columns p').evaluateAll((ps) => ps.map((p) => Math.round(p.getBoundingClientRect().top)));
    expect(kicker.y).toBeGreaterThan(Math.min(...tops));

    await page.setViewportSize({ width: 390, height: 844 });
    expect(await columnLefts(page, '.prose-columns p')).toHaveLength(1);
    expect(await hasNoHorizontalScroll(page)).toBe(true);
});

test('numbered steps fill the full width in a single column', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openFixture(page, 'page-about.en');
    // The procedure block is not wrapped (helper/ProseColumns.php keeps any
    // <ol> out of columns); over-length prose is pinned in test/php/run.php.
    const steps = page.locator('.blocks-inner > .block-html').filter({ has: page.locator('ol') });
    await expect(steps).toHaveCount(1);
    await expect(steps.locator('.prose-columns')).toHaveCount(0);
    const widths = await steps.evaluate((block) => ({
        block: block.getBoundingClientRect().width,
        paragraphs: [...block.querySelectorAll('p')].map((p) => p.getBoundingClientRect().width),
    }));
    expect(widths.paragraphs.length).toBeGreaterThan(1);
    for (const width of widths.paragraphs) expect(width).toBeGreaterThan(widths.block * 0.95);
});

test('page blocks are ruled sections on one flat surface, not cards', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openFixture(page, 'page-about.en');
    const blocks = await page.locator('.blocks-inner > .block').evaluateAll((elements) => elements.map((element) => {
        const style = getComputedStyle(element);
        return {
            cls: element.className,
            ruleTop: `${style.borderTopWidth} ${style.borderTopStyle}`,
            bg: style.backgroundColor,
            shadow: style.boxShadow,
            radius: style.borderTopLeftRadius,
            paddingInline: style.paddingLeft,
        };
    }));
    for (const block of blocks) {
        expect(block.bg, block.cls).toBe('rgba(0, 0, 0, 0)');
        expect(block.shadow, block.cls).toBe('none');
        expect(block.radius, block.cls).toBe('0px');
        expect(block.paddingInline, block.cls).toBe('0px');
    }
    // The title opens the page (as the plate here); the section under it
    // does not open on a rule against it; every later section opens on the
    // 2px ink rule.
    expect(blocks[1].ruleTop).toBe('0px none');
    expect(blocks[2].ruleTop).toBe('2px solid');
    // One flat --surface: the body paints it, nothing between it and the blocks.
    const ground = await page.evaluate(() => {
        const probe = document.createElement('i');
        probe.style.color = 'var(--surface)';
        document.body.append(probe);
        return {
            body: getComputedStyle(document.body).backgroundColor,
            surface: getComputedStyle(probe).color,
            main: getComputedStyle(document.querySelector('#content')).backgroundColor,
        };
    });
    expect(ground.body).toBe(ground.surface);
    expect(ground.main).toBe('rgba(0, 0, 0, 0)');
});

test('a carousel further down a page opens on one rule, not two (regression: section rule + its own)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openFixture(page, 'page-about.en');
    const rules = await page.locator('.blocks-inner > .block-carousel:not(:first-child)').evaluateAll((elements) => elements.map((block) => ({
        block: getComputedStyle(block).borderTopWidth,
        carousel: getComputedStyle(block.querySelector(':scope > .carousel')).borderTopWidth,
    })));
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
        expect(rule.block).toBe('2px');
        expect(rule.carousel).toBe('0px');
    }
    // The space under an asset block is the block's alone.
    const assetMargins = await page.locator('.block-asset > .assets').evaluateAll((elements) => elements.map((element) => getComputedStyle(element).marginBottom));
    expect(assetMargins.length).toBeGreaterThan(0);
    for (const margin of assetMargins) expect(margin).toBe('0px');
});

test('inner pages open on the breadcrumb under the masthead; the hero is the homepage\'s alone', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openFixture(page, 'item.en');
    await expect(page.locator('.banner')).toHaveCount(0);
    const gap = await page.evaluate(() => document.querySelector('#content .breadcrumbs').getBoundingClientRect().top
        - document.querySelector('.main-header').getBoundingClientRect().bottom);
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThan(80);

    await openFixture(page, 'page-home.en');
    const hero = await page.locator('.banner').evaluate((banner) => ({
        screen: getComputedStyle(banner.querySelector('.banner__media'), '::after').backgroundImage,
        blend: getComputedStyle(banner.querySelector('.banner__media'), '::after').mixBlendMode,
        searchRadius: getComputedStyle(banner.querySelector('.banner__search form')).borderTopLeftRadius,
    }));
    expect(hero.screen).toContain('radial-gradient');
    expect(hero.blend).toBe('multiply');
    expect(hero.searchRadius).toBe('0px');
});

// ---- The plate page head of section pages -------------------------------------

/**
 * Classic scrollbars. Headless engines draw overlay scrollbars, which take no
 * width, so a band sized in vw cannot overflow in them; WebKit honours a
 * styled scrollbar and draws a 15px one, which is how a desktop visitor on
 * Windows sees the page — and where `100vw` is wider than the page.
 */
const classicScrollbars = { html: (html) => html.replace('</head>', '<style>::-webkit-scrollbar{width:15px;height:15px;background:#ccc}</style></head>') };

/** No sideways scroll, measured against the width the page can use (scrollbar excluded). */
const fitsWithoutSidewaysScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

const plateGeometry = (page) => page.evaluate(() => {
    const head = document.querySelector('.page-head');
    const box = head.getBoundingClientRect();
    const title = head.querySelector('h1');
    const grid = document.querySelector('.blocks-inner').getBoundingClientRect();
    const image = getComputedStyle(head, '::before');
    return {
        top: box.top,
        left: box.left,
        width: box.width,
        height: box.height,
        page: document.documentElement.clientWidth,
        masthead: document.querySelector('.main-header').getBoundingClientRect().bottom,
        titleLeft: title.getBoundingClientRect().left,
        contentLeft: grid.left,
        titleSize: parseFloat(getComputedStyle(title).fontSize),
        titleColour: getComputedStyle(title).color,
        titleRule: getComputedStyle(title).borderTopStyle,
        image: image.content === 'none' ? 'none' : image.backgroundImage,
        screen: getComputedStyle(head, '::after').backgroundImage,
    };
});

test('a section page opens on the plate: flush under the masthead, edge to edge, title on the content edge', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openFixture(page, 'page-about.en');
    await expect(page.locator('.page-head')).toHaveCount(1);
    await expect(page.locator('.blocks-inner > .block-pageTitle:first-child > header.page-head > h1.title')).toHaveText('About');
    const plate = await plateGeometry(page);
    expect(Math.abs(plate.top - plate.masthead)).toBeLessThan(1);
    expect(plate.left).toBe(0);
    expect(Math.abs(plate.width - plate.page)).toBeLessThan(1);
    expect(Math.abs(plate.titleLeft - plate.contentLeft)).toBeLessThan(1);
    // A band, not a hero: ~160px with a one-line title at this width, and a
    // display title one step under the hero's.
    expect(plate.height).toBeGreaterThan(120);
    expect(plate.height).toBeLessThan(200);
    expect(plate.titleSize).toBeGreaterThan(48);
    expect(plate.titleColour).toBe('rgb(255, 255, 255)');
    expect(plate.titleRule).toBe('none');
    expect(plate.image).toContain('banner-1400.webp');
    expect(plate.screen).toContain('radial-gradient');

    // The homepage keeps its hero and gets no plate.
    await openFixture(page, 'page-home.en');
    await expect(page.locator('.page-head')).toHaveCount(0);
    await expect(page.locator('.banner')).toHaveCount(1);
});

test('the plate prints no image below $md: a phone downloads nothing for it', async ({ page }) => {
    const images = [];
    page.on('request', (request) => {
        if (/\/asset\/img\/banner/.test(request.url())) images.push(request.url());
    });
    for (const width of [390, 767]) {
        await page.setViewportSize({ width, height: 844 });
        await openFixture(page, 'page-overview.fr');
        const plate = await plateGeometry(page);
        expect(plate.image, `${width}px`).toBe('none');
        expect(plate.screen, `${width}px: the halftone stays`).toContain('radial-gradient');
        expect(Math.abs(plate.top - plate.masthead)).toBeLessThan(1);
    }
    expect(images).toEqual([]);

    await page.setViewportSize({ width: 768, height: 900 });
    await openFixture(page, 'page-overview.fr');
    expect((await plateGeometry(page)).image).toContain('banner-1024.webp');
});

for (const width of [360, 768, 1280, 1920]) {
    test(`the full-bleed plate adds no sideways scroll at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        for (const name of ['page-overview.fr', 'page-exhibit.en']) {
            await openFixture(page, name, classicScrollbars);
            expect(await fitsWithoutSidewaysScroll(page), name).toBe(true);
            const plate = await plateGeometry(page);
            // Edge to edge of the page the visitor sees (the band's box is
            // wider by the scrollbar; the body clips it).
            expect(plate.width, `${name}: edge to edge`).toBeGreaterThanOrEqual(plate.page - 1);
            // The long French title wraps inside the page.
            const title = await page.locator('.page-head h1').boundingBox();
            expect(title.x + title.width, name).toBeLessThanOrEqual(plate.page + 1);
        }
    });
}

test('the masthead still sticks over a plate page (the clip makes no scroll container)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    await openFixture(page, 'page-exhibit.en');
    expect(await page.evaluate(() => getComputedStyle(document.body).overflowX)).toBe('clip');
    await page.evaluate(() => window.scrollTo(0, 900));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
    // Sticky: still at the top of the viewport (the nav strip may slide up
    // under it), not scrolled away with the page.
    const header = await page.evaluate(() => document.querySelector('.main-header').getBoundingClientRect());
    expect(header.bottom).toBeGreaterThan(0);
});

test('a child page carries its breadcrumb inside the plate, above the title, in white', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openFixture(page, 'page-exhibit.en');
    // One trail, inside the plate: none stranded between masthead and band.
    await expect(page.locator('nav.breadcrumbs')).toHaveCount(1);
    const crumbs = page.locator('.page-head > nav.breadcrumbs');
    await expect(crumbs).toHaveAttribute('aria-label', 'Breadcrumb');
    await expect(crumbs.locator('a')).toHaveText(['Exhibits']);
    await expect(crumbs.locator('[aria-current="page"]')).toHaveText('Hajj in Burkina Faso');
    const layout = await page.evaluate(() => {
        const head = document.querySelector('.page-head');
        const nav = head.querySelector('.breadcrumbs').getBoundingClientRect();
        return {
            navTop: nav.top,
            navBottom: nav.bottom,
            titleTop: head.querySelector('h1').getBoundingClientRect().top,
            plateTop: head.getBoundingClientRect().top,
        };
    });
    expect(layout.navBottom).toBeLessThanOrEqual(layout.titleTop);
    expect(layout.navTop).toBeGreaterThan(layout.plateTop);

    // The focus ring is white on the plate, where the primary ring would vanish.
    // (WebKit's Tab skips links unless the OS setting says otherwise, so the
    // ring is asked for by a key press, then focus.)
    const link = crumbs.locator('a');
    await page.keyboard.press('Shift');
    await link.focus();
    await expect(link).toBeFocused();
    const ring = await link.evaluate((element) => {
        const style = getComputedStyle(element);
        return { style: style.outlineStyle, colour: style.outlineColor };
    });
    expect(ring.style).toBe('solid');
    expect(ring.colour).toBe('rgb(255, 255, 255)');
});

test('forced colours: the plate drops its layers and the title and crumbs keep system colours', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'forced-colors emulation is Chromium-only');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ forcedColors: 'active' });
    await openFixture(page, 'page-exhibit.en');
    const plate = await page.evaluate(() => {
        const head = document.querySelector('.page-head');
        return {
            image: getComputedStyle(head, '::before').display,
            screen: getComputedStyle(head, '::after').display,
            title: getComputedStyle(head.querySelector('h1')).color,
            canvas: getComputedStyle(document.body).backgroundColor,
            ground: getComputedStyle(head).backgroundColor,
        };
    });
    expect(plate.image).toBe('none');
    expect(plate.screen).toBe('none');
    expect(plate.ground).toBe(plate.canvas);
    expect(plate.title).not.toBe(plate.canvas);
});

test('print: the plate prints as ink, with no blue band', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openFixture(page, 'page-exhibit.en');
    await page.emulateMedia({ media: 'print' });
    const plate = await page.evaluate(() => {
        const head = document.querySelector('.page-head');
        const style = getComputedStyle(head);
        return {
            ground: style.backgroundColor,
            layers: style.backgroundImage,
            screen: getComputedStyle(head, '::after').display,
            title: getComputedStyle(head.querySelector('h1')).color,
        };
    });
    expect(plate.ground).toBe('rgba(0, 0, 0, 0)');
    expect(plate.layers).toBe('none');
    expect(plate.screen).toBe('none');
    expect(plate.title).not.toBe('rgb(255, 255, 255)');
});

test('print: a record breaks between rows, internal links print no address, the light set applies from dark mode', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ media: 'print', colorScheme: 'dark' });
    await openFixture(page, 'item-set.en');
    const sheet = await page.evaluate(() => {
        const css = (element, property, pseudo) => getComputedStyle(element, pseudo).getPropertyValue(property);
        const main = document.querySelector('main');
        const internal = [...main.querySelectorAll('a[href^="/"]')][0];
        const table = main.querySelector('.linked-resources-table');
        const probe = document.createElement('i');
        probe.style.color = 'var(--panel-bg)';
        document.body.append(probe);
        const context = document.createElement('canvas').getContext('2d');
        context.fillStyle = getComputedStyle(probe).color;
        context.fillRect(0, 0, 1, 1);
        return {
            internalAfter: css(internal, 'content', '::after'),
            tableBreak: css(table, 'break-inside'),
            rowBreak: css(table.querySelector('tbody tr'), 'break-inside'),
            controls: [...document.querySelectorAll('.linked-resources__controls')].map((el) => css(el, 'display')),
            panel: [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)],
        };
    });
    expect(sheet.internalAfter).toBe('none');
    expect(sheet.tableBreak).toBe('auto');
    expect(sheet.rowBreak).toBe('avoid');
    expect(sheet.controls.length).toBeGreaterThan(0);
    expect(new Set(sheet.controls)).toEqual(new Set(['none']));
    // --panel-bg composes --surface: on paper it is the light ground, not the lamplit one.
    expect(Math.min(...sheet.panel), `panel ground rgb(${sheet.panel})`).toBeGreaterThan(240);
});

test('print: item metadata rows stay whole while the sheet may break, and the annotation buttons are gone', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ media: 'print' });
    await openFixture(page, 'item.en');
    const sheet = await page.evaluate(() => {
        const property = document.querySelector('main dl > .property');
        return {
            dl: getComputedStyle(property.parentElement).breakInside,
            property: getComputedStyle(property).breakInside,
            buttons: [...document.querySelectorAll('.annotation-btn')].map((el) => getComputedStyle(el).display),
            external: getComputedStyle(document.querySelector('main a[href^="https://"]:not([aria-hidden="true"]):not(.citation__text a)'), '::after').content,
            // The citation prints its URL as the link text already.
            cited: getComputedStyle(document.querySelector('.citation__text a[href^="https://"]'), '::after').content,
        };
    });
    expect(sheet.dl).toBe('auto');
    expect(sheet.property).toBe('avoid');
    expect(sheet.buttons.length).toBeGreaterThan(0);
    expect(new Set(sheet.buttons)).toEqual(new Set(['none']));
    expect(sheet.external).toContain('https://');
    expect(sheet.cited).toBe('none');
});

test('the hero ground stays a deep seed blue in dark mode, never the re-lit dark primary', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    for (const theme of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme: theme });
        await openFixture(page, 'page-home.en');
        const [ground, primary] = await page.evaluate(() => {
            const probe = document.createElement('i');
            document.body.append(probe);
            const rgb = (value) => { probe.style.color = value; return getComputedStyle(probe).color; };
            return [getComputedStyle(document.querySelector('.banner')).backgroundColor, rgb('var(--primary)')];
        });
        // A ground white type reads on: dark enough in both themes.
        const luminance = await page.evaluate((colour) => {
            const c = document.createElement('canvas').getContext('2d');
            c.fillStyle = colour; c.fillRect(0, 0, 1, 1);
            const [r, g, b] = c.getImageData(0, 0, 1, 1).data;
            const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
            return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        }, ground);
        expect(1.05 / (luminance + 0.05), `${theme}: white on the hero ground`).toBeGreaterThan(4.5);
        if (theme === 'dark') expect(ground).not.toBe(primary);
    }
});
