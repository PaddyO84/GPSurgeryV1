(function() {
    function getTheme() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('theme')) {
            const theme = urlParams.get('theme');
            localStorage.setItem('siteTheme', theme);
            return theme;
        }
        return localStorage.getItem('siteTheme') || 'default';
    }

    function applyTheme(theme) {
        if (theme && theme !== 'default') {
            document.documentElement.setAttribute('data-theme', theme);
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }

    const currentTheme = getTheme();
    applyTheme(currentTheme);

    // Expose setter for UI controls if needed
    window.setTheme = function(themeName) {
        localStorage.setItem('siteTheme', themeName);
        applyTheme(themeName);

        // Update URL without reloading to reflect state, if supported
        const url = new URL(window.location);
        url.searchParams.set('theme', themeName);
        window.history.pushState({}, '', url);
    };
})();
