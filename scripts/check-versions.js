#!/usr/bin/env node
'use strict';

// Asserts that every version declaration agrees — and, given an argument, that
// they agree with it (the release workflow passes the tag).
//
//     node scripts/check-versions.js          # the declarations agree
//     node scripts/check-versions.js 2.14.2   # ...and are this version
//
// Run on every push by .github/workflows/build.yml, so drift is caught on the
// commit that introduces it rather than at the next release — or, as with
// package-lock.json, four releases later.

const { readAll, readReleaseDate } = require('./lib/versions');

const expected = process.argv[2] ? process.argv[2].replace(/^v/, '') : null;
const declarations = readAll();
const problems = [];

const missing = declarations.filter((declaration) => declaration.version === null);
for (const declaration of missing) {
    problems.push(`${declaration.label}: no version declaration found — the pattern in scripts/lib/versions.js no longer matches`);
}

const found = declarations.filter((declaration) => declaration.version !== null);
const reference = expected ?? found[0]?.version;

for (const declaration of found) {
    if (declaration.version !== reference) {
        problems.push(`${declaration.label}: ${declaration.version} (expected ${reference})`);
    }
}

const date = readReleaseDate();
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) {
    problems.push(`CITATION.cff: date-released is "${date}", not an ISO date`);
}

if (problems.length) {
    console.error(`✗ version declarations disagree${expected ? ` with tag ${expected}` : ''}:\n`);
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error('\n  Fix with:  npm run bump -- <version>');
    process.exit(1);
}

const suffix = expected ? ` (matches tag v${expected})` : '';
console.log(`✓ version declarations agree: ${reference}${suffix} — ${declarations.length} sites, released ${date}`);
