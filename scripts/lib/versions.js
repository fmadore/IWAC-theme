'use strict';

// The version declarations, in one place.
//
// Five files carry this theme's version, and a release that ships them out of
// step ships a theme whose admin screen, stylesheet header or citation record
// lies about itself. asset/sass/style.scss joined the release gate in 2.9.14
// having drifted from 2.9.0 across thirteen unchecked releases; package-lock's
// two copies drifted from 2.10.1 across four more, because the gate asserted
// only the four a human remembered to edit.
//
// So neither list is maintained by hand any more: DECLARATIONS below is the
// single source for both the writer (bump-version.js) and the guard
// (check-versions.js), and adding a sixth site means adding one entry here.

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

/**
 * Read a file as UTF-8 text.
 */
function read(file) {
    return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

/**
 * Replace exactly one regex match's first capture group, failing loudly when
 * the pattern no longer matches. A silent no-op here is the whole failure mode
 * this module exists to prevent.
 */
function substitute(file, pattern, value) {
    const before = read(file);
    let hits = 0;
    const after = before.replace(pattern, (match, captured) => {
        hits += 1;
        return match.replace(captured, value);
    });
    if (hits !== 1) {
        throw new Error(`${file}: expected 1 match for ${pattern}, found ${hits}`);
    }
    fs.writeFileSync(path.join(ROOT, file), after);
}

/**
 * Read one JSON path, e.g. ['packages', '', 'version'].
 */
function readJsonPath(file, keys) {
    let node = JSON.parse(read(file));
    for (const key of keys) node = node?.[key];
    return typeof node === 'string' ? node : null;
}

// `write: null` marks a declaration the writer does not own. package.json and
// package-lock.json are npm's to edit — `npm version` keeps the lockfile's two
// copies in step with the manifest, and reformatting a 400 kB lockfile by hand
// to move two strings is how you lose a review.
const DECLARATIONS = [
    {
        label: 'config/theme.ini',
        file: 'config/theme.ini',
        get: () => read('config/theme.ini').match(/^version\s*=\s*"([^"]+)"/m)?.[1] ?? null,
        write: (version) => substitute('config/theme.ini', /^version\s*=\s*"([^"]+)"/m, version),
    },
    {
        label: 'package.json',
        file: 'package.json',
        get: () => readJsonPath('package.json', ['version']),
        write: null,
    },
    {
        label: 'package-lock.json (root)',
        file: 'package-lock.json',
        get: () => readJsonPath('package-lock.json', ['version']),
        write: null,
    },
    {
        label: 'package-lock.json (packages."")',
        file: 'package-lock.json',
        get: () => readJsonPath('package-lock.json', ['packages', '', 'version']),
        write: null,
    },
    {
        label: 'CITATION.cff',
        file: 'CITATION.cff',
        get: () => read('CITATION.cff').match(/^version:\s*"?([^"\r\n]+)"?/m)?.[1] ?? null,
        write: (version) => substitute('CITATION.cff', /^version:\s*"([^"]+)"/m, version),
    },
    {
        label: 'asset/sass/style.scss',
        file: 'asset/sass/style.scss',
        get: () => read('asset/sass/style.scss').match(/^Version:\s*(.+?)\s*$/m)?.[1] ?? null,
        write: (version) => substitute('asset/sass/style.scss', /^Version:\s*(.+?)\s*$/m, version),
    },
];

/**
 * Every declaration's current value, in declaration order.
 */
function readAll() {
    return DECLARATIONS.map((declaration) => ({
        label: declaration.label,
        version: declaration.get(),
    }));
}

/**
 * Write the declarations this module owns. package.json and package-lock.json
 * are left to `npm version` — see the note on DECLARATIONS.
 */
function writeOwned(version) {
    const written = [];
    for (const declaration of DECLARATIONS) {
        if (!declaration.write) continue;
        declaration.write(version);
        written.push(declaration.label);
    }
    return written;
}

/**
 * Set CITATION.cff's release date. GitHub renders it in the citation strings,
 * and the file's own header asks for it to move with `version`.
 */
function writeReleaseDate(date) {
    substitute('CITATION.cff', /^date-released:\s*"([^"]+)"/m, date);
    return date;
}

function readReleaseDate() {
    return read('CITATION.cff').match(/^date-released:\s*"([^"]+)"/m)?.[1] ?? null;
}

module.exports = {
    ROOT,
    DECLARATIONS,
    readAll,
    writeOwned,
    writeReleaseDate,
    readReleaseDate,
};
