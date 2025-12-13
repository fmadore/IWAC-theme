/**
 * Theme Toggle
 * Handles dark/light theme switching with localStorage persistence
 * and respects system preference as default
 */
(function() {
    'use strict';

    const STORAGE_KEY = 'iwac-theme-preference';
    const THEME_ATTRIBUTE = 'data-theme';

    /**
     * Get the user's preferred theme
     * Priority: localStorage > system preference > light
     */
    function getPreferredTheme() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return stored;
        }
        
        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        
        return 'light';
    }

    /**
     * Apply the theme to the document
     */
    function applyTheme(theme) {
        document.body.setAttribute(THEME_ATTRIBUTE, theme);
        updateToggleButton(theme);
    }

    /**
     * Update the toggle button's aria-label and icon visibility
     */
    function updateToggleButton(theme) {
        const toggle = document.querySelector('[data-theme-toggle]');
        if (!toggle) return;

        const isDark = theme === 'dark';
        toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
        toggle.setAttribute('aria-pressed', isDark.toString());

        // Update icon visibility
        const lightIcon = toggle.querySelector('.theme-toggle__icon--light');
        const darkIcon = toggle.querySelector('.theme-toggle__icon--dark');
        
        if (lightIcon && darkIcon) {
            lightIcon.style.display = isDark ? 'none' : 'inline';
            darkIcon.style.display = isDark ? 'inline' : 'none';
        }
    }

    /**
     * Toggle between light and dark themes
     */
    function toggleTheme() {
        const currentTheme = document.body.getAttribute(THEME_ATTRIBUTE) || getPreferredTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        localStorage.setItem(STORAGE_KEY, newTheme);
        applyTheme(newTheme);
    }

    /**
     * Initialize theme toggle functionality
     */
    function init() {
        // Apply initial theme immediately to prevent flash
        const preferredTheme = getPreferredTheme();
        applyTheme(preferredTheme);

        // Set up toggle button click handler
        document.addEventListener('click', function(event) {
            const toggle = event.target.closest('[data-theme-toggle]');
            if (toggle) {
                event.preventDefault();
                toggleTheme();
            }
        });

        // Listen for system preference changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(event) {
                // Only update if user hasn't manually set a preference
                if (!localStorage.getItem(STORAGE_KEY)) {
                    applyTheme(event.matches ? 'dark' : 'light');
                }
            });
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for external use if needed
    window.IWACTheme = {
        toggle: toggleTheme,
        get: getPreferredTheme,
        set: function(theme) {
            localStorage.setItem(STORAGE_KEY, theme);
            applyTheme(theme);
        }
    };
})();
