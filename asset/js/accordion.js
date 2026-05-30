const accordionScript = () => {

    const accordionTrigger = document.getElementsByClassName('accordion__trigger');

    for (let i = 0; i < accordionTrigger.length; i++) {
        accordionTrigger[i].addEventListener('click', function() {
            this.classList.toggle('expanded');
            this.setAttribute('aria-expanded', this.classList.contains('expanded'));
            this.parentElement.parentElement.classList.toggle('expanded');
            const panel = this.parentElement.nextElementSibling;
            if (panel.style.maxHeight) {
                panel.style.maxHeight = null;
            } else {
                panel.style.maxHeight = panel.scrollHeight + 'px';
            }
        });
    }

    function refreshPanelsHeight() {
        for (let i = 0; i < accordionTrigger.length; i++) {
            const panel = accordionTrigger[i].parentElement.nextElementSibling;
            if (panel.style.maxHeight) {
                panel.style.maxHeight = panel.scrollHeight + 'px';
            }
        }
    }

    // Resize Events

    refreshPanelsHeight();

    window.addEventListener('resize', IWACUtils.debounce(refreshPanelsHeight, 250));
}

IWACUtils.onReady(accordionScript);
