---
trigger: always_on
---

# Theme Configuration (theme.ini)

## File Location

`config/theme.ini`

## Structure

```ini
[info]
name = "Theme Name"
version = "1.0.0"
author = "Author Name"
omeka_version_constraint = "^4.1.0"
has_translations = true

helpers[] = "HelperName"

[config]
; Settings defined here
```

## Element Groups

Organize settings into collapsible sections:
```ini
element_groups.general = "General Settings"
element_groups.header = "Header"
element_groups.banner = "Banner"
element_groups.footer = "Footer"
```

## Setting Types

### Color Picker
```ini
elements.primary_color.name = "primary_color"
elements.primary_color.type = "Laminas\Form\Element\Color"
elements.primary_color.options.label = "Primary Color"
elements.primary_color.attributes.value = "#E64A19"
elements.primary_color.options.element_group = "general"
```

### Asset Upload (Image)
```ini
elements.logo.name = "logo"
elements.logo.type = "Omeka\Form\Element\Asset"
elements.logo.options.label = "Logo"
elements.logo.options.element_group = "header"
```

### Select Dropdown
```ini
elements.layout.type = "Laminas\Form\Element\Select"
elements.layout.options.value_options.grid = "Grid"
elements.layout.options.value_options.list = "List"
```

### Text/Textarea
```ini
elements.heading.type = "Text"
elements.description.type = "Laminas\Form\Element\Textarea"
elements.content.type = "Omeka\Form\Element\HtmlTextarea"
```

## Reading Settings in Templates

```php
$primaryColor = $this->themeSetting('primary_color') ?? '#E64A19';
$logoUrl = $this->themeSettingAssetUrl('logo');
```

## Block Templates

Register custom block templates:
```ini
block_templates.html.featured = "Featured Content"
block_templates.media.gallery = "Gallery View"
```

## Resource Page Regions

Define regions for item/media show pages:
```ini
resource_page_regions.items.left = "Left sidebar"
resource_page_regions.items.main = "Main"
resource_page_regions.items.right = "Right sidebar"
```

## Default Resource Page Blocks

```ini
resource_page_blocks.items.main[] = "values"
resource_page_blocks.items.main[] = "mediaList"
```

## View Helpers

Register custom PHP helpers:
```ini
helpers[] = "ResourceTags"
helpers[] = "ContrastColor"
```
