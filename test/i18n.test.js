'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

test('gettext catalogs are current and include markers plus plural forms', () => {
    const check = spawnSync(process.execPath, ['scripts/build-i18n.js', '--check'], {
        cwd: ROOT,
        encoding: 'utf8',
    });
    assert.equal(check.status, 0, check.stdout + check.stderr);

    const pot = fs.readFileSync(path.join(ROOT, 'language', 'template.pot'), 'utf8');
    assert.match(pot, /msgid "Site pages"/);
    assert.match(pot, /msgid "%s item"\nmsgid_plural "%s items"/);

    const mo = fs.readFileSync(path.join(ROOT, 'language', 'fr.mo'));
    assert.notEqual(mo.indexOf(Buffer.from('%s item\0%s items')), -1);
    assert.notEqual(mo.indexOf(Buffer.from('%s contenu\0%s contenus')), -1);
});
