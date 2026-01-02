document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    let pages = [];

    if (searchInput && searchResults) {
        // Fetch page data for search index
        fetch('searchIndex.json')
            .then(response => response.json())
            .then(data => {
                pages = data;
            });

        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase();
            searchResults.innerHTML = '';

            if (query.length > 2) {
                const results = pages.filter(page => {
                    return page.title.toLowerCase().includes(query) || page.content.toLowerCase().includes(query);
                });

                if (results.length > 0) {
                    results.forEach(result => {
                        const li = document.createElement('li');
                        li.innerHTML = `<a href="${result.url}">${result.title}</a>`;
                        searchResults.appendChild(li);
                    });
                } else {
                    const li = document.createElement('li');
                    li.textContent = 'No results found.';
                    searchResults.appendChild(li);
                }
            }
        });
    }
});
