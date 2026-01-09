---
description: Troubleshoot CSS and Sass issues
---

# Debug Styles Workflow

## Steps

### 1. Check Build Output
// turbo
```bash
npm run build
```
Look for Sass compilation errors.

### 2. Verify Import Chain
Ensure the file is properly forwarded:
1. Component → `_components.scss`
2. Block → `blocks/_blocks.scss` → `_components.scss`
3. Base element → `elements/_elements.scss`

### 3. Check Specificity
Use browser DevTools to see which rules apply:
- Look for crossed-out styles
- Check selector specificity
- Look for `!important` overrides

### 4. Verify Token Exists
Search for the token definition:
```bash
grep -r "token-name" asset/sass/abstracts/
```

### 5. Check Theme Context
If styles differ between light/dark:
- Inspect with `body[data-theme="dark"]`
- Check `@media (prefers-color-scheme: dark)`

### 6. Clear Cache and Rebuild
// turbo
```bash
npm run build
```
Hard refresh browser (Ctrl+Shift+R).

## Common Issues

| Symptom | Likely Cause |
|---------|--------------|
| Styles not applying | Missing @forward in index |
| Token undefined | Typo or missing from _tokens.scss |
| Dark mode wrong | Missing dark theme override |
| Specificity conflict | Need more specific selector or check cascade |
| Build error | Sass syntax error or missing @use |
