(function() {
    // Function to load a component from a file into an element
    window.loadComponent = function(elementId, filePath) {
        const element = document.getElementById(elementId);
        if (!element) {
            return Promise.resolve(null);
        }
        return fetch(filePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load ${filePath}: ${response.statusText}`);
                }
                return response.text();
            })
            .then(data => {
                element.innerHTML = data;
                const event = new CustomEvent('componentLoaded', { detail: { elementId, filePath } });
                document.dispatchEvent(event);
                return element;
            })
            .catch(error => {
                console.error(`Error loading component: ${error}`);
                throw error;
            });
    };

    window.loadComponents = function() {
        const p1 = window.loadComponent("header-placeholder", "header.html");
        const p2 = window.loadComponent("footer-placeholder", "footer.html");
        return Promise.allSettled([p1, p2]).then(results => {
            document.dispatchEvent(new CustomEvent('componentsLoaded'));
            return results;
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener("DOMContentLoaded", function() {
            window.loadComponents();
        });
    } else {
        window.loadComponents();
    }
})();
