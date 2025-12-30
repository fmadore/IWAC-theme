---
description: Compile Sass to CSS for production or development
---

# Compile Sass Workflow

## Prerequisites
Ensure Node.js dependencies are installed.

## Steps

### 1. Install Dependencies (if needed)
// turbo
`ash
npm install
`

### 2. For Development (watch mode)
// turbo
`ash
npm run start
`
This will watch for changes and recompile automatically.

### 3. For Production Build
// turbo
`ash
npm run build
`
This creates minified CSS in asset/css/.

## Output
- Compiled CSS goes to asset/css/style.css
- Never edit the CSS directly - always modify Sass source files

## Troubleshooting
- If you see Sass errors, check for:
  - Missing @use statements
  - @forward not at top of file
  - Undefined variables/mixins
