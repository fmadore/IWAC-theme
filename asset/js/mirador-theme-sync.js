/**
 * Mirador Theme Sync
 * Syncs the site's light/dark toggle with Mirador's built-in theme system.
 *
 * The Mirador module stores viewer instances at window.miradors[id].
 * Each instance exposes a Redux store — dispatching UPDATE_CONFIG with
 * { selectedTheme: 'light'|'dark' } switches MUI's palette at runtime.
 */
(function () {
    'use strict';

    var ACTION_TYPE = 'mirador/UPDATE_CONFIG';

    /**
     * Get the current site theme from the body attribute or system preference.
     */
    function getCurrentTheme() {
        var explicit = document.body.getAttribute('data-theme');
        if (explicit) return explicit;
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    /**
     * Dispatch a theme change to all Mirador viewer stores.
     */
    function syncMiradorTheme(theme) {
        if (!window.miradors) return;
        var keys = Object.keys(window.miradors);
        for (var i = 0; i < keys.length; i++) {
            var viewer = window.miradors[keys[i]];
            if (viewer && viewer.store && typeof viewer.store.dispatch === 'function') {
                viewer.store.dispatch({
                    type: ACTION_TYPE,
                    config: { selectedTheme: theme }
                });
            }
        }
    }

    /**
     * Wait for Mirador to initialize, then apply the current site theme.
     * Mirador loads asynchronously via an ES module, so we poll briefly.
     */
    function waitForMirador(callback, attempts) {
        attempts = attempts || 0;
        if (window.miradors && Object.keys(window.miradors).length > 0) {
            // Check if the first entry has a store (viewer initialized vs raw config)
            var first = window.miradors[Object.keys(window.miradors)[0]];
            if (first && first.store) {
                callback();
                return;
            }
        }
        if (attempts < 50) { // ~5 seconds max
            setTimeout(function () { waitForMirador(callback, attempts + 1); }, 100);
        }
    }

    /**
     * Observe data-theme attribute changes on <body> to sync Mirador.
     */
    function observeThemeChanges() {
        var observer = new MutationObserver(function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
                if (mutations[i].attributeName === 'data-theme') {
                    syncMiradorTheme(getCurrentTheme());
                    break;
                }
            }
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    }

    /**
     * Initialize: sync theme once Mirador is ready, then watch for changes.
     */
    function init() {
        waitForMirador(function () {
            syncMiradorTheme(getCurrentTheme());
            observeThemeChanges();

            // Also listen for system preference changes
            if (window.matchMedia) {
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
                    if (!document.body.getAttribute('data-theme')) {
                        syncMiradorTheme(getCurrentTheme());
                    }
                });
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
