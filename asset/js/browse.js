(function () {
    'use strict';

    const browseScripts = () => {
        const resources = document.querySelectorAll('.resources');

        resources.forEach((resourcesSet) => {
            const resourceItems = resourcesSet.querySelectorAll('.resource');
            const layoutToggles = resourcesSet.parentElement.querySelectorAll('.layout-toggle button');
            let masonry = null;

            const initMasonryGrid = () => {
                if (resourcesSet.classList.contains('resource-grid') && !masonry) {
                    // Masonry
                    resourcesSet.dataset.masonryReady = true;
                    const instance = new MiniMasonry({
                        container: resourcesSet,
                        gutter: 27,
                        ultimateGutter: 27,
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
                    const layoutToggleDisabled = e.currentTarget.parentElement.querySelector('.layout-toggle button:disabled');
                    if (layoutToggleDisabled) {
                        layoutToggleDisabled.removeAttribute('disabled');
                    }

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

                    e.currentTarget.setAttribute('disabled', true);
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
