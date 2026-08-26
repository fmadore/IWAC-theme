#!/usr/bin/env node
'use strict';

// Writes every version declaration at once, and stamps CITATION.cff's release
// date. This is the only supported way to bump the theme.
//
//     npm run bump -- patch          # 2.14.1 -> 2.14.2
//     npm run bump -- minor          # 2.14.1 -> 2.15.0
//     npm run bump -- 2.15.0         # explicit
//     npm run bump -- patch --date 2026-09-01
//
// package.json and package-lock.json are handed to `npm version`, which does
// the semver arithmetic and keeps the lockfile's two copies in step; whatever
// it resolves is then propagated to the other three declarations. So the
// increment keywords work without this script parsing semver at all.

const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const { ROOT, readAll, writeOwned, writeReleaseDate } = require('./lib/versions');

/**
 * Today, local time, as YYYY-MM-DD. Assembled from the parts rather than
 * through toLocaleDateString, whose output depends on the host's locale data.
 */
function today() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const args = process.argv.slice(2);
const dateIndex = args.indexOf('--date');
const date = dateIndex === -1 ? today() : args[dateIndex + 1];
const spec = (dateIndex === -1 ? args : args.filter((_, index) => index !== dateIndex && index !== dateIndex + 1))[0];

if (!spec) {
    console.error('usage: npm run bump -- <version|patch|minor|major> [--date YYYY-MM-DD]');
    process.exit(1);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error(`--date must be an ISO date, got "${date}"`);
    process.exit(1);
}

/**
 * Run npm from this process's own npm when there is one (an `npm run bump`
 * parent sets npm_execpath), so the bump can't silently use a different npm
 * than the one that wrote the lockfile.
 */
function npm(argv) {
    const execpath = process.env.npm_execpath;
    const viaNode = execpath && execpath.endsWith('.js');
    const result = viaNode
        ? spawnSync(process.execPath, [execpath, ...argv], { cwd: ROOT, stdio: 'inherit' })
        : spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', argv, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
    if (result.status !== 0) process.exit(result.status || 1);
}

// npm resolves the spec and writes package.json + both lockfile copies.
npm(['version', spec, '--no-git-tag-version', '--allow-same-version']);

const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const written = writeOwned(version);
writeReleaseDate(date);

console.log(`\n✓ bumped to ${version}, released ${date}`);
for (const { label, version: value } of readAll()) {
    console.log(`  ${value === version ? '✓' : '✗'} ${label.padEnd(30)} ${value}`);
}
console.log(`\n  written here: ${written.join(', ')}; package.json and package-lock.json by npm version.`);
console.log('  Next: npm run build && git commit && git tag v' + version);
