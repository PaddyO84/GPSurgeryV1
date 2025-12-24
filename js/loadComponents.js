document.addEventListener("DOMContentLoaded", function() {
    // Function to load a component from a file into an element
    const loadComponent = (elementId, filePath) => {
        const element = document.getElementById(elementId);
        if (element) {
            fetch(filePath)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to load ${filePath}: ${response.statusText}`);
                    }
                    return response.text();
                })
                .then(data => {
                    element.innerHTML = data;
                })
                .catch(error => console.error(`Error loading component: ${error}`));
        }
    };

    // Load header and footer
    loadComponent("header-placeholder", "header.html");
    loadComponent("footer-placeholder", "footer.html");
});
