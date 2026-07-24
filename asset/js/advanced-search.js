(function () {
'use strict';

const advancedSearchScripts = () => {
    const propertyQueries = document.getElementById('property-queries');
    
    // Exit early if property-queries element doesn't exist on this page
    if (!propertyQueries) {
        return;
    }
    
    const addRowBtn = propertyQueries.querySelector('.add-value');
    
    // Exit if add button doesn't exist
    if (!addRowBtn) {
        return;
    }
    
    const placeLabels = () => {
        setTimeout(() => {
            const subFields = propertyQueries.querySelectorAll('.sub-field');
            // Batch the reads before the writes so each caption doesn't
            // force a fresh layout.
            const placements = [];
            subFields.forEach((subField) => {
                const prev = subField.previousElementSibling;
                if (prev && prev.classList.contains('sub-label')) {
                    placements.push([prev, subField.offsetLeft, subField.offsetTop - 19]);
                }
            });
            placements.forEach(([label, left, top]) => {
                label.style.left = left + 'px';
                label.style.top = top + 'px';
                label.style.opacity = 1;
            });
        }, 10);
    };

    placeLabels();

    addRowBtn.addEventListener('click', placeLabels);

    // Rows are added and removed dynamically, so listen once on the container
    // rather than binding each .remove-value button. The previous version
    // re-bound every remove button on every placeLabels() run — and each of
    // those handlers called placeLabels() again, so a handful of add/remove
    // clicks left every button carrying a growing stack of duplicate
    // listeners, each triggering another full relayout pass.
    propertyQueries.addEventListener('click', (event) => {
        if (event.target.closest('.remove-value')) {
            placeLabels();
        }
    });

    window.addEventListener('resize', IWACUtils.debounce(placeLabels, 250));
}

IWACUtils.onReady(advancedSearchScripts);
})();
