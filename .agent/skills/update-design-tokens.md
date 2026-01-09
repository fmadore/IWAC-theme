---
description: Safely modify or add design tokens
---

# Update Design Tokens Workflow

## Steps

### 1. Identify the Token Category
Tokens are in `asset/sass/abstracts/variables/_tokens.scss`:
- Spacing: `--space-*`
- Shadows: `--shadow-*`
- Glows: `--glow-*`
- Transitions: `--transition-*`
- Easing: `--ease-*`
- Lifts: `--lift-*`
- Radii: `--radius-*`

### 2. Check for Dark Mode
If the token changes per theme, also update:
- `@media (prefers-color-scheme: dark)` block
- `body[data-theme="dark"]` block

### 3. Add or Modify Token
Add with a comment explaining the value:
```scss
--token-name: value; // Xpx - purpose
```

### 4. Update Sass Aliases (if needed)
If creating a new category, add Sass variable alias at bottom:
```scss
$token-name: var(--token-name);
```

### 5. Search for Usage Impact
Check what components use related tokens:
```bash
grep -r "token-name" asset/sass/
```

### 6. Compile and Verify
// turbo
```bash
npm run build
```

## Checklist
- [ ] Token follows naming convention
- [ ] Dark mode variant added if applicable
- [ ] Comment explains the value
- [ ] No breaking changes to existing components
