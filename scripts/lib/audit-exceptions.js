'use strict';

// Advisories `npm run check:audit` lets through at high or critical severity.
//
// An entry is an admission, not a fix: it has to say why no upgrade clears the
// advisory and why the vulnerable code cannot be reached. The check retires
// entries on its own — it fails as soon as npm can fix an excepted advisory
// in range, and as soon as one stops appearing — so this list cannot outlive
// its reason the way a hand-kept ignore list would.
//
// Keyed by the GitHub advisory id, the last segment of the advisory's URL.

module.exports = {
    'GHSA-vfj7-8cjw-p6xm': {
        package: 'braces',
        since: '2026-10-05',
        reason:
            'Stack exhaustion on deeply nested brace patterns. No braces release fixes it — 3.0.3 is the latest and ' +
            'is in range — and every path to it is build tooling: micromatch under stylelint (17.16.0, the latest, ' +
            'still depends on it) and chokidar / findup-sync under gulp 5. The only patterns those expand are the ' +
            'globs this repository writes; nothing reaches them from a request, and none of it ships in the release archive.',
    },
};
