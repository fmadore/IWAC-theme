---
description: Verify theme builds correctly and follows standards
---

# Theme Verification Workflow

## Steps

### 1. Build CSS
// turbo
`ash
npm run build
`
Verify no Sass compilation errors.

### 2. Check for Hardcoded Values
Search for potential issues:
// turbo
`ash
grep -r "rgba\|#[0-9a-fA-F]\{3,6\}\|[0-9]px" asset/sass/ --include="*.scss" | head -20
`

### 3. Verify Design Token Usage
Look for color-mix() usage:
// turbo
`ash
grep -r "color-mix" asset/sass/ --include="*.scss" | wc -l
`

### 4. Check for Deprecated Patterns
// turbo
`ash
grep -r "@import" asset/sass/ --include="*.scss"
`
Should return nothing (use @use/@forward).

## Verification Checklist

- [ ] CSS compiles without errors
- [ ] No hardcoded color values
- [ ] No hardcoded spacing values
- [ ] No rgba() - use color-mix()
- [ ] No @import - use @use/@forward
- [ ] Dark mode works correctly
- [ ] Light mode works correctly
- [ ] Reduced motion respected
