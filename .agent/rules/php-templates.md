---
trigger: always_on
---

# PHP Templates & View Helpers

## Directory Structure

```
├── helper/               # Laminas View Helpers
│   ├── BrowseLayout.php  # Shared grid/list layout state for browse pages
│   └── ResourceTags.php  # Resource type/class tags
└── view/
    ├── layout/           # Main layout template
    ├── common/           # Shared partials (header, footer, etc.)
    └── omeka/site/       # Omeka S page overrides
```

## View Helpers

Helpers extend `Laminas\View\Helper\AbstractHelper` and are called via `$this->HelperName()`.

### Creating a Helper

```php
<?php
namespace OmekaTheme\Helper;

use Laminas\View\Helper\AbstractHelper;

class MyHelper extends AbstractHelper
{
    public function __invoke($param)
    {
        // Helper logic
        return $result;
    }
}
```

### Available Theme Helpers

| Helper | Usage | Purpose |
|--------|-------|---------|
| [ResourceTags](helper/ResourceTags.php#6-112) | `$this->ResourceTags($resource)` | Render resource type tags |
| [BrowseLayout](/helper/BrowseLayout.php) | `$this->browseLayout()` | Grid/list state for browse-style listings |

## Template Conventions

### Always Escape Output

```php
<?php // Text content ?>
<?php echo $this->escapeHtml($title); ?>

<?php // Attributes ?>
<a href="<?php echo $this->escapeHtmlAttr($url); ?>">

<?php // Translations ?>
<?php echo $this->translate('Text to translate'); ?>
```

### Use Theme Settings

```php
$primaryColor = $this->themeSetting('primary_color') ?? '#e77f11';
$logo = $this->themeSettingAssetUrl('logo');
```

### Use Partials for Reusable Components

```php
<?php echo $this->partial('common/header', ['site' => $site]); ?>
```

## Accessibility Requirements

### Interactive Elements

```php
<button type="button"
        aria-label="<?php echo $this->escapeHtmlAttr($translate('Toggle menu')); ?>"
        aria-expanded="false"
        aria-controls="menu-drawer">
```

### Skip Links

```php
<a id="skipnav" href="#content"><?php echo $this->translate('Skip to main content'); ?></a>
```

### Semantic HTML

- Use `<header>`, `<nav>`, `<main>`, `<footer>`
- Use `role` attributes where appropriate
- Associate labels with form inputs

## Module Integration

Check if a module helper exists before using:

```php
<?php if ($this->getHelperPluginManager()->has('languageSwitcher')): ?>
    <?php echo $this->languageSwitcher(); ?>
<?php endif; ?>
```

## CSS Custom Properties from PHP

The layout template generates CSS variables from admin settings:

```php
$primaryHsl = hexToHsl($primaryColor);
?>
<style>
:root {
    --primary-hue: <?php echo $primaryHsl['h']; ?>;
    --primary-sat: <?php echo $primaryHsl['s']; ?>%;
    --primary: hsl(var(--primary-hue), var(--primary-sat), <?php echo $primaryHsl['l']; ?>%);
}
</style>
```

## BEM Class Naming

Match Sass component classes:

```php
<div class="banner__content banner__content--left">
    <h1 class="banner__heading"><?php echo $heading; ?></h1>
</div>
```
