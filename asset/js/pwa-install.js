/**
 * IWAC PWA installer — manifest + custom install button, no auto-popup.
 *
 * Design intent (see CLAUDE.md): "no annoying pop-up, just a button available
 * to the browser". We therefore:
 *   1. Build the web-app manifest at runtime from per-site data emitted by
 *      layout.phtml and attach it as a same-origin blob: URL. A blob URL is
 *      required (not data:) because the manifest's start_url/scope must be
 *      same-origin with the document — a data: URL has an opaque origin and
 *      Chrome rejects it. A blob inherits the document origin, so the absolute
 *      same-origin URLs we resolve below pass installability checks. This lets
 *      the manifest carry the correct per-site name / start_url / scope without
 *      an Omeka route (themes can't register one).
 *   2. Capture `beforeinstallprompt`, suppress the browser's own mini-infobar,
 *      and reveal the masthead install button instead. The native prompt only
 *      ever fires from a user click on that button.
 *   3. On iOS Safari (which never fires beforeinstallprompt and has no
 *      programmatic install) the same button reveals a short, dismissible
 *      "Share → Add to Home Screen" hint — still button-triggered, never auto.
 *
 * No service worker: Omeka serves theme assets from /themes/<theme>/asset/,
 * which is not a parent path of the site (/s/<slug>/), so a theme-shipped SW
 * could only claim a uselessly narrow scope (broadening it needs the
 * Service-Worker-Allowed response header = server config). Chrome/Edge dropped
 * the SW requirement for installability, so the manifest alone makes the app
 * installable. Offline caching, if ever wanted, belongs at the server level.
 */
(function () {
	'use strict';

	var DATA_ID = 'iwac-pwa-manifest';
	var manifestObjectUrl = null;

	/** True when the app is already running as an installed PWA. */
	function isStandalone() {
		return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
			(window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches) ||
			window.navigator.standalone === true; // iOS Safari
	}

	function isIos() {
		return /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
			// iPadOS 13+ reports as Mac; detect by touch support.
			(window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
	}

	/** Resolve a root-relative URL to an absolute, same-origin one. */
	function abs(url) {
		try {
			return new URL(url, window.location.href).href;
		} catch (e) {
			return url;
		}
	}

	/**
	 * Build the manifest from the JSON island and attach it as a blob: URL.
	 * Returns true on success.
	 */
	function attachManifest() {
		// Respect an existing manifest (e.g. one added by a module) — don't fight it.
		if (document.querySelector('link[rel="manifest"]')) {
			return true;
		}
		var island = document.getElementById(DATA_ID);
		if (!island) {
			return false;
		}
		var data;
		try {
			data = JSON.parse(island.textContent);
		} catch (e) {
			return false;
		}

		// Resolve all URLs to absolute same-origin so the blob manifest validates.
		if (data.start_url) { data.start_url = abs(data.start_url); }
		if (data.scope) { data.scope = abs(data.scope); }
		if (data.id) { data.id = abs(data.id); }
		if (Array.isArray(data.icons)) {
			data.icons.forEach(function (icon) { if (icon.src) { icon.src = abs(icon.src); } });
		}
		if (Array.isArray(data.shortcuts)) {
			data.shortcuts.forEach(function (sc) {
				if (sc.url) { sc.url = abs(sc.url); }
				if (Array.isArray(sc.icons)) {
					sc.icons.forEach(function (icon) { if (icon.src) { icon.src = abs(icon.src); } });
				}
			});
		}

		try {
			var blob = new Blob([JSON.stringify(data)], { type: 'application/manifest+json' });
			manifestObjectUrl = URL.createObjectURL(blob);
			var link = document.createElement('link');
			link.rel = 'manifest';
			link.href = manifestObjectUrl;
			document.head.appendChild(link);
			return true;
		} catch (e) {
			return false;
		}
	}

	function init() {
		var button = document.querySelector('[data-pwa-install]');
		// Attach the manifest regardless of the button so add-to-home-screen,
		// theme-color and the installed-app identity work everywhere.
		attachManifest();

		if (!button) {
			return;
		}

		// Already installed → nothing to offer.
		if (isStandalone()) {
			return;
		}

		var deferredPrompt = null;

		function showButton() {
			button.hidden = false;
		}
		function hideButton() {
			button.hidden = true;
			closeHint();
		}

		// --- Native install path (Chromium, desktop + Android) -----------------
		window.addEventListener('beforeinstallprompt', function (e) {
			// Suppress the browser's own infobar; we drive the prompt from the button.
			e.preventDefault();
			deferredPrompt = e;
			button.removeAttribute('data-pwa-ios'); // native path wins over the iOS hint
			showButton();
		});

		window.addEventListener('appinstalled', function () {
			deferredPrompt = null;
			hideButton();
		});

		// --- iOS Safari path (no beforeinstallprompt, no programmatic install) --
		var hint = null;
		function closeHint() {
			if (hint && hint.parentNode) {
				hint.parentNode.removeChild(hint);
			}
			hint = null;
			button.setAttribute('aria-expanded', 'false');
			document.removeEventListener('click', onDocClick, true);
			document.removeEventListener('keydown', onKeydown, true);
		}
		function onDocClick(ev) {
			if (hint && !hint.contains(ev.target) && ev.target !== button && !button.contains(ev.target)) {
				closeHint();
			}
		}
		function onKeydown(ev) {
			if (ev.key === 'Escape') { closeHint(); }
		}
		function toggleHint() {
			if (hint) { closeHint(); return; }
			hint = document.createElement('div');
			hint.className = 'pwa-install__hint';
			hint.setAttribute('role', 'dialog');
			hint.setAttribute('aria-label', button.getAttribute('data-label-ios') || 'Install');
			hint.textContent = button.getAttribute('data-hint-ios') ||
				'Tap the Share icon, then “Add to Home Screen”.';
			button.insertAdjacentElement('afterend', hint);
			button.setAttribute('aria-expanded', 'true');
			// Defer listener attach so this very click doesn't immediately close it.
			setTimeout(function () {
				document.addEventListener('click', onDocClick, true);
				document.addEventListener('keydown', onKeydown, true);
			}, 0);
		}

		button.addEventListener('click', function () {
			if (deferredPrompt) {
				// A BeforeInstallPromptEvent allows exactly one prompt() call —
				// never re-arm with the same event (the second call throws
				// synchronously). After a dismissal Chromium re-fires
				// beforeinstallprompt on its own schedule, which re-reveals
				// the button; hide it in the meantime.
				var dp = deferredPrompt;
				deferredPrompt = null;
				try {
					dp.prompt();
				} catch (e) {
					hideButton();
					return;
				}
				dp.userChoice.then(function (choice) {
					if (choice && choice.outcome === 'accepted') {
						hideButton();
					} else {
						button.hidden = true;
					}
				}).catch(function () {
					button.hidden = true;
				});
			} else if (button.hasAttribute('data-pwa-ios')) {
				toggleHint();
			}
		});

		// iOS Safari, not yet installed: offer the manual hint button.
		if (isIos() && !isStandalone()) {
			button.setAttribute('data-pwa-ios', '');
			button.setAttribute('aria-expanded', 'false');
			showButton();
		}
	}

	IWACUtils.onReady(init);
})();
