const showMoreFacets = (button) => {
    const facets = document.getElementById('facets');
    const isExpanded = facets.classList.toggle('show-all');

    button.textContent = isExpanded ? 'Show less' : 'Show more';
    button.setAttribute('aria-expanded', isExpanded);
};
