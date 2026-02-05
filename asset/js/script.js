const freedomScripts = () => {

    const body = document.body;
    const mainHeader = document.querySelector('.main-header');
    const mainHeaderTopBar = document.querySelector('.main-header__top-bar');
    const mainHeaderMainBar = document.querySelector('.main-header__main-bar');
    const menuDrawer = document.getElementById('menu-drawer');
    const userBar = document.getElementById('user-bar');

    // Scrolling Events

    let lastKnownScrollPosition = 0;
    let ticking = false;
    let scrollDirection = 'up';

    function onScroll(scrollPos) {
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

        if(scrollPos > 60 && scrollDirection == 'down') {
            mainHeader.style.top = - (userBarHeight + mainHeaderTopBar.offsetHeight) + 'px';
            // Update menu drawer position to match visible header area
            const menuTop = mainHeaderMainBar.offsetHeight;
            menuDrawer.style.setProperty('--menu-drawer-top', menuTop + 'px');
            menuDrawer.style.top = menuTop + 'px';
            menuDrawer.style.height = 'calc(100vh - ' + menuTop + 'px)';
        } else {
            mainHeader.style.top = 0;
            // Reset menu drawer to full header height
            const menuTop = mainHeader.offsetHeight;
            menuDrawer.style.setProperty('--menu-drawer-top', menuTop + 'px');
            menuDrawer.style.top = menuTop + 'px';
            menuDrawer.style.height = 'calc(100vh - ' + menuTop + 'px)';
        }
    }

    document.addEventListener('scroll', (event) => {
        scrollDirection = Math.max(lastKnownScrollPosition, window.scrollY) == lastKnownScrollPosition ? 'up': 'down';
        lastKnownScrollPosition = window.scrollY;

        if (!ticking) {
            window.requestAnimationFrame(() => {
                onScroll(lastKnownScrollPosition);
                ticking = false;
            });

            ticking = true;
        }
    });

    // Resize Events

    let userBarHeight = 0;
    let timeout = false;
    const delay = 250;

    onResize();

    function onResize() {
        getUserBarHeight();
        refreshBodyPaddingTop();
        onScroll(lastKnownScrollPosition);
    }

    window.addEventListener('resize', function() {
        clearTimeout(timeout);
        timeout = setTimeout(onResize, delay);
    });

    function refreshBodyPaddingTop() {
        body.style.paddingTop = mainHeader.offsetHeight + 'px';
        document.documentElement.style.scrollPaddingTop = (mainHeaderMainBar.offsetHeight + 20) + 'px';
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
            }
        });
    }

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
                    setAnnotationTooltipPos();
                } else {
                    annotationBtn.classList.remove('is-active');
                    trigger.setAttribute('aria-expanded', 'false');
                }
            });
        }

        // Position tooltip on hover
        annotationBtn.addEventListener('mouseover', setAnnotationTooltipPos);

        function setAnnotationTooltipPos() {
            const annotationBtnOffset = annotationBtn.getBoundingClientRect();
            const { top, left } = annotationBtnOffset;
            const distanceToRightEdge = window.innerWidth - (left + annotationBtn.offsetWidth);

            if (distanceToRightEdge < (annotationTooltipWrapper.offsetWidth + 15)) {
                annotationTooltip.style.left = (distanceToRightEdge - annotationTooltipWrapper.offsetWidth - 15) + 'px';
            } else {
                annotationTooltip.style.left = '0px';
            }

            if ((top - mainHeader.offsetHeight - mainHeader.offsetTop) < (annotationTooltipWrapper.offsetHeight + 15)) {
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
    });

    // Close annotations when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.annotation-btn')) {
            closeAllAnnotations();
        }
    });

    // Language Switcher dropdown functionality

    const languageSwitcher = document.querySelector('[data-language-switcher]');
    
    if (languageSwitcher) {
        const toggleBtn = languageSwitcher.querySelector('.language-switcher__toggle');
        
        if (toggleBtn) {
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
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', freedomScripts);
} else {
    freedomScripts();
}
