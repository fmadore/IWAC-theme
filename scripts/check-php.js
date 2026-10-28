#!/usr/bin/env node
/**
 * The PHP half of `npm run verify` — the same checks CI's PHP job runs.
 *
 *     node scripts/check-php.js            (also: npm run check:php)
 *     node scripts/check-php.js --require  fail when no PHP is on PATH (CI)
 *
 *   1. `php -l` over every template and helper (view/, helper/)
 *   2. config/theme.ini parses the way Omeka parses it (INI_SCANNER_RAW)
 *   3. the helper and template tests (test/php/run.php — `npm run test:php`)
 *   4. the rendered fixtures match a fresh render (`npm run check:fixtures`)
 *
 * WHY THE SKIP. A contributor's machine may have no PHP at all, and the Node
 * half of the contract is still worth running there. So without a `php` on
 * PATH this prints how to get one and exits 0 — loudly, never silently. CI
 * passes `--require`, which turns the same absence into a failure, so a syntax
 * error still cannot reach a release. That asymmetry is deliberate (it is
 * DRE-theme's scripts/check-php.mjs, minus the Docker runner).
 *
 * IWAC_SKIP_PHP=1 skips it outright unless --require is given. Only the
 * Quality workflow's frontend job sets it: the runner image ships an older PHP
 * than the theme's floor, and the PHP matrix job runs this with --require on
 * both supported versions.
 *
 * Plain Node, no dependencies, so the PHP job can run it without `npm ci`.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const REQUIRE = process.argv.includes('--require');

if (process.env.IWAC_SKIP_PHP && !REQUIRE) {
    console.log('PHP checks: SKIPPED (IWAC_SKIP_PHP is set; the PHP job runs them with --require).');
    process.exit(0);
}

const probe = spawnSync('php', ['-v'], { encoding: 'utf8' });
if (probe.error || probe.status !== 0) {
    const message = [
        `PHP checks: no php on PATH — ${REQUIRE ? 'REQUIRED but not found.' : 'SKIPPED.'}`,
        '',
        '  Get one (the theme needs PHP 8.4 or later):',
        '    winget install PHP.PHP.8.5            # Windows, then reopen the shell',
        '    brew install php                      # macOS',
        '    sudo apt install php-cli              # Debian/Ubuntu (8.4+)',
        '',
        '  CI runs these with --require, so a PHP failure still cannot reach a release.',
    ].join('\n');
    if (REQUIRE) {
        console.error(message);
        process.exit(1);
    }
    console.log(message);
    process.exit(0);
}
console.log(`PHP checks: using ${probe.stdout.split('\n')[0].trim()}`);

function walk(directory, out = []) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(target, out);
        else if (/\.(php|phtml)$/.test(entry.name)) out.push(target);
    }
    return out;
}

function step(label, argv) {
    const result = spawnSync('php', argv, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (result.status !== 0) {
        process.stdout.write(result.stdout || '');
        process.stderr.write(result.stderr || '');
        console.error(`\n✗ ${label}`);
        process.exit(result.status || 1);
    }
    return result.stdout || '';
}

// 1. Syntax. One `php -l` per file: PHP 8.3+ accepts several files per call,
// but reports them less legibly, and ~200 spawns cost a few seconds.
const files = ['view', 'helper'].flatMap((dir) => walk(path.join(ROOT, dir))).sort();
const syntaxErrors = [];
for (const file of files) {
    const result = spawnSync('php', ['-l', file], { encoding: 'utf8' });
    if (result.status !== 0) {
        syntaxErrors.push(`${path.relative(ROOT, file).split(path.sep).join('/')}\n      `
            + `${(result.stderr || '') + (result.stdout || '')}`.trim().split('\n')
                .filter((line) => line.trim() && !line.startsWith('No syntax errors')).join('\n      '));
    }
}
if (syntaxErrors.length) {
    console.error(`✗ PHP syntax: ${syntaxErrors.length} file(s) failed to parse\n`);
    for (const error of syntaxErrors) console.error(`  ${error}`);
    process.exit(1);
}
console.log(`✓ PHP syntax (${files.length} templates and helpers)`);

// 2. theme.ini, parsed as Omeka parses it.
step('config/theme.ini does not parse', ['-r',
    'exit(false === parse_ini_file("config/theme.ini", true, INI_SCANNER_RAW) ? 1 : 0);']);
console.log('✓ config/theme.ini parses');

// 3. + 4. Behaviour, and the committed fixtures the JS suite runs on.
process.stdout.write(step('PHP tests failed (npm run test:php)', ['test/php/run.php']).split('\n').filter((line) => !line.startsWith('ok - ')).join('\n'));
process.stdout.write(step('rendered fixtures are stale — run `npm run build:fixtures` and commit the diff',
    ['test/php/render-fixtures.php', '--check']));
