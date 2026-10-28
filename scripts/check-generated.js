#!/usr/bin/env node
/**
 * Generated files must be the committed ones — run AFTER `npm run build`
 * (`npm run verify` does).
 *
 *     node scripts/check-generated.js           local: friendly
 *     node scripts/check-generated.js --strict  CI: any difference fails
 *
 * The compiled CSS, the minified JS twins, tokens.json, the DESIGN-SYSTEM.md
 * tables and the translation catalogue are committed, because the release
 * archive carries no toolchain. A source change that was never rebuilt ships
 * the old artifact. CI used to say so with a bare `git diff --exit-code`,
 * which names a file but not why it matters, and fails on every uncommitted
 * edit when run locally.
 *
 * So, after the build:
 *   - in CI (--strict, or GITHUB_ACTIONS/CI set) the checkout was clean, so
 *     ANY tracked difference is a failure — the committed artifact was stale,
 *     or the build is not reproducible. It names each file, the way
 *     `git diff --exit-code` did, plus the command that fixes it;
 *   - locally, a changed artifact is only an error when none of the inputs it
 *     is built from differ from HEAD. Otherwise the rebuilt file is exactly
 *     what should be committed with those inputs, and this is a reminder.
 *
 * DRE-theme's scripts/check-stale-css.mjs, generalised to every artifact.
 */
'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const STRICT = process.argv.includes('--strict') || Boolean(process.env.GITHUB_ACTIONS || process.env.CI);

// Each artifact group, the inputs it is built from, and the command that
// rebuilds it. A path ending in / is a directory.
const GROUPS = [
    {
        outputs: ['asset/css/'],
        inputs: ['asset/sass/', 'package.json', 'package-lock.json', 'scripts/build-css.js', 'gulpfile.js'],
        rebuild: 'npm run build',
    },
    {
        outputs: ['asset/js/dist/'],
        inputs: ['asset/js/', 'scripts/build-js.js', 'package-lock.json'],
        rebuild: 'npm run build:js',
    },
    {
        outputs: ['tokens.json', 'docs/DESIGN-SYSTEM.md'],
        inputs: ['asset/sass/abstracts/', 'asset/sass/base/', 'view/layout/layout.phtml', 'scripts/build-tokens.js',
            'scripts/lib/', 'package.json'],
        rebuild: 'npm run build:tokens',
    },
    {
        outputs: ['language/template.pot', 'language/fr.mo'],
        inputs: ['view/', 'helper/', 'config/', 'language/fr.po', 'scripts/build-i18n.js'],
        rebuild: 'npm run build:i18n',
    },
];

function git(args) {
    const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
    if (result.status !== 0) {
        console.error(`Generated files: git ${args.join(' ')} failed — ${result.error?.message ?? result.stderr}`);
        process.exit(2);
    }
    return result.stdout;
}

/** Paths under `paths` that differ from HEAD (staged, unstaged or untracked). */
function changed(paths) {
    return git(['status', '--porcelain', '--untracked-files=all', '--', ...paths])
        .split('\n').filter(Boolean).map((line) => line.slice(3).replace(/^.* -> /, ''));
}

const isOutput = (file) => GROUPS.some((group) => group.outputs.some((out) => (out.endsWith('/') ? file.startsWith(out) : file === out)));

if (STRICT) {
    // Tracked changes anywhere, plus untracked files inside an artifact
    // directory (a twin nobody committed). Untracked files elsewhere are not
    // the build's doing.
    const dirty = git(['status', '--porcelain', '--untracked-files=all'])
        .split('\n').filter(Boolean)
        .filter((line) => !line.startsWith('??') || isOutput(line.slice(3)))
        .map((line) => line.slice(3));
    if (!dirty.length) {
        console.log('✓ generated files match the committed ones');
        process.exit(0);
    }
    for (const file of dirty) {
        const group = GROUPS.find((g) => g.outputs.some((out) => (out.endsWith('/') ? file.startsWith(out) : file === out)));
        const fix = group ? `run '${group.rebuild}' and commit the result` : 'a file that is not a known artifact changed (the build is not reproducible, or the checkout was not clean)';
        const message = `${file} differs from the commit after the build — ${fix}.`;
        console.error(process.env.GITHUB_ACTIONS ? `::error file=${file}::${message}` : `✗ ${message}`);
    }
    spawnSync('git', ['--no-pager', 'diff', '--stat'], { cwd: ROOT, stdio: 'inherit' });
    process.exit(1);
}

let failed = false;
for (const group of GROUPS) {
    const stale = changed(group.outputs);
    if (!stale.length) continue;
    const inputs = changed(group.inputs).filter((file) => !isOutput(file));
    if (inputs.length) {
        console.log(`• ${stale.join(', ')} changed together with ${inputs.length} input(s) `
            + `(${inputs.slice(0, 3).join(', ')}${inputs.length > 3 ? ', …' : ''}) — commit them together.`);
        continue;
    }
    failed = true;
    console.error(`✗ ${stale.join(', ')} ${stale.length === 1 ? 'is' : 'are'} out of date with no input changed — `
        + `run '${group.rebuild}' and commit the result.`);
    spawnSync('git', ['--no-pager', 'diff', '--stat', '--', ...stale], { cwd: ROOT, stdio: 'inherit' });
}
if (failed) process.exit(1);
console.log('✓ generated files are current (or travel with the inputs that changed them)');
