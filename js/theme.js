(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        const themeModule = factory();
        root.getTheme = themeModule.getTheme;
        root.applyTheme = themeModule.applyTheme;
        root.setTheme = themeModule.setTheme;

        const currentTheme = themeModule.getTheme();
        themeModule.applyTheme(currentTheme);
    }
})(typeof self !== 'undefined' ? self : this, function() {
    const ALLOWED_THEMES = new Set(['default', 'blue', 'teal']);

    function getTheme(win, storage) {
        const currentWindow = win || (typeof window !== 'undefined' ? window : null);
        let currentStorage = storage;
        if (!currentStorage) {
            try {
                currentStorage = (typeof localStorage !== 'undefined') ? localStorage : null;
            } catch(e) {
                currentStorage = null;
            }
        }

        if (currentWindow && currentWindow.location && currentWindow.location.search) {
            const urlParams = new URLSearchParams(currentWindow.location.search);
            if (urlParams.has('theme')) {
                const theme = urlParams.get('theme');
                if (!ALLOWED_THEMES.has(theme)) {
                    return 'default';
                }
                if (currentStorage) {
                    try { currentStorage.setItem('siteTheme', theme); } catch(e) {}
                }
                return theme;
            }
        }

        if (currentStorage) {
            try {
                const storedTheme = currentStorage.getItem('siteTheme');
                return ALLOWED_THEMES.has(storedTheme) ? storedTheme : 'default';
            } catch(e) {
                return 'default';
            }
        }
        return 'default';
    }

    function applyTheme(theme, doc) {
        const currentDoc = doc || (typeof document !== 'undefined' ? document : null);
        if (!currentDoc || !currentDoc.documentElement) return;

        if (theme && theme !== 'default') {
            currentDoc.documentElement.setAttribute('data-theme', theme);
        } else {
            currentDoc.documentElement.removeAttribute('data-theme');
        }
    }

    function setTheme(themeName, win, storage, doc) {
        const normalizedTheme = ALLOWED_THEMES.has(themeName) ? themeName : 'default';
        const currentWindow = win || (typeof window !== 'undefined' ? window : null);
        let currentStorage = storage;
        if (!currentStorage) {
            try {
                currentStorage = (typeof localStorage !== 'undefined') ? localStorage : null;
            } catch(e) {
                currentStorage = null;
            }
        }
        const currentDoc = doc || (typeof document !== 'undefined' ? document : null);

        if (currentStorage) {
            try { currentStorage.setItem('siteTheme', normalizedTheme); } catch(e) {}
        }
        applyTheme(normalizedTheme, currentDoc);

        if (currentWindow && currentWindow.location && currentWindow.history && currentWindow.history.replaceState) {
            try {
                const url = new URL(currentWindow.location.href);
                url.searchParams.set('theme', normalizedTheme);
                currentWindow.history.replaceState({}, '', url.toString());
            } catch(e) {}
        }
    }

    return {
        getTheme: getTheme,
        applyTheme: applyTheme,
        setTheme: setTheme
    };
});
