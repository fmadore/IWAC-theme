---
description: Create a new Sass component following project conventions
---

# Add New Component Workflow

## Steps

### 1. Create Component Directory and File
Create the component file at:
asset/sass/components/[component-name]/_[component-name].scss

### 2. Add Required Import
At the top of the new file, add:
`scss
@use "../../abstracts/abstracts" as *;
`

### 3. Write Component Styles
Use BEM naming convention:
`scss
.component-name {
    // Base styles using design tokens
    
    &__element {
        // Element styles
    }
    
    &--modifier {
        // Modifier styles
    }
}
`

### 4. Forward in Index
Add to asset/sass/components/_components.scss:
`scss
@forward "component-name/component-name";
`

### 5. Compile and Verify
// turbo
`ash
npm run build
`

## Checklist
- [ ] File uses @use for abstracts
- [ ] BEM naming convention followed
- [ ] CSS custom properties used (no hardcoded values)
- [ ] color-mix() used instead of rgba()
- [ ] Forwarded in _components.scss
- [ ] Compiles without errors
