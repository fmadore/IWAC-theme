(function () {
    'use strict';

    const browseScripts = () => {
        const resources = document.querySelectorAll('.resources');

        resources.forEach((resourcesSet) => {
            const resourceItems = resourcesSet.querySelectorAll('.resource');
            const layoutToggles = resourcesSet.parentElement.querySelectorAll('.layout-toggle button');

            const initMasonryGrid = () => {
                if (resourcesSet.classList.contains('resource-grid') && !resourcesSet.dataset.masonryReady) {
                    // Masonry
                    resourcesSet.dataset.masonryReady = true;
                    const masonry = new MiniMasonry({
                        container: resourcesSet,
                        gutter: 27,
                        ultimateGutter: 27,
                        surroundingGutter: false
                    });

                    // Reset layout as images load. Cached images never fire
                    // `load`, so check `complete` and relayout immediately.
                    let pendingLayout = false;
                    const relayout = () => {
                        if (pendingLayout) return;
                        pendingLayout = true;
                        requestAnimationFrame(() => {
                            pendingLayout = false;
                            masonry.layout();
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
                    window.history.pushState({}, '', url);
                    const navLinks = document.querySelectorAll('.pager-wrapper a.previous, .pager-wrapper a.next');
                    navLinks.forEach((navLink) => {
                        let navLinkUrl = new URL(navLink.href);
                        navLinkUrl.searchParams.set('view', view);
                        navLink.href = navLinkUrl.toString();
                    });

                    e.currentTarget.setAttribute('disabled', true);
                    resourcesSet.classList.toggle('resource-list');
                    resourcesSet.classList.toggle('resource-grid');

                    resourceItems.forEach((resource) => {
                        resource.classList.toggle('media-object');
                        const thumbnailWithDecoration = resource.querySelector('.resource__thumbnail.decoration');
                        if (thumbnailWithDecoration) {
                            thumbnailWithDecoration.classList.toggle('decoration--thumbnail');
                        }

                        const resourceMeta = resource.querySelector('.resource__meta');
                        if (resourceMeta) {
                            resourceMeta.classList.toggle('media-object-section');
                        }
                    });

                    initMasonryGrid();
                });
            });
        });
    }

    IWACUtils.onReady(browseScripts);
})();
