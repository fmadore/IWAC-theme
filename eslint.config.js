'use strict';

/**
 * ESLint — correctness, not style. `recommended` catches the class of bug the
 * syntax gate (scripts/check-js-syntax.js) cannot: an undefined name, an
 * unused variable left behind by a refactor, an unreachable branch. Formatting
 * is left to .editorconfig; the tree mixes tab- and space-indented files and
 * that is not worth a mass diff.
 */
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
    {
        ignores: [
            'node_modules/',
            'vendor/',
            'test-results/',
            'playwright-report/',
            // Machine-local agent workspace (gitignored): the preview rig, and
            // `.claude/worktrees/*` — whole checkouts of this repository, which
            // ESLint would otherwise lint a second time, generated files and
            // all (4,278 errors from one stale worktree in October 2026).
            '.claude/',
            // Vendored, minified third-party code.
            'asset/js/minimasonry.min.js',
            // esbuild output of asset/js/*.js (npm run build:js) — the sources
            // are what is linted; `check:js-dist` proves the twins match them.
            'asset/js/dist/',
        ],
    },

    js.configs.recommended,

    // The theme's browser scripts: classic scripts (no modules), sharing a
    // few globals through window.
    {
        files: ['asset/js/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                ...globals.browser,
                IWACUtils: 'readonly',   // asset/js/utils.js
                MiniMasonry: 'readonly', // asset/js/minimasonry.min.js
            },
        },
    },

    // Build scripts, guards, tests and config: Node, CommonJS.
    {
        files: [
            'scripts/**/*.js',
            // The module guard engine, synced into both modules as .cjs so it
            // loads as CommonJS inside IwacSearch's ESM package too.
            'scripts/**/*.cjs',
            'test/**/*.js',
            'test-support/**/*.js',
            'e2e/**/*.js',
            '*.js',
        ],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'commonjs',
            globals: { ...globals.node },
        },
    },

    // Playwright specs run in Node but hand callbacks to page.evaluate(),
    // which execute in the browser.
    {
        files: ['e2e/**/*.js'],
        languageOptions: {
            globals: { ...globals.browser },
        },
    },

    {
        rules: {
            // `catch (e) {}` with a comment is how the theme says "degrade
            // silently" (storage, clipboard, history) — allow the unused binding.
            'no-unused-vars': ['error', { caughtErrors: 'none' }],
        },
    },
];
