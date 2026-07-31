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

    const ACTION_TYPE = 'mirador/UPDATE_CONFIG';

    /**
     * Get the current site theme from the body attribute or system preference.
     */
    function getCurrentTheme() {
        const explicit = document.body.getAttribute('data-theme');
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
        const keys = Object.keys(window.miradors);
        for (const key of keys) {
            const viewer = window.miradors[key];
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
     * Mirador loads asynchronously via an ES module. Observe DOM changes and
     * keep a low-frequency fallback check until the store becomes available.
     */
    function waitForMirador(callback) {
        let interval = null;
        let observer = null;

        function stop() {
            if (interval) window.clearInterval(interval);
            if (observer) observer.disconnect();
            interval = null;
            observer = null;
        }

        function check() {
            if (window.miradors && Object.keys(window.miradors).length > 0) {
                // Check if the first entry has a store (viewer initialized vs raw config)
                const first = window.miradors[Object.keys(window.miradors)[0]];
                if (first && first.store) {
                    callback();
                    stop();
                }
            }
        }

        interval = window.setInterval(check, 250);
        observer = new MutationObserver(check);
        observer.observe(document.documentElement, { childList: true, subtree: true });
        window.addEventListener('pagehide', stop, { once: true });
        check();
    }

    /**
     * Observe data-theme attribute changes on <body> to sync Mirador.
     */
    function observeThemeChanges() {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.attributeName === 'data-theme') {
                    syncMiradorTheme(getCurrentTheme());
                    break;
                }
            }
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    }

    /**
     * Initialize: sync theme once Mirador is ready, then watch for changes.
     * Bail immediately on pages without a Mirador mount point — this script
     * is enqueued site-wide, and polling 50 timers on every page for a
     * viewer that isn't there is pure waste.
     */
    function init() {
        const hasMount = window.miradors
            || document.querySelector('[id^="mirador"], .mirador-viewer, [data-mirador]');
        if (!hasMount) {
            return;
        }
        observeThemeChanges();
        waitForMirador(() => {
            syncMiradorTheme(getCurrentTheme());
        });
    }

    IWACUtils.onReady(init);
})();
