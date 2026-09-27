'use strict';

/**
 * Stylelint — bug-catching rules only (unknown properties, units and
 * selectors, invalid hex, duplicate declarations, shorthand overrides…), not a
 * house style: the Sass is consistent already, and a formatter pass would be a
 * mass diff for nothing. The last two rules turn CLAUDE.md gotchas into
 * errors, the way scripts/check-token-usage.js does for tokens: prose that a
 * rule can check should be a rule.
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
        }, {
            message: (property) => (property === 'outline'
                ? 'A focus rule takes `outline: 2px solid transparent`, never `none`: forced-colors mode drops box-shadow rings and repaints the transparent outline.'
                : 'color-mix takes `in oklab`, not `in srgb` — sRGB mixing muddies mid-tones (CLAUDE.md).'),
        }],
    },
};
