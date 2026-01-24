/**
 * Linked Resources - Client-side search filtering and sorting
 */
const linkedResourcesScript = () => {
    const container = document.getElementById('linked-resources');
    if (!container) return;

    const searchInput = container.querySelector('.linked-resources__search-input');
    const sortSelect = container.querySelector('.linked-resources__sort-select');
    const statusRegion = container.querySelector('.linked-resources__status');
    const accordionPanels = container.querySelectorAll('.accordion__panel');
    const noResultsEl = container.querySelector('.linked-resources__no-results');

    if (!searchInput || !sortSelect) return;

    let debounceTimer = null;
    const DEBOUNCE_DELAY = 200;

    /**
     * Debounced search filter
     */
    function handleSearch() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            filterResources();
        }, DEBOUNCE_DELAY);
    }

    /**
     * Filter resources by search term
     */
    function filterResources() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        let totalVisible = 0;
        let totalItems = 0;

        accordionPanels.forEach(panel => {
            const items = panel.querySelectorAll('.linked-resource');
            let panelVisible = 0;

            items.forEach(item => {
                const title = (item.dataset.title || '').toLowerCase();
                const matches = !searchTerm || title.includes(searchTerm);

                item.style.display = matches ? '' : 'none';
                item.setAttribute('aria-hidden', !matches);

                if (matches) panelVisible++;
                totalItems++;
            });

            totalVisible += panelVisible;

            // Update accordion heading count if exists
            const accordion = panel.closest('.linked-resource-accordion');
            if (accordion) {
                const countEl = accordion.querySelector('.linked-resource-count');
                if (countEl && searchTerm) {
                    countEl.textContent = `(${panelVisible})`;
                } else if (countEl) {
                    countEl.textContent = `(${countEl.dataset.originalCount})`;
                }
            }
        });

        // Show/hide no results message
        if (noResultsEl) {
            noResultsEl.style.display = (searchTerm && totalVisible === 0) ? '' : 'none';
            noResultsEl.setAttribute('aria-hidden', !(searchTerm && totalVisible === 0));
        }

        // Announce results to screen readers
        announceStatus(searchTerm, totalVisible, totalItems);

        // Refresh accordion panel heights after filtering
        refreshAccordionHeights();
    }

    /**
     * Sort resources within each accordion panel
     */
    function sortResources() {
        const sortValue = sortSelect.value;

        accordionPanels.forEach(panel => {
            const items = Array.from(panel.querySelectorAll('.linked-resource'));
            if (items.length === 0) return;

            items.sort((a, b) => {
                switch (sortValue) {
                    case 'alpha-asc':
                        return (a.dataset.title || '').localeCompare(b.dataset.title || '', undefined, { sensitivity: 'base' });
                    case 'alpha-desc':
                        return (b.dataset.title || '').localeCompare(a.dataset.title || '', undefined, { sensitivity: 'base' });
                    case 'date-desc':
                        return compareDates(b.dataset.date, a.dataset.date);
                    case 'date-asc':
                        return compareDates(a.dataset.date, b.dataset.date);
                    default:
                        return 0;
                }
            });

            // Reorder DOM elements
            items.forEach(item => panel.appendChild(item));
        });

        // Refresh accordion panel heights after sorting
        refreshAccordionHeights();
    }

    /**
     * Compare date strings (handles empty/missing dates)
     */
    function compareDates(dateA, dateB) {
        const a = dateA ? new Date(dateA).getTime() : 0;
        const b = dateB ? new Date(dateB).getTime() : 0;
        return a - b;
    }

    /**
     * Announce filter results to screen readers
     */
    function announceStatus(searchTerm, visible, total) {
        if (!statusRegion) return;

        if (!searchTerm) {
            statusRegion.textContent = '';
        } else if (visible === 0) {
            statusRegion.textContent = linkedResourcesNoResults || 'No resources found';
        } else {
            const message = (linkedResourcesResultsFound || '{count} resources found')
                .replace('{count}', visible);
            statusRegion.textContent = message;
        }
    }

    /**
     * Refresh accordion panel heights (needed after DOM changes)
     */
    function refreshAccordionHeights() {
        accordionPanels.forEach(panel => {
            if (panel.style.maxHeight) {
                panel.style.maxHeight = panel.scrollHeight + 'px';
            }
        });
    }

    /**
     * Clear search input
     */
    function clearSearch() {
        searchInput.value = '';
        filterResources();
        searchInput.focus();
    }

    // Event listeners
    searchInput.addEventListener('input', handleSearch);
    sortSelect.addEventListener('change', sortResources);

    // Escape key clears search
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            clearSearch();
        }
    });

    // Clear button (if exists)
    const clearBtn = container.querySelector('.linked-resources__search-clear');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearSearch);
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', linkedResourcesScript);
} else {
    linkedResourcesScript();
}
