# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IWAC-theme is a customized Omeka S theme (fork of Freedom theme) for the Islam West Africa Collection digital archive at ZMO Berlin. It features dark/light mode toggle, multilingual support, and modern Sass architecture.

**Live site**: https://islam.zmo.de/s/westafrica/

**Stack**: Omeka S 4.1.0+ (PHP), Sass with modern module system, Gulp build, vanilla JavaScript

## Design Philosophy

**Modern, professional, academic—but not flashy or gimmicky.**

### Core Principles
- **Subtle Elegance** - Sophisticated without being showy
- **Academic Appropriateness** - Clean typography for scholarly content
- **Cultural Sensitivity** - Respectful presentation of Islamic heritage materials
- **Functional Beauty** - Design serves usability

### Visual Guidelines
- Use the primary orange (IWAC brand) as accent, not dominant
- Subtle, muted backgrounds with high contrast for readability
- Generous whitespace and breathing room between sections
- Subtle shadows for elevation; avoid heavy drop shadows
- Fast, purposeful transitions (150-200ms); no bouncing/elastic effects
- Clear hover feedback and visible focus states

### What to Avoid
- Overly flashy animations or jarring color combinations
- Too many competing visual elements
- Unnecessary decorative elements or Web 2.0 glossy effects
- Harsh borders

## Build Commands

```bash
npm install              # Install dependencies
npm run start            # Watch mode - auto-compile on .scss changes
npm run build            # One-off production build
```

## Architecture

### Directory Structure
- `asset/sass/` - **Primary editing location** for styles (SCSS source)
- `asset/css/` - Auto-generated CSS (never edit directly)
- `asset/js/` - JavaScript files
- `view/` - PHP templates (.phtml)
- `config/theme.ini` - Theme settings definitions

### Sass Module System (Critical)

**Always use `@use`/`@forward` syntax. Never use deprecated `@import`.**

```scss
// In component files, import abstracts:
@use "../../abstracts/abstracts" as *;

// In index files, forward sub-modules:
@forward "component-name/component-name";
```

Key rules:
- `@forward` rules MUST come before any other rules in a file
- Each file using variables/mixins needs its own `@use` statement

### CSS Custom Properties (Design Tokens)

**Always use CSS custom properties instead of hardcoded values.**

| Category | Examples |
|----------|----------|
| Colors | `--primary`, `--ink`, `--surface`, `--border` |
| HSL Components | `--primary-hue`, `--primary-sat`, `--ink-lum` |
| Spacing | `--space-1` through `--space-40` |
| Shadows | `--shadow-xs` through `--shadow-xl` |
| Glows | `--glow-xs` through `--glow-xl` (primary-colored) |
| Radii | `--radius-sm`, `--radius-md`, `--radius-lg` |
| Transitions | `--transition-fast`, `--transition-base`, `--transition-slow` |
| Lifts | `--lift-xxs`, `--lift-xs`, `--lift-sm` (hover translateY) |

For opacity/color mixing, use `color-mix()`:
```scss
background: color-mix(in srgb, var(--primary) 20%, transparent);
```

### Dark/Light Theme System

Three-way support:
1. System preference: `@media (prefers-color-scheme: dark)`
2. Manual dark: `body[data-theme="dark"]`
3. Force light: `body[data-theme="light"]`

Theme colors defined in `_colors.scss`, persistence via `localStorage` key `iwac-theme-preference`.

### BEM Naming Convention

```scss
.block { }
.block__element { }
.block--modifier { }
```

## Adding a New Component

1. Create: `asset/sass/components/name/_name.scss`
2. Add at top: `@use "../../abstracts/abstracts" as *;`
3. Forward in: `asset/sass/components/_components.scss`
4. Run: `npm run build`

## PHP Templates

- Use `<?php ?>` tags (not short tags)
- Always escape output: `$this->escapeHtml()`, `$this->escapeHtmlAttr()`
- Translation: `$this->translate('String')`
- Access settings: `$this->themeSetting('setting_name')`
- Check module availability before using helpers:
```php
<?php if ($this->getHelperPluginManager()->has('helperName')): ?>
    <?= $this->helperName() ?>
<?php endif; ?>
```

## Key Files

| File | Purpose |
|------|---------|
| `asset/sass/style.scss` | Main Sass entry point |
| `asset/sass/abstracts/variables/_colors.scss` | Color system (light/dark) |
| `asset/sass/abstracts/variables/_tokens.scss` | Design tokens |
| `view/layout/layout.phtml` | Main HTML structure, dynamic color injection |
| `view/common/header.phtml` | Header with theme toggle, language switcher |
| `asset/js/theme-toggle.js` | Theme persistence logic |
| `config/theme.ini` | All theme settings definitions |

## Module Integrations

The theme integrates with: Internationalisation (language switching), Mapping, Collecting, Faceted Browse, URI Dereferencer, Universal Viewer. Always check module availability before using their helpers.

## Constraints

- Never edit files in `asset/css/` - they're auto-generated
- Never use deprecated Sass `@import` syntax
- Never hardcode colors, spacing, or other design tokens
- Respect `prefers-reduced-motion` for animations
- Test both light and dark modes
