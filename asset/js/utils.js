/**
 * Shared utilities for the IWAC theme scripts.
 * Exposes window.IWACUtils.
 */
(function () {
    'use strict';

    /**
     * Run a callback when the DOM is ready.
     * If the DOM is already parsed, the callback runs synchronously.
     */
    function onReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback, { once: true });
        } else {
            callback();
        }
    }

    /**
     * Trailing-edge debounce. Returns a wrapped function that only fires
     * `wait` ms after the last call.
     */
    function debounce(fn, wait) {
        let timeout = null;
        return function debounced(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                timeout = null;
                fn.apply(this, args);
            }, wait);
        };
    }

    /**
     * Storage wrapped in try/catch — any localStorage/sessionStorage access
     * can throw (blocked cookies, some private/embedded contexts). Features
     * degrade to per-pageview behaviour instead of dying on the first read.
     */
    function safeStorage(storageName) {
        return {
            get: function (key) {
                try { return window[storageName].getItem(key); } catch (e) { return null; }
            },
            set: function (key, value) {
                try { window[storageName].setItem(key, value); return true; } catch (e) { return false; }
            },
            remove: function (key) {
                try { window[storageName].removeItem(key); } catch (e) { /* unavailable */ }
            }
        };
    }

    window.IWACUtils = {
        onReady: onReady,
        debounce: debounce,
        localStore: safeStorage('localStorage'),
        sessionStore: safeStorage('sessionStorage')
    };
})();
