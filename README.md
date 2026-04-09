# IWAC Theme: An Omeka S Theme for the Islam West Africa Collection

> **Fork Notice**: This theme is a fork of the [Freedom theme](https://github.com/omeka-s-themes/freedom) by the [Omeka Team](https://omeka.org) at the Corporation for Digital Scholarship. We gratefully acknowledge their work as the foundation for this theme.

This is a customized Omeka S theme for the [Islam West Africa Collection](https://islam.zmo.de/s/westafrica/page/home) digital archive at ZMO Berlin. It extends the Freedom theme with modern enhancements including light/dark mode toggle and multilingual support.

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

### Modern Design System
- **CSS Custom Properties** - Comprehensive design token system for colors, spacing, typography
- **HSL Color System** - Dynamic color generation from admin settings
- **Fluid Typography** - Responsive text sizing with `clamp()`
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
- **Primary Color** - The theme's primary brand color (default: `#E64A19`, IWAC Burnt Orange). Automatically adapts for dark mode.
- **Secondary Color** - Footer and secondary UI elements (default: `#394f68`, slate blue)
- **Accent Color** - Alternative accent color for special highlights (default: `#394f68`)

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
│   ├── breadcrumbs, error-page, facets, footer, header
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

### Other Supported Modules

The theme includes styling for:
- **Mapping** - Interactive maps on resource pages
- **Collecting** - User submission forms
- **Faceted Browse** - Advanced search with facets
- **Numeric Data Types** - Date/time and number fields
- **URI Dereferencer** - External linked data display

## Design Tokens

The theme uses CSS custom properties for consistent theming. Only the tokens
listed below are stable — do **not** invent new token names, and see
`CLAUDE.md` for the full reference and common-mistake table.

```css
/* Colors (semantic, auto-adapted for light/dark theme) */
--primary, --primary-hover, --primary-active
--ink          /* primary text */
--muted        /* secondary/muted text */
--surface      /* page background */
--surface-raised  /* cards, panels, hover surfaces */
--border, --border-light
--focus-color

/* Spacing scale (4px base) */
--space-1 through --space-40
--space-sm, --space-md, --space-lg, --space-xl

/* Typography (fluid clamp-based) */
--text-xs, --text-sm, --text-base, --text-lg
--text-xl, --text-2xl, --text-3xl, --text-4xl
--line-height-normal, --line-height-relaxed

/* Effects */
--shadow-sm, --shadow-md, --shadow-lg
--radius-sm, --radius-md, --radius-lg, --radius-full
--transition-fast, --transition-base, --transition-slow

/* Accent mixing (for tinted borders/backgrounds) */
--accent-mix-subtle, --accent-mix-medium, --accent-mix-strong
```

The primary-color HSL components (`--primary-hue`, `--primary-sat`) are
injected at runtime from the admin settings in `view/layout/layout.phtml`.

## Credits & Acknowledgments

This theme is a **fork** of the [Freedom theme](https://github.com/omeka-s-themes/freedom) (v1.1.0) developed by the Omeka Team at the [Corporation for Digital Scholarship](https://digitalscholar.org). The original theme provided the foundation, architecture, and many of the features present in this customized version.

**Original Freedom Theme Authors:**
- Omeka Team / Corporation for Digital Scholarship
- Nelson Amaya (Out of the Bugs)

We extend our sincere thanks for their excellent work on creating such a well-structured and customizable theme.

## Copyright

IWAC Theme is Copyright © 2024-present Frédérick Madore / ZMO Berlin

**Based on Freedom S**, Copyright © 2023-present Corporation for Digital Scholarship, Vienna, Virginia, USA http://digitalscholar.org

The Corporation for Digital Scholarship distributes the Omeka source code
under the GNU General Public License, version 3 (GPLv3). The full text
of this license is given in the license file.

The Omeka name is a registered trademark of the Corporation for Digital Scholarship.

Third-party copyright in this distribution is noted where applicable.

All rights not expressly granted are reserved.
