/**
 * Linked Resources - Client-side search/sort and AJAX-swapped
 * facet filtering and pagination.
 *
 * The root element is #linked-resources. Facet chips, pagination
 * nav links, and the pager form all target the current URL with
 * query params; instead of letting the browser do a full reload
 * (which scroll-jumps to the top then back to the fragment), we
 * fetch the new HTML, parse out the replacement #linked-resources
 * block, and swap its inner HTML in place. history.pushState keeps
 * the URL bookmarkable.
 */

/** Selectors we rebind after every AJAX swap. */
const LINKED_ROOT_ID = 'linked-resources';

let originalOrder = [];

const bindLinkedResources = () => {
    const root = document.getElementById(LINKED_ROOT_ID);
    if (!root) return;

    const searchInput = root.querySelector('.linked-resources__search-input');
    const sortSelect = root.querySelector('.linked-resources__sort-select');
    const tbody = root.querySelector('.linked-resources-table tbody');
    const statusRegion = root.querySelector('.linked-resources__status');
    const noResultsEl = root.querySelector('.linked-resources__no-results');

    // Snapshot original row order for "Default" sort reset.
    if (tbody) {
        originalOrder = Array.from(tbody.querySelectorAll('tr'));
    }

    if (searchInput && tbody) {
        const handleSearch = IWACUtils.debounce(
            () => filterResources(tbody, searchInput, noResultsEl, statusRegion),
            200
        );
        searchInput.addEventListener('input', handleSearch);
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                filterResources(tbody, searchInput, noResultsEl, statusRegion);
                searchInput.focus();
            }
        });
    }

    if (sortSelect && tbody) {
        sortSelect.addEventListener('change', () => sortResources(tbody, sortSelect));
    }

    // AJAX: facet chips.
    root.querySelectorAll('.linked-resources__facet').forEach((a) => {
        a.addEventListener('click', handleAjaxLink);
    });

    // AJAX: pagination prev/next links.
    root.querySelectorAll('.linked-footer a.pagination-nav').forEach((a) => {
        a.addEventListener('click', handleAjaxLink);
    });

    // AJAX: the "go to page N" pager form.
    const pagerForm = root.querySelector('.linked-footer form.pager');
    if (pagerForm) {
        pagerForm.addEventListener('submit', handlePagerSubmit);
    }
};

function filterResources(tbody, searchInput, noResultsEl, statusRegion) {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const rows = tbody.querySelectorAll('tr');
    let visibleCount = 0;

    rows.forEach((row) => {
        const title = (row.dataset.title || '').toLowerCase();
        const matches = !searchTerm || title.includes(searchTerm);
        row.style.display = matches ? '' : 'none';
        row.setAttribute('aria-hidden', String(!matches));
        if (matches) visibleCount++;
    });

    if (noResultsEl) {
        noResultsEl.hidden = !(searchTerm && visibleCount === 0);
    }

    announceStatus(statusRegion, searchTerm, visibleCount);
}

function sortResources(tbody, sortSelect) {
    const sortValue = sortSelect.value;
    let rows;

    if (sortValue === 'default') {
        rows = originalOrder.slice();
    } else {
        rows = Array.from(tbody.querySelectorAll('tr'));
        rows.sort((a, b) => {
            switch (sortValue) {
                case 'alpha-asc':
                    return (a.dataset.title || '').localeCompare(
                        b.dataset.title || '',
                        undefined,
                        { sensitivity: 'base' }
                    );
                case 'alpha-desc':
                    return (b.dataset.title || '').localeCompare(
                        a.dataset.title || '',
                        undefined,
                        { sensitivity: 'base' }
                    );
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
    rows.forEach((row) => fragment.appendChild(row));
    tbody.appendChild(fragment);
}

function compareDates(dateA, dateB) {
    const a = dateA ? new Date(dateA).getTime() : NaN;
    const b = dateB ? new Date(dateB).getTime() : NaN;
    const aNaN = Number.isNaN(a);
    const bNaN = Number.isNaN(b);
    if (aNaN && bNaN) return 0;
    if (aNaN) return 1;
    if (bNaN) return -1;
    return a - b;
}

function announceStatus(statusRegion, searchTerm, visible) {
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

// ---- AJAX swap ----------------------------------------------------------

function handleAjaxLink(e) {
    // Respect modifier keys so ctrl/cmd/shift-click still open new tabs.
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) {
        return;
    }
    const link = e.currentTarget;
    if (!link.href || link.classList.contains('disabled')) {
        return;
    }
    e.preventDefault();
    swapContent(link.href);
}

function handlePagerSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const params = new URLSearchParams();
    for (const [key, value] of data.entries()) {
        if (value !== '') {
            params.set(key, String(value));
        }
    }
    const url = `${window.location.pathname}?${params.toString()}#resources-linked`;
    swapContent(url);
}

async function swapContent(url) {
    const root = document.getElementById(LINKED_ROOT_ID);
    if (!root) return;

    root.setAttribute('aria-busy', 'true');

    try {
        const response = await fetch(url, {
            credentials: 'same-origin',
            headers: { 'X-Requested-With': 'fetch' },
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const newRoot = doc.getElementById(LINKED_ROOT_ID);
        if (!newRoot) {
            throw new Error('Response did not contain #linked-resources');
        }

        root.innerHTML = newRoot.innerHTML;
        history.pushState({ linkedResources: true }, '', url);
        bindLinkedResources();
    } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[linked-resources] AJAX swap failed, falling back to full reload', err);
        window.location.href = url;
    } finally {
        root.removeAttribute('aria-busy');
    }
}

function handlePopState(event) {
    // Only react to history entries we created, so we don't hijack other
    // back-button navigation on the page.
    if (event.state && event.state.linkedResources) {
        swapContent(window.location.href);
    }
}

IWACUtils.onReady(() => {
    bindLinkedResources();
    window.addEventListener('popstate', handlePopState);
});
