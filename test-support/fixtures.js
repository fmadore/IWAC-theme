'use strict';

/**
 * Pages rendered from the real templates, for the DOM tests to run against.
 *
 * test/php/render-fixtures.php renders layout.phtml around the theme's content
 * templates into test/fixtures/rendered/ (`npm run build:fixtures`), and
 * `npm run check:fixtures` fails when a committed file no longer matches a
 * fresh render. So a test that loads a fixture is testing the markup the
 * templates actually produce: rename a data-* hook in a .phtml and the
 * fixture changes with it, and the script that still looks for the old name
 * fails here instead of on the live site.
 *
 * Each fixture is a whole page — header, drawer, footer, PWA island and all —
 * opened at the URL it was rendered for (manifest.json), on a test origin.
 */

const fs = require('node:fs');
const path = require('node:path');
const { createDom } = require('./dom');

const DIR = path.join(__dirname, '..', 'test', 'fixtures', 'rendered');
const ORIGIN = 'https://example.test';

let manifest = null;

function entry(name) {
    manifest = manifest || JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8'));
    if (!manifest[name]) {
        throw new Error(`No rendered fixture "${name}" — fixtures are listed in test/php/render-fixtures.php`);
    }
    return manifest[name];
}

/** The fixture's HTML, as committed. */
function fixtureHtml(name) {
    entry(name);
    return fs.readFileSync(path.join(DIR, `${name}.html`), 'utf8');
}

/** The absolute URL the page was rendered for. */
function fixtureUrl(name) {
    return ORIGIN + entry(name).url;
}

/** A jsdom window on the rendered page, at its own URL. */
function fixtureDom(name) {
    return createDom(fixtureHtml(name), fixtureUrl(name));
}

module.exports = { fixtureDom, fixtureHtml, fixtureUrl };
