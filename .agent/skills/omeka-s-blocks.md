---
trigger: always_on
---

# Omeka S Blocks & Page Builder

## Block Types in Theme

| Block | Sass File | Class Pattern |
|-------|-----------|---------------|
| HTML | `block-group/_block-group.scss` | `.block-html` |
| Asset | `assets/_assets.scss` | `.block-asset` |
| Carousel | `carousel/_carousel.scss` | `.block-carousel` |
| Browse Preview | `browse-preview/_browse-preview.scss` | `.block-browsePreview` |
| Item Showcase | `item-showcase/_item-showcase.scss` | `.block-itemShowcase` |
| Media Embed | `media-embed/_media-embed.scss` | `.block-media` |
| Table of Contents | `table-of-contents/_table-of-contents.scss` | `.block-tableOfContents` |
| Timeline | `timeline/_timeline.scss` | `.block-timeline` |
| Collecting | `collecting/_collecting.scss` | `.collecting-block` |

## Block Class Naming

All page builder blocks follow this pattern:
```html
<div class="block block-{blockType}">
    <!-- Block content -->
</div>
```

## Styling a Block

```scss
.block-myBlock {
    background: var(--panel-bg);
    border: var(--panel-border);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
    
    // Use BEM for internal elements
    .my-block__title { }
}
```

## Block Groups

Multiple blocks can be grouped:
```scss
.block-blockGroup {
    &:has(.block-asset) {
        // Special styling when group contains an asset
    }
}
```

## Block Templates

Register in `theme.ini`:
```ini
block_templates.html.featured = "Featured Content"
```

Template files go in `view/common/block-template/`.

## Resource Page Regions

Defined in theme.ini:
```ini
resource_page_regions.items.left = "Left sidebar"
resource_page_regions.items.main = "Main"
resource_page_regions.items.right = "Right sidebar"
```
