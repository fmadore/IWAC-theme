/**
 * File navigation.js.
 *
 * Handles toggling the navigation menu for small screens and enables TAB key
 * navigation support for dropdown menus.
 *
 * Translated strings arrive as data-* attributes on #menu-drawer
 * (see view/common/menu-drawer.phtml) — never as globals.
 */

(function () {
	let mmHeader, mmNavigation, mmToggli, mmBody, mmDrawer, mmBacker, mmClones, mmStrings, cleanupTrap;

	// The drawer overlays these regions; they are inert while it is open so
	// keyboard/AT focus can't wander behind the modal surface.
	const INERT_REGIONS = '#content, .main-footer, .banner, #back-to-top';

	const FOCUSABLE_SELECTOR = [
		'a[href]',
		'button:not([disabled])',
		'input:not([disabled])',
		'select:not([disabled])',
		'textarea:not([disabled])',
		'[tabindex]:not([tabindex="-1"])',
	].join(', ');

	document.addEventListener("DOMContentLoaded", function() {
		let collection, menu;

		// collect the menus for mobile
		collection = document.querySelectorAll( '.main-navigation' );

		// get the toggle menu item (li)
		mmToggli = document.querySelector( '.main-navigation__toggle' );

		// Exit early if collection is empty or the toggle button is absent
		if ( 0 === collection.length || null === mmToggli ) {
			return;
		}

		// the top-most element containing content (i.e. body)
		mmBody = document.getElementsByTagName( 'body' )[0];

		mmHeader = document.querySelector('.main-header__main-bar');
		mmDrawer = document.getElementById( 'menu-drawer' );
		mmBacker = document.getElementById( 'menu-backer' );
		mmClones = document.getElementById( 'menu-clones' );

		// Translated UI strings (with English fallbacks).
		mmStrings = {
			close: (mmDrawer && mmDrawer.dataset.closeText) || 'Close',
			openMenu: (mmDrawer && mmDrawer.dataset.openMenuText) || 'Open menu',
			toggleSubmenu: (mmDrawer && mmDrawer.dataset.toggleSubmenuText) || 'Toggle submenu',
			// %s is replaced with the parent entry's name.
			showSubmenuFor: (mmDrawer && mmDrawer.dataset.showSubmenuText) || 'show submenu for “%s”',
		};

		// reverse the collection so .main-navigation renders first in the .menu-drawer
		collection = Array.prototype.slice.call( collection );
		collection.reverse();

		const mmToggleSrText = mmToggli.querySelector('.sr-only');

		mmToggli.onclick = toggleMenu;

		function toggleMenu() {
			if ( ! mmDrawer.classList.contains( 'toggled' ) ) {
				mmToggli.setAttribute('aria-expanded', 'true');
				if (mmToggleSrText) mmToggleSrText.textContent = mmStrings.close;
				openMenuDrawer();
			} else {
				mmToggli.setAttribute('aria-expanded', 'false');
				if (mmToggleSrText) mmToggleSrText.textContent = mmStrings.openMenu;
				closeMenuDrawer();
			}
		}

		collection.forEach( container => {
			menu = container.querySelector( 'ul' );

			menu.querySelectorAll('li').forEach(item => {
				for (const child of item.children) {
					if (child.tagName === 'UL') {
						item.classList.add('menu-item-has-children');
					}
				}
			});

			// put a clone of the menu in the menu clones container
			let clone = menu.cloneNode( true );
			mmClones.appendChild( clone );

			if ( -1 === menu.className.indexOf( 'nav-menu' ) ) {
				menu.className += ' nav-menu';
			}
		} );

		document.querySelectorAll( '.main-navigation .nav-menu > li.menu-item-has-children' ).forEach( item => {
			const activatingA = item.querySelector('a');
			const btn = document.createElement('button');
			btn.className = 'submenu-btn';
			const btnOuter = document.createElement('span');
			const btnLabel = document.createElement('span');
			btnLabel.className = 'screen-reader-text';
			btnLabel.textContent = mmStrings.showSubmenuFor.replace('%s', activatingA.text);
			btnOuter.appendChild(btnLabel);
			btn.appendChild(btnOuter);
			activatingA.after(btn);

			const itemButton = item.querySelector('button');
			const itemSubmenu = item.querySelector('ul');

			// aria-expanded belongs on the control that toggles (the button);
			// putting it on the sibling link too confuses assistive tech.
			itemButton.setAttribute('aria-expanded', 'false');

			if (item.closest('.main-navigation')) { // Desktop only.
				item.addEventListener('mouseenter', () => {
					item.classList.add('open');
					itemButton.setAttribute('aria-expanded', 'true');

					requestAnimationFrame(() => {
						itemSubmenu.style.opacity = '1';
					});
				});

				item.addEventListener('mouseleave', () => {
					item.classList.remove('open');
					itemButton.setAttribute('aria-expanded', 'false');
					itemSubmenu.style.opacity = '0';
				});

				item.addEventListener('focusout', (e) => {
					// Wait a tick to let focus settle
					requestAnimationFrame(() => {
						if (!item.contains(document.activeElement)) {
							item.classList.remove('open');
							itemButton.setAttribute('aria-expanded', 'false');
						}
					});
				});

				item.addEventListener('keydown', function (e) {
					if (e.key === 'Escape' || e.key === 'Esc') {
						item.classList.remove('open');
						itemButton.setAttribute('aria-expanded', 'false');
						itemButton.focus(); // Return focus to button
					}
				});

				itemButton.addEventListener('click', function (event) {
					const isOpen = this.parentNode.classList.toggle('open');

					this.setAttribute('aria-expanded', isOpen.toString());

					requestAnimationFrame(() => {
						itemSubmenu.style.opacity = '1';
					});

					event.preventDefault();
				});
			}
		});

		mmClones.querySelectorAll( '*' ).forEach( item => {
			if( item.id ) {
				item.id = item.id + "-drawer";
			}
		} );

		mmDrawer.querySelectorAll( '.menu-item-has-children' ).forEach( item => {
			const link = item.querySelector('a');

			// Create toggle button
			const toggleBtn = document.createElement('button');
			toggleBtn.className = 'mobile-dropdown-toggle';
			toggleBtn.setAttribute('aria-label', mmStrings.toggleSubmenu);
			toggleBtn.setAttribute('aria-expanded', 'false');

			// Insert after link
			link.after(toggleBtn);

			// Add click event to the button. The focus trap recomputes its
			// focusable list on every keystroke, so no re-arm is needed here.
			toggleBtn.addEventListener( 'click', function( event ) {
				event.stopPropagation();
				event.preventDefault();

				if (item.classList.contains('expanded')) {
					item.classList.remove('expanded');
					toggleBtn.setAttribute('aria-expanded', 'false');
				} else {
					item.classList.add('expanded');
					toggleBtn.setAttribute('aria-expanded', 'true');
				}
			});
		});

		mmBacker.addEventListener( 'click', function( event ) {
			event.preventDefault();
			closeMenuDrawer();
		} );
	} );

	// Trap focus. The drawer lives OUTSIDE <header> (backdrop-filter containing
	// block), so the trap spans both containers in DOM order — header controls
	// first, then the drawer — while the page behind them is inert.
	function getFocusableElements(containers) {
		const elements = [];
		containers.forEach((container) => {
			if (container) {
				elements.push(...container.querySelectorAll(FOCUSABLE_SELECTOR));
			}
		});
		return elements.filter(el => el.offsetParent !== null && !el.closest('[inert]'));
	}

	function trapFocus(containers) {
		function handleKey(e) {
			const focusable = getFocusableElements(containers); // Recalculate dynamically
			const first = focusable[0];
			const last = focusable[focusable.length - 1];

			if (e.key === 'Tab' && first && last) {
				if (e.shiftKey && document.activeElement === first) {
					e.preventDefault();
					last.focus();
				} else if (!e.shiftKey && document.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}

			if (e.key === 'Escape') {
				e.preventDefault();
				closeMenuDrawer();
			}
		}

		document.addEventListener('keydown', handleKey);

		return () => {
			document.removeEventListener('keydown', handleKey);
		};
	}

	function setPageInert(state) {
		document.querySelectorAll(INERT_REGIONS).forEach((el) => {
			if (state) {
				el.setAttribute('inert', '');
			} else {
				el.removeAttribute('inert');
			}
		});
	}

	cleanupTrap = null;

	function openMenuDrawer() {
		mmBacker.removeAttribute('aria-hidden');
		mmBacker.tabIndex = 0;
		mmDrawer.querySelectorAll( 'a' ).forEach( item => {
			item.tabIndex = 0;
		} );
		mmBody.classList.add( 'menu-drawer-toggled');
		mmDrawer.classList.add( 'toggled' );
		mmDrawer.removeAttribute('aria-hidden');
		mmDrawer.removeAttribute('inert');
		// Remove inline display:none that was set for progressive enhancement
		mmDrawer.style.display = '';
		mmToggli.classList.add( 'open' );

		setPageInert(true);

		const focusable = getFocusableElements([mmDrawer]);
		if (focusable.length) focusable[0].focus();

		mmNavigation = mmDrawer.querySelector('.navigation');
		if (mmNavigation) mmNavigation.classList.add('in-viewport');

		cleanupTrap = trapFocus([mmHeader, mmDrawer]);
	}

	function closeMenuDrawer() {
		// remove the expanded class from all menu items
		mmDrawer.querySelectorAll( '.expanded' ).forEach( item => {
			item.classList.remove( 'expanded' );
		} );

		mmDrawer.querySelectorAll( '.in-viewport' ).forEach( item => {
			item.classList.remove( 'in-viewport' );
		});

		// remove collapsed items from the tabindex
		mmDrawer.querySelectorAll( 'a' ).forEach( item => {
			item.tabIndex = -1;
		} );

		setPageInert(false);

		mmBacker.setAttribute('aria-hidden', 'true');
		mmBacker.tabIndex = -1;
		mmBody.classList.remove( 'menu-drawer-toggled');
		mmDrawer.classList.remove( 'toggled' );
		mmDrawer.setAttribute('aria-hidden', 'true');
		mmDrawer.setAttribute('inert', '');
		mmToggli.classList.remove( 'open' );
		mmToggli.setAttribute('aria-expanded', 'false');
		const srText = mmToggli.querySelector('.sr-only');
		if (srText) srText.textContent = mmStrings.openMenu;
		mmToggli.focus();

		if (typeof cleanupTrap === 'function') {
			cleanupTrap();
			cleanupTrap = null;
		}
	}
})();
