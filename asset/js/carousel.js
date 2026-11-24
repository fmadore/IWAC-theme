/**
 * Item carousel — measurement-dependent chrome for the scroll-snap plate run.
 *
 * WHAT THIS IS NOT. It is not the carousel. The track in
 * view/common/block-layout/item-carousel.phtml is a native overflow-x scroller
 * with scroll-snap: swipe, momentum, trackpad, shift-wheel, arrow keys and the
 * scrollbar all work before this file has parsed, and keep working if it never
 * arrives. Everything here is chrome that cannot be written in CSS because it
 * needs to measure the track: whether it overflows at all, which slide is
 * leading, and how far along the run the reader is.
 *
 * So every control ships `hidden` in the markup and is unhidden only after the
 * first measurement confirms it has something to do. A four-slide block on a
 * wide screen showing four at a time gets no arrows, no counter and no rule —
 * not disabled ones.
 *
 * WHY A MEASURED DELTA AND NOT A SLIDE WIDTH. Stepping by a fixed slide width
 * accumulates error: the track's gap, the fractional peek width below 600px and
 * sub-pixel layout all drift, and after eight steps the run sits between snap
 * points. Each step instead measures the target slide's start edge against the
 * track's (the track has no inline padding, so that edge is the snap edge) and
 * scrolls by exactly that difference; scroll-snap absorbs any sub-pixel rest.
 *
 * WHY NOT scrollIntoView. It scrolls every scrollable ancestor, the document
 * included. `block: 'nearest'` only spares the page while the slide is already
 * in the viewport: once the reader had scrolled past an autoplaying carousel,
 * every tick pulled the page back up to it (issue #37). scrollBy on the track
 * moves the track and nothing else.
 *
 * THE INDEX IS READ FROM SCROLL, NOT COUNTED. There is no "current slide" state
 * to keep in sync, because the reader can move the track by six means this file
 * never sees. The leading index is derived from scrollLeft on every scroll
 * event, which makes a swipe, an arrow press and a trackpad flick indis-
 * tinguishable — the only correct model for a native scroller.
 *
 * RTL. scrollLeft runs negative in a right-to-left track (the modern spec
 * behaviour). The position is taken from its magnitude over the scrollable
 * distance, so the progress rule and counter read correctly in both directions;
 * the arrows resolve their own direction from the computed style rather than
 * assuming prev means left.
 */
(function () {
    'use strict';

    var utils = window.IWACUtils || {};
    var onReady = utils.onReady || function (callback) { callback(); };
    var debounce = utils.debounce || function (fn) { return fn; };

    // A snap landing is never pixel-exact: sub-pixel layout and the engine's own
    // rounding leave a slide a fraction short of its offset. Anything inside a
    // pixel of the end counts as the end, or the "next" arrow never disables.
    var EPSILON = 1;

    function prefersReducedMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function setupCarousel(root) {
        var track = root.querySelector('[data-carousel-track]');
        if (!track) {
            return;
        }

        var slides = Array.prototype.slice.call(track.querySelectorAll('[data-carousel-slide]'));
        if (!slides.length) {
            return;
        }

        var nav = root.querySelector('[data-carousel-nav]');
        var counter = root.querySelector('[data-carousel-counter]');
        var rule = root.querySelector('[data-carousel-rule]');
        var mark = root.querySelector('.carousel__rule-mark');
        var prevBtn = root.querySelector('[data-carousel-prev]');
        var nextBtn = root.querySelector('[data-carousel-next]');
        var toggleBtn = root.querySelector('[data-carousel-toggle]');
        var currentOut = root.querySelector('[data-carousel-current]');
        var statusOut = root.querySelector('[data-carousel-status]');
        var positionFormat = (nav && nav.getAttribute('data-label-position')) || 'Slide %1$s of %2$s';

        var autoplayMs = parseInt(root.getAttribute('data-carousel-autoplay'), 10) || 0;
        var autoplayTimer = null;
        var autoplayOn = false;
        var lastIndex = -1;

        function isRtl() {
            return window.getComputedStyle(track).direction === 'rtl';
        }

        function scrollable() {
            return track.scrollWidth - track.clientWidth;
        }

        function overflows() {
            return scrollable() > EPSILON;
        }

        // Magnitude, not sign: an RTL track counts up from 0 to -max.
        function position() {
            var max = scrollable();
            return max > 0 ? Math.min(1, Math.abs(track.scrollLeft) / max) : 0;
        }

        // The leading slide is the first whose start edge has not yet passed the
        // track's start edge, measured in the track's own coordinates so the
        // page's scroll position is irrelevant.
        function leadingIndex() {
            var origin = track.getBoundingClientRect();
            var rtl = isRtl();
            var best = 0;
            var bestDelta = Infinity;
            for (var i = 0; i < slides.length; i++) {
                var box = slides[i].getBoundingClientRect();
                var delta = rtl ? (origin.right - box.right) : (box.left - origin.left);
                // Bias to the slide at or after the edge; a slide scrolled just
                // past it should not win over the one now leading.
                var score = delta < -EPSILON ? Math.abs(delta) + 1e6 : Math.abs(delta);
                if (score < bestDelta) {
                    bestDelta = score;
                    best = i;
                }
            }
            return best;
        }

        // Scroll the track, and only the track, until slide `index` leads.
        // Same measurement as leadingIndex(): in RTL the run advances leftward,
        // so a slide further along sits left of the start edge and needs a
        // negative scrollBy.
        function scrollToSlide(index) {
            var origin = track.getBoundingClientRect();
            var box = slides[index].getBoundingClientRect();
            var left = isRtl() ? (box.right - origin.right) : (box.left - origin.left);
            track.scrollBy({
                left: left,
                behavior: prefersReducedMotion() ? 'auto' : 'smooth'
            });
        }

        function step(direction) {
            var index = leadingIndex() + direction;
            scrollToSlide(Math.max(0, Math.min(slides.length - 1, index)));
        }

        function render() {
            var has = overflows();

            // Toggling `hidden` is the whole reveal: no control is ever shown in
            // a state where pressing it would do nothing.
            if (nav) { nav.hidden = !has; }
            if (counter) { counter.hidden = !has; }
            if (rule) { rule.hidden = !has; }
            if (!has) {
                stopAutoplay();
                return;
            }

            var pos = position();
            var index = leadingIndex();

            if (prevBtn) { prevBtn.disabled = pos <= 0; }
            if (nextBtn) { nextBtn.disabled = pos >= 1; }

            if (currentOut) { currentOut.textContent = String(index + 1); }

            // The live region carries the full sentence; the visible "3 / 12" is
            // aria-hidden, because "3 slash 12" is not what a screen reader
            // should say. Announced only when the index actually changes, or an
            // inertial swipe fires a dozen redundant announcements.
            if (statusOut && index !== lastIndex) {
                statusOut.textContent = positionFormat
                    .replace('%1$s', String(index + 1))
                    .replace('%2$s', String(slides.length));
            }
            lastIndex = index;

            if (mark) {
                // Fraction of the run in view, and how far that window has
                // travelled. Both are unitless; the stylesheet turns them into a
                // width and an inline offset so the rule reads as a scrollbar.
                var size = Math.min(1, track.clientWidth / track.scrollWidth);
                mark.style.setProperty('--carousel-mark-size', String(size));
                mark.style.setProperty('--carousel-mark-pos', String(pos));
            }
        }

        function stopAutoplay() {
            autoplayOn = false;
            if (autoplayTimer) {
                window.clearInterval(autoplayTimer);
                autoplayTimer = null;
            }
            syncToggle();
        }

        function startAutoplay() {
            if (!autoplayMs || autoplayTimer || !overflows()) {
                return;
            }
            autoplayOn = true;
            autoplayTimer = window.setInterval(function () {
                // Wrap at the end rather than stalling: an unattended slideshow
                // that stops on the last slide has simply ended.
                if (position() >= 1 - 0.001) {
                    scrollToSlide(0);
                } else {
                    step(1);
                }
            }, autoplayMs);
            syncToggle();
        }

        function syncToggle() {
            // While the run advances itself, the position is not news: a polite
            // region would talk over the reader every few seconds for as long
            // as the slideshow plays. Silence it during rotation and restore it
            // the moment the reader is driving (the APG carousel pattern).
            if (statusOut) {
                statusOut.setAttribute('aria-live', autoplayOn ? 'off' : 'polite');
            }
            if (!toggleBtn) {
                return;
            }
            var label = autoplayOn
                ? toggleBtn.getAttribute('data-label-pause')
                : toggleBtn.getAttribute('data-label-play');
            var span = toggleBtn.querySelector('.carousel__btn-label');
            if (span) { span.textContent = label; }
            // The label already states the action ("Stop automatic slideshow");
            // no aria-pressed on top of it, or a screen reader hears "Stop
            // automatic slideshow, pressed" — two contradicting states at once.
            toggleBtn.classList.toggle('is-playing', autoplayOn);
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', function () {
                stopAutoplay();
                step(-1);
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', function () {
                stopAutoplay();
                step(1);
            });
        }
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function () {
                if (autoplayOn) {
                    stopAutoplay();
                } else {
                    startAutoplay();
                }
            });
        }

        // render() measures every slide, so run it once a frame at most.
        var renderQueued = false;
        track.addEventListener('scroll', function () {
            if (renderQueued) return;
            renderQueued = true;
            window.requestAnimationFrame(function () {
                renderQueued = false;
                render();
            });
        }, { passive: true });
        window.addEventListener('resize', debounce(render, 150), { passive: true });

        // Late-arriving images change scrollWidth, which changes whether the
        // chrome should be there at all. Cheaper and more reliable than a load
        // listener per image, and it also catches a font swap reflowing titles.
        if (window.ResizeObserver) {
            var ro = new ResizeObserver(debounce(render, 100));
            ro.observe(track);
        } else {
            window.addEventListener('load', render);
        }

        if (autoplayMs > 0) {
            // WCAG 2.2.2: moving content must be pausable, and under a
            // reduced-motion preference it should not start moving at all. The
            // control is still rendered so the reader can opt in.
            if (prefersReducedMotion()) {
                stopAutoplay();
            } else {
                startAutoplay();
            }
            root.addEventListener('mouseenter', function () {
                if (autoplayOn) { window.clearInterval(autoplayTimer); autoplayTimer = null; }
            });
            root.addEventListener('mouseleave', function () {
                // autoplayOn is the reader's choice; hover only paused the
                // timer. Testing an "interacted" flag here as well froze a
                // run the reader had restarted, under a "Stop" label.
                if (autoplayOn && !autoplayTimer) { autoplayOn = false; startAutoplay(); }
            });
            // Focus entering the run is a reader working through it
            // deliberately — except on the toggle, which decides for itself:
            // a click focuses it first, and stopping here made the click that
            // follows restart a run the reader had just asked to stop.
            root.addEventListener('focusin', function (event) {
                if (toggleBtn && toggleBtn.contains(event.target)) return;
                stopAutoplay();
            });
            document.addEventListener('visibilitychange', function () {
                if (document.hidden) {
                    if (autoplayTimer) { window.clearInterval(autoplayTimer); autoplayTimer = null; }
                } else if (autoplayOn && !autoplayTimer) {
                    // As on mouseleave: hiding paused only the timer. A handle
                    // that is still live is left running, never orphaned by a
                    // second interval.
                    autoplayOn = false;
                    startAutoplay();
                }
            });
        }

        root.classList.add('is-enhanced');
        render();
    }

    onReady(function () {
        var roots = document.querySelectorAll('[data-carousel]');
        for (var i = 0; i < roots.length; i++) {
            setupCarousel(roots[i]);
        }
    });
}());
