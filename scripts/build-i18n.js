#!/usr/bin/env node
/**
 * build-i18n.js — regenerate the theme's gettext catalog without needing
 * the gettext binaries (xgettext/msgmerge/msgfmt).
 *
 *  1. Extracts every translate('…') literal from view/ and helper/ into
 *     language/template.pot (sorted, stable output).
 *  2. Merges language/fr.po against the new pot: keeps existing
 *     translations, appends new msgids with empty msgstr, drops msgids
 *     that no longer exist in the templates.
 *  3. Compiles language/fr.mo from the merged fr.po (little-endian MO).
 *
 * Untranslated (empty-msgstr) entries are omitted from the .mo, so Omeka
 * falls through to its core French catalog for strings the theme shares
 * with core ("Items", "Search", …). Only theme-specific strings need a
 * translation here.
 *
 * Usage: node scripts/build-i18n.js [--check]
 *   --check  exit non-zero if template.pot / fr.mo would change (CI guard)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LANG_DIR = path.join(ROOT, 'language');
const SOURCE_DIRS = ['view', 'helper'];
const CHECK = process.argv.includes('--check');

// ---------------------------------------------------------------------------
// 1. Extraction
// ---------------------------------------------------------------------------

function* walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            yield* walk(full);
        } else if (/\.(phtml|php)$/.test(entry.name)) {
            yield full;
        }
    }
}

// translate('…') / translate("…") — including the plugin-variable forms
// $translate('…') used throughout the templates.
const CALL_RE = /translate\s*\(\s*('((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g;

function unescapePhp(str, quote) {
    if (quote === "'") {
        return str.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    }
    return str
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
}

function extract() {
    const messages = new Map(); // msgid -> Set of "file:line" refs
    for (const dir of SOURCE_DIRS) {
        for (const file of walk(path.join(ROOT, dir))) {
            const src = fs.readFileSync(file, 'utf8');
            const rel = path.relative(ROOT, file);
            let m;
            while ((m = CALL_RE.exec(src)) !== null) {
                const quote = m[1][0];
                const raw = quote === "'" ? m[2] : m[3];
                const msgid = unescapePhp(raw, quote);
                if (!msgid) continue;
                const line = src.slice(0, m.index).split('\n').length;
                if (!messages.has(msgid)) messages.set(msgid, new Set());
                messages.get(msgid).add(`${rel}:${line}`);
            }
        }
    }
    return messages;
}

// ---------------------------------------------------------------------------
// 2. PO read/write
// ---------------------------------------------------------------------------

function poEscape(str) {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t');
}

function poUnescape(str) {
    return str
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
}

/** Minimal PO parser: returns { header, entries: Map<msgid, msgstr> }. */
function parsePo(text) {
    const entries = new Map();
    let header = '';
    // Split on blank lines; each block is one entry.
    for (const block of text.split(/\n\s*\n/)) {
        const idMatch = block.match(/msgid\s+((?:"(?:[^"\\]|\\.)*"\s*)+)msgstr/);
        const strMatch = block.match(/msgstr\s+((?:"(?:[^"\\]|\\.)*"\s*)+)/);
        if (!idMatch || !strMatch) continue;
        const joinParts = (s) => (s.match(/"(?:[^"\\]|\\.)*"/g) || [])
            .map((p) => poUnescape(p.slice(1, -1)))
            .join('');
        const msgid = joinParts(idMatch[1]);
        const msgstr = joinParts(strMatch[1]);
        if (msgid === '') {
            header = msgstr;
        } else {
            entries.set(msgid, msgstr);
        }
    }
    return { header, entries };
}

function formatEntry(msgid, msgstr, refs) {
    let out = '';
    if (refs && refs.size) {
        out += `#: ${Array.from(refs).sort().join(' ')}\n`;
    }
    out += `msgid "${poEscape(msgid)}"\n`;
    out += `msgstr "${poEscape(msgstr)}"\n`;
    return out;
}

// ---------------------------------------------------------------------------
// 3. MO compilation (GNU gettext binary format, little-endian)
// ---------------------------------------------------------------------------

function compileMo(header, entries) {
    // Only translated entries ship; include the header (empty msgid).
    const pairs = [['', header]];
    for (const [id, str] of Array.from(entries.entries()).sort((a, b) =>
        a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)) {
        if (str) pairs.push([id, str]);
    }

    const n = pairs.length;
    const origs = pairs.map(([id]) => Buffer.from(id, 'utf8'));
    const trans = pairs.map(([, str]) => Buffer.from(str, 'utf8'));

    const headerSize = 28;
    const tableSize = n * 8;
    let offset = headerSize + tableSize * 2;

    const origTable = Buffer.alloc(tableSize);
    const transTable = Buffer.alloc(tableSize);
    const strings = [];

    origs.forEach((buf, i) => {
        origTable.writeUInt32LE(buf.length, i * 8);
        origTable.writeUInt32LE(offset, i * 8 + 4);
        strings.push(buf, Buffer.from([0]));
        offset += buf.length + 1;
    });
    trans.forEach((buf, i) => {
        transTable.writeUInt32LE(buf.length, i * 8);
        transTable.writeUInt32LE(offset, i * 8 + 4);
        strings.push(buf, Buffer.from([0]));
        offset += buf.length + 1;
    });

    const head = Buffer.alloc(headerSize);
    head.writeUInt32LE(0x950412de, 0); // magic
    head.writeUInt32LE(0, 4); // revision
    head.writeUInt32LE(n, 8); // number of strings
    head.writeUInt32LE(headerSize, 12); // offset of original table
    head.writeUInt32LE(headerSize + tableSize, 16); // offset of translation table
    head.writeUInt32LE(0, 20); // hash table size
    head.writeUInt32LE(headerSize + tableSize * 2, 24); // hash table offset

    return Buffer.concat([head, origTable, transTable, ...strings]);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const messages = extract();
const sortedIds = Array.from(messages.keys()).sort();

// template.pot
let pot = `# IWAC-theme translation template.
# Regenerate with: npm run build:i18n
msgid ""
msgstr ""
"Project-Id-Version: IWAC-theme\\n"
"Report-Msgid-Bugs-To: https://github.com/fmadore/IWAC-theme/issues\\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"

`;
pot += sortedIds.map((id) => formatEntry(id, '', messages.get(id))).join('\n');

// fr.po — merge
const frPath = path.join(LANG_DIR, 'fr.po');
const fr = parsePo(fs.readFileSync(frPath, 'utf8'));
const dropped = Array.from(fr.entries.keys()).filter((id) => !messages.has(id));

let po = `msgid ""
msgstr ""
"Project-Id-Version: IWAC-theme\\n"
"Language: fr\\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"

`;
po += sortedIds
    .map((id) => formatEntry(id, fr.entries.get(id) || '', messages.get(id)))
    .join('\n');

const mo = compileMo(
    'Project-Id-Version: IWAC-theme\nLanguage: fr\nMIME-Version: 1.0\nContent-Type: text/plain; charset=UTF-8\nContent-Transfer-Encoding: 8bit\n',
    new Map(sortedIds.map((id) => [id, fr.entries.get(id) || '']))
);

const outputs = [
    [path.join(LANG_DIR, 'template.pot'), pot],
    [frPath, po],
    [path.join(LANG_DIR, 'fr.mo'), mo],
];

let changed = false;
for (const [file, content] of outputs) {
    const current = fs.existsSync(file) ? fs.readFileSync(file) : Buffer.alloc(0);
    const next = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    if (!current.equals(next)) {
        changed = true;
        if (!CHECK) fs.writeFileSync(file, next);
        console.log(`${CHECK ? 'would update' : 'wrote'} ${path.relative(ROOT, file)}`);
    }
}

const untranslated = sortedIds.filter((id) => !fr.entries.get(id));
console.log(`✓ ${sortedIds.length} msgids (${untranslated.length} untranslated in fr)`);
if (dropped.length) console.log(`  dropped stale: ${dropped.join(' | ')}`);
if (untranslated.length) {
    console.log('  untranslated (core catalog may cover them):');
    untranslated.forEach((id) => console.log(`    - ${id}`));
}
if (CHECK && changed) {
    console.error('✗ i18n catalog is stale — run `npm run build:i18n`');
    process.exit(1);
}
