(function() {
    let initialized = false;
    let pages = [];

    function initSearch() {
        if (initialized) return;
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');
        if (!searchInput || !searchResults) return;

        initialized = true;

        function handleSearch() {
            const query = searchInput.value.toLowerCase();
            searchResults.innerHTML = '';

            if (query.length > 2) {
                const results = pages.filter(page => {
                    return (page.title && page.title.toLowerCase().includes(query)) ||
                           (page.content && page.content.toLowerCase().includes(query));
                });

                if (results.length > 0) {
                    results.forEach(result => {
                        const li = document.createElement('li');
                        const a = document.createElement('a');
                        a.href = result.url;
                        a.textContent = result.title;
                        li.appendChild(a);
                        searchResults.appendChild(li);
                    });
                } else {
                    const li = document.createElement('li');
                    li.textContent = 'No results found.';
                    searchResults.appendChild(li);
                }
            }
        }

        // Fetch page data for search index
        fetch('searchIndex.json')
            .then(response => response.json())
            .then(data => {
                pages = data;
                if (searchInput.value.trim().length > 0) {
                    handleSearch();
                }
            })
            .catch(err => console.error('Could not load search index:', err));

        searchInput.addEventListener('input', handleSearch);
    }

    document.addEventListener('componentLoaded', (e) => {
        if (e.detail && e.detail.elementId === 'header-placeholder') {
            initSearch();
        }
    });

    document.addEventListener('componentsLoaded', initSearch);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSearch);
    } else {
        initSearch();
    }
})();
