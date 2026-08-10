'use strict';

const { defineConfig } = require('@playwright/test');

// Omeka serves the site under /s/<slug>/, so the base URL needs its trailing
// slash: without it `new URL()` drops the slug and every goto() lands on the
// bare host, where none of the theme's markup exists.
const siteUrl = process.env.IWAC_LIVE_BASE_URL || 'https://islam.zmo.de/s/westafrica';

module.exports = defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    expect: { timeout: 8_000 },
    retries: 1,
    reporter: 'list',
    use: {
        baseURL: siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`,
        browserName: 'chromium',
        locale: 'en-GB',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
});
