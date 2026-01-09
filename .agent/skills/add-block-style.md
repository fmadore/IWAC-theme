---
description: Style a new Omeka S page builder block type
---

# Add Block Style Workflow

## Steps

### 1. Identify the Block Class
Inspect the block in browser DevTools to find its class:
- Pattern: `.block-{blockType}`
- Examples: `.block-html`, `.block-carousel`, `.block-browsePreview`

### 2. Create Component File
Create at: `asset/sass/components/blocks/{block-name}/_{block-name}.scss`

```scss
@use "../../../abstracts/abstracts" as *;

// ==========================================================================
// Block Name
// Description of the block's purpose
// ==========================================================================

.block-blockName {
    background: var(--panel-bg);
    border: var(--panel-border);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
    margin-block-end: var(--space-lg);
}
```

### 3. Forward in Index
Add to `asset/sass/components/blocks/_blocks.scss`:
```scss
@forward "block-name/block-name";
```

### 4. Compile and Verify
// turbo
```bash
npm run build
```

## Checklist
- [ ] Block class matches Omeka S output
- [ ] Uses design tokens (no hardcoded values)
- [ ] Forwarded in _blocks.scss
- [ ] Compiles without errors
