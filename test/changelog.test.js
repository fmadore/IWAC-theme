'use strict';

// CHANGELOG.md feeds the notes of any release the release workflow creates,
// and `npm run bump` (scripts/bump-version.js) promotes its [Unreleased]
// notes. Ported from DRE-theme's tests/js/lint-changelog.test.mjs.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { changelogSection, promoteUnreleased, REPOSITORY } = require('../scripts/lib/changelog');

const ROOT = path.join(__dirname, '..');

const SAMPLE = `# Changelog

## [Unreleased]

<!-- placeholder -->

### Fixed

- Something.

## [1.1.0] - 2026-01-02

### Added

- Feature.

## [1.0.0] - 2026-01-01

- First.

## Earlier releases

See GitHub.

[Unreleased]: ${REPOSITORY}/compare/v1.1.0...HEAD
[1.1.0]: ${REPOSITORY}/compare/v1.0.0...v1.1.0
[1.0.0]: ${REPOSITORY}/releases/tag/v1.0.0
`;

test('a version section stops at the next heading and drops editing placeholders', () => {
    assert.equal(changelogSection(SAMPLE, '1.1.0'), '### Added\n\n- Feature.');
    assert.equal(changelogSection(SAMPLE, '1.0.0'), '- First.');
    assert.equal(changelogSection(SAMPLE, 'Unreleased'), '### Fixed\n\n- Something.');
    assert.equal(changelogSection(SAMPLE, '1.0'), null);
    assert.equal(changelogSection(SAMPLE.replace(/\n/g, '\r\n'), '1.0.0'), '- First.');
});

test('promoting [Unreleased] dates the notes, keeps the placeholder and updates the links', () => {
    const out = promoteUnreleased(SAMPLE, '1.2.0', '2026-02-03');
    assert.match(out, /## \[Unreleased\]\n\n<!-- placeholder -->\n\n## \[1\.2\.0\] - 2026-02-03\n\n### Fixed\n\n- Something\.\n\n## \[1\.1\.0\]/);
    assert.equal(changelogSection(out, 'Unreleased'), '');
    assert.equal(changelogSection(out, '1.2.0'), '### Fixed\n\n- Something.');
    assert.match(out, new RegExp(`^\\[Unreleased\\]: ${REPOSITORY}/compare/v1\\.2\\.0\\.\\.\\.HEAD$`, 'm'));
    assert.match(out, new RegExp(`^\\[1\\.2\\.0\\]: ${REPOSITORY}/compare/v1\\.1\\.0\\.\\.\\.v1\\.2\\.0$`, 'm'));
    // Idempotent, and a no-op when there is nothing to release.
    assert.equal(promoteUnreleased(out, '1.2.0', '2026-02-04'), out);
    assert.equal(promoteUnreleased(out, '1.3.0', '2026-02-04'), out);
});

test('the repository changelog keeps an [Unreleased] section and its link references', () => {
    const text = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8').replace(/\r\n/g, '\n');
    assert.match(text, /^## \[Unreleased\]$/m);
    assert.match(text, /^\[Unreleased\]: \S+\/compare\/v\d+\.\d+\.\d+\.\.\.HEAD$/m);
    const versions = [...text.matchAll(/^## \[(\d+\.\d+\.\d+)\] - \d{4}-\d{2}-\d{2}$/gm)].map((m) => m[1]);
    assert.ok(versions.length > 0, 'no dated version sections');
    for (const version of versions) {
        assert.ok(changelogSection(text, version), `CHANGELOG.md ${version} has no notes`);
        assert.match(text, new RegExp(`^\\[${version.replace(/\./g, '\\.')}\\]: https://`, 'm'), `no link reference for ${version}`);
    }
    // Every other second-level heading is the pointer to older history.
    for (const [, name] of text.matchAll(/^## (?!\[)(.+)$/gm)) {
        assert.equal(name, 'Earlier releases', `unexpected section "## ${name}"`);
    }
    // Keep a Changelog's change types only.
    for (const [, type] of text.matchAll(/^### (.+)$/gm)) {
        assert.ok(['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'].includes(type),
            `unknown change type "### ${type}"`);
    }
});

test('the current version has notes, so release.yml can publish them', () => {
    const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const result = spawnSync(process.execPath, ['scripts/changelog-section.js', version], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.trim().length > 0);
    assert.equal(spawnSync(process.execPath, ['scripts/changelog-section.js', '0.0.0'], { cwd: ROOT }).status, 1);
});
