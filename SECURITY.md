# Security policy

## Supported versions

Only the latest tagged release and the current `master` receive fixes. The theme
runs on one deployment (the two sites at islam.zmo.de); there are no maintained
back-branches.

## Reporting a vulnerability

Please report privately through GitHub's
[private vulnerability reporting](https://github.com/fmadore/IWAC-theme/security/advisories/new)
rather than opening a public issue. Expect an acknowledgement within a few
working days.

## What is security-relevant here

The theme is presentation: templates, view helpers, a stylesheet and a few
scripts. It holds no credentials and runs no queries of its own beyond Omeka's
API. What can still go wrong:

- **Output escaping in templates and helpers.** Every value a template prints
  comes from Omeka records, site settings or the request. A value printed
  without the matching escaper (`escapeHtml`, `escapeHtmlAttr`, a `json_encode`
  with the `JSON_HEX_*` flags inside a script) is in scope, and so is a query
  parameter reflected into the page.
- **Theme settings that reach CSS or URLs.** Settings such as the banner height
  and the brand colours are validated by helpers (`CssLength`, `BrandSeeds`,
  `PageHead::imageValue()`) before they are printed into a `style` attribute or
  rule; a way past those checks is in scope.
- **Private records.** The theme must not show a private item, media or item set
  to a visitor who cannot see it in Omeka itself.
- **The release archive.** A release that ships development files, or an
  archive that differs from the one the workflow built and checked (each
  release carries a `.sha256` and a build provenance attestation:
  `gh attestation verify <zip> --repo fmadore/IWAC-theme`).

## Out of scope

- Findings in [Omeka S](https://github.com/omeka/omeka-s) itself or in the
  modules the sites run (IwacSearch, IwacVisualizations and IWAC-SEO have their
  own repositories) — report those there.
- Server and deployment configuration of islam.zmo.de (TLS, headers, caching).
- Vulnerabilities in development dependencies that cannot reach the shipped
  theme: every npm package here is a build tool, and none is in the release
  archive (`npm run check:audit` and `scripts/lib/audit-exceptions.js`).
- Automated scanner output submitted without a working proof of concept.
