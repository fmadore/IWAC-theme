#!/usr/bin/env node
'use strict';

// Print one version's notes from CHANGELOG.md.
//
//     node scripts/changelog-section.js 2.31.0
//
// release.yml writes the notes of a release it has to create from this.
// Exit code 1 when the version has no section, or an empty one, so the
// workflow can fall back to generated notes with a warning.

const fs = require('node:fs');
const path = require('node:path');
const { changelogSection } = require('./lib/changelog');

const version = process.argv[2]?.replace(/^v/, '');
if (!version) {
    console.error('usage: node scripts/changelog-section.js <version>');
    process.exit(2);
}
const text = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8');
const notes = changelogSection(text, version);
if (!notes) {
    console.error(`CHANGELOG.md has no notes for ${version}.`);
    process.exit(1);
}
process.stdout.write(notes + '\n');
