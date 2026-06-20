/**
 * Theme Toggle
 * Three-state theme control: system / light / dark.
 *
 * The button cycles system → light → dark → system. "system" means no
 * stored preference (follow the OS); "light"/"dark" are explicit overrides
 * persisted to localStorage. Two attributes are written to <body>:
 *   data-theme       resolved light|dark — drives all styling
 *   data-theme-mode  system|light|dark   — drives which toggle icon shows
 * Both are also set synchronously by the head-script in layout.phtml so the
 * correct theme AND icon paint on first frame with no flash.
 */
(function() {
    'use strict';

    const STORAGE_KEY = 'iwac-theme-preference';
    const THEME_ATTRIBUTE = 'data-theme';
    const MODE_ATTRIBUTE = 'data-theme-mode';
    // Cycle order. Keep in sync with the head-script + _theme-toggle.scss.
    const MODES = ['system', 'light', 'dark'];

    /**
     * The OS-level colour-scheme preference.
     */
    function systemTheme() {
        return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
            ? 'dark'
            : 'light';
    }

    /**
     * The user's explicit choice. No stored value = follow the system.
     */
    function getMode() {
        const stored = localStorage.getItem(STORAGE_KEY);
        return (stored === 'light' || stored === 'dark') ? stored : 'system';
    }

    /**
     * Resolve a mode to the concrete light|dark theme used for styling.
     */
    function resolveTheme(mode) {
        return mode === 'system' ? systemTheme() : mode;
    }

    /**
     * Apply a mode: set the resolved theme + the mode, and sync the button.
     */
    function applyMode(mode) {
        document.body.setAttribute(THEME_ATTRIBUTE, resolveTheme(mode));
        document.body.setAttribute(MODE_ATTRIBUTE, mode);
        updateToggleButton(mode);
    }

    /**
     * Update the toggle button's accessible label.
     *
     * Icon visibility is owned entirely by CSS via body[data-theme-mode]
     * (see _theme-toggle.scss). We deliberately do NOT write inline display
     * styles here — that clobbered the pre-paint CSS state previously. The
     * label announces the NEXT mode in the cycle (i.e. the action a click
     * performs).
     */
    function updateToggleButton(mode) {
        const toggle = document.querySelector('[data-theme-toggle]');
        if (!toggle) return;

        const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
        // Labels are injected (and translated) by the template; fall back to
        // English if the data attributes are absent.
        const labels = {
            light: toggle.dataset.labelToLight || 'Switch to light theme',
            dark: toggle.dataset.labelToDark || 'Switch to dark theme',
            system: toggle.dataset.labelToSystem || 'Use system theme'
        };
        toggle.setAttribute('aria-label', labels[next]);
    }

    /**
     * Advance to the next mode in the cycle and persist it.
     */
    function cycleTheme() {
        const next = MODES[(MODES.indexOf(getMode()) + 1) % MODES.length];
        if (next === 'system') {
            localStorage.removeItem(STORAGE_KEY);
        } else {
            localStorage.setItem(STORAGE_KEY, next);
        }
        applyMode(next);
    }

    /**
     * Initialize theme toggle functionality
     */
    function init() {
        // Apply initial state immediately to prevent flash
        applyMode(getMode());

        // Set up toggle button click handler
        document.addEventListener('click', function(event) {
            const toggle = event.target.closest('[data-theme-toggle]');
            if (toggle) {
                event.preventDefault();
                cycleTheme();
            }
        });

        // Follow OS changes live while in system mode.
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
                if (getMode() === 'system') {
                    applyMode('system');
                }
            });
        }
    }

    // Initialize when DOM is ready
    IWACUtils.onReady(init);

    // Expose for external use if needed
    window.IWACTheme = {
        cycle: cycleTheme,
        toggle: cycleTheme, // back-compat alias (was light↔dark only)
        getMode: getMode,
        get: function() { return resolveTheme(getMode()); },
        set: function(mode) {
            if (mode === 'system') {
                localStorage.removeItem(STORAGE_KEY);
            } else {
                localStorage.setItem(STORAGE_KEY, mode);
            }
            applyMode(mode);
        }
    };
})();
