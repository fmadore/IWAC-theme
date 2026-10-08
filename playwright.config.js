'use strict';

const { defineConfig } = require('@playwright/test');

// Omeka serves the site under /s/<slug>/, so the base URL needs its trailing
// slash: without it `new URL()` drops the slug and every goto() lands on the
// bare host, where none of the theme's markup exists.
function siteBase(url) {
    return url.endsWith('/') ? url : `${url}/`;
}

const englishSite = process.env.IWAC_LIVE_BASE_URL || 'https://islam.zmo.de/s/westafrica';
const frenchSite = process.env.IWAC_LIVE_FR_BASE_URL || 'https://islam.zmo.de/s/afrique_ouest';

module.exports = defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    expect: { timeout: 8_000 },
    retries: 1,
    reporter: 'list',
    use: {
        browserName: 'chromium',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    // Both sites, because they are not the same pages: the French one has its
    // own slugs, its own translated strings (which lay out at different
    // widths), and its own module configuration. `metadata` carries what the
    // specs need to know about each — e2e/live.spec.js reads it.
    projects: [
        {
            name: 'en',
            use: { baseURL: siteBase(englishSite), locale: 'en-GB' },
            metadata: { lang: 'en', home: 'page/home', browse: 'page/browse' },
        },
        {
            name: 'fr',
            use: { baseURL: siteBase(frenchSite), locale: 'fr-FR' },
            metadata: { lang: 'fr', home: 'page/accueil', browse: 'page/parcourir' },
        },
    ],
});
