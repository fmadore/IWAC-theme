'use strict';

const { defineConfig } = require('@playwright/test');

// The local browser suite (`npm run test:browser`, docs/TESTING.md): the
// rendered fixture pages and the theme's committed CSS/JS on a routed origin
// (test/browser/fixtures.js), in Chromium, Firefox and WebKit. No Omeka, no
// database, no network — unlike playwright.config.js, which drives the live
// sites after a release.
//
// IWAC_BROWSER_CHANNEL=msedge (or chrome) runs the Chromium project on an
// installed browser instead of Playwright's build — handy on Windows.

const channel = process.env.IWAC_BROWSER_CHANNEL;

module.exports = defineConfig({
    testDir: './test/browser',
    testMatch: '**/*.spec.js',
    fullyParallel: true,
    workers: process.env.CI ? 2 : 3,
    timeout: 30_000,
    expect: { timeout: 5_000 },
    retries: process.env.CI ? 1 : 0,
    outputDir: 'test-results/local',
    reporter: process.env.CI ? [['list'], ['github']] : 'list',
    use: {
        headless: true,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: ['chromium', 'firefox', 'webkit'].map((browserName) => ({
        name: browserName,
        use: { browserName, ...(browserName === 'chromium' && channel ? { channel } : {}) },
    })),
});
