# GitHub Copilot Instructions for IWAC Theme

## Project Overview

This is **IWAC-theme** (Islam West Africa Collection theme), a customized fork of the [Omeka S Freedom theme](https://github.com/omeka-s-themes/freedom) for the [Islam West Africa Collection](https://islam.zmo.de/s/westafrica/page/home) digital archive.

### Project Goals
1. **Modernize the theme** with contemporary design patterns
2. **Implement light/dark theme toggle** with CSS custom properties
3. **Add language switcher** using the [Internationalisation module](https://github.com/Daniel-KM/Omeka-S-module-Internationalisation)
4. **Customize styling through Sass** - all style changes should be made in the Sass source files

---

## Technology Stack

- **Platform**: Omeka S 4.1.0+
- **PHP**: 7.4+
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **CSS Preprocessor**: Sass (SCSS syntax)
- **Build Tools**: Gulp, Node.js
- **Template Engine**: PHP (phtml files)

---

## Project Structure

```
IWAC-theme/
├── asset/
│   ├── css/              # Compiled CSS (do not edit directly)
│   ├── img/              # Theme images
│   ├── js/               # JavaScript files
│   └── sass/             # Sass source files (primary editing location)
│       ├── abstracts/    # Variables, mixins
│       ├── base/         # Base elements, layout, typography
│       ├── components/   # UI components (header, footer, navigation, etc.)
│       ├── generic/      # Normalize, box-sizing, resets
│       └── utilities/    # Utility classes
├── config/
│   └── theme.ini         # Theme configuration and settings
├── helper/               # PHP view helpers
├── view/
│   ├── common/           # Shared partials (header, footer, banner, etc.)
│   ├── layout/           # Main layout template
│   └── omeka/site/       # Page-specific templates
├── gulpfile.js           # Gulp build configuration
└── package.json          # Node.js dependencies
```

---

## Coding Standards

### Sass/SCSS

- **Always edit Sass files** in `asset/sass/`, never edit compiled CSS directly
- Use **SCSS syntax** (not indented Sass)
- Follow **BEM naming convention**: `.block__element--modifier`
- Use **CSS custom properties** (CSS variables) for theming support
- Use **`@use`/`@forward`** syntax (not deprecated `@import`)
- Define colors in `asset/sass/abstracts/variables/_colors.scss`
- Define breakpoints in `asset/sass/abstracts/variables/_breakpoints.scss`
- Create mixins in `asset/sass/abstracts/mixins/_mixins.scss`

#### Sass Module System
The project uses the modern Sass module system with `@use` and `@forward`:

```scss
// In leaf files (files with actual styles), import abstracts:
@use "../../abstracts/abstracts" as *;

// In index files, forward sub-modules:
@forward "sub-module";
```

**Key rules:**
- `@forward` rules must come before any other rules in a file
- Each file that uses Sass variables/mixins needs its own `@use` statement
- Use `as *` to access members without namespace prefix

#### CSS Custom Properties (Preferred)

The project uses **CSS custom properties directly** rather than Sass variables for theming. This enables runtime theme switching.

> **⚠️ CRITICAL: Always use CSS custom properties instead of hardcoded values!**
> This ensures consistency across the theme, enables dark mode support, and makes future updates easier. Never hardcode colors, spacing, shadows, or transitions.

```scss
// ✅ PREFERRED: Use CSS custom properties directly
.button {
    background: var(--primary);
    color: var(--white);
    box-shadow: var(--glow-sm);
    transition: background-color var(--transition-fast);
    padding: var(--space-4) var(--space-8);
    border-radius: var(--radius-md);
}

// ❌ AVOID: Hardcoded values
.button {
    background: #e77f11;           // Use var(--primary)
    color: white;                   // Use var(--white)
    box-shadow: 0 2px 6px rgba(...); // Use var(--shadow-sm) or var(--glow-sm)
    transition: 0.2s ease;          // Use var(--transition-base)
    padding: 16px 32px;             // Use var(--space-4) var(--space-8)
    border-radius: 10px;            // Use var(--radius-md)
}

// ❌ AVOID: Legacy Sass variables (being phased out)
$color__primary: var(--primary);  // Don't create new ones
```

**Key CSS custom property categories:**
- **Colors**: `--primary`, `--primary-hover`, `--ink`, `--ink-light`, `--muted`, `--surface`, `--border`, `--white`, `--black`
- **Color HSL Components** (for derived colors): `--primary-hue`, `--primary-sat`, `--ink-hue`, `--ink-sat`, `--ink-lum`
- **Spacing**: `--space-1` through `--space-40`, or semantic `--space-sm`, `--space-md`, etc.
- **Shadows**: `--shadow-xs` through `--shadow-xl`
- **Glows**: `--glow-xs` through `--glow-xl` (primary-colored shadows)
- **Radii**: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full`
- **Transitions**: `--transition-fast`, `--transition-base`, `--transition-slow`
- **Layout**: `--content-max-width`, `--content-max-width-narrow`, `--content-max-width-wide`
- **Typography**: `--font-weight-medium`, `--font-weight-bold`, `--line-height-relaxed`
- **Effects**: `--backdrop-blur-sm/md/lg/xl`, `--gradient-primary`, `--text-shadow-dark`

**For overlays and dynamic colors using HSL:**
```scss
// Using ink color with custom opacity for overlays
background: hsl(var(--ink-hue) var(--ink-sat) var(--ink-lum) / 0.5);

// Using primary color with custom opacity
background: hsl(var(--primary-hue) 70% 50% / 0.15);
```

### PHP Templates

- Use `<?php ?>` tags, not short tags
- Always escape output: `$this->escapeHtml()`, `$this->escapeHtmlAttr()`
- Use translation helper: `$this->translate('String')` or `$translate('String')`
- Check for module availability before using module helpers:
  ```php
  <?= $this->getHelperPluginManager()->has('languageSwitcher') ? $this->languageSwitcher() : '' ?>
  ```

### JavaScript

- Use ES6+ syntax (const, let, arrow functions, template literals)
- Prefer vanilla JavaScript over jQuery for new code
- Use `DOMContentLoaded` event for initialization
- Store theme preference in `localStorage`

---

## Key Features to Implement

### 1. Dark/Light Theme Toggle

**Implementation Strategy:**
- Use CSS custom properties defined in `:root` for light theme
- Override with `[data-theme="dark"]` selector for dark theme
- Store preference in `localStorage`
- Respect `prefers-color-scheme` media query as default

**Files to modify:**
- `asset/sass/abstracts/variables/_colors.scss` - Add dark mode color variables
- `asset/sass/base/_base.scss` or create `asset/sass/base/_theme.scss` - Theme switching logic
- `asset/js/script.js` or create `asset/js/theme-toggle.js` - JavaScript toggle logic
- `view/common/header.phtml` - Add toggle button UI

**Theme Toggle Button Example:**
```html
<button class="theme-toggle" aria-label="Toggle dark mode" data-theme-toggle>
    <span class="theme-toggle__icon theme-toggle__icon--light">☀️</span>
    <span class="theme-toggle__icon theme-toggle__icon--dark">🌙</span>
</button>
```

### 2. Language Switcher

**Implementation Strategy:**
- Use the Internationalisation module's `languageSwitcher()` view helper
- Add to header area in `view/layout/layout.phtml` or `view/common/header.phtml`
- Style the language switcher in `asset/sass/components/header/`
- Create custom partial at `view/common/language-switcher.phtml` if needed

**Integration Code:**
```php
<?php // In header.phtml or layout.phtml ?>
<?php if ($this->getHelperPluginManager()->has('languageSwitcher')): ?>
    <div class="language-switcher">
        <?= $this->languageSwitcher() ?>
    </div>
<?php endif; ?>
```

---

## CSS Custom Properties Reference

The theme uses a comprehensive CSS custom properties system defined in:
- `asset/sass/abstracts/variables/_colors.scss` - Colors & theming
- `asset/sass/abstracts/variables/_tokens.scss` - Spacing, shadows, effects
- `asset/sass/abstracts/variables/_typography.scss` - Font sizes

### Color System (HSL-based)
```css
:root {
    /* Primary (IWAC orange) */
    --primary: hsl(28, 74%, 52%);
    --primary-hover: hsl(28, 74%, 47%);
    --primary-active: hsl(28, 86%, 42%);
    
    /* Ink (text) */
    --ink: hsl(222, 24%, 14%);
    --ink-light: hsl(222, 18%, 36%);
    --muted: hsl(222, 14%, 52%);
    
    /* Surfaces */
    --surface: hsl(0, 0%, 100%);
    --surface-raised: hsl(210, 33%, 97%);
    --background: hsl(210, 40%, 96%);
    
    /* Borders */
    --border: hsl(210, 24%, 86%);
    --border-light: hsl(210, 24%, 92%);
    
    /* Status */
    --success: hsl(152, 45%, 52%);
    --warning: hsl(22, 100%, 50%);
    --error: hsl(355, 90%, 47%);
    --info: hsl(210, 75%, 52%);
}
```

### Design Tokens
```css
:root {
    /* Shadows */
    --shadow-sm, --shadow-md, --shadow-lg, --shadow-xl
    
    /* Glows (primary-colored, for buttons/accents) */
    --glow-xs, --glow-sm, --glow-md, --glow-lg, --glow-xl
    
    /* Spacing */
    --space-1 (4px) through --space-40 (160px)
    
    /* Border Radius */
    --radius-sm (6px), --radius-md (10px), --radius-lg (14px)
    
    /* Transitions */
    --transition-fast (150ms), --transition-base (200ms), --transition-slow (300ms)
    
    /* Backdrop Blur */
    --backdrop-blur-sm, --backdrop-blur-md, --backdrop-blur-lg
    
    /* Interactive Transforms */
    --lift-xxs (-1px), --lift-xs (-2px), --lift-sm (-4px)
    --hover-scale: 1.02;
}
```

### Dark Mode
Dark mode is handled via:
1. `@media (prefers-color-scheme: dark)` - System preference
2. `body[data-theme="dark"]` - Manual toggle override
3. `body[data-theme="light"]` - Force light mode

---

## Build Commands

```bash
# Install dependencies
npm install

# Watch for Sass changes and compile (development)
npm run start
# or
gulp css:watch

# One-off CSS compilation (production)
npm run build
# or
gulp css
```

---

## Theme Settings (theme.ini)

Theme settings are defined in `config/theme.ini` and accessed in templates via:
```php
$this->themeSetting('setting_name')
```

Key settings:
- `primary_color` - Main theme color
- `secondary_color` - Secondary/background color
- `accent_color` - Links and accents
- `header_layout` - `inline` or `center`
- `logo` - Custom logo upload
- `banner_*` - Banner configuration
- `footer_*` - Footer configuration

---

## View Helpers

Custom PHP helpers in `helper/` directory:
- `ContrastColor.php` - Calculate contrasting text color
- `ShadeColor.php` - Generate darker/lighter color variants
- `ResourceTags.php` - Display resource type tags

---

## Utility Classes

Available utility classes for use in templates:
- `.inline`, `.alignleft`, `.alignright`, `.aligncenter`
- `.alignfull`, `.alignwide`, `.alignnarrow`
- `.textleft`, `.textright`, `.textcenter`
- `.clearfix`
- `.screen-reader-text` (accessibility)
- `.container` (max-width content wrapper)

---

## Accessibility Guidelines

- Maintain WCAG 2.1 AA compliance
- Ensure sufficient color contrast (4.5:1 for normal text, 3:1 for large text)
- Use semantic HTML elements
- Include proper ARIA labels for interactive elements
- Support keyboard navigation
- Respect `prefers-reduced-motion` for animations
- Ensure theme toggle and language switcher are accessible

---

## File Naming Conventions

- Sass partials: `_filename.scss` (underscore prefix)
- Components: Use directory structure (e.g., `components/header/_header.scss`)
- JavaScript: `kebab-case.js`
- PHP templates: `kebab-case.phtml`
- Images: `kebab-case.{svg,png,jpg}`

---

## When Making Changes

1. **Styles**: Always modify Sass files in `asset/sass/`, then run `gulp css` or `npm run start`
2. **Templates**: Edit `.phtml` files in `view/` directory
3. **Settings**: Modify `config/theme.ini` for new theme options
4. **Scripts**: Add/edit JavaScript in `asset/js/`
5. **Test** dark mode, light mode, and RTL language support
6. **Verify** responsive design at mobile, tablet, and desktop breakpoints

---

## Module Dependencies

This theme is designed to work with:
- **Internationalisation** ([GitHub](https://github.com/Daniel-KM/Omeka-S-module-Internationalisation)) - Language switching
- Core Omeka S modules (Search, Mapping, Collecting, etc.)

Always check for module availability before using their helpers:
```php
<?php if ($this->getHelperPluginManager()->has('helperName')): ?>
    <?= $this->helperName() ?>
<?php endif; ?>
```

---

## Common Patterns

### Adding a New Sass Component
1. Create file: `asset/sass/components/component-name/_component-name.scss`
2. Add `@use "../../abstracts/abstracts" as *;` at the top if using variables/mixins
3. Forward in index: Add `@forward "component-name/component-name";` to `asset/sass/components/_components.scss`
4. Run build: `npm run build`

### Styling Interactive Elements
Use the design tokens for consistent, polished interactions:

```scss
.card {
    background: var(--panel-bg);
    border: var(--panel-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--panel-shadow);
    transition: 
        transform var(--transition-base),
        box-shadow var(--transition-base);

    &:hover {
        transform: translateY(var(--lift-xs)) scale(var(--hover-scale));
        box-shadow: var(--shadow-lg), var(--glow-sm);
    }
}

.btn-primary {
    background: var(--primary);
    box-shadow: var(--glow-sm);
    
    &:hover {
        background: var(--primary-hover);
        box-shadow: var(--glow-md);
    }
}
```

### Glassmorphism Effect
```scss
.overlay {
    background: var(--surface-overlay);
    backdrop-filter: var(--backdrop-blur-lg);
    -webkit-backdrop-filter: var(--backdrop-blur-lg);
}
```

### Adding a New Theme Setting
1. Add element definition in `config/theme.ini`
2. Access in templates: `$this->themeSetting('setting_name')`

### Creating a Custom Partial
1. Create file in `view/common/`
2. Include with: `<?= $this->partial('common/partial-name') ?>`

---

## Islam West Africa Collection Context

This theme serves the Islam West Africa Collection (IWAC) at ZMO Berlin. Key considerations:
- **Multilingual support**: French and English
- **Academic context**: Clean, readable typography for scholarly content
- **Cultural sensitivity**: Appropriate visual design for Islamic cultural heritage materials
- **Accessibility**: Wide international audience with varying internet speeds and devices
