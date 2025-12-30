# CSS Custom Properties (Design Tokens)

## Always Use Design Tokens

CRITICAL: Never use hardcoded values. Always use CSS custom properties.

## Color System

### Primary Colors
- --primary: IWAC orange
- --primary-hover: Hover state
- --primary-active: Active state

### Text Colors  
- --ink: Primary text
- --ink-light: Secondary text
- --muted: Tertiary text

### Surfaces
- --surface: Card/panel background
- --surface-raised: Elevated background
- --background: Page background

### Borders
- --border: Standard border
- --border-light: Subtle border

## Spacing Scale

Use --space-1 through --space-40:
- --space-1: 4px
- --space-2: 8px
- --space-4: 16px
- --space-8: 32px

## Shadows & Effects

- --shadow-sm/md/lg/xl: Neutral shadows
- --glow-sm/md/lg/xl: Primary-colored glows

## Border Radius

- --radius-sm: 6px
- --radius-md: 12px
- --radius-lg: 16px
- --radius-full: 9999px

## Transitions

- --transition-fast: 150ms
- --transition-base: 200ms
- --transition-slow: 300ms

## Example Usage

`scss
.card {
    background: var(--panel-bg);
    border: var(--panel-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--panel-shadow);
    padding: var(--space-6);
    transition: box-shadow var(--transition-base);
    
    &:hover {
        box-shadow: var(--shadow-lg), var(--glow-sm);
    }
}
`

## Dark Mode

Dark mode is handled via:
1. @media (prefers-color-scheme: dark) - System 
2. body[data-theme="dark"] - Manual toggle
3. body[data-theme="light"] - Force light
