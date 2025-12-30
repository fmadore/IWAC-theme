# Color System

## HSL-Based Dynamic Colors

Colors are generated from admin-configurable values using HSL (Hue, Saturation, Lightness). This allows automatic light/dark theme variants.

### HSL Components

Each semantic color has decomposed HSL values:
```css
--primary-hue: 28;      /* Orange hue from admin */
--primary-sat: 87%;     /* Saturation */
--primary-light: 49%;   /* Lightness */
--primary: hsl(var(--primary-hue), var(--primary-sat), var(--primary-light));
```

### Using HSL for Dynamic Colors

When you need opacity or color mixing:
```scss
// ✅ Use color-mix() with the composed color
background: color-mix(in srgb, var(--primary) 20%, transparent);

// ✅ Or construct from HSL for specific lightness
background: hsl(var(--primary-hue), var(--primary-sat), 95%);
```

## Theme Switching

### Three-Way Theme Support

1. **System preference** (default):
   ```css
   @media (prefers-color-scheme: dark) {
       :root:not([data-theme="light"]) { /* dark styles */ }
   }
   ```

2. **Manual dark mode**:
   ```css
   body[data-theme="dark"] { /* dark styles */ }
   ```

3. **Force light mode**:
   ```css
   body[data-theme="light"] { /* light styles */ }
   ```

### How It Works

- `_colors.scss` defines semantic colors for light/dark
- `_tokens.scss` defines effects (shadows, glows) that adapt per theme
- JavaScript sets `data-theme` attribute based on user toggle
- localStorage persists user preference

## File Responsibilities

| File | Purpose |
|------|---------|
| `_colors.scss` | Semantic colors (--ink, --surface, --primary) |
| `_tokens.scss` | Effects, spacing, shadows that may change per theme |

## Dark Mode Shadow Adjustments

Shadows are stronger in dark mode for visibility:
```scss
// Light mode
--shadow-color: color-mix(in srgb, black 10%, transparent);

// Dark mode  
--shadow-color: color-mix(in srgb, black 18%, transparent);
```

## Creating Theme-Aware Styles

Always use semantic tokens, not raw HSL:
```scss
// ✅ Correct - adapts to theme
.card {
    background: var(--surface);
    color: var(--ink);
    box-shadow: var(--shadow-md);
}

// ❌ Avoid - doesn't adapt
.card {
    background: white;
    color: #333;
}
```
