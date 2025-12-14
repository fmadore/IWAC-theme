# Universal Viewer Component

This component provides comprehensive, theme-consistent styling for the [Universal Viewer (UV)](https://universalviewer.io/) IIIF module in Omeka S.

## Overview

The Universal Viewer is a widely-used IIIF viewer that displays images, audio, video, and other media types. This styling component ensures that the UV interface integrates seamlessly with the IWAC theme's design system, including:

- Theme color palette (IWAC orange primary color)
- Light/dark mode support
- Consistent spacing, shadows, and border radii
- Typography and interactive states

## Features

### 1. **Theme Integration**
All major UV interface elements use theme CSS custom properties:
- Panels (header, footer, side panels) use `--surface`, `--surface-raised`, `--background`
- Text uses `--text-primary`, `--text-heading`, `--text-secondary`
- Links and buttons use `--primary`, `--primary-hover`, `--primary-active`
- Borders use `--border`, `--border-light`

### 2. **Proper Isolation**
The UV has its own internal CSS that can conflict with theme styles. This component includes comprehensive resets to:
- Prevent theme button styles from affecting UV buttons
- Prevent theme form field styles from affecting UV inputs
- Maintain UV's internal functionality while applying theme colors

### 3. **Interactive Elements**
All interactive UV elements respect theme design tokens:
- Buttons use `--transition-fast` for smooth hover effects
- Hover states use theme colors with appropriate opacity
- Focus states use theme focus colors and rings
- Tabs, thumbnails, and tree view items have consistent hover/selected states

### 4. **Dark Mode Support**
The component fully supports the theme's dark mode:
- Automatically adjusts when system preference is dark mode
- Respects manual theme toggle (`data-theme="dark"` or `data-theme="light"`)
- Overrides UV's hardcoded input colors in dark mode

### 5. **Responsive Design**
- Removes border radius on mobile for full-width viewing
- Limits side panel width on mobile devices
- Maintains usability across all screen sizes

## Styled Elements

### Core Panels
- `.headerPanel` - Top toolbar area
- `.leftPanel` / `.rightPanel` - Side panels (thumbnails, info, etc.)
- `.footerPanel` - Bottom controls
- `.centerPanel` - Main viewer area

### Navigation & Controls
- `.tab` - Tab navigation with hover and selected states
- `.btn` - Buttons with theme colors
- `.btn.btn-primary` - Primary action buttons
- `.btn.imageBtn` - Icon buttons with subtle hover effects

### Content Views
- `.treeView` - Hierarchical content structure
- `.thumbsView` - Thumbnail gallery
- `.metadata` - Metadata display panel

### Interactive Elements
- `.searchResult` - Search results with highlight and hover states
- `.dialogue` - Modal dialogs
- `.overlay` - Modal backgrounds

### Form Elements
- `input[type="text"]` - Text inputs with theme-aware styling
- Custom scrollbars with theme colors

## Usage

This component is automatically included when the theme's CSS is compiled. No additional setup is required.

### HTML Structure
The Universal Viewer module automatically generates the appropriate HTML structure. Simply use the UV module in your Omeka S installation, and these styles will be applied.

### Customization

If you need to customize the UV styling further:

1. Edit `/asset/sass/components/universal-viewer/_universal-viewer.scss`
2. Use theme CSS custom properties for consistency
3. Add `!important` flags when necessary to override UV's inline styles
4. Rebuild CSS: `npm run build`

## Important Notes

### Why the Resets?
The UV includes its own comprehensive CSS, and Omeka S themes apply global styles to all elements. The resets in this component ensure:
- Theme styles don't break UV functionality
- UV's internal layout remains intact
- Theme colors are applied without structural changes

### Important Flag Usage
Many rules use `!important` because the UV module includes inline styles and very specific CSS selectors. This is necessary to ensure theme colors are applied consistently.

### Class Structure
- `.uv` - Main container (may be on the page)
- `.uv-iiif-extension-host` - UV's extension host container (shadow DOM host)

Both selectors are used throughout to ensure styling works regardless of UV version or configuration.

## Browser Support

This component supports all modern browsers that the IWAC theme supports:
- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Mobile browsers

## Maintenance

When updating the UV module or theme:
1. Test the viewer in both light and dark modes
2. Verify all interactive elements (buttons, tabs, search)
3. Check responsive behavior on mobile devices
4. Ensure metadata and thumbnail panels display correctly

## Related Files

- **Sass source**: `/asset/sass/components/universal-viewer/_universal-viewer.scss`
- **Compiled CSS**: `/asset/css/style.css` (includes UV styles)
- **Component index**: `/asset/sass/components/_components.scss` (forwards this component)
- **Variables**: `/asset/sass/abstracts/variables/_colors.scss` and `_tokens.scss`

## References

- [Universal Viewer Documentation](https://universalviewer.io/)
- [IIIF Specification](https://iiif.io/)
- [Omeka S Universal Viewer Module](https://github.com/Daniel-KM/Omeka-S-module-UniversalViewer)
