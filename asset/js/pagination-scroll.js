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

    var STORAGE_KEY = 'pagination-scroll';

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
        var target = findScrollTarget();
        if (!target) return;

        var headerHeight = 0;
        var header = document.querySelector('.main-header__main-bar');
        if (header) headerHeight = header.offsetHeight + 20;

        var top = target.getBoundingClientRect().top + window.scrollY - headerHeight;
        window.scrollTo({ top: top, behavior: behavior || 'instant' });
    }

    // --- Regular browse pages: sessionStorage-based scroll ---

    // On page load, check if we should scroll
    var shouldScroll = sessionStorage.getItem(STORAGE_KEY);
    if (shouldScroll) {
        sessionStorage.removeItem(STORAGE_KEY);
        // Wait for layout to settle
        requestAnimationFrame(function () {
            scrollToResults('instant');
        });
    }

    // Mark pagination actions so we scroll after the reload
    document.addEventListener('click', function (e) {
        var link = e.target.closest('.pagination a.pagination-nav:not(.disabled)');
        if (link) {
            sessionStorage.setItem(STORAGE_KEY, '1');
        }
    });

    document.addEventListener('submit', function (e) {
        if (e.target.closest('.pagination .pager')) {
            sessionStorage.setItem(STORAGE_KEY, '1');
        }
    });

    // --- Faceted browse pages: MutationObserver-based scroll ---

    var sectionContent = document.getElementById('section-content');
    var isFacetedBrowse = document.querySelector('.faceted-browse-page, .block-facetedBrowsePreview');

    if (sectionContent && isFacetedBrowse) {
        var paginationClicked = false;

        // Use event delegation on sectionContent since its children are replaced by AJAX
        sectionContent.addEventListener('click', function (e) {
            if (e.target.closest('.pagination a.pagination-nav:not(.disabled)')) {
                paginationClicked = true;
            }
        });

        sectionContent.addEventListener('submit', function (e) {
            if (e.target.closest('.pagination .pager')) {
                paginationClicked = true;
            }
        });

        // Watch for AJAX content replacement
        var observer = new MutationObserver(function () {
            if (!paginationClicked) return;
            paginationClicked = false;
            // Small delay to let new content render
            requestAnimationFrame(function () {
                scrollToResults('smooth');
            });
        });

        observer.observe(sectionContent, { childList: true });
    }
})();
