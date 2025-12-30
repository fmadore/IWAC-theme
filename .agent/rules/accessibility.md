# Accessibility Guidelines

## WCAG 2.1 AA Compliance Required

This theme must meet WCAG 2.1 Level AA standards.

## Color Contrast

- Normal text: 4.5:1 minimum contrast ratio
- Large text (18px+ or 14px+ bold): 3:1 minimum
- UI components and graphics: 3:1 minimum

## Semantic HTML

Always use appropriate semantic elements:
- <header>, <nav>, <main>, <footer>
- <article>, <section>, <aside>
- Proper heading hierarchy (h1-h6)

## ARIA Labels

Interactive elements need proper labels:

`html
<button aria-label="Toggle dark mode" data-theme-toggle>
    <span class="icon">...</span>
</button>
`

## Keyboard Navigation

- All interactive elements must be keyboard accessible
- Visible focus states required
- Skip links for main content

## Motion/Animation

Respect user preferences:

`scss
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
    }
}
`

## Screen Reader Support

- Use .screen-reader-text class for visually hidden but accessible content
- Proper alt text for images
- Form labels associated with inputs

## Focus Indicators

`scss
:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
}
`

## Testing

- Test with keyboard-only navigation
- Test with screen readers (NVDA, VoiceOver)
- Use browser accessibility tools
- Validate color contrast ratios
