---
trigger: always_on
---

# IWAC Theme - Project Overview

## About This Project

This is **IWAC-theme** (Islam West Africa Collection theme), a customized fork of the [Omeka S Freedom theme](https://github.com/omeka-s-themes/freedom) for the [Islam West Africa Collection](https://islam.zmo.de/s/westafrica/page/home) digital archive.

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Omeka S    | 4.2.0+  | Platform |
| PHP        | 7.4+    | Templates |
| Sass       | SCSS    | Styling source |
| Gulp       | Latest  | Build automation |
| Node.js    | LTS     | Build tooling |

## Project Goals

1. **Modernize the theme** with contemporary design patterns
2. **Implement light/dark theme toggle** with CSS custom properties
3. **Add language switcher** using the Internationalisation module
4. **Professional, academic aesthetic** suitable for scholarly content
5. **Accessibility-first** approach (WCAG 2.1 AA)

## Key Directories

```
IWAC-theme/
├── asset/
│   ├── css/              # Compiled CSS (never edit directly)
│   ├── img/              # Theme images
│   ├── js/               # JavaScript files
│   └── sass/             # Sass source (primary editing location)
│       ├── abstracts/    # Variables, mixins, functions
│       ├── base/         # Base elements, layout, typography
│       ├── components/   # UI components
│       ├── generic/      # Normalize, resets
│       └── utilities/    # Utility classes
├── config/theme.ini      # Theme configuration
├── helper/               # PHP view helpers
└── view/                 # PHP templates (.phtml)
```

## Critical Rules

- NEVER edit files in asset/css/ - always modify Sass source files.
- Always use CSS custom properties instead of hardcoded values for theming support.

## Build Commands

```bash
# Install dependencies
npm install

# Development (watch mode)
npm run start

# Production build
npm run build
```

## Cultural Context

This theme serves the Islam West Africa Collection (IWAC) at ZMO Berlin:
- **Multilingual**: French and English
- **Academic context**: Clean, readable typography for scholarly content
- **Cultural sensitivity**: Appropriate visual design for Islamic cultural heritage
- **Accessibility**: Wide international audience with varying internet speeds
