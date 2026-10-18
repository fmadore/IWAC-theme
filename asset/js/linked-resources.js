/**
 * Linked Resources - AJAX-swapped search, sort, facet filtering and
 * pagination.
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
 * The search and the sort run on the server, over every resource the root
 * lists rather than the rows on screen: each root's `.linked-resources__query`
 * is a plain GET form (it works without this script), which is submitted as
 * the reader types or picks an order, and the answer swaps in like a page.
 *
 * Each root keeps its state in its own query parameters, named in its
 * data-query-params (the block: lr_page, resource_property, lr_q and
 * lr_sort; the item-set ledger: page, its sort and its title row), so one
 * URL renders both roots where they stand. A control's
 * href was rendered with the query as it stood then, so once the other root
 * has swapped it carries that root's old state — followed as-is, it would
 * put the other root back on reload or Back. composeUrl() takes the swapping
 * root's parameters from the control and every other root's from the
 * current address.
 *
 * Status strings arrive as data attributes on the root
 * (data-no-results-text / data-results-found-text / data-page-results-text,
 * with the result count on data-total), never as globals.
 */
(function () {
    'use strict';

    const ROOT_SELECTOR = '.linked-resources';

    // A one-letter title search matches nearly everything and costs a whole
    // query; the search starts at two (or when the field is emptied).
    const MIN_SEARCH = 2;

    // Cache of in-flight and completed prefetch promises keyed by URL, so
    // hovering a pagination link and then clicking it reuses the warmed request.
    const prefetchCache = new Map();
    const requestGenerations = new Map();
    const activeRequests = new Map();
    const currentUrls = new Map();
    // Per root: whether its last history entry was a search ('query') or a
    // page / relation change ('navigation').
    const lastSwapKinds = new Map();

    function linkedResourceHistory() {
        const value = history.state && history.state.linkedResources;
        return value && typeof value === 'object' && !Array.isArray(value)
            ? value
            : {};
    }

    // A reader who asked the browser to save data gets no speculative
    // requests: the idle warm-up of the next page is a whole extra page
    // render per visit, and on a metered connection it is theirs to pay for.
    function saveData() {
        const connection = navigator.connection;
        return Boolean(connection && connection.saveData);
    }

    /** The query parameters a root keeps its state in. */
    function rootParams(root) {
        return (root.dataset.queryParams || '').split(/\s+/).filter(Boolean);
    }

    /**
     * The URL a swap of `root` to `href` loads and records: `href`, with
     * every other root's parameters as the current address has them. A
     * parameter that already agrees is left alone, so the common case —
     * nothing else has moved — returns `href` as it was (only resolved),
     * and a warmed prefetch of it is found again.
     */
    function composeUrl(root, href) {
        const target = new URL(href, window.location.href);
        const current = new URLSearchParams(window.location.search);
        document.querySelectorAll(ROOT_SELECTOR).forEach((other) => {
            if (other === root) return;
            rootParams(other).forEach((name) => {
                const want = current.getAll(name);
                const have = target.searchParams.getAll(name);
                if (want.length === have.length && want.every((value, i) => value === have[i])) return;
                target.searchParams.delete(name);
                want.forEach((value) => target.searchParams.append(name, value));
            });
        });
        return target.href;
    }

    function prefetch(url) {
        if (!url || prefetchCache.has(url) || saveData()) return;
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
        const form = root.querySelector('form.linked-resources__query');
        if (form) {
            bindQueryForm(root, form);
        }

        // AJAX: facet chips.
        root.querySelectorAll('.linked-resources__facet').forEach((a) => {
            a.addEventListener('click', handleAjaxLink);
        });

        // AJAX: pagination prev/next links. Also warm a prefetch on hover/focus
        // so clicking the arrow reuses an already-fetched response.
        root.querySelectorAll('.linked-footer a.pagination-nav').forEach((a) => {
            a.addEventListener('click', handleAjaxLink);
            const warm = () => prefetch(composeUrl(root, a.href));
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
            schedule(() => prefetch(composeUrl(root, nextLink.href)));
        }
    }

    /**
     * The search form: submitted on a pause in typing, on a new order, on
     * Enter, and emptied by Escape. The Apply button is only for readers
     * without this script — a select cannot submit itself.
     */
    function bindQueryForm(root, form) {
        const input = form.querySelector('.linked-resources__search-input');
        const sortSelect = form.querySelector('.linked-resources__sort-select');
        const apply = form.querySelector('.linked-resources__apply');
        if (apply) apply.hidden = true;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            submitQuery(form);
        });

        if (input) {
            // What the form last asked the server for, so a pause that leaves
            // the search as it was (a typed-then-erased letter) asks nothing.
            form.dataset.submitted = input.value.trim();
            const handleInput = IWACUtils.debounce(() => {
                const value = input.value.trim();
                if (value === form.dataset.submitted) return;
                if (value !== '' && value.length < MIN_SEARCH) return;
                submitQuery(form);
            }, 300);
            input.addEventListener('input', handleInput);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && input.value !== '') {
                    e.preventDefault();
                    input.value = '';
                    submitQuery(form);
                }
            });
        }

        if (sortSelect) {
            sortSelect.addEventListener('change', () => submitQuery(form));
        }
    }

    /**
     * The URL the form would submit to: its fields, empty ones left out —
     * and with them the hidden fields that only qualify an empty one
     * (data-requires names it: the ledger's "title contains" row is three
     * hidden fields around its text, meaningless without it).
     */
    function formUrl(form) {
        const target = new URL(form.getAttribute('action') || window.location.href, window.location.href);
        const params = new URLSearchParams();
        const filled = (name) => [...form.elements].some((el) => el.name === name && el.value.trim() !== '');
        for (const el of form.elements) {
            if (!el.name || el.disabled || el.type === 'submit') continue;
            const text = el.value.trim();
            if (text === '') continue;
            if (el.dataset.requires && !filled(el.dataset.requires)) continue;
            params.append(el.name, text);
        }
        target.search = params.toString();
        return target.href;
    }

    function submitQuery(form) {
        const root = form.closest(ROOT_SELECTOR);
        if (!root) return;
        const input = form.querySelector('.linked-resources__search-input');
        form.dataset.submitted = input ? input.value.trim() : '';
        swapContent(root.id, composeUrl(root, formUrl(form)), { query: true });
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
        swapContent(root.id, composeUrl(root, link.href));
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
        swapContent(root.id, composeUrl(root, url));
    }

    async function swapContent(rootId, url, options) {
        const root = document.getElementById(rootId);
        if (!root) return;
        const skipHistory = options && options.skipHistory;
        const fromQuery = Boolean(options && options.query);

        const generation = (requestGenerations.get(rootId) || 0) + 1;
        requestGenerations.set(rootId, generation);
        const previousRequest = activeRequests.get(rootId);
        if (previousRequest) previousRequest.abort();
        const controller = new AbortController();
        activeRequests.set(rootId, controller);

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
                    signal: controller.signal,
                });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                html = await response.text();
            }
            if (generation !== requestGenerations.get(rootId)) return;
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const newRoot = doc.getElementById(rootId);
            if (!newRoot) {
                throw new Error(`Response did not contain #${rootId}`);
            }

            const current = document.getElementById(rootId);
            if (!current) return;
            // Focus outlives the swap. A reader in the search field may have
            // typed on while the request was out, and the response's field
            // holds what was asked, not what is there now: keep their text
            // and caret, and ask again if it moved on. A reader on the sort
            // select stays on it.
            const active = document.activeElement;
            const activeId = active && active !== current && current.contains(active) && active.id ? active.id : null;
            const liveInput = active && active.classList && active.classList.contains('linked-resources__search-input')
                ? active
                : null;
            const replacement = document.importNode(newRoot, true);
            current.replaceWith(replacement);
            currentUrls.set(rootId, url);
            if (!skipHistory) {
                const linkedResources = Object.assign(
                    {},
                    linkedResourceHistory(),
                    { [rootId]: url }
                );
                const state = Object.assign({}, history.state, { linkedResources });
                // One entry per search, not one per pause in typing: a
                // search or sort that follows another replaces it, so Back
                // leaves the search rather than unpicking it letter by letter.
                if (fromQuery && lastSwapKinds.get(rootId) === 'query') {
                    history.replaceState(state, '', url);
                } else {
                    history.pushState(state, '', url);
                }
                lastSwapKinds.set(rootId, fromQuery ? 'query' : 'navigation');
            }
            bindRoot(replacement);

            const refocus = activeId ? replacement.querySelector(`[id="${activeId}"]`) : null;
            if (refocus) {
                if (liveInput && refocus.classList.contains('linked-resources__search-input')) {
                    const { selectionStart, selectionEnd } = liveInput;
                    refocus.value = liveInput.value;
                    refocus.focus({ preventScroll: true });
                    try {
                        refocus.setSelectionRange(selectionStart, selectionEnd);
                    } catch {
                        // Where an input type has no selection, the caret
                        // simply lands at the end.
                    }
                    if (refocus.form && refocus.value.trim() !== refocus.form.dataset.submitted) {
                        refocus.dispatchEvent(new Event('input'));
                    }
                } else {
                    refocus.focus({ preventScroll: true });
                }
            } else {
                // The clicked control was destroyed by the swap — put
                // keyboard focus back on the region so tabbing resumes in
                // place.
                replacement.setAttribute('tabindex', '-1');
                replacement.focus({ preventScroll: true });
            }

            // Let the live region announce the update: the search's result
            // count after a search or a new order, the rows on screen after
            // a page or a relation.
            const statusRegion = replacement.querySelector('.linked-resources__status');
            const rowCount = replacement.querySelectorAll('.linked-resources-table tbody tr').length;
            if (statusRegion) {
                const total = Number(replacement.dataset.total);
                if (fromQuery && rowCount === 0) {
                    statusRegion.textContent = replacement.dataset.noResultsText || 'No resources found';
                } else if (fromQuery) {
                    statusRegion.textContent = (replacement.dataset.resultsFoundText || '{count} resources found')
                        .replace('{count}', Number.isFinite(total) ? total : rowCount);
                } else {
                    statusRegion.textContent = (replacement.dataset.pageResultsText || '{count} resources on this page')
                        .replace('{count}', rowCount);
                }
            }
        } catch (err) {
            if (err.name === 'AbortError' || generation !== requestGenerations.get(rootId)) {
                return;
            }
            console.warn('[linked-resources] AJAX swap failed, falling back to full reload', err);
            window.location.href = url;
        } finally {
            if (generation === requestGenerations.get(rootId)) {
                const currentRoot = document.getElementById(rootId);
                if (currentRoot) currentRoot.removeAttribute('aria-busy');
                activeRequests.delete(rootId);
            }
        }
    }

    function handlePopState(event) {
        if (!event.state || !event.state.linkedResources) return;
        lastSwapKinds.clear();
        Object.entries(event.state.linkedResources).forEach(([rootId, url]) => {
            if (document.getElementById(rootId) && currentUrls.get(rootId) !== url) {
                swapContent(rootId, url, { skipHistory: true });
            }
        });
    }

    IWACUtils.onReady(() => {
        const roots = document.querySelectorAll(ROOT_SELECTOR);
        if (!roots.length) return;
        const initialUrls = {};
        roots.forEach((root) => {
            bindRoot(root);
            initialUrls[root.id] = window.location.href;
            currentUrls.set(root.id, window.location.href);
        });
        // Mark every root's entry-point so Back from the first AJAX-created
        // entry restores each independently instead of leaving stale DOM.
        history.replaceState(
            Object.assign({}, history.state, {
                linkedResources: initialUrls,
            }),
            '',
            window.location.href
        );
        window.addEventListener('popstate', handlePopState);
    });
})();
