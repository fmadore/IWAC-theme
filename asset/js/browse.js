(function () {
    'use strict';

    const browseScripts = () => {
        const resources = document.querySelectorAll('.resources');

        resources.forEach((resourcesSet) => {
            const resourceItems = resourcesSet.querySelectorAll('.resource');
            const layoutToggles = resourcesSet.parentElement.querySelectorAll('.layout-toggle button');
            let masonry = null;

            // The gutter is the grid's `column-gap` in _resource-grid.scss —
            // resolved to px by the browser, so the spacing scale stays the
            // single source. 24 (--space-6) only if no stylesheet applies.
            const readGutter = () => {
                const gap = parseFloat(window.getComputedStyle(resourcesSet).columnGap);
                return Number.isFinite(gap) ? gap : 24;
            };

            const initMasonryGrid = () => {
                if (resourcesSet.classList.contains('resource-grid') && !masonry) {
                    // Masonry
                    resourcesSet.dataset.masonryReady = true;
                    const gutter = readGutter();
                    const instance = new MiniMasonry({
                        container: resourcesSet,
                        gutter: gutter,
                        ultimateGutter: gutter,
                        surroundingGutter: false
                    });
                    masonry = instance;

                    // Reset layout as images load. Cached images never fire
                    // `load`, so check `complete` and relayout immediately.
                    let pendingLayout = false;
                    const relayout = () => {
                        if (pendingLayout) return;
                        pendingLayout = true;
                        requestAnimationFrame(() => {
                            pendingLayout = false;
                            if (masonry === instance) instance.layout();
                        });
                    };
                    resourcesSet.querySelectorAll('img').forEach((img) => {
                        if (img.complete) {
                            relayout();
                        } else {
                            img.addEventListener('load', relayout, { once: true });
                        }
                    });
                }
            }

            const destroyMasonryGrid = () => {
                if (!masonry) return;
                masonry.destroy();
                masonry = null;
                delete resourcesSet.dataset.masonryReady;
            };

            initMasonryGrid();

            layoutToggles.forEach((layoutToggle) => {
                layoutToggle.addEventListener('click', (e) => {
                    // aria-pressed marks the current layout (both buttons stay
                    // enabled, so focus stays on the one just used); choosing
                    // the current layout again changes nothing.
                    if (e.currentTarget.getAttribute('aria-pressed') === 'true') {
                        return;
                    }
                    e.currentTarget.parentElement.querySelectorAll('button[data-view]').forEach((button) => {
                        button.setAttribute('aria-pressed', button === e.currentTarget ? 'true' : 'false');
                    });

                    const url = new URL(window.location.href);
                    // data-view carries the untranslated value — never derive
                    // the query param from the localized aria-label.
                    const view = e.currentTarget.dataset.view
                        || (e.currentTarget.classList.contains('list') ? 'list' : 'grid');
                    url.searchParams.set('view', view);
                    // The layout is a view preference, not a new navigation
                    // destination. Replacing avoids stale DOM when Back is used.
                    window.history.replaceState(window.history.state, '', url);
                    const navLinks = document.querySelectorAll('.pager-wrapper a.previous, .pager-wrapper a.next');
                    navLinks.forEach((navLink) => {
                        let navLinkUrl = new URL(navLink.href);
                        navLinkUrl.searchParams.set('view', view);
                        navLink.href = navLinkUrl.toString();
                    });
                    // The "go to page" form carries the query as hidden inputs
                    // rendered server-side, so it only has a `view` input if the
                    // page was loaded with one. Without this, typing a page
                    // number after toggling silently reverted the layout.
                    document.querySelectorAll('.pagination form.pager').forEach((pager) => {
                        let viewInput = pager.querySelector('input[type="hidden"][name="view"]');
                        if (!viewInput) {
                            viewInput = document.createElement('input');
                            viewInput.type = 'hidden';
                            viewInput.name = 'view';
                            pager.prepend(viewInput);
                        }
                        viewInput.value = view;
                    });

                    const isGrid = view === 'grid';
                    resourcesSet.classList.toggle('resource-list', !isGrid);
                    resourcesSet.classList.toggle('resource-grid', isGrid);

                    resourceItems.forEach((resource) => {
                        resource.classList.toggle('media-object', !isGrid);
                        const thumbnailWithDecoration = resource.querySelector('.resource__thumbnail.decoration');
                        if (thumbnailWithDecoration) {
                            thumbnailWithDecoration.classList.toggle('decoration--thumbnail', !isGrid);
                        }

                        const resourceMeta = resource.querySelector('.resource__meta');
                        if (resourceMeta) {
                            resourceMeta.classList.toggle('media-object-section', !isGrid);
                        }
                    });

                    if (isGrid) initMasonryGrid();
                    else destroyMasonryGrid();
                });
            });
        });
    }

    IWACUtils.onReady(browseScripts);
})();
