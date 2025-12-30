# Sass Module System

## Modern @use/@forward Syntax

This project uses the modern Sass module system. Never use the deprecated @import syntax.

## File Organization

### Abstracts (@use pattern)
Files that need variables/mixins must include:
`scss
@use "../../abstracts/abstracts" as *;
`

### Index Files (@forward pattern)
Index files forward sub-modules:
`scss
@forward "sub-module";
`

## Key Rules

1. @forward rules MUST come before any other rules
2. Each file needing Sass variables/mixins needs its own @use statement
3. Use as * to access members without namespace prefix

## Adding a New Component

1. Create file: asset/sass/components/name/_name.scss
2. Add @use statement at top
3. Forward in index: asset/sass/components/_components.scss
4. Run npm run build

## File Naming

- Partials: _filename.scss (underscore prefix)
- Use directory structure for organization
- BEM naming: .block__element--modifier
