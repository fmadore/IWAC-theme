'use strict';

// CHANGELOG.md (Keep a Changelog) helpers, shared by the writer and the guards.
//
//   changelogSection()   release.yml's notes (scripts/changelog-section.js),
//                        check-versions.js, test/changelog.test.js
//   promoteUnreleased()  `npm run bump` (scripts/bump-version.js)
//
// Ported from DRE-theme's scripts/changelog-section.mjs.

const REPOSITORY = 'https://github.com/fmadore/IWAC-theme';

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const headingRe = (name) => new RegExp(`^## \\[${escape(name)}\\][^\\n]*\\n`, 'm');

/**
 * Body of `## [name]` up to the next `## ` heading or link reference block,
 * without HTML comments (editing placeholders), trimmed. null when there is
 * no such heading.
 */
function changelogSection(text, name) {
    const source = text.replace(/\r\n/g, '\n');
    const heading = source.match(headingRe(name));
    if (!heading) return null;
    const rest = source.slice(heading.index + heading[0].length);
    const end = rest.search(/^## |^\[[^\]]+\]: /m);
    return (end === -1 ? rest : rest.slice(0, end)).replace(/<!--[\s\S]*?-->/g, '').trim();
}

/**
 * Turn the [Unreleased] notes into a `## [version] - date` section, leave an
 * empty [Unreleased] above it, and update the link references at the bottom.
 * Returns the text (LF-normalised) unchanged when the version already has a
 * section or there is nothing unreleased to promote.
 */
function promoteUnreleased(text, version, date) {
    const source = text.replace(/\r\n/g, '\n');
    if (headingRe(version).test(source)) return source;
    const unreleased = source.match(headingRe('Unreleased'));
    const notes = changelogSection(source, 'Unreleased');
    if (!unreleased || !notes) return source;

    // The notes move under the new heading; an HTML-comment placeholder stays
    // behind under [Unreleased] for the next round.
    const at = unreleased.index + unreleased[0].length;
    const rest = source.slice(at);
    const end = rest.search(/^## |^\[[^\]]+\]: /m);
    const body = end === -1 ? rest : rest.slice(0, end);
    const placeholders = (body.match(/<!--[\s\S]*?-->/g) ?? []).join('\n');
    let out = `${source.slice(0, at)}\n${placeholders ? placeholders + '\n\n' : ''}`
        + `## [${version}] - ${date}\n\n${notes}\n\n${end === -1 ? '' : rest.slice(end)}`;

    const previous = out.match(/^\[Unreleased\]: .*\/compare\/(v[^.\s]+\.[^.\s]+\.[^.\s]+)\.\.\.HEAD$/m)?.[1];
    out = out.replace(/^\[Unreleased\]: .*$/m, `[Unreleased]: ${REPOSITORY}/compare/v${version}...HEAD`);
    const reference = previous
        ? `[${version}]: ${REPOSITORY}/compare/${previous}...v${version}`
        : `[${version}]: ${REPOSITORY}/releases/tag/v${version}`;
    return out.replace(/^(\[Unreleased\]: .*)$/m, `$1\n${reference}`);
}

module.exports = { REPOSITORY, changelogSection, promoteUnreleased };
