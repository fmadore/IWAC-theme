#!/usr/bin/env node
/**
 * Run the behaviour suite — `npm test`, or `npm test -- --minified` via
 * `npm run test:minified` to run every DOM test against asset/js/dist/*.min.js
 * (see test-support/dom.js). One list of test files, discovered rather than
 * restated: the old `npm test` line named each file, so a new test file was
 * silently skipped until someone remembered to add it there too.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const files = fs.readdirSync(path.join(ROOT, 'test'))
    .filter((f) => f.endsWith('.test.js'))
    .sort()
    .map((f) => path.join('test', f));

const env = { ...process.env };
if (process.argv.includes('--minified')) env.IWAC_TEST_MINIFIED = '1';

const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...files], {
    cwd: ROOT,
    stdio: 'inherit',
    env,
});
process.exit(result.status === null ? 1 : result.status);
