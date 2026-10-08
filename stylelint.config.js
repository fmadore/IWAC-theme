'use strict';

/**
 * Stylelint — bug-catching rules only (unknown properties, units and
 * selectors, invalid hex, duplicate declarations, shorthand overrides…), not a
 * house style: the Sass is consistent already, and a formatter pass would be a
 * mass diff for nothing. The rules after the Sass block turn CLAUDE.md gotchas
 * and DESIGN-PHILOSOPHY.md prohibitions (glass outside the header, gradients,
 * coloured side-stripes) into errors, the way scripts/check-token-usage.js
 * does for tokens: prose that a rule can check should be a rule. Each
 * prohibition carries a per-file allowlist in `overrides`, and an entry there
 * says what job the exception does.
 */
module.exports = {
    customSyntax: 'postcss-scss',
    plugins: ['stylelint-scss'],
    ignoreFiles: ['asset/css/**', 'node_modules/**'],
    rules: {
        'annotation-no-unknown': true,
        'at-rule-descriptor-no-unknown': true,
        'block-no-empty': true,
        'color-no-invalid-hex': true,
        'declaration-block-no-duplicate-custom-properties': true,
        // Consecutive duplicates are deliberate fallbacks (`height: 100vh;
        // height: 100dvh;`); anything else is a leftover.
        'declaration-block-no-duplicate-properties': [true, {
            ignore: ['consecutive-duplicates-with-different-syntaxes', 'consecutive-duplicates-with-different-values'],
        }],
        'declaration-block-no-shorthand-property-overrides': true,
        // normalize.css's `monospace, monospace` is a known sizing fix.
        'font-family-no-duplicate-names': [true, { ignoreFontFamilyNames: ['monospace'] }],
        'font-family-no-missing-generic-family-keyword': true,
        'function-calc-no-unspaced-operator': true,
        'keyframe-block-no-duplicate-selectors': true,
        'keyframe-declaration-no-important': true,
        'media-feature-name-no-unknown': true,
        'named-grid-areas-no-invalid': true,
        'no-duplicate-at-import-rules': true,
        'no-invalid-double-slash-comments': true,
        'no-invalid-position-at-import-rule': true,
        'property-no-unknown': true,
        'selector-anb-no-unmatchable': true,
        'selector-pseudo-class-no-unknown': true,
        'selector-pseudo-element-no-unknown': true,
        // <replay-web-page> and friends.
        'selector-type-no-unknown': [true, { ignore: ['custom-elements'] }],
        'string-no-newline': true,
        'unit-no-unknown': true,

        // Sass at-rules (@use, @forward, @include, @each…) are not CSS ones.
        'at-rule-no-unknown': null,
        'scss/at-rule-no-unknown': true,
        'scss/no-duplicate-mixins': true,
        'scss/operator-no-unspaced': true,
        'scss/declaration-nested-properties-no-divided-groups': true,

        'at-rule-disallowed-list': [['import'], {
            message: 'Use @use / @forward, never @import — the theme is on the Sass module system (CLAUDE.md).',
        }],
        'declaration-property-value-disallowed-list': [{
            '/.*/': ['/color-mix\\(\\s*in\\s+srgb/'],
            outline: ['none'],
            // A side stripe in a brand, status or categorical colour — the
            // "coloured side-stripe" DESIGN-PHILOSOPHY.md lists under What to
            // Avoid. Hairline dividers in --border-* and the blockquote rule
            // (--blockquote-border) are typography, and stay legal.
            '/^border-(?:left|inline-start)(?:-color)?$/': [
                '/var\\(\\s*--(?:primary|secondary|info|success|warning|error|type-|series-)/',
            ],
        }, {
            message: (property) => {
                if (property === 'outline') {
                    return 'A focus rule takes `outline: 2px solid transparent`, never `none`: forced-colors mode drops box-shadow rings and repaints the transparent outline.';
                }
                if (/^border-(?:left|inline-start)/.test(property)) {
                    return 'No coloured side-stripes (DESIGN-PHILOSOPHY.md, What to Avoid): a category is a dot, a section opens on a full rule.';
                }
                return 'color-mix takes `in oklab`, not `in srgb` — sRGB mixing muddies mid-tones (CLAUDE.md).';
            },
        }],

        // Glass is the sticky header's alone (DESIGN-PHILOSOPHY.md, Quiet
        // chrome) — overridden for _header.scss below.
        'property-disallowed-list': [['backdrop-filter', '-webkit-backdrop-filter'], {
            message: 'backdrop-filter is reserved for the sticky header (DESIGN-PHILOSOPHY.md): every other surface is opaque --surface.',
        }],
        // "No atmospheric gradients, no gradient bars" (DESIGN-PHILOSOPHY.md,
        // What to Avoid). The two files that legitimately draw one are
        // allowlisted below, each for a functional job, not decoration.
        'function-disallowed-list': [['/^(?:-[a-z]+-)?(?:repeating-)?(?:linear|radial|conic)-gradient$/'], {
            message: 'No gradients (DESIGN-PHILOSOPHY.md, What to Avoid). If one does a functional job, add its file to the allowlist in stylelint.config.js with the reason.',
        }],
    },
    overrides: [
        {
            files: ['asset/sass/components/header/_header.scss'],
            rules: { 'property-disallowed-list': null },
        },
        {
            files: [
                // The hero scrim: legibility of white type over the duotone plate.
                'asset/sass/components/banner/_banner.scss',
                // The fade that tells a reader a clamped description continues.
                'asset/sass/base/elements/_resource-description.scss',
            ],
            rules: { 'function-disallowed-list': null },
        },
    ],
};
