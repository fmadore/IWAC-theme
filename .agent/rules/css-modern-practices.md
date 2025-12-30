# Modern CSS Practices

## Use color-mix() Instead of gba()

Modern CSS offers color-mix() as a superior alternative to gba() for creating transparent or blended colors.

### Why color-mix()?

1. **Works with CSS custom properties** - Unlike gba(), can use existing color variables
2. **Better theming** - Automatically adapts when base colors change
3. **More readable** - Intent is clearer
4. **Future-proof** - Part of CSS Color Level 4 specification

### Examples

```scss
// ❌ AVOID: rgba() with hardcoded values or decomposed HSL
background: rgba(0, 0, 0, 0.5);
background: hsla(var(--ink-hue), var(--ink-sat), var(--ink-lum), 0.5);

// ✅ PREFERRED: color-mix() with CSS custom properties
background: color-mix(in srgb, var(--ink) 50%, transparent);
background: color-mix(in srgb, var(--primary) 20%, var(--surface));

// For overlays and semi-transparent backgrounds
.overlay {
    background: color-mix(in srgb, var(--ink) 60%, transparent);
}

// For hover states with subtle color shifts
.button:hover {
    background: color-mix(in srgb, var(--primary) 85%, black);
}

// For borders with reduced opacity
.card {
    border: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
}
```

### Common Patterns

| Use Case | Pattern |
|----------|---------|
| Semi-transparent background | `color-mix(in srgb, var(--color) NN%, transparent)` |
| Darken a color | `color-mix(in srgb, var(--color) NN%, black)` |
| Lighten a color | `color-mix(in srgb, var(--color) NN%, white)` |
| Blend two colors | `color-mix(in srgb, var(--color1) NN%, var(--color2))` |

### Migration from rgba()

When encountering `rgba()` in existing code:

1. Identify the base color being made transparent
2. Find the corresponding CSS custom property
3. Replace with `color-mix(in srgb, var(--property) opacity%, transparent)`

## Other Modern CSS Practices

### Prefer Logical Properties

```scss
// ❌ AVOID
margin-left: var(--space-4);
padding-right: var(--space-2);

// ✅ PREFERRED (supports RTL languages)
margin-inline-start: var(--space-4);
padding-inline-end: var(--space-2);
```

### Use Modern Layout

```scss
// Prefer CSS Grid and Flexbox over floats
.container {
    display: grid;
    gap: var(--space-4);
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}
```

### Prefer gap Over Margins

```scss
// ❌ AVOID
.flex-container > * + * {
    margin-left: var(--space-4);
}

// ✅ PREFERRED
.flex-container {
    display: flex;
    gap: var(--space-4);
}
```

### Use Modern Selectors

```scss
// :is() and :where() for grouping
:is(h1, h2, h3) {
    color: var(--text-heading);
}

// :has() for parent selection (when supported)
.card:has(.featured-badge) {
    border-color: var(--primary);
}
```
