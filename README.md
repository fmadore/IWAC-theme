# IWAC Theme: An Omeka S Theme for the Islam West Africa Collection

> **Origin**: IWAC Theme started as a fork of the [Freedom theme](https://github.com/omeka-s-themes/freedom) by the [Omeka Team](https://omeka.org) at the Corporation for Digital Scholarship. It has since diverged substantially and is maintained as a standalone theme, but we gratefully acknowledge Freedom as the foundation it grew out of.

This is a customized Omeka S theme for the [Islam West Africa Collection](https://islam.zmo.de/s/westafrica/page/home) digital archive at ZMO Berlin, with modern enhancements including a light/dark mode toggle and multilingual support.

![IWAC Theme](https://github.com/fmadore/IWAC-theme/blob/master/theme.jpg?raw=true)

## Features

### Light/Dark Mode Toggle
- User-selectable theme with toggle button in the header
- Respects system preference (`prefers-color-scheme`) as default
- Persists user choice in `localStorage`
- Smooth transitions between themes
- Accessible keyboard navigation and ARIA labels

### Language Switcher
- Integration with the [Internationalisation module](https://github.com/Daniel-KM/Omeka-S-module-Internationalisation)
- Displays current language with flag-style abbreviation (EN/FR)
- Dropdown menu for switching between available translations
- Only visible when module is installed and page has translations

### Installable PWA
- Each site is installable as an app ("Add to Home Screen" / desktop "Install") with a brand icon
- Quiet install button in the masthead — **no auto-popup**; it only appears when the browser can install
- iOS Safari gets a click-only "Share → Add to Home Screen" hint
- Per-site web-app manifest (name, icons, theme color, Browse/Search shortcuts) built at runtime
- Toggle off via **General Settings → Enable PWA**. See [`docs/PWA.md`](docs/PWA.md)

### Modern Design System
- **CSS Custom Properties** - Comprehensive design token system for colors, spacing, typography
- **OKLCH Color System** - Perceptually-uniform palette derived from a single admin-set brand seed (`--primary-base`) via `color-mix(in oklab, …)`
- **Display-tier fluid type** - `clamp()` on the largest headings; a fixed `rem` scale for body/UI so labels don't drift between breakpoints
- **Source Serif 4 + Public Sans** - font stacks exposed as `--font-*` tokens for sibling modules to consume
- **Logical Properties** - RTL-ready with `margin-inline`, `padding-block`, etc.

### Additional Features
- **Responsive** - Mobile-first approach with flexible layouts
- **Accessible** - WCAG 2.1 AA compliant with proper contrast ratios
- **Customizable** - Extensive theme settings and Sass-based styling
- **Modular Sass** - Modern `@use`/`@forward` syntax (no deprecated `@import`)

## Requirements

- **Omeka S**: 4.1.0 or higher
- **PHP**: 8.1 or higher
- **Node.js**: 18.x or higher (for Sass compilation)

### Optional Modules
- [Internationalisation](https://github.com/Daniel-KM/Omeka-S-module-Internationalisation) - For language switching functionality

## Installation

For basic out-of-the-box use of the theme, follow the [Omeka S User Manual instructions for installing themes](https://omeka.org/s/docs/user-manual/sites/site_theme/#installing-themes).

For more advanced use, such as customizing the theme with Sass, you'll need to install the tools with [NodeJS](https://nodejs.org/en/) (18.x or greater). Navigate to your theme directory and run:

```bash
npm install
```

## Theme Settings

### General Settings
- **Primary Color** - The theme's primary brand color (default: `#E64A19`, IWAC Burnt Orange). Every primary variant (hover, active, focus ring, glows, blockquote) and the data-visualization sequential ramps derive from it via `color-mix(in oklab, …)`. Automatically adapts for dark mode.
- **Secondary Color** - A second, **non-brand** color used only for data visualizations — chart series 2 and corpus comparison in the IwacVisualizations module (default: `#394f68`, slate blue). Not used for buttons, links, or focus. See [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md).
- **Enable PWA (installable app)** - Adds the web app manifest, icons, and the masthead install button so visitors can install the site as an app. Default on. See [`docs/PWA.md`](docs/PWA.md).

### Header Layout
- Inline logo and menu
- Centered logo and menu

### Top Navigation Depth
Maximum number of levels to show in the site's top navigation bar. Set to 0 to show all levels.

### Logo
A custom logo (SVG, JPG, PNG)

### Banner
- Banner image
- Heading
- Description
- Content position
- Banner width
- Banner height
- Banner height for mobile devices
- Banner image vertical position within the wrapper
- Banner image horizontal position within the wrapper

### Footer
- Footer Logo
- Footer Site description
- Footer Menu
- Footer Menu Depth
- Footer Content
- Footer Copyright

### Social Media
- Facebook
- Twitter
- LinkedIn
- Instagram
- Youtube
- Mastodon

### Image Settings
- Decorative border for Media and/or Assets

### Resource Tags
- Show tags based on Resource Type or Class

### Browse Settings
- Layout for Browse Pages
- Truncate Body Property

## Customizing the Theme

If you want to customize the site with your own CSS, the [CSS Editor](https://omeka.org/s/modules/CSSEditor/) module allows site administrators to write style overrides.

For advanced CSS and Sass users, this theme includes variables and mixins for managing and extending many styles.

### Sass Tasks

Run these commands within the theme's root directory.

* **npm run start**: While this task runs, it watches for changes to sass files and recompiles the CSS.
* **npm run build**: One-off task for compiling the current Sass/CSS.
* **gulp css**: Alias for `npm run build`.
* **gulp css:watch**: This task watches for changes in the Sass, then compiles the CSS.

### Sass Module System

This theme uses the modern Sass module system with `@use` and `@forward` (not deprecated `@import`).

```scss
// In component files, import abstracts:
@use "../../abstracts/abstracts" as *;

// In index files, forward sub-modules:
@forward "component-name";
```

**Key rules:**
- `@forward` rules must come before any other rules
- Each file using variables/mixins needs its own `@use` statement
- Use `as *` to access members without namespace prefix

### Sass File Structure

The full, authoritative structure lives under `asset/sass/`. The high-level layout is:

```text
sass/
├── abstracts/          # Variables, tokens, mixins (no output)
│   ├── mixins/
│   └── variables/      # _breakpoints, _colors, _layout, _tokens, _typography
├── base/               # Element & layout baseline (buttons, fields, links…)
│   ├── elements/
│   ├── layout/
│   ├── typography/
│   └── _theme.scss     # Dark/light theme infrastructure
├── components/         # Component styles (BEM-scoped)
│   ├── accordion, advanced-search, annotation, banner
│   ├── blocks/         # Block-layout styles (carousel, timeline, …)
│   ├── breadcrumbs, error-page, footer, header
│   ├── hierarchy, iframe-embed, linked-resources, local-contexts
│   ├── mapping, metadata, mirador, navigation, pagination
│   ├── resources/      # resource-grid, resource-list, browse-controls
│   └── search-results, sentiment, uri-dereferencer, user-bar
├── generic/            # Box-sizing, normalize
└── utilities/          # Accessibility, alignments, clearfix, print
```

See `CLAUDE.md` for design-token guidelines and the canonical list of CSS
custom properties.

## Utility Classes

IWAC Theme offers a set of predefined utility classes that will help you to add styles to certain elements by just assigning them these classes.

You can even combine multiple utility classes.

- `inline`
- `alignleft`
- `alignright`
- `aligncenter`
- `alignfull`
- `alignwide`
- `alignnarrow`
- `textleft`
- `textright`
- `textcenter`
- `clearfix`
- `screen-reader-text`

## Module Integration

### Internationalisation Module

This theme is designed to work with the [Internationalisation module](https://github.com/Daniel-KM/Omeka-S-module-Internationalisation) for language switching.

**Setup:**
1. Install and configure the Internationalisation module
2. Create translated versions of your site pages
3. The language switcher will automatically appear in the header

The language switcher displays:
- Current language code (e.g., "EN" or "FR")
- Dropdown with available translations for the current page
- Links styled consistently with the theme

### Sibling Modules (Shared Design System)

Two companion modules are part of the **same design system** and *consume* the
theme's design tokens rather than defining their own. The full contract — which
tokens they may use, the canonical fallback values, dark-mode rules, and the
one sanctioned exception (module-owned chart/data colours) — is documented in
[**`docs/DESIGN-SYSTEM.md`**](docs/DESIGN-SYSTEM.md).

- **[IwacSearch](https://github.com/fmadore/IwacSearch)** - Typesense-backed public search (Svelte 5). The header search box (`view/common/search-form.phtml`) feeds the module's typeahead via a `data-iwac-header-search` hook; the public/admin apps mount on `[data-iwac-search-root]` / `[data-iwac-admin-root]`. All colours, type, and spacing resolve from the theme's `--*` tokens.
- **[IwacVisualizations](https://github.com/fmadore/IwacVisualizations)** - ECharts/MapLibre dashboards on the homepage and resource pages. Reads theme tokens at runtime (so charts track light/dark and admin colour overrides) and uses the admin **Secondary Color** as chart series 2 / corpus B.

### Other Supported Modules

The theme also includes styling for:
- **Mapping** - Interactive maps on resource pages
- **Collecting** - User submission forms
- **Numeric Data Types** - Date/time and number fields
- **URI Dereferencer** - External linked data display

## Design Tokens

The theme uses CSS custom properties for consistent theming. Only the tokens
listed below are stable — do **not** invent new token names, and see
`CLAUDE.md` for the full reference and common-mistake table.

```css
/* Colors (semantic, auto-adapted for light/dark theme) */
--primary, --primary-hover, --primary-active
--secondary    /* 2nd categorical/data-series colour (charts) — not UI chrome */
--ink          /* primary text */
--muted        /* secondary/muted text */
--surface      /* page background */
--surface-raised  /* cards, panels, hover surfaces */
--border, --border-light
--focus-color

/* Spacing scale (4px base) */
--space-1 through --space-40
--space-sm, --space-md, --space-lg, --space-xl

/* Typography */
--text-xs, --text-sm, --text-base, --text-lg   /* fixed rem scale (body/UI) */
--text-xl, --text-2xl, --text-3xl, --text-4xl  /* 3xl/4xl use fluid clamp() */
--font-headings, --font-body, --font-mono       /* font stacks (consumed by modules) */
--line-height-normal, --line-height-relaxed

/* Effects */
--shadow-sm, --shadow-md, --shadow-lg
--radius-sm, --radius-md, --radius-lg, --radius-full
--transition-fast, --transition-base, --transition-slow

/* Accent mixing (for tinted borders/backgrounds) */
--accent-mix-subtle, --accent-mix-medium, --accent-mix-strong
```

The raw brand seeds `--primary-base` and `--secondary-base` are injected at
runtime from the admin's Primary/Secondary Color settings in
`view/layout/layout.phtml`; every variant (hover/active, focus ring, glows,
blockquote, chart ramps…) is derived from them in Sass via
`color-mix(in oklab, …)`. The old HSL components `--primary-hue` /
`--primary-sat` were removed in the OKLCH migration.

For how the **IwacSearch** and **IwacVisualizations** modules consume these
tokens — including the canonical fallback values and the module-owned
data-colour exception — see [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md).

## Credits & Acknowledgments

IWAC Theme began as a fork of the [Freedom theme](https://github.com/omeka-s-themes/freedom) (v1.1.0) developed by the Omeka Team at the [Corporation for Digital Scholarship](https://digitalscholar.org). Freedom provided the initial foundation and architecture; the theme has since evolved its own design system, build pipeline, and component library, and is now maintained as a standalone project (no longer linked to the upstream fork network on GitHub).

**Original Freedom Theme Authors:**
- Omeka Team / Corporation for Digital Scholarship
- Nelson Amaya (Out of the Bugs)

We extend our sincere thanks for their excellent work, which made it possible to bootstrap this theme on a solid, well-structured base.

## Copyright

IWAC Theme is Copyright © 2024-present Frédérick Madore / ZMO Berlin

**Based on Freedom S**, Copyright © 2023-present Corporation for Digital Scholarship, Vienna, Virginia, USA http://digitalscholar.org

The Corporation for Digital Scholarship distributes the Omeka source code
under the GNU General Public License, version 3 (GPLv3). The full text
of this license is given in the license file.

The Omeka name is a registered trademark of the Corporation for Digital Scholarship.

Third-party copyright in this distribution is noted where applicable.

All rights not expressly granted are reserved.
