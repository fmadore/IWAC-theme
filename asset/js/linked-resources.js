/**
 * Linked Resources - Client-side search/sort and AJAX-swapped
 * facet filtering and pagination.
 *
 * A root element is any `.linked-resources` container (the linked-resources
 * page block on item pages, the item-set ledger on item-set pages — both can
 * coexist, so roots are identified by their unique `id`). Facet chips,
 * pagination nav links, and the pager form all target the current URL with
 * query params; instead of letting the browser do a full reload (which
 * scroll-jumps to the top then back to the fragment), we fetch the new HTML,
 * parse out the replacement root by id, and swap its inner HTML in place.
 * history.pushState keeps the URL bookmarkable.
 *
 * Status strings arrive as data attributes on the root
 * (data-no-results-text / data-results-found-text), never as globals.
 */
(function () {
    'use strict';

    const ROOT_SELECTOR = '.linked-resources';

    // Original row order per root id, for the "Default" sort reset.
    const originalOrders = new Map();

    // Cache of in-flight and completed prefetch promises keyed by URL, so
    // hovering a pagination link and then clicking it reuses the warmed request.
    const prefetchCache = new Map();

    function prefetch(url) {
        if (!url || prefetchCache.has(url)) return;
        // Bound the cache. Pagination only warms a handful of URLs, but cap it so
        // a long browsing session can't retain unbounded response bodies (Map
        // keeps insertion order, so the first key is the oldest).
        if (prefetchCache.size >= 8) {
            prefetchCache.delete(prefetchCache.keys().next().value);
        }
        const promise = fetch(url, {
            credentials: 'same-origin',
            headers: { 'X-Requested-With': 'fetch' },
        })
            .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
            .catch(() => {
                prefetchCache.delete(url);
                return null;
            });
        prefetchCache.set(url, promise);
    }

    function bindRoot(root) {
        const searchInput = root.querySelector('.linked-resources__search-input');
        const sortSelect = root.querySelector('.linked-resources__sort-select');
        const tbody = root.querySelector('.linked-resources-table tbody');
        const statusRegion = root.querySelector('.linked-resources__status');
        const noResultsEl = root.querySelector('.linked-resources__no-results');

        // Snapshot original row order for "Default" sort reset.
        if (tbody) {
            originalOrders.set(root.id, Array.from(tbody.querySelectorAll('tr')));
        }

        if (searchInput && tbody) {
            const handleSearch = IWACUtils.debounce(
                () => filterResources(root, tbody, searchInput, noResultsEl, statusRegion),
                200
            );
            searchInput.addEventListener('input', handleSearch);
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    searchInput.value = '';
                    filterResources(root, tbody, searchInput, noResultsEl, statusRegion);
                    searchInput.focus();
                }
            });
        }

        if (sortSelect && tbody) {
            sortSelect.addEventListener('change', () => sortResources(root, tbody, sortSelect));
        }

        // AJAX: facet chips.
        root.querySelectorAll('.linked-resources__facet').forEach((a) => {
            a.addEventListener('click', handleAjaxLink);
        });

        // AJAX: pagination prev/next links. Also warm a prefetch on hover/focus
        // so clicking the arrow reuses an already-fetched response.
        root.querySelectorAll('.linked-footer a.pagination-nav').forEach((a) => {
            a.addEventListener('click', handleAjaxLink);
            const warm = () => prefetch(a.href);
            a.addEventListener('mouseenter', warm);
            a.addEventListener('focus', warm);
        });

        // AJAX: the "go to page N" pager form.
        const pagerForm = root.querySelector('.linked-footer form.pager');
        if (pagerForm) {
            pagerForm.addEventListener('submit', handlePagerSubmit);
        }

        // Idle prefetch of the next page so the most common navigation (Next
        // / Go-to-next-page) feels instant after the current page settles.
        const nextLink = root.querySelector('.linked-footer a.pagination-nav.next');
        if (nextLink) {
            const schedule = window.requestIdleCallback
                || ((cb) => window.setTimeout(cb, 500));
            schedule(() => prefetch(nextLink.href));
        }
    }

    function filterResources(root, tbody, searchInput, noResultsEl, statusRegion) {
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

        announceStatus(root, statusRegion, searchTerm, visibleCount);
    }

    function sortResources(root, tbody, sortSelect) {
        const sortValue = sortSelect.value;
        let rows;

        if (sortValue === 'default') {
            rows = (originalOrders.get(root.id) || []).slice();
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

    function announceStatus(root, statusRegion, searchTerm, visible) {
        if (!statusRegion) return;
        if (!searchTerm) {
            statusRegion.textContent = '';
        } else if (visible === 0) {
            statusRegion.textContent = root.dataset.noResultsText || 'No resources found';
        } else {
            const message = (root.dataset.resultsFoundText || '{count} resources found')
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
        const root = link.closest(ROOT_SELECTOR);
        if (!root) return;
        e.preventDefault();
        swapContent(root.id, link.href);
    }

    function handlePagerSubmit(e) {
        e.preventDefault();
        const form = e.currentTarget;
        const root = form.closest(ROOT_SELECTOR);
        if (!root) return;
        const data = new FormData(form);
        const params = new URLSearchParams();
        for (const [key, value] of data.entries()) {
            if (value !== '') {
                params.set(key, String(value));
            }
        }
        const fragment = root.dataset.fragment ? `#${root.dataset.fragment}` : '';
        const url = `${window.location.pathname}?${params.toString()}${fragment}`;
        swapContent(root.id, url);
    }

    async function swapContent(rootId, url, options) {
        const root = document.getElementById(rootId);
        if (!root) return;
        const skipHistory = options && options.skipHistory;

        root.setAttribute('aria-busy', 'true');

        try {
            // Reuse a warmed prefetch if one is in flight or already resolved.
            let html;
            if (prefetchCache.has(url)) {
                html = await prefetchCache.get(url);
                prefetchCache.delete(url);
            }
            if (!html) {
                const response = await fetch(url, {
                    credentials: 'same-origin',
                    headers: { 'X-Requested-With': 'fetch' },
                });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                html = await response.text();
            }
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const newRoot = doc.getElementById(rootId);
            if (!newRoot) {
                throw new Error(`Response did not contain #${rootId}`);
            }

            root.innerHTML = newRoot.innerHTML;
            if (!skipHistory) {
                history.pushState({ linkedResources: rootId }, '', url);
            }
            bindRoot(root);

            // The clicked control was destroyed by the swap — put keyboard
            // focus back on the region so tabbing resumes in place, and let
            // the live region announce the update.
            root.setAttribute('tabindex', '-1');
            root.focus({ preventScroll: true });
            const statusRegion = root.querySelector('.linked-resources__status');
            const rowCount = root.querySelectorAll('.linked-resources-table tbody tr').length;
            if (statusRegion) {
                statusRegion.textContent = (root.dataset.resultsFoundText || '{count} resources found')
                    .replace('{count}', rowCount);
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('[linked-resources] AJAX swap failed, falling back to full reload', err);
            window.location.href = url;
        } finally {
            root.removeAttribute('aria-busy');
        }
    }

    function handlePopState(event) {
        // Only react to history entries we created (or the marked entry
        // point), so we don't hijack other back-button navigation.
        if (event.state && event.state.linkedResources) {
            swapContent(event.state.linkedResources, window.location.href, { skipHistory: true });
        }
    }

    IWACUtils.onReady(() => {
        const roots = document.querySelectorAll(ROOT_SELECTOR);
        if (!roots.length) return;
        roots.forEach(bindRoot);
        // Mark the entry-point history record so Back from the first
        // AJAX-created entry restores page 1 instead of leaving stale DOM.
        // With two roots on one page only the first drives history — the
        // Back behaviour for the other stays a plain URL change, never
        // stale-DOM-plus-wrong-URL.
        if (!history.state || !history.state.linkedResources) {
            history.replaceState({ linkedResources: roots[0].id }, '', window.location.href);
        }
        window.addEventListener('popstate', handlePopState);
    });
})();
