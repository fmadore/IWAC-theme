#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const files = [
    path.join(ROOT, 'gulpfile.js'),
    path.join(ROOT, 'playwright.config.js'),
];

function collect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) collect(target);
        else if (entry.name.endsWith('.js')) files.push(target);
    }
}

collect(path.join(ROOT, 'scripts'));
collect(path.join(ROOT, 'asset', 'js'));
collect(path.join(ROOT, 'test'));
collect(path.join(ROOT, 'test-support'));
collect(path.join(ROOT, 'e2e'));

for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status || 1);
}

console.log(`✓ JavaScript syntax (${files.length} files)`);
