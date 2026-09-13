(function () {
  function getTheme(windowObj = window, localStorageObj = localStorage) {
    const urlParams = new URLSearchParams(windowObj.location.search);
    if (urlParams.has("theme")) {
      const theme = urlParams.get("theme");
      localStorageObj.setItem("siteTheme", theme);
      return theme;
    }
    return localStorageObj.getItem("siteTheme") || "default";
  }

  function setThemeAttribute(theme, documentObj = document) {
    if (theme && theme !== "default") {
      documentObj.documentElement.setAttribute("data-theme", theme);
    } else {
      documentObj.documentElement.removeAttribute("data-theme");
    }
  }

  function applyTheme(theme) {
    setThemeAttribute(theme);
  }

  // Only auto-apply in browser environment if not imported as module
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const currentTheme = getTheme(window, localStorage);
    applyTheme(currentTheme);

    // Expose setter for UI controls if needed
    window.setTheme = function (themeName) {
      localStorage.setItem("siteTheme", themeName);
      applyTheme(themeName);

      // Update URL without reloading to reflect state, if supported
      const url = new URL(window.location);
      url.searchParams.set("theme", themeName);
      window.history.pushState({}, "", url);
    };
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { getTheme, applyTheme, setThemeAttribute };
  }
})();
