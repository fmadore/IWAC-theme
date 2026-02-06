# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IWAC-theme is a customized Omeka S theme (fork of Freedom theme) for the Islam West Africa Collection digital archive at ZMO Berlin. It features dark/light mode toggle, multilingual support, and modern Sass architecture.

**Live site**: https://islam.zmo.de/s/westafrica/

**Stack**: Omeka S 4.1.0+ (PHP), Sass with modern module system, Gulp build, vanilla JavaScript

## Design Philosophy

**Modern, professional, academic—warm and inviting without being flashy.**

This is primarily a **newspaper collection** (not manuscripts), so the aesthetic should feel clean, editorial, and journalistic rather than archival or antiquarian.

### Core Principles
- **Warm Professionalism** - Inviting warmth through color while maintaining scholarly credibility
- **Editorial Clarity** - Clean typography suited for reading newspaper content
- **Cultural Sensitivity** - Respectful presentation of Islamic heritage materials
- **Functional Beauty** - Design serves usability and readability

### Color Philosophy
The light theme uses **warm neutral tones** (hue ~35-40) rather than cold blue-grays:
- Surfaces have a subtle cream undertone (not stark white)
- Borders and shadows carry warm gray tones
- The primary orange (IWAC brand) harmonizes with the warm base
- A subtle atmospheric gradient adds depth without distraction

This warmth creates visual comfort for extended reading sessions while differentiating the site from generic "default Bootstrap" aesthetics.

### Visual Guidelines
- Use the primary orange (IWAC brand) as accent, not dominant
- Warm neutral backgrounds with high contrast for readability
- Generous whitespace and breathing room between sections
- Warm-tinted shadows for elevation; avoid harsh black shadows
- Fast, purposeful transitions (150-200ms); no bouncing/elastic effects
- Clear hover feedback and visible focus states
- Subtle atmospheric depth in light theme (warm glow from top)

### Component Styling Approach
Key UI components use subtle accent integration for visual cohesion:
- **Metadata properties** have accent-tinted left borders and card treatment
- **Breadcrumbs** show current page with accent dot marker
- **Resource cards** reveal accent line on hover
- **Pagination** has subtle accent-tinted top border
- **Facet legends** use accent-tinted backgrounds and borders
- **Search results** show accent border on hover

This creates consistent visual language without overwhelming the content.

### What to Avoid
- Cold, clinical blue-gray color schemes (feels like a generic template)
- Parchment/manuscript aesthetics (this is newspapers, not illuminated texts)
- Overly flashy animations or jarring color combinations
- Too many competing visual elements
- Unnecessary decorative elements or Web 2.0 glossy effects
- Harsh borders or stark black shadows

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

**CRITICAL: Only use tokens defined in `_colors.scss`, `_tokens.scss`, `_typography.scss`. Do NOT invent token names - undefined tokens fail silently at runtime.**

| Category | Pattern | Examples |
|----------|---------|----------|
| Colors | direct names | `--primary`, `--primary-hover`, `--ink`, `--muted`, `--surface`, `--surface-raised`, `--border`, `--border-light` |
| Text sizes | `--text-{size}` | `--text-xs`, `--text-sm`, `--text-base`, `--text-lg`, `--text-2xl` |
| Spacing | `--space-{n}` | `--space-1` through `--space-40` (also `--space-sm`, `--space-md`, etc.) |
| Effects | `--shadow-{size}`, `--radius-{size}` | `--shadow-sm`, `--shadow-md`, `--radius-md`, `--radius-lg` |
| Accent lines | `--accent-line-{size}` | `--accent-line-sm` (2px), `--accent-line-md` (3px) |
| Transitions | `--transition-{speed}` | `--transition-fast`, `--transition-base`, `--transition-slow` |
| Line height | `--line-height-{type}` | `--line-height-normal`, `--line-height-relaxed` |
| Accent mix | `--accent-mix-{strength}` | `--accent-mix-subtle` (25%), `--accent-mix-medium` (40%), `--accent-mix-strong` (60%) |

**Common mistakes - these tokens DON'T exist:**
| Wrong | Correct |
|-------|---------|
| `--surface-alt`, `--surface-hover` | `--surface-raised` |
| `--ink-muted`, `--text-muted` | `--muted` |
| `--font-size-*` | `--text-*` |
| `--leading-*` | `--line-height-*` |
| `--border-dark`, `--border-strong`, `--border-hover` | `--border` |
| `--accent` | `--primary` (accent alias was removed) |
| `--line-height-tight` | Use `1.25` directly or `$font__headings-line-height` |
| `--font-weight-*` | Use numeric values directly (400, 500, 600, 700) |

For color variations, use `color-mix()` with accent-mix tokens for consistency:
```scss
// Use standardized accent-mix tokens for consistent accent tinting
border-color: color-mix(in srgb, var(--primary) var(--accent-mix-medium), var(--border));
background: color-mix(in srgb, var(--primary) 20%, transparent);
```

### Shared Mixins (`_mixins.scss`)

Use these mixins for consistent component patterns:

| Mixin | Purpose | Usage |
|-------|---------|-------|
| `@include card-hover` | Lift + shadow + accent border on hover | Resource cards, carousel slides |
| `@include focus-ring` | Consistent `focus-visible` outline | Interactive elements (buttons, links) |
| `@include accent-line-top($opacity)` | Accent gradient line at top of element | Resource grid cards (opacity: 0 on load) |
| `@include accent-line-left` | Accent line on left side | Resource list cards, metadata |
| `@include pagination-container` | Shared pagination layout with accent border | All pagination components |
| `@include title-link` | Consistent resource title link styling | Resource grid/list titles |
| `@include primary-button` / `@include secondary-button` | Button variants | Buttons, pagination controls |

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
- **Never invent CSS custom property names** - only use tokens explicitly listed in the "CSS Custom Properties" section above
- Respect `prefers-reduced-motion` for animations
- Test both light and dark modes
- Run `npm run build` after changes to verify compilation
