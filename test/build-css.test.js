'use strict';

// scripts/build-css.js — the CSS build that replaced gulp. Runs on a scratch
// theme tree in the OS temp directory, never on this repository's own files.
// Ported from DRE-theme's tests/js/build-css.test.mjs.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { buildCss, watchSources } = require('../scripts/build-css');

function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'iwac-css-test-'));
    t.after(() => {
        // Cleanup is restricted to the temporary directory this test created.
        assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
        assert.ok(path.basename(root).startsWith('iwac-css-test-'));
        fs.rmSync(root, { recursive: true, force: true });
    });
    for (const dir of ['asset/sass/nested', 'asset/js', 'view/layout']) {
        fs.mkdirSync(path.join(root, dir), { recursive: true });
    }
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ browserslist: ['Safari 9'] }));
    const partial = path.join(root, 'asset/sass/nested/_palette.scss');
    fs.writeFileSync(partial, '$tone: red;');
    fs.writeFileSync(path.join(root, 'asset/sass/style.scss'),
        '@use "nested/palette";\n.sample { color: palette.$tone; user-select: none; &::before { content: "é"; } }\n');
    return { root, partial, output: path.join(root, 'asset/css/style.css') };
}

test('the build compiles entry points only, prefixes, minifies and keeps @charset first', async (t) => {
    const f = fixture(t);
    fs.writeFileSync(path.join(f.root, 'asset/sass/_not-an-entry.scss'), '$value: 1;');
    assert.deepEqual(await buildCss(f.root), ['asset/css/style.css']);
    const css = fs.readFileSync(f.output, 'utf8');
    assert.ok(css.startsWith('@charset "UTF-8";'), css.slice(0, 40));
    assert.match(css, /\.sample\{color:red;-webkit-user-select:none;user-select:none\}/);
    assert.match(css, /content:"é"/);
    assert.ok(!css.includes('﻿'), 'no BOM — expanded output announces Unicode with @charset');
    assert.equal(fs.existsSync(path.join(f.root, 'asset/css/_not-an-entry.css')), false);
});

test('invalid Sass fails the build without replacing the last good output', async (t) => {
    const f = fixture(t);
    await buildCss(f.root);
    const before = fs.readFileSync(f.output, 'utf8');
    fs.writeFileSync(f.partial, '$tone: blue;');
    const broken = path.join(f.root, 'asset/sass/z-broken.scss');
    fs.writeFileSync(broken, '.broken { color:');
    await assert.rejects(buildCss(f.root), /Expected expression/);
    assert.equal(fs.readFileSync(f.output, 'utf8'), before);
    assert.deepEqual(fs.readdirSync(path.join(f.root, 'asset/css')), ['style.css'], 'no temporary file left');
});

// The watcher is exercised for real, so its latency is the OS's: a cold
// Windows run has been seen to take seconds for one event. The deadline is
// generous on purpose; a passing run finishes well inside it.
const WATCH_DEADLINE_MS = 20_000;

async function waitFor(predicate, what) {
    const deadline = Date.now() + WATCH_DEADLINE_MS;
    while (!predicate()) {
        if (Date.now() > deadline) assert.fail(`timed out waiting for the watcher: ${what}`);
        await delay(25);
    }
}

test('watch mode rebuilds on a nested partial, survives an error and notices atomic saves', { timeout: 60_000 }, async (t) => {
    const f = fixture(t);
    // The output is read inside the callbacks, between builds, never by
    // polling: polling reads racing the build's rename stalled it on Windows
    // in DRE-theme's version of this test.
    let builds = 0;
    let css = '';
    const errors = [];
    const close = watchSources(f.root, {
        log: (message) => {
            if (message.startsWith('✓ CSS')) {
                builds += 1;
                css = fs.readFileSync(f.output, 'utf8');
            }
        },
        onError: (label, error) => errors.push({ label, error, css: fs.readFileSync(f.output, 'utf8') }),
    });
    try {
        await waitFor(() => builds > 0, 'initial build');
        const before = css;
        fs.writeFileSync(f.partial, '$tone: ;');
        await waitFor(() => errors.length > 0, 'error from a broken partial');
        assert.equal(errors[0].label, 'CSS');
        assert.match(errors[0].error.message, /Expected expression/);
        assert.equal(errors[0].css, before, 'a failed build keeps the last good CSS');
        const previous = builds;
        const replacement = `${f.partial}.new`;
        fs.writeFileSync(replacement, '$tone: blue;');
        fs.renameSync(replacement, f.partial);
        await waitFor(() => builds > previous && /color:(blue|#00f)/.test(css), 'rebuild after an atomic save');
    } finally {
        close();
    }
});
