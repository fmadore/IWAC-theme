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
        const stored = IWACUtils.localStore.get(STORAGE_KEY);
        return (stored === 'light' || stored === 'dark') ? stored : 'system';
    }

    /**
     * Persist a mode ("system" = no stored value). Storage failures are
     * swallowed — the choice still applies for this pageview.
     */
    function storeMode(mode) {
        if (mode === 'system') {
            IWACUtils.localStore.remove(STORAGE_KEY);
        } else {
            IWACUtils.localStore.set(STORAGE_KEY, mode);
        }
    }

    /**
     * Resolve a mode to the concrete light|dark theme used for styling.
     */
    function resolveTheme(mode) {
        return mode === 'system' ? systemTheme() : mode;
    }

    /**
     * Apply a mode: set the resolved theme + the mode, and sync the button.
     * `announce` is forwarded to the live region (true only for user toggles,
     * so we stay silent on initial load and passive system-preference changes).
     */
    function applyMode(mode, announce) {
        document.body.setAttribute(THEME_ATTRIBUTE, resolveTheme(mode));
        document.body.setAttribute(MODE_ATTRIBUTE, mode);
        updateToggleButton(mode, announce);
    }

    /**
     * Update the toggle button's accessible label and, on user action,
     * announce the new state.
     *
     * Icon visibility is owned entirely by CSS via body[data-theme-mode]
     * (see _theme-toggle.scss). We deliberately do NOT write inline display
     * styles here — that clobbered the pre-paint CSS state previously.
     *
     * The accessible name states the CURRENT mode plus the action a click
     * performs, so a screen-reader user hears the active state on focus — the
     * previous label named only the *next* action, leaving "system" invisible
     * to assistive tech. When the user actually toggles (`announce`), the new
     * state is also pushed to a polite live region.
     */
    function updateToggleButton(mode, announce) {
        const toggle = document.querySelector('[data-theme-toggle]');
        if (!toggle) return;

        // Labels are injected (and translated) by the template; fall back to
        // English if the data attributes are absent.
        const labels = {
            system: toggle.dataset.labelSystem || 'System theme active. Activate to switch to light mode.',
            light: toggle.dataset.labelLight || 'Light theme active. Activate to switch to dark mode.',
            dark: toggle.dataset.labelDark || 'Dark theme active. Activate to switch to system theme.'
        };
        toggle.setAttribute('aria-label', labels[mode] || labels.system);

        if (!announce) return;
        const status = document.querySelector('[data-theme-status]');
        if (!status) return;
        const states = {
            system: toggle.dataset.stateSystem || 'System theme',
            light: toggle.dataset.stateLight || 'Light theme',
            dark: toggle.dataset.stateDark || 'Dark theme'
        };
        status.textContent = states[mode] || states.system;
    }

    /**
     * Advance to the next mode in the cycle and persist it.
     */
    function cycleTheme() {
        const next = MODES[(MODES.indexOf(getMode()) + 1) % MODES.length];
        storeMode(next);
        applyMode(next, true);
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
            storeMode(mode);
            applyMode(mode);
        }
    };
})();
