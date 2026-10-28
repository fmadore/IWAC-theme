#!/usr/bin/env node
/**
 * Compile the theme's stylesheet — no task runner.
 *
 *     node scripts/build-css.js           compile asset/sass/*.scss → asset/css/
 *     node scripts/build-css.js --watch   compile once, then rebuild on change
 *                                         (`npm run start`)
 *
 * Each entry point (an asset/sass/*.scss that is not a `_partial`) goes
 * through the `sass` JS API, then PostCSS with autoprefixer (browserslist from
 * package.json) and cssnano, and lands in asset/css/<name>.css.
 *
 * WHY NOT GULP. Gulp contributed glob expansion and a watcher, and cost a
 * plugin layer that hid what the compiler was asked to do: gulp-sass v6 sends
 * options to Sass' modern API, which has no `outputStyle` (the option is
 * `style`), so the `outputStyle: 'compressed'` the gulpfile asked for was a
 * silent no-op for as long as anyone can tell. cssnano was doing all the
 * minifying. DRE-theme found the same thing (scripts/build-css.mjs, v2.32).
 *
 * WHY `expanded`, NOT `compressed`. Sass' compressed output announces a
 * non-ASCII stylesheet with a bare U+FEFF BOM instead of `@charset`. At byte 0
 * that is harmless; anywhere else it welds itself to the next selector and the
 * rule it opens matches nothing — DRE-theme lost 63 token declarations, its
 * whole spacing scale, that way. Expanded output emits `@charset "UTF-8";`,
 * which cssnano keeps first, and cssnano minifies better than Sass does
 * anyway. scripts/check-compiled-css.js guards the output either way.
 *
 * WATCH MODE replaces `gulp`'s watch tasks, and survives a compile error (it
 * reports it and keeps the last good stylesheet):
 *   - any .scss under asset/sass            → CSS
 *   - asset/sass/abstracts/variables/*.scss → also tokens.json (build-tokens.js),
 *     which publishes every variable file, not just the colours
 *   - view/layout/layout.phtml              → tokens.json (the loaded font
 *     weights are read from it)
 *   - asset/js/*.js (not vendored *.min.js) → asset/js/dist/ (build-js.js):
 *     templates load only the minified twins
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

/** The Sass entry points: top-level asset/sass/*.scss that are not partials. */
function entries(root) {
    const sourceDir = path.join(root, 'asset', 'sass');
    return fs.readdirSync(sourceDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.scss') && !entry.name.startsWith('_'))
        .map((entry) => entry.name)
        .sort();
}

/**
 * Compile every entry, then write. Nothing is written until everything has
 * compiled, so a Sass error leaves the last successful build intact; each
 * file is written to a temporary name and renamed into place.
 *
 * @returns {Promise<string[]>} the written paths, relative to root
 */
async function buildCss(root = ROOT) {
    // Required lazily so `--help`-style usage errors need no dependencies.
    const sass = require('sass');
    const postcss = require('postcss');
    const autoprefixer = require('autoprefixer');
    const cssnano = require('cssnano');

    const names = entries(root);
    if (!names.length) throw new Error('CSS build: no Sass entry points in asset/sass');

    const outputs = [];
    for (const name of names) {
        const from = path.join(root, 'asset', 'sass', name);
        const to = path.join(root, 'asset', 'css', name.replace(/\.scss$/, '.css'));
        const compiled = sass.compile(from, { style: 'expanded' });
        // `from` is the Sass source, so autoprefixer resolves browserslist
        // from package.json exactly as the gulp pipeline did.
        const result = await postcss([
            autoprefixer(),
            // Structural minification: merges/dedupes rules and shortens values.
            // The default preset is rendering-safe and passes modern colour
            // syntax (oklch / color-mix / CSS masks) through untouched.
            cssnano({ preset: 'default' }),
        ]).process(compiled.css, { from, to, map: false });
        for (const warning of result.warnings()) console.warn(warning.toString());
        outputs.push({ to, css: result.css });
    }

    fs.mkdirSync(path.join(root, 'asset', 'css'), { recursive: true });
    for (const { to, css } of outputs) {
        const temporary = `${to}.${process.pid}.tmp`;
        try {
            fs.writeFileSync(temporary, css, 'utf8');
            fs.renameSync(temporary, to);
        } finally {
            fs.rmSync(temporary, { force: true });
        }
    }
    return outputs.map(({ to }) => path.relative(root, to).split(path.sep).join('/'));
}

/** Run another build script of this repo, echoing its output. */
function runScript(root, script) {
    return new Promise((resolve, reject) => {
        execFile(process.execPath, [path.join(root, 'scripts', script)], { cwd: root }, (error, stdout, stderr) => {
            if (stdout) process.stdout.write(stdout);
            if (stderr) process.stderr.write(stderr);
            if (error) reject(new Error(`${script} failed`));
            else resolve();
        });
    });
}

/**
 * A task that never runs twice at once: a change during a run queues exactly
 * one more run. Errors are reported, never thrown — watch mode must outlive
 * a typo.
 */
function serialTask(label, run, onError) {
    let running = false;
    let pending = false;
    let timer = null;
    const loop = async () => {
        if (running) {
            pending = true;
            return;
        }
        running = true;
        try {
            do {
                pending = false;
                try {
                    await run();
                } catch (error) {
                    onError(label, error);
                }
            } while (pending);
        } finally {
            running = false;
        }
    };
    // Editors save in bursts (write + rename + chmod): coalesce them.
    const schedule = () => {
        clearTimeout(timer);
        timer = setTimeout(loop, 75);
    };
    schedule.cancel = () => clearTimeout(timer);
    schedule.now = loop;
    return schedule;
}

/**
 * Watch the sources and rebuild what each change affects.
 *
 * @returns {() => void} close
 */
function watchSources(root = ROOT, {
    log = (message) => console.log(message),
    onError = (label, error) => console.error(`✗ ${label}: ${error.message || error}`),
    initialBuild = true,
} = {}) {
    const css = serialTask('CSS', async () => {
        const written = await buildCss(root);
        log(`✓ CSS: ${written.join(', ')}`);
    }, onError);
    const tokens = serialTask('tokens', () => runScript(root, 'build-tokens.js'), onError);
    const js = serialTask('JS', () => runScript(root, 'build-js.js'), onError);

    const watchers = [];
    const close = () => {
        for (const task of [css, tokens, js]) task.cancel();
        for (const watcher of watchers) watcher.close();
    };
    const posix = (name) => String(name).split(path.sep).join('/');
    const watchDir = (directory, recursive, onChange) => {
        const watcher = fs.watch(directory, { recursive }, (event, name) => {
            if (name) onChange(posix(name));
        });
        watcher.on('error', (error) => onError(`watching ${path.relative(root, directory) || '.'}`, error));
        watchers.push(watcher);
    };

    try {
        watchDir(path.join(root, 'asset', 'sass'), true, (name) => {
            if (!name.endsWith('.scss')) return;
            css();
            if (/^abstracts\/variables\/[^/]+\.scss$/.test(name)) tokens();
        });
        watchDir(path.join(root, 'view', 'layout'), false, (name) => {
            if (name === 'layout.phtml') tokens();
        });
        watchDir(path.join(root, 'asset', 'js'), false, (name) => {
            if (name.endsWith('.js') && !name.endsWith('.min.js')) js();
        });
    } catch (error) {
        close();
        throw error;
    }

    // Compile once first, so a fresh checkout or a branch switch never serves
    // stale CSS — what `gulp`'s default task did.
    if (initialBuild) void css.now();
    log('Watching asset/sass, asset/js and view/layout/layout.phtml (Ctrl+C to stop).');
    return close;
}

module.exports = { buildCss, watchSources, entries };

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length > 1 || (args.length && args[0] !== '--watch')) {
        console.error('usage: node scripts/build-css.js [--watch]');
        process.exit(2);
    }
    if (args[0] === '--watch') {
        const close = watchSources();
        process.once('SIGINT', () => { close(); process.exit(0); });
        process.once('SIGTERM', () => { close(); process.exit(0); });
    } else {
        buildCss().then(
            (written) => console.log(`✓ CSS: ${written.join(', ')}`),
            (error) => {
                console.error(`✗ CSS build failed\n${error.message || error}`);
                process.exit(1);
            },
        );
    }
}
