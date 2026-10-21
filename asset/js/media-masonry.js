(function () {
    'use strict';

    // Packs a Media embed block that uses the "Masonry" template
    // (view/common/block-template/media-masonry.phtml) with MiniMasonry.
    //
    // The stylesheet owns the geometry: `.media-embed.layout-masonry` declares a
    // column width and a column gap, and without this script those lay the cards
    // out as CSS columns, which read down each column. Here the same two values,
    // resolved to px, become MiniMasonry's base width and gutter, so the cards
    // keep their size and spacing and only their order changes: each one drops
    // into the shortest column, which keeps the editor's order running across.
    //
    // A card's height changes after layout — an image or an embedded player
    // loads, a webfont swaps in, the card's width changes with the viewport —
    // so a ResizeObserver on every card re-packs the wall, once per frame.
    // MiniMasonry handles window resizes itself.

    const setUp = (wall) => {
        if (wall.dataset.masonryReady || typeof MiniMasonry === 'undefined') return;

        // Read before [data-masonry-ready] switches the columns off.
        const style = window.getComputedStyle(wall);
        const baseWidth = parseFloat(style.columnWidth);
        const gutter = parseFloat(style.columnGap);
        if (!Number.isFinite(baseWidth) || !Number.isFinite(gutter)) return;

        wall.dataset.masonryReady = 'true';
        const masonry = new MiniMasonry({
            container: wall,
            baseWidth: baseWidth,
            gutter: gutter,
            ultimateGutter: gutter,
            surroundingGutter: false,
            direction: style.direction === 'rtl' ? 'rtl' : 'ltr'
        });

        if (typeof ResizeObserver === 'undefined') return;
        let pending = false;
        const observer = new ResizeObserver(() => {
            if (pending) return;
            pending = true;
            window.requestAnimationFrame(() => {
                pending = false;
                masonry.layout();
            });
        });
        Array.from(wall.children).forEach((card) => observer.observe(card));
    };

    IWACUtils.onReady(() => {
        document.querySelectorAll('.media-embed.layout-masonry').forEach(setUp);
    });
})();
