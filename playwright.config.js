'use strict';

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    expect: { timeout: 8_000 },
    retries: 1,
    reporter: 'list',
    use: {
        baseURL: process.env.IWAC_LIVE_BASE_URL || 'https://islam.zmo.de/s/westafrica',
        browserName: 'chromium',
        locale: 'en-GB',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
});
