/**
 * "How to cite" panel — style switcher + copy-to-clipboard.
 *
 * Progressive enhancement over view/common/citation.phtml: server-side the
 * default style is shown and the others are hidden; this wires the tablist
 * (click + roving-tabindex arrow keys) and the copy button. Reduced-motion is
 * respected by the CSS — nothing here animates.
 */
(function () {
    'use strict';

    var onReady = (window.IWACUtils && window.IWACUtils.onReady) || function (cb) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', cb, { once: true });
        } else {
            cb();
        }
    };

    /** Copy text to the clipboard, resolving on success. Falls back to execCommand. */
    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        return new Promise(function (resolve, reject) {
            try {
                var ta = document.createElement('textarea');
                ta.value = text;
                ta.setAttribute('readonly', '');
                ta.style.position = 'absolute';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                var ok = document.execCommand('copy');
                document.body.removeChild(ta);
                ok ? resolve() : reject(new Error('execCommand failed'));
            } catch (err) {
                reject(err);
            }
        });
    }

    function initPanel(root) {
        var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-citation-style]'));
        var panels = Array.prototype.slice.call(root.querySelectorAll('[data-citation-panel]'));
        var copyBtn = root.querySelector('[data-citation-copy]');
        var copyLabel = copyBtn ? copyBtn.querySelector('.citation__copy-label') : null;
        var status = root.querySelector('.citation__status');
        var resetTimer = null;

        // Current style = the server-rendered active tab, or the first panel.
        var active = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0];
        var current = active
            ? active.getAttribute('data-citation-style')
            : (panels[0] ? panels[0].getAttribute('data-citation-panel') : null);

        function activate(style, focusTab) {
            current = style;
            tabs.forEach(function (tab) {
                var on = tab.getAttribute('data-citation-style') === style;
                tab.classList.toggle('is-active', on);
                tab.setAttribute('aria-selected', on ? 'true' : 'false');
                tab.tabIndex = on ? 0 : -1;
                if (on && focusTab) {
                    tab.focus();
                }
            });
            panels.forEach(function (panel) {
                if (panel.getAttribute('data-citation-panel') === style) {
                    panel.removeAttribute('hidden');
                } else {
                    panel.setAttribute('hidden', '');
                }
            });
        }

        tabs.forEach(function (tab, index) {
            tab.addEventListener('click', function () {
                activate(tab.getAttribute('data-citation-style'), false);
            });
            tab.addEventListener('keydown', function (event) {
                var delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1
                    : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1
                    : event.key === 'Home' ? 'first'
                    : event.key === 'End' ? 'last'
                    : 0;
                if (!delta) {
                    return;
                }
                event.preventDefault();
                var next = delta === 'first' ? 0
                    : delta === 'last' ? tabs.length - 1
                    : (index + delta + tabs.length) % tabs.length;
                activate(tabs[next].getAttribute('data-citation-style'), true);
            });
        });

        if (copyBtn && copyLabel) {
            var idleLabel = copyBtn.getAttribute('data-copy-label') || copyLabel.textContent;
            copyBtn.addEventListener('click', function () {
                var panel = current
                    ? root.querySelector('[data-citation-panel="' + current + '"]')
                    : panels[0];
                var text = panel ? (panel.textContent || '').replace(/\s+/g, ' ').trim() : '';
                if (!text) {
                    return;
                }
                copyText(text).then(function () {
                    finish(true, copyBtn.getAttribute('data-copied-label') || 'Copied');
                }).catch(function () {
                    finish(false, copyBtn.getAttribute('data-error-label') || 'Copy failed');
                });
            });

            var finish = function (ok, message) {
                root.classList.toggle('is-copied', ok);
                copyLabel.textContent = message;
                if (status) {
                    status.textContent = message;
                }
                window.clearTimeout(resetTimer);
                resetTimer = window.setTimeout(function () {
                    root.classList.remove('is-copied');
                    copyLabel.textContent = idleLabel;
                    if (status) {
                        status.textContent = '';
                    }
                }, 2200);
            };
        }
    }

    onReady(function () {
        Array.prototype.forEach.call(document.querySelectorAll('.citation'), initPanel);
    });
})();
