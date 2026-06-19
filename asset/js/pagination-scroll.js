/**
 * Pagination Scroll
 * Scrolls to the top of the results area after a pagination action,
 * so users see the beginning of the new page of results.
 *
 * Used on browse pages with a full page reload, via sessionStorage.
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'pagination-scroll';

    /**
     * Find the best element to scroll to (the results area).
     */
    function findScrollTarget() {
        return document.querySelector('.browse-controls')
            || document.querySelector('.pagination');
    }

    /**
     * Scroll to the results area, accounting for fixed header.
     */
    function scrollToResults(behavior) {
        const target = findScrollTarget();
        if (!target) return;

        let headerHeight = 0;
        const header = document.querySelector('.main-header__main-bar');
        if (header) headerHeight = header.offsetHeight + 20;

        const top = target.getBoundingClientRect().top + window.scrollY - headerHeight;
        window.scrollTo({ top: top, behavior: behavior || 'instant' });
    }

    // On page load, check if we should scroll
    if (sessionStorage.getItem(STORAGE_KEY)) {
        sessionStorage.removeItem(STORAGE_KEY);
        // Wait for layout to settle
        requestAnimationFrame(() => scrollToResults('instant'));
    }

    // Mark pagination actions so we scroll after the reload
    document.addEventListener('click', (e) => {
        if (e.target.closest('.pagination a.pagination-nav:not(.disabled)')) {
            sessionStorage.setItem(STORAGE_KEY, '1');
        }
    });

    document.addEventListener('submit', (e) => {
        if (e.target.closest('.pagination .pager')) {
            sessionStorage.setItem(STORAGE_KEY, '1');
        }
    });
})();
