/**
 * Linked Resources - Client-side search filtering and sorting
 * Operates on a flat table of <tr> rows.
 */
const linkedResourcesScript = () => {
    const container = document.getElementById('linked-resources');
    if (!container) return;

    const searchInput = container.querySelector('.linked-resources__search-input');
    const sortSelect = container.querySelector('.linked-resources__sort-select');
    const statusRegion = container.querySelector('.linked-resources__status');
    const tbody = container.querySelector('.linked-resources-table tbody');
    const noResultsEl = container.querySelector('.linked-resources__no-results');

    if (!searchInput || !sortSelect || !tbody) return;

    // Preserve original DOM order so "Default" sort can restore it.
    const originalOrder = Array.from(tbody.querySelectorAll('tr'));

    const handleSearch = IWACUtils.debounce(filterResources, 200);

    function filterResources() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const rows = tbody.querySelectorAll('tr');
        let visibleCount = 0;

        rows.forEach(row => {
            const title = (row.dataset.title || '').toLowerCase();
            const matches = !searchTerm || title.includes(searchTerm);

            row.style.display = matches ? '' : 'none';
            row.setAttribute('aria-hidden', String(!matches));

            if (matches) visibleCount++;
        });

        if (noResultsEl) {
            const showNoResults = Boolean(searchTerm) && visibleCount === 0;
            noResultsEl.hidden = !showNoResults;
        }

        announceStatus(searchTerm, visibleCount, rows.length);
    }

    function sortResources() {
        const sortValue = sortSelect.value;
        let rows;

        if (sortValue === 'default') {
            rows = originalOrder.slice();
        } else {
            rows = Array.from(tbody.querySelectorAll('tr'));
            rows.sort((a, b) => {
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
        }

        const fragment = document.createDocumentFragment();
        rows.forEach(row => fragment.appendChild(row));
        tbody.appendChild(fragment);
    }

    function compareDates(dateA, dateB) {
        const a = dateA ? new Date(dateA).getTime() : 0;
        const b = dateB ? new Date(dateB).getTime() : 0;
        if (Number.isNaN(a) && Number.isNaN(b)) return 0;
        if (Number.isNaN(a)) return 1;
        if (Number.isNaN(b)) return -1;
        return a - b;
    }

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

    function clearSearch() {
        searchInput.value = '';
        filterResources();
        searchInput.focus();
    }

    searchInput.addEventListener('input', handleSearch);
    sortSelect.addEventListener('change', sortResources);

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            clearSearch();
        }
    });
};

IWACUtils.onReady(linkedResourcesScript);
