/**
 * Mirador Integration
 * Two jobs, both reached through the same handle:
 *
 *  1. Syncs the site's light/dark toggle with Mirador's built-in theme system.
 *  2. Makes "Maximize window" fill the page instead of the card.
 *
 * The Mirador module stores viewer instances at window.miradors[id], keyed by
 * the id of their container element. Each instance exposes a Redux store —
 * dispatching UPDATE_CONFIG with { selectedTheme: 'light'|'dark' } switches
 * MUI's palette at runtime, and state.windows[id].maximized reports whether a
 * window has been maximized within its workspace.
 */
(function () {
    'use strict';

    const ACTION_TYPE = 'mirador/UPDATE_CONFIG';
    const MINIMIZE_WINDOW = 'mirador/MINIMIZE_WINDOW';
    const MAXIMIZED_CLASS = 'is-maximized';
    const BODY_CLASS = 'mirador-maximized';

    /**
     * Run a callback for every initialized viewer instance.
     */
    function eachViewer(callback) {
        if (!window.miradors) return;
        for (const id of Object.keys(window.miradors)) {
            const viewer = window.miradors[id];
            if (viewer && viewer.store && typeof viewer.store.getState === 'function') {
                callback(id, viewer);
            }
        }
    }

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
        eachViewer((id, viewer) => {
            viewer.store.dispatch({
                type: ACTION_TYPE,
                config: { selectedTheme: theme }
            });
        });
    }

    /**
     * Whether any window in this viewer's workspace is maximized.
     */
    function hasMaximizedWindow(viewer) {
        const windows = viewer.store.getState().windows;
        if (!windows) return false;
        return Object.keys(windows).some((id) => windows[id].maximized);
    }

    /**
     * Mirror each viewer's maximized state onto its container as a class, so
     * the stylesheet can lift the container itself to the viewport. Mirador
     * maximizes a window *within its workspace*, and the workspace is the
     * module's 600px card — without this the control appears not to work.
     */
    function syncMaximizedState() {
        let anyMaximized = false;

        eachViewer((id, viewer) => {
            const container = document.getElementById(id);
            if (!container) return;

            const maximized = hasMaximizedWindow(viewer);
            if (maximized) anyMaximized = true;

            // This runs on every store action — including a viewport update per
            // animation frame while panning — so do nothing unless it changed.
            if (container.classList.contains(MAXIMIZED_CLASS) === maximized) return;

            // The container leaves the flow, and letting the page collapse
            // behind the overlay clamps the scroll position on the way out.
            const block = container.closest('.block-mirador');
            if (maximized) {
                if (block) block.style.minHeight = container.offsetHeight + 'px';
                container.classList.add(MAXIMIZED_CLASS);
            } else {
                container.classList.remove(MAXIMIZED_CLASS);
                if (block) block.style.minHeight = '';
            }
        });

        document.body.classList.toggle(BODY_CLASS, anyMaximized);
    }

    /**
     * Restore every maximized window. Returns whether anything was restored.
     */
    function minimizeAllWindows() {
        let restored = false;

        eachViewer((id, viewer) => {
            const windows = viewer.store.getState().windows || {};
            for (const windowId of Object.keys(windows)) {
                if (!windows[windowId].maximized) continue;
                viewer.store.dispatch({ type: MINIMIZE_WINDOW, windowId: windowId });
                restored = true;
            }
        });

        return restored;
    }

    /**
     * Track the maximized state and give the full-page overlay the exit every
     * overlay is expected to have. MUI stops Escape from propagating out of an
     * open dialog, so this only fires when the viewer itself is on top.
     */
    function watchMaximizedState() {
        eachViewer((id, viewer) => viewer.store.subscribe(syncMaximizedState));
        syncMaximizedState();

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape' || event.defaultPrevented) return;
            if (!document.body.classList.contains(BODY_CLASS)) return;
            if (minimizeAllWindows()) event.preventDefault();
        });
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
            watchMaximizedState();
        });
    }

    IWACUtils.onReady(init);
})();
