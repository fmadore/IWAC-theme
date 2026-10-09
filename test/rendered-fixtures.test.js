'use strict';

// The DOM tests load pages rendered from the templates and committed under
// test/fixtures/rendered/. A template edit without `npm run build:fixtures`
// leaves them testing yesterday's markup — so the suite refuses to run green
// on a stale set, the way i18n.test.js refuses a stale catalogue.
//
// Rendering needs PHP. Without a `php` on PATH this test is skipped, never
// passed: CI's PHP job runs the same check (`npm run check:fixtures`) on both
// ends of the supported PHP range regardless.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

test('rendered fixtures match a fresh render of the templates', (t) => {
    const check = spawnSync('php', ['test/php/render-fixtures.php', '--check'], { cwd: ROOT, encoding: 'utf8' });
    if (check.error && check.error.code === 'ENOENT') {
        t.skip('no php on PATH — run `npm run check:fixtures` where there is one');
        return;
    }
    assert.equal(check.status, 0, check.stdout + check.stderr);
});
