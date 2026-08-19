(function () {
'use strict';

const freedomScripts = () => {

    const mainHeader = document.querySelector('.main-header');
    const mainHeaderMainBar = document.querySelector('.main-header__main-bar');
    const navStrip = document.querySelector('.main-header .main-navigation');
    const menuDrawer = document.getElementById('menu-drawer');
    const userBar = document.getElementById('user-bar');

    // The section strip is only rendered from this breakpoint (see
    // _navigation.scss $lg); below it the drawer + hamburger live in the
    // masthead row, which must therefore never slide away.
    const stripVisible = window.matchMedia('(min-width: 1024px)');

    // Scrolling Events — masthead slides away on scroll-down so the section
    // strip stays pinned alone; scrolling up brings the wordmark back.

    let lastKnownScrollPosition = 0;
    let ticking = false;
    let scrollDirection = 'up';

    function onScroll(scrollPos) {
        // Header chrome can be absent on minimal pages; bail safely so the
        // rest of freedomScripts (annotations, language switcher) still binds.
        if (!mainHeader || !mainHeaderMainBar || !menuDrawer) {
            return;
        }

        // Skip header auto-hide when an input is focused to prevent scroll jitter
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.tagName === 'SELECT' ||
            activeElement.isContentEditable
        );

        if (isInputFocused) {
            return;
        }

        const canCollapse = stripVisible.matches && navStrip;

        if (canCollapse && scrollPos > 60 && scrollDirection == 'down') {
            mainHeader.style.top = - (userBarHeight + mainHeaderMainBar.offsetHeight) + 'px';
        } else {
            mainHeader.style.top = 0;
        }
        syncMenuDrawer();
    }

    // Passive: this handler never calls preventDefault, and saying so lets the
    // browser start compositing the scroll without waiting on it.
    document.addEventListener('scroll', (event) => {
        scrollDirection = Math.max(lastKnownScrollPosition, window.scrollY) == lastKnownScrollPosition ? 'up': 'down';
        lastKnownScrollPosition = window.scrollY;

        if (!ticking) {
            window.requestAnimationFrame(() => {
                onScroll(lastKnownScrollPosition);
                syncBackToTop(lastKnownScrollPosition);
                ticking = false;
            });

            ticking = true;
        }
    }, { passive: true });

    // Back to top — appears once the page has scrolled past ~a viewport.
    // Toggled outside onScroll, which early-returns while an input is
    // focused or header chrome is absent.

    const backToTop = document.getElementById('back-to-top');

    function syncBackToTop(scrollPos) {
        if (!backToTop) {
            return;
        }
        backToTop.classList.toggle('is-visible', scrollPos > Math.max(600, window.innerHeight * 0.75));
    }

    if (backToTop) {
        backToTop.addEventListener('click', () => {
            const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
            // Park focus on the page-top landmark so keyboard users don't
            // tab onward from a control that just hid itself.
            const content = document.getElementById('content');
            if (content) {
                content.focus({ preventScroll: true });
            }
        });
        syncBackToTop(window.scrollY);
    }

    // Resize Events

    let userBarHeight = 0;

    function onResize() {
        if (!mainHeader || !mainHeaderMainBar) {
            return;
        }
        getUserBarHeight();
        refreshScrollPadding();
        onScroll(lastKnownScrollPosition);
    }

    window.addEventListener('resize', IWACUtils.debounce(onResize, 250));

    // Anchor jumps must land below the sticky chrome. NOTE: this same
    // scroll-padding makes Chromium fight the caret when typing into an
    // input that sits INSIDE the sticky header (every keystroke nudges the
    // page up trying to clear the padding) — so it is zeroed while focus is
    // within the header (see focusin/focusout below).
    function refreshScrollPadding() {
        document.documentElement.style.scrollPaddingTop = (mainHeader.offsetHeight + 16) + 'px';
    }

    if (mainHeader) {
        mainHeader.addEventListener('focusin', () => {
            document.documentElement.style.scrollPaddingTop = '0px';
        });
        mainHeader.addEventListener('focusout', () => {
            refreshScrollPadding();
        });
    }

    // Keep the drawer pinned under whatever part of the header is visible.
    // Called from every scroll frame, so it stays cheap: the drawer only needs
    // pinning while it is actually open, and even then only when the header's
    // bottom edge has really moved. Previously this wrote three inline styles
    // to a display:none element on every single frame of every scroll.
    let lastMenuTop = null;

    function syncMenuDrawer() {
        if (!menuDrawer || !mainHeader) {
            return;
        }
        if (!menuDrawer.classList.contains('toggled')) {
            // Force a re-sync when it next opens.
            lastMenuTop = null;
            return;
        }
        const menuTop = Math.max(0, mainHeader.getBoundingClientRect().bottom);
        if (menuTop === lastMenuTop) {
            return;
        }
        lastMenuTop = menuTop;
        menuDrawer.style.setProperty('--menu-drawer-top', menuTop + 'px');
        menuDrawer.style.top = menuTop + 'px';
        menuDrawer.style.height = 'calc(100vh - ' + menuTop + 'px)';
    }

    // The drawer is opened by navigation.js (it adds .toggled). Watch for that
    // rather than reaching across files, so the first sync happens the moment
    // it opens instead of waiting for the next scroll frame.
    if (menuDrawer) {
        new MutationObserver(syncMenuDrawer).observe(menuDrawer, {
            attributes: true,
            attributeFilter: ['class'],
        });
    }

    function getUserBarHeight() {
        if (userBar) {
            userBarHeight = userBar.offsetHeight;
        }
    }

    // Annotations tooltip - click toggle and positioning

    const annotationBtns = document.querySelectorAll('.annotation-btn');

    function closeAllAnnotations(except = null) {
        annotationBtns.forEach((btn) => {
            if (btn !== except) {
                btn.classList.remove('is-active');
                const trigger = btn.querySelector('.annotation-trigger');
                if (trigger) {
                    trigger.setAttribute('aria-expanded', 'false');
                }
                const tooltip = btn.querySelector('.annotation-tooltip');
                if (tooltip) tooltip.setAttribute('aria-hidden', 'true');
            }
        });
    }

    const annotationPositioners = [];

    annotationBtns.forEach((annotationBtn) => {
        const annotationTooltip = annotationBtn.querySelector('.annotation-tooltip');
        const annotationTooltipWrapper = annotationTooltip?.querySelector('.annotation-tooltip__wrapper');
        const trigger = annotationBtn.querySelector('.annotation-trigger');

        if (!annotationTooltip || !annotationTooltipWrapper) return;

        // Click to toggle (for mobile and accessibility)
        if (trigger) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const isActive = annotationBtn.classList.contains('is-active');

                closeAllAnnotations(annotationBtn);

                if (!isActive) {
                    annotationBtn.classList.add('is-active');
                    trigger.setAttribute('aria-expanded', 'true');
                    annotationTooltip.setAttribute('aria-hidden', 'false');
                    setAnnotationTooltipPos();
                } else {
                    annotationBtn.classList.remove('is-active');
                    trigger.setAttribute('aria-expanded', 'false');
                    annotationTooltip.setAttribute('aria-hidden', 'true');
                }
            });
        }

        // Position tooltip on hover (mouseenter: fires once, doesn't bubble
        // from children, so no repeated layout reads / thrash on hover).
        annotationBtn.addEventListener('mouseenter', setAnnotationTooltipPos);

        function setAnnotationTooltipPos() {
            const annotationBtnOffset = annotationBtn.getBoundingClientRect();
            const { top, left } = annotationBtnOffset;
            const visualViewport = window.visualViewport;
            const viewportLeft = visualViewport ? visualViewport.offsetLeft : 0;
            const viewportWidth = (visualViewport && visualViewport.width)
                || document.documentElement.clientWidth
                || window.innerWidth;
            // The wrapper uses --space-4 as both padding and the intended
            // viewport gutter. Reading its computed padding resolves rem to px.
            const gutter = parseFloat(window.getComputedStyle(annotationTooltipWrapper).paddingInlineStart) || 16;
            const panelWidth = annotationTooltipWrapper.offsetWidth;
            const minimumLeft = viewportLeft + gutter;
            const maximumLeft = Math.max(
                minimumLeft,
                viewportLeft + viewportWidth - panelWidth - gutter
            );
            const panelLeft = Math.min(Math.max(left, minimumLeft), maximumLeft);

            // Convert the viewport-clamped coordinate back into the absolute
            // offset expected inside .annotation-btn.
            annotationTooltip.style.left = (panelLeft - left) + 'px';

            // Header chrome can be absent on minimal pages.
            const headerClearance = mainHeader ? mainHeader.offsetHeight + mainHeader.offsetTop : 0;
            if ((top - headerClearance) < (annotationTooltipWrapper.offsetHeight + 15)) {
                annotationTooltip.style.bottom = (- annotationTooltipWrapper.offsetHeight - 20) + 'px';
                annotationTooltipWrapper.classList.add('below-button');
            } else {
                annotationTooltip.style.bottom = '10px';
                annotationTooltipWrapper.classList.remove('below-button');

                if (annotationTooltip.style.left == '0px') {
                    annotationTooltip.style.bottom = '5px';
                }
            }
        }

        annotationPositioners.push({ annotationBtn, setAnnotationTooltipPos });
    });

    // Re-clamp an open panel after rotation, browser-chrome resizing, or zoom.
    // Closed panels remain display:none and cause no layout reads.
    function repositionOpenAnnotations() {
        annotationPositioners.forEach(({ annotationBtn, setAnnotationTooltipPos }) => {
            if (annotationBtn.classList.contains('is-active') || annotationBtn.matches(':hover')) {
                setAnnotationTooltipPos();
            }
        });
    }

    window.addEventListener('resize', repositionOpenAnnotations, { passive: true });
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', repositionOpenAnnotations, { passive: true });
    }

    // Close annotations when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.annotation-btn')) {
            closeAllAnnotations();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const activeAnnotation = document.querySelector('.annotation-btn.is-active');
        if (!activeAnnotation) return;
        const trigger = activeAnnotation.querySelector('.annotation-trigger');
        closeAllAnnotations();
        if (trigger) trigger.focus();
    });

    // Language Switcher dropdown functionality

    const languageSwitcher = document.querySelector('[data-language-switcher]');
    
    if (languageSwitcher) {
        const toggleBtn = languageSwitcher.querySelector('.language-switcher__toggle');
        
        if (toggleBtn) {
            // Claim the component: the CSS reveals the panel on :focus-within
            // only while this class is absent. That fallback exists for the
            // no-JS case, and without the marker it fought this handler — the
            // panel opened on mere keyboard focus with aria-expanded still
            // "false", and Escape could not dismiss it, because closing
            // returns focus to a toggle that sits inside the component.
            // Added before the listeners so no frame renders the JS path with
            // the focus fallback still live.
            languageSwitcher.classList.add('js-enhanced');

            // Toggle dropdown on button click
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = languageSwitcher.classList.contains('is-open');
                
                if (isOpen) {
                    closeLanguageSwitcher();
                } else {
                    languageSwitcher.classList.add('is-open');
                    toggleBtn.setAttribute('aria-expanded', 'true');
                }
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!languageSwitcher.contains(e.target)) {
                    closeLanguageSwitcher();
                }
            });

            // Close dropdown on Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && languageSwitcher.classList.contains('is-open')) {
                    closeLanguageSwitcher();
                    toggleBtn.focus();
                }
            });

            function closeLanguageSwitcher() {
                languageSwitcher.classList.remove('is-open');
                toggleBtn.setAttribute('aria-expanded', 'false');
            }
        }
    }

    // Initial header sync. Must stay LAST: onResize() reaches through onScroll
    // into syncMenuDrawer, so every `let` above has to be past its temporal
    // dead zone before it runs. Only the `function` declarations hoist.
    onResize();
}

IWACUtils.onReady(freedomScripts);
})();
