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
- Define colors in `asset/sass/abstracts/variables/_colors.scss`
- Define breakpoints in `asset/sass/abstracts/variables/_breakpoints.scss`
- Create mixins in `asset/sass/abstracts/mixins/_mixins.scss`

#### Color Variables Pattern
```scss
// Use CSS custom properties for theme support
$color__primary: var(--primary);
$color__bg-body: var(--bg-body);

// Define in :root for light theme, [data-theme="dark"] for dark theme
:root {
    --primary: #e77f11;
    --bg-body: #ffffff;
}

[data-theme="dark"] {
    --primary: #f5a050;
    --bg-body: #1a1a2e;
}
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
- Create custom partial at `view/common/helper/language-switcher.phtml` if needed

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

The theme uses CSS custom properties set in `view/layout/layout.phtml`:

```css
:root {
    --primary: <?php echo $primaryColor; ?>;
    --primary-dark: /* computed */;
    --primary-contrast: /* computed */;
    --secondary: <?php echo $secondaryColor; ?>;
    --secondary-dark: /* computed */;
    --secondary-contrast: /* computed */;
    --accent: <?php echo $accentColor; ?>;
    --accent-dark: /* computed */;
}
```

**For dark mode, add these additional variables:**
```css
:root {
    --bg-body: #ffffff;
    --bg-surface: #f5f5f5;
    --text-primary: #333333;
    --text-secondary: #666666;
}

[data-theme="dark"] {
    --bg-body: #1a1a2e;
    --bg-surface: #16213e;
    --text-primary: #eaeaea;
    --text-secondary: #b0b0b0;
}
```

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
2. Import in: `asset/sass/components/_components.scss`
3. Run build: `npm run build`

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
