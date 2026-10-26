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

module.exports = {};
