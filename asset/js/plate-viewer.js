/**
 * Plate viewer — full-screen reading for Asset-block images.
 *
 * WHY THE SOURCE IS ALREADY BIG ENOUGH. An Asset page block renders through
 * `thumbnail($asset, 'large')`, and an Omeka *asset* carries no derivatives:
 * the src IS the stored original. So a 1877x1026 screenshot is already in the
 * page at full resolution, and the layout is what shrinks it — to 320px in a
 * standalone Asset block, to the viewport on a phone, or (inside a block group,
 * which is how the AI-access walkthrough is built) to a column width that then
 * makes a tall plate scroll past a screen. Nothing is missing but a way to
 * look at it.
 *
 * That fact is also what makes the open transition exact: the viewer reuses the
 * SAME src, so there is no second request, no decode wait, and the plate can
 * genuinely fly out of its own thumbnail rather than cross-fade over it.
 *
 * WHAT IS ELIGIBLE. `.block-asset .asset > img` — the direct-child combinator
 * is load-bearing: an asset attached to a page renders `.asset > a > img`, and
 * that click already navigates. Hijacking it would take the link away.
 *
 * SEQUENCE. Every eligible plate on the page is one series, so a step-by-step
 * page (the AI-access install walkthrough) can be read straight through. The
 * step controls and the counter only render when there is more than one.
 *
 * TOP LAYER, NOT Z-INDEX. Built on <dialog>.showModal(), which puts the viewer
 * in the browser's top layer — above the sticky masthead without entering the
 * z-index conversation at all, and with the focus trap, Escape, and background
 * inerting handled by the UA. (Compare the Mirador maximize lift, which had to
 * raise `.block-mirador` to --z-modal by hand to clear that same header.)
 *
 * DEGRADES WITHOUT ITS TEMPLATE. Every translated string falls back to English,
 * so the script is correct on a page that has not picked up asset.phtml's
 * data-* island yet, and no-JS readers keep the plain <img> they have today.
 */
(function () {
    'use strict';

    const utils = window.IWACUtils || {};
    const onReady = utils.onReady || function (callback) { callback(); };

    const PLATE_SELECTOR = '.block-asset .asset > img';
    const OPEN_MS = 320;
    const CLOSE_MS = 220;
    const CHROME_MS = 200;
    // Matches --ease-out-quart. Real objects decelerate smoothly.
    const EASE = 'cubic-bezier(0.25, 1, 0.5, 1)';
    // Zoom goes to ACTUAL SIZE — one stored pixel per CSS pixel, which is the
    // only zoom target that needs no explaining and is exactly what a reader
    // squinting at a screenshot is asking for. The 4x ceiling is for the day an
    // archive scan rather than a screenshot lands in an Asset block: at 1:1 a
    // 6000px plate would be twenty screens wide with only panning to get back.
    const ZOOM_CEILING = 4;
    // ...and it is only offered when actual size is meaningfully bigger than
    // the fit. Several plates on the AI-access page are ~1000px naturals
    // already upscaled by the page grid; a control that jumps 5% is a control
    // that appears not to work.
    const ZOOM_THRESHOLD = 1.25;
    const SWIPE_MIN_PX = 48;
    const DRAG_SLOP_PX = 6;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    onReady(function () {
        const images = Array.prototype.slice.call(document.querySelectorAll(PLATE_SELECTOR));
        if (!images.length) {
            return;
        }

        const strings = readStrings();
        const plates = images.map(buildPlate);
        const total = plates.length;

        let viewer = null;
        let current = -1;
        let zoomed = false;
        let plateAnimation = null;
        let chromeAnimations = [];

        plates.forEach(mountTrigger);

        /* -------------------------------------------------------------- */
        /*  Translated strings                                            */
        /* -------------------------------------------------------------- */

        function readStrings() {
            // asset.phtml hangs the catalogue on every .assets container it
            // renders; the first one answers for the page. English fallbacks
            // keep the script honest on a site running an older template.
            const island = document.querySelector('.assets[data-plate-open]');
            const data = island ? island.dataset : {};
            return {
                open: data.plateOpen || 'View full screen',
                // %s is the image's own caption or alt text.
                openNamed: data.plateOpenNamed || 'View full screen: %s',
                viewer: data.plateViewer || 'Image viewer',
                close: data.plateClose || 'Close viewer',
                previous: data.platePrevious || 'Previous image',
                next: data.plateNext || 'Next image',
                zoomIn: data.plateZoomIn || 'Zoom in',
                zoomOut: data.plateZoomOut || 'Fit to screen',
                tap: data.plateTap || 'Tap to enlarge',
                // %1 is the current image's number, %2 the total.
                position: data.platePosition || 'Image %1 of %2'
            };
        }

        function positionText(index) {
            return strings.position
                .replace('%1', String(index + 1))
                .replace('%2', String(total));
        }

        /* -------------------------------------------------------------- */
        /*  Triggers                                                      */
        /* -------------------------------------------------------------- */

        function buildPlate(img, index) {
            const holder = img.closest('.asset');
            const captionEl = holder ? holder.querySelector('.caption') : null;
            const caption = captionEl ? captionEl.textContent.trim() : '';
            return {
                index: index,
                img: img,
                caption: caption,
                alt: (img.getAttribute('alt') || '').trim(),
                trigger: null
            };
        }

        function mountTrigger(plate) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'plate-trigger';
            button.setAttribute('aria-haspopup', 'dialog');

            const name = plate.caption || plate.alt;
            button.setAttribute(
                'aria-label',
                name ? strings.openNamed.replace('%s', name) : strings.open
            );

            const hint = document.createElement('span');
            hint.className = 'plate-trigger__hint';
            hint.setAttribute('aria-hidden', 'true');

            plate.img.parentNode.insertBefore(button, plate.img);
            button.appendChild(plate.img);
            button.appendChild(hint);
            button.addEventListener('click', function () { open(plate.index); });

            plate.trigger = button;
        }

        /* -------------------------------------------------------------- */
        /*  Viewer construction (lazy — a page nobody zooms builds nothing) */
        /* -------------------------------------------------------------- */

        function ensureViewer() {
            if (viewer) {
                return viewer;
            }

            const dialog = document.createElement('dialog');
            dialog.className = 'plate-viewer';
            if (total < 2) {
                dialog.classList.add('plate-viewer--single');
            }
            dialog.setAttribute('aria-label', strings.viewer);

            const scrim = el('div', 'plate-viewer__scrim');
            scrim.setAttribute('aria-hidden', 'true');

            const stage = el('div', 'plate-viewer__stage');

            const bar = el('div', 'plate-viewer__bar');
            // The counter reads "3 / 6" — the dateline's tracked label type and
            // primary separator, doing the one job it can do silently. Screen
            // readers get the full sentence from the status region instead of
            // "three slash six".
            const counter = el('p', 'plate-viewer__counter');
            counter.setAttribute('aria-hidden', 'true');
            const counterNow = el('span', 'plate-viewer__counter-now');
            const counterAll = el('span', 'plate-viewer__counter-all');
            counter.append(counterNow, counterAll);

            const tools = el('div', 'plate-viewer__tools');
            const zoomBtn = toolButton('plate-viewer__tool--zoom');
            const closeBtn = toolButton('plate-viewer__tool--close');
            closeBtn.setAttribute('aria-label', strings.close);
            tools.append(zoomBtn, closeBtn);
            bar.append(counter, tools);

            const prevBtn = stepButton('plate-viewer__step--prev', strings.previous);
            const nextBtn = stepButton('plate-viewer__step--next', strings.next);

            const frame = el('div', 'plate-viewer__frame');
            const plateImg = document.createElement('img');
            plateImg.className = 'plate-viewer__plate';
            plateImg.setAttribute('alt', '');
            plateImg.setAttribute('draggable', 'false');
            // A landscape screenshot fitted to a portrait phone uses maybe a
            // third of the room and lands barely wider than the thumbnail the
            // reader just tapped. The gesture that pays off is the one nothing
            // on a touch screen can hint at with a cursor — so it says so, in
            // the space the fit left over. aria-hidden: the zoom control in the
            // bar already names this action.
            const hint = el('p', 'plate-viewer__hint');
            hint.setAttribute('aria-hidden', 'true');
            hint.textContent = strings.tap;
            frame.append(plateImg, hint);

            const caption = el('p', 'plate-viewer__caption');
            const status = el('p', 'sr-only');
            status.setAttribute('role', 'status');
            status.setAttribute('aria-live', 'polite');

            stage.append(bar, prevBtn, frame, nextBtn, caption, status);
            dialog.append(scrim, stage);
            document.body.appendChild(dialog);

            viewer = {
                dialog: dialog,
                scrim: scrim,
                stage: stage,
                bar: bar,
                counter: counter,
                counterNow: counterNow,
                counterAll: counterAll,
                zoomBtn: zoomBtn,
                closeBtn: closeBtn,
                prevBtn: prevBtn,
                nextBtn: nextBtn,
                frame: frame,
                plateImg: plateImg,
                hint: hint,
                caption: caption,
                status: status
            };

            bindViewer();
            return viewer;
        }

        function el(tag, className) {
            const node = document.createElement(tag);
            node.className = className;
            return node;
        }

        function toolButton(modifier) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'plate-viewer__tool ' + modifier;
            return button;
        }

        function stepButton(modifier, label) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'plate-viewer__step ' + modifier;
            button.setAttribute('aria-label', label);
            return button;
        }

        /* -------------------------------------------------------------- */
        /*  Behaviour                                                     */
        /* -------------------------------------------------------------- */

        function bindViewer() {
            const v = viewer;

            v.closeBtn.addEventListener('click', function () { close(); });
            v.prevBtn.addEventListener('click', function () { step(-1); });
            v.nextBtn.addEventListener('click', function () { step(1); });
            v.zoomBtn.addEventListener('click', function () { setZoom(!zoomed); });

            // Escape: the UA would slam the dialog shut with no transition, so
            // take the cancel and run the same animated close as the button.
            v.dialog.addEventListener('cancel', function (event) {
                event.preventDefault();
                close();
            });

            v.dialog.addEventListener('keydown', function (event) {
                if (event.altKey || event.ctrlKey || event.metaKey) {
                    return;
                }
                if (event.key === 'ArrowLeft') {
                    if (step(-1)) { event.preventDefault(); }
                } else if (event.key === 'ArrowRight') {
                    if (step(1)) { event.preventDefault(); }
                } else if (event.key === 'Home') {
                    event.preventDefault();
                    show(0);
                } else if (event.key === 'End') {
                    event.preventDefault();
                    show(total - 1);
                }
            });

            // Clicking the room, rather than the plate, closes it.
            v.scrim.addEventListener('click', function () { close(); });
            v.frame.addEventListener('click', function (event) {
                if (event.target !== v.plateImg) {
                    close();
                }
            });

            bindPointer();
            window.addEventListener('resize', utils.debounce
                ? utils.debounce(onResize, 150)
                : onResize);
        }

        function onResize() {
            if (!viewer || !viewer.dialog.open) {
                return;
            }
            // A rotation changes what "fitted" and "worth zooming" mean.
            if (zoomed) {
                setZoom(false);
            }
            syncZoomTool();
        }

        /**
         * One pointer pipeline for three gestures, because they are mutually
         * exclusive by state: drag pans a zoomed plate, a touch swipe steps
         * through the series when it is fitted, and a press that never moved is
         * a click that toggles zoom.
         */
        function bindPointer() {
            const v = viewer;
            let active = false;
            let moved = false;
            let startX = 0;
            let startY = 0;
            let startScrollLeft = 0;
            let startScrollTop = 0;
            let pointerType = 'mouse';

            v.plateImg.addEventListener('pointerdown', function (event) {
                if (event.button !== 0 && event.pointerType === 'mouse') {
                    return;
                }
                active = true;
                moved = false;
                pointerType = event.pointerType;
                startX = event.clientX;
                startY = event.clientY;
                startScrollLeft = v.frame.scrollLeft;
                startScrollTop = v.frame.scrollTop;
                // Touch panning of a zoomed plate is the browser's job; taking
                // the pointer would replace momentum scrolling with a worse
                // hand-written one.
                if (zoomed && pointerType === 'mouse') {
                    v.plateImg.setPointerCapture(event.pointerId);
                    event.preventDefault();
                }
            });

            v.plateImg.addEventListener('pointermove', function (event) {
                if (!active) {
                    return;
                }
                const dx = event.clientX - startX;
                const dy = event.clientY - startY;
                if (Math.abs(dx) > DRAG_SLOP_PX || Math.abs(dy) > DRAG_SLOP_PX) {
                    moved = true;
                }
                if (zoomed && pointerType === 'mouse' && moved) {
                    v.frame.scrollLeft = startScrollLeft - dx;
                    v.frame.scrollTop = startScrollTop - dy;
                }
            });

            v.plateImg.addEventListener('pointerup', function (event) {
                if (!active) {
                    return;
                }
                active = false;
                const dx = event.clientX - startX;
                const dy = event.clientY - startY;

                if (!zoomed && pointerType === 'touch'
                    && Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
                    step(dx < 0 ? 1 : -1);
                    return;
                }
                if (!moved) {
                    toggleZoomAt(event);
                }
            });

            v.plateImg.addEventListener('pointercancel', function () { active = false; });
            // The plate is a zoom control; its own click must not reach the
            // frame handler, which reads a click on the frame as "outside".
            v.plateImg.addEventListener('click', function (event) { event.stopPropagation(); });
        }

        function toggleZoomAt(event) {
            if (zoomed) {
                setZoom(false);
                return;
            }
            if (!canZoom()) {
                return;
            }
            const rect = viewer.plateImg.getBoundingClientRect();
            setZoom(true, {
                x: rect.width ? (event.clientX - rect.left) / rect.width : 0.5,
                y: rect.height ? (event.clientY - rect.top) / rect.height : 0.5
            });
        }

        /* -------------------------------------------------------------- */
        /*  Plate state                                                   */
        /* -------------------------------------------------------------- */

        function show(index) {
            const plate = plates[index];
            if (!plate) {
                return;
            }
            const v = viewer;
            current = index;

            // Width/height attributes give the plate a correct layout box from
            // the first frame, before the (cached) bitmap is decoded — which is
            // what lets the open measurement below be taken synchronously.
            if (plate.img.naturalWidth) {
                v.plateImg.width = plate.img.naturalWidth;
                v.plateImg.height = plate.img.naturalHeight;
            }
            v.plateImg.src = plate.img.currentSrc || plate.img.src;
            // The caption is on screen as text; repeating it as alt would read
            // the same sentence twice. Where they differ, alt still carries it.
            v.plateImg.alt = (plate.alt && plate.alt !== plate.caption) ? plate.alt : '';

            v.caption.textContent = plate.caption;
            v.caption.hidden = !plate.caption;
            v.counterNow.textContent = String(index + 1);
            v.counterAll.textContent = String(total);

            v.prevBtn.disabled = index === 0;
            v.nextBtn.disabled = index === total - 1;

            v.status.textContent = plate.caption
                ? positionText(index) + '. ' + plate.caption
                : positionText(index);

            // setZoom syncs the tools on its way out.
            setZoom(false);
        }

        function step(direction) {
            const next = current + direction;
            if (next < 0 || next >= total) {
                return false;
            }
            show(next);
            return true;
        }

        function canZoom() {
            const plate = plates[current];
            if (!plate || !plate.img.naturalWidth) {
                return false;
            }
            const fitted = viewer.plateImg.getBoundingClientRect().width;
            return fitted > 0 && plate.img.naturalWidth > fitted * ZOOM_THRESHOLD;
        }

        // Only offer the hint where the fit actually left a band clear of the
        // plate; on a plate that fills its frame it would sit on the image.
        function hasRoomBelowPlate() {
            const frame = viewer.frame.getBoundingClientRect();
            const plate = viewer.plateImg.getBoundingClientRect();
            return frame.height - plate.height >= 56;
        }

        function syncZoomTool() {
            const available = canZoom();
            viewer.zoomBtn.hidden = !available && !zoomed;
            viewer.hint.hidden = !available || zoomed || !hasRoomBelowPlate();
            viewer.zoomBtn.setAttribute(
                'aria-label',
                zoomed ? strings.zoomOut : strings.zoomIn
            );
            viewer.zoomBtn.setAttribute('aria-pressed', zoomed ? 'true' : 'false');
        }

        function setZoom(on, origin) {
            const v = viewer;
            const plate = plates[current];
            if (on && (!plate || !plate.img.naturalWidth)) {
                return;
            }

            if (on) {
                const fitted = v.plateImg.getBoundingClientRect().width;
                const width = Math.min(
                    plate.img.naturalWidth,
                    Math.round(fitted * ZOOM_CEILING)
                );
                v.plateImg.style.width = width + 'px';
                zoomed = true;
                v.dialog.classList.add('is-zoomed');

                const at = origin || { x: 0.5, y: 0.5 };
                v.frame.scrollLeft = (v.frame.scrollWidth - v.frame.clientWidth) * at.x;
                v.frame.scrollTop = (v.frame.scrollHeight - v.frame.clientHeight) * at.y;
            } else {
                v.plateImg.style.width = '';
                zoomed = false;
                v.dialog.classList.remove('is-zoomed');
                v.frame.scrollLeft = 0;
                v.frame.scrollTop = 0;
            }
            syncZoomTool();
        }

        /* -------------------------------------------------------------- */
        /*  Open / close                                                  */
        /* -------------------------------------------------------------- */

        function open(index) {
            const plate = plates[index];
            if (!plate) {
                return;
            }
            ensureViewer();
            // A close leaves its flight filling forwards, so the plate is still
            // wearing the thumbnail's transform. Clear it BEFORE measuring, or
            // the reopen measures a transformed box and computes a flight to
            // nowhere.
            clearFlight();

            const from = plate.img.getBoundingClientRect();
            show(index);
            viewer.dialog.showModal();
            lockScroll();
            // showModal() lands focus on the first tabbable control, which is
            // the counter-less bar's zoom tool; close is the safer landing.
            viewer.closeBtn.focus({ preventScroll: true });
            syncZoomTool();

            animateChrome(0, 1, CHROME_MS);
            flight(from, viewer.plateImg.getBoundingClientRect(), OPEN_MS);
        }

        function close() {
            const v = viewer;
            if (!v || !v.dialog.open) {
                return;
            }
            const plate = plates[current];
            const trigger = plate ? plate.trigger : null;

            if (zoomed) {
                setZoom(false);
            }
            // Unlock before measuring: the series may have walked several
            // plates down the page, and the thumbnail this one flies home to
            // has to be on screen and at its final position first. The scrim is
            // still opaque, so the scroll is never seen.
            unlockScroll();
            if (trigger) {
                trigger.scrollIntoView({ block: 'center', behavior: 'instant' });
            }

            const to = trigger ? trigger.querySelector('img').getBoundingClientRect() : null;
            const from = v.plateImg.getBoundingClientRect();

            // Idempotent and self-detaching. The next open cancels this
            // animation to clear its forwards fill, which fires oncancel — and
            // an un-guarded finish() there closes the dialog that open() just
            // showed, ~40ms after it appeared.
            let finished = false;
            const finish = function () {
                if (finished) {
                    return;
                }
                finished = true;
                v.dialog.close();
                if (trigger) {
                    trigger.focus({ preventScroll: true });
                }
            };

            animateChrome(1, 0, CLOSE_MS);
            if (to && !reducedMotion.matches) {
                const animation = flight(to, from, CLOSE_MS, true);
                if (animation) {
                    animation.onfinish = finish;
                    animation.oncancel = finish;
                    return;
                }
            }
            window.setTimeout(finish, reducedMotion.matches ? 0 : CLOSE_MS);
        }

        /**
         * The one authored moment: the plate travels between its thumbnail and
         * its full size rather than cross-fading. `from` and `to` are the rects
         * of the same bitmap, so a uniform scale is exact — no distortion to
         * hide behind a blur.
         */
        function clearFlight() {
            if (plateAnimation) {
                plateAnimation.cancel();
                plateAnimation = null;
            }
        }

        function flight(from, to, duration, reverse) {
            const v = viewer;
            clearFlight();
            if (reducedMotion.matches || !from.width || !to.width || !v.plateImg.animate) {
                return null;
            }
            const scale = from.width / to.width;
            const dx = (from.left + from.width / 2) - (to.left + to.width / 2);
            const dy = (from.top + from.height / 2) - (to.top + to.height / 2);
            const offset = 'translate(' + dx + 'px, ' + dy + 'px) scale(' + scale + ')';

            plateAnimation = v.plateImg.animate(
                reverse
                    ? [{ transform: 'none' }, { transform: offset }]
                    : [{ transform: offset }, { transform: 'none' }],
                { duration: duration, easing: EASE, fill: reverse ? 'forwards' : 'none' }
            );
            return plateAnimation;
        }

        function animateChrome(fromValue, toValue, duration) {
            const v = viewer;
            // Every one of these fills forwards, so every one has to be tracked
            // and cancelled — an untracked animation left at opacity 0 is a
            // control that never comes back.
            chromeAnimations.forEach(function (animation) { animation.cancel(); });
            chromeAnimations = [];

            if (!v.scrim.animate) {
                v.scrim.style.opacity = String(toValue);
                return;
            }
            const options = {
                duration: reducedMotion.matches ? 0 : duration,
                easing: EASE,
                fill: 'forwards'
            };
            chromeAnimations = [v.scrim, v.bar, v.caption, v.prevBtn, v.nextBtn].map(
                function (node) {
                    return node.animate(
                        [{ opacity: fromValue }, { opacity: toValue }],
                        options
                    );
                }
            );
        }

        /* -------------------------------------------------------------- */
        /*  Scroll lock                                                   */
        /* -------------------------------------------------------------- */

        function lockScroll() {
            const root = document.documentElement;
            const gutter = window.innerWidth - root.clientWidth;
            // The masthead is position:sticky, so it is in flow and this padding
            // holds it still too — no separate compensation, and nothing shifts
            // sideways when the scrollbar goes away.
            root.style.setProperty('--plate-gutter', gutter + 'px');
            root.classList.add('has-plate-viewer');
        }

        function unlockScroll() {
            const root = document.documentElement;
            root.classList.remove('has-plate-viewer');
            root.style.removeProperty('--plate-gutter');
        }
    });
})();
