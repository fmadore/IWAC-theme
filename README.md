# IWAC Theme: An Omeka S Theme for the Islam West Africa Collection

> **Fork Notice**: This theme is a fork of the [Freedom theme](https://github.com/omeka-s-themes/freedom) by the [Omeka Team](https://omeka.org) at the Corporation for Digital Scholarship. We gratefully acknowledge their work as the foundation for this theme.

This is a customized Omeka S theme for the [Islam West Africa Collection](https://islam.zmo.de/s/westafrica/page/home) digital archive at ZMO Berlin. It extends the Freedom theme with modern enhancements including light/dark mode toggle and multilingual support.

![IWAC Theme](https://github.com/fmadore/IWAC-theme/blob/master/theme.jpg?raw=true)

## Features

- **Light/Dark Mode Toggle** - User-selectable theme with system preference detection
- **Language Switcher** - Integration with the [Internationalisation module](https://github.com/Daniel-KM/Omeka-S-module-Internationalisation)
- **Modern Design** - Clean, accessible interface optimized for academic content
- **Customizable** - Extensive theme settings and Sass-based styling
- **Responsive** - Mobile-first approach with flexible layouts

## Installation

For basic out-of-the-box use of the theme, follow the [Omeka S User Manual instructions for installing themes](https://omeka.org/s/docs/user-manual/sites/site_theme/#installing-themes).

For more advanced use, such as customizing the theme with Sass, you'll need to install the tools with [NodeJS](https://nodejs.org/en/) (16.x or greater). Navigate to your theme directory and run:

```bash
npm install
```

## Theme Settings

### General Settings
- **Primary Color** - The theme's primary color (default: #e77f11)
- **Secondary Color** - Background and secondary elements color
- **Accent Color** - Links and accent elements color

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
* **gulp css**: This is the one-off task for compiling the current Sass/CSS.
* **gulp css:watch**: This task watches for changes in the Sass, then compiles the CSS.

### Sass File Structure

```bash
sass
    ├── abstracts
    │   ├── mixins
    │   └── variables
    │       ├── breakpoints
    │       ├── colors
    │       ├── layout
    │       └── typography
    ├── base
    │   ├── elements
    │   │   ├── body
    │   │   ├── buttons
    │   │   ├── caption
    │   │   ├── fields
    │   │   ├── hr
    │   │   ├── icons
    │   │   ├── language-tag
    │   │   ├── links
    │   │   ├── lists
    │   │   ├── media
    │   │   ├── resource-description
    │   │   ├── resource-tag
    │   │   ├── tables
    │   │   ├── titles
    │   │   └── tooltip
    │   ├── layout
    │   │   ├── layout
    │   │   └── regions
    │   └── typography
    │       ├── copy
    │       ├── headings
    │       └── typography
    ├── components
    │   ├── accordion
    │   ├── advanced-search
    │   ├── annotation
    │   ├── banner
    │   ├── blocks
    │   │   ├── assets
    │   │   ├── browse-preview
    │   │   ├── carousel
    │   │   ├── collecting
    │   │   ├── item-showcase
    │   │   ├── item-with-metadata
    │   │   ├── list-of-sites
    │   │   ├── media-embed
    │   │   ├── table-of-contents
    │   │   └── timeline
    │   ├── breadcrumbs
    │   ├── facets
    │   ├── footer
    │   ├── header
    │   ├── linked-resources
    │   ├── metadata
    │   ├── navigation
    │   ├── pagination
    │   ├── resources
    │   │   ├── browse-controls
    │   │   ├── resource-grid
    │   │   ├── resource-list
    │   ├── search-results
    │   ├── uri-dereferencer
    │   └── user-bar
    ├── generic
    │   ├── box-sizing
    │   └── normalize
    └── utilities
        ├── accessibility
        ├── alignments
        └── clearfix
```

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

This theme is designed to work with the [Internationalisation module](https://github.com/Daniel-KM/Omeka-S-module-Internationalisation) for language switching. The language switcher is automatically displayed in the header when the module is installed and configured.

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
