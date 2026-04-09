/**
 * Pagination Scroll
 * Scrolls to the top of the results area after a pagination action,
 * so users see the beginning of the new page of results.
 *
 * Handles two cases:
 * 1. Regular browse pages (full page reload) — uses sessionStorage
 * 2. Faceted browse pages (AJAX content replacement) — uses MutationObserver
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'pagination-scroll';

    /**
     * Find the best element to scroll to (the results area).
     */
    function findScrollTarget() {
        return document.querySelector('.browse-controls')
            || document.getElementById('section-content')
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

    // --- Regular browse pages: sessionStorage-based scroll ---

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

    // --- Faceted browse pages: MutationObserver-based scroll ---

    const sectionContent = document.getElementById('section-content');
    const isFacetedBrowse = document.querySelector('.faceted-browse-page, .block-facetedBrowsePreview');

    if (sectionContent && isFacetedBrowse) {
        let paginationClicked = false;

        // Use event delegation on sectionContent since its children are replaced by AJAX
        sectionContent.addEventListener('click', (e) => {
            if (e.target.closest('.pagination a.pagination-nav:not(.disabled)')) {
                paginationClicked = true;
            }
        });

        sectionContent.addEventListener('submit', (e) => {
            if (e.target.closest('.pagination .pager')) {
                paginationClicked = true;
            }
        });

        // Watch for AJAX content replacement
        const observer = new MutationObserver(() => {
            if (!paginationClicked) return;
            paginationClicked = false;
            // Small delay to let new content render
            requestAnimationFrame(() => scrollToResults('smooth'));
        });

        observer.observe(sectionContent, { childList: true });
    }
})();
