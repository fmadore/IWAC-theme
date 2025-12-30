---
description: Migrate rgba() to color-mix() for modern CSS
---

# Migrate rgba() to color-mix() Workflow

## Overview
Replace legacy rgba() color definitions with modern color-mix() function.

## Steps

### 1. Find All rgba() Usage
// turbo
`ash
grep -rn "rgba\|hsla" asset/sass/ --include="*.scss"
`

### 2. Analyze Each Usage
For each rgba() found:
- Identify the base color
- Determine the opacity/alpha value
- Find corresponding CSS custom property

### 3. Convert Pattern

**Before:**
`scss
background: rgba(0, 0, 0, 0.5);
background: hsla(var(--ink-hue), var(--ink-sat), var(--ink-lum), 0.5);
`

**After:**
`scss
background: color-mix(in srgb, var(--ink) 50%, transparent);
`

### 4. Common Conversions

| rgba Pattern | color-mix Replacement |
|--------------|----------------------|
| rgba(0,0,0,0.5) | color-mix(in srgb, black 50%, transparent) |
| rgba(255,255,255,0.8) | color-mix(in srgb, white 80%, transparent) |
| hsla(var(--primary-hue),...,0.2) | color-mix(in srgb, var(--primary) 20%, transparent) |

### 5. Verify Changes
// turbo
`ash
npm run build
`

### 6. Test Both Themes
Verify appearance in light and dark modes.
