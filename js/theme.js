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
                if (currentStorage) {
                    try { currentStorage.setItem('siteTheme', theme); } catch(e) {}
                }
                return theme;
            }
        }

        if (currentStorage) {
            try {
                return currentStorage.getItem('siteTheme') || 'default';
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
            try { currentStorage.setItem('siteTheme', themeName); } catch(e) {}
        }
        applyTheme(themeName, currentDoc);

        if (currentWindow && currentWindow.location && currentWindow.history && currentWindow.history.pushState) {
            try {
                const url = new URL(currentWindow.location.href);
                url.searchParams.set('theme', themeName);
                currentWindow.history.pushState({}, '', url.toString());
            } catch(e) {}
        }
    }

    return {
        getTheme: getTheme,
        applyTheme: applyTheme,
        setTheme: setTheme
    };
});
