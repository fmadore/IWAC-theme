---
trigger: always_on
---

# Component Architecture

## Component File Structure

Each component lives in its own directory:
```
components/
├── _components.scss      # Index file
├── banner/
│   └── _banner.scss
├── header/
│   ├── _header.scss
│   ├── _theme-toggle.scss
│   └── _language-switcher.scss
└── blocks/
    ├── _blocks.scss      # Sub-index
    ├── carousel/
    ├── item-showcase/
    └── ...
```

## Index File Pattern

Index files use `@use` for abstracts, then `@forward` sub-modules:

```scss
// _components.scss
@use "../abstracts/abstracts" as *;

@forward "banner/banner";
@forward "header/header";
@forward "header/theme-toggle";
```

## Component File Template

```scss
@use "../../abstracts/abstracts" as *;

// ==========================================================================
// Component Name
// Brief description of the component's purpose
// ==========================================================================

.component-name {
    // Layout
    display: flex;
    gap: var(--space-4);
    
    // Box model
    padding: var(--space-4);
    border-radius: var(--radius-md);
    
    // Visual
    background: var(--surface);
    box-shadow: var(--shadow-sm);
    
    // Transitions
    transition: box-shadow var(--transition-fast),
                transform var(--transition-fast);
    
    // Elements (BEM)
    &__header {
        margin-block-end: var(--space-2);
    }
    
    &__content {
        flex: 1;
    }
    
    // Modifiers (BEM)
    &--featured {
        box-shadow: var(--shadow-lg), var(--glow-sm);
    }
    
    // States
    &:hover {
        transform: translateY(var(--lift-xs));
        box-shadow: var(--shadow-md);
    }
}

// Media queries at component level
@media (min-width: $md) {
    .component-name {
        padding: var(--space-6);
    }
}
```

## Nested Components

For complex components with multiple sub-files:

```scss
// blocks/_blocks.scss (sub-index)
@use "../../abstracts/abstracts" as *;

@forward "carousel/carousel";
@forward "item-showcase/item-showcase";
```

Then in the main index:
```scss
// _components.scss
@forward "blocks/blocks";  // Forwards entire block family
```

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| File | `_kebab-case.scss` | `_theme-toggle.scss` |
| Directory | `kebab-case/` | `browse-preview/` |
| Class | `.kebab-case` | `.theme-toggle` |
| BEM Element | `__element` | `.card__header` |
| BEM Modifier | `--modifier` | `.card--featured` |

## Component Ordering

Within the main [_components.scss](IWAC-theme/asset/sass/components/_components.scss), group by:
1. Header/Navigation
2. Content components
3. Blocks (page builder)
4. Footer
5. Module integrations (mapping, viewer, etc.)
