const { expect } = require("chai");
const { getTheme, applyTheme, setThemeAttribute } = require("../js/theme");
const { JSDOM } = require("jsdom");

describe("js/theme.js tests", () => {
  describe("getTheme()", () => {
    it("should return theme from URL query string and save to localStorage", () => {
      const windowObj = { location: { search: "?theme=dark" } };
      const localStorageObj = {
        store: {},
        setItem(key, val) {
          this.store[key] = val;
        },
        getItem(key) {
          return this.store[key];
        },
      };
      const result = getTheme(windowObj, localStorageObj);
      expect(result).to.equal("dark");
      expect(localStorageObj.getItem("siteTheme")).to.equal("dark");
    });

    it("should return theme from localStorage when absent in URL", () => {
      const windowObj = { location: { search: "" } };
      const localStorageObj = {
        store: { siteTheme: "blue" },
        setItem(key, val) {
          this.store[key] = val;
        },
        getItem(key) {
          return this.store[key];
        },
      };
      const result = getTheme(windowObj, localStorageObj);
      expect(result).to.equal("blue");
    });

    it("should return default when absent in both URL and localStorage", () => {
      const windowObj = { location: { search: "" } };
      const localStorageObj = {
        store: {},
        setItem(key, val) {
          this.store[key] = val;
        },
        getItem(key) {
          return this.store[key] || null;
        },
      };
      const result = getTheme(windowObj, localStorageObj);
      expect(result).to.equal("default");
    });

    it("should fallback to default for invalid theme values in a way consistent with logic (returns what is there or default)", () => {
      // The logic as written just returns the string, but we can verify it returns whatever was set or default
      const windowObj = { location: { search: "" } };
      const localStorageObj = {
        store: { siteTheme: "" }, // Empty string
        setItem(key, val) {
          this.store[key] = val;
        },
        getItem(key) {
          return this.store[key] || null;
        }, // getItem normally returns null if not found, but we mocked it to return empty string
      };
      const result = getTheme(windowObj, localStorageObj);
      expect(result).to.equal("default");
    });
  });

  describe("setThemeAttribute() / applyTheme()", () => {
    let dom, documentObj;

    beforeEach(() => {
      dom = new JSDOM("<!DOCTYPE html><html><head></head><body></body></html>");
      documentObj = dom.window.document;
      global.document = documentObj; // Mock global document for applyTheme
    });

    afterEach(() => {
      delete global.document;
    });

    it("should set data-theme attribute on documentElement when theme is valid", () => {
      setThemeAttribute("dark", documentObj);
      expect(documentObj.documentElement.getAttribute("data-theme")).to.equal(
        "dark",
      );
    });

    it("should remove data-theme attribute when theme is default", () => {
      documentObj.documentElement.setAttribute("data-theme", "dark");
      setThemeAttribute("default", documentObj);
      expect(documentObj.documentElement.hasAttribute("data-theme")).to.be
        .false;
    });

    it("should not throw error for null/undefined", () => {
      expect(() => setThemeAttribute(null, documentObj)).to.not.throw();
      expect(documentObj.documentElement.hasAttribute("data-theme")).to.be
        .false;

      expect(() => setThemeAttribute(undefined, documentObj)).to.not.throw();
      expect(documentObj.documentElement.hasAttribute("data-theme")).to.be
        .false;
    });

    it("applyTheme should call setThemeAttribute globally using document", () => {
      applyTheme("blue");
      expect(documentObj.documentElement.getAttribute("data-theme")).to.equal(
        "blue",
      );
    });
  });
});

describe("browser initialization block", () => {
  it("should execute when window and document are defined globally", () => {
    // We must set up globals BEFORE importing theme.js so we can cover the initialization block
    // but the test runs in an environment where theme.js was ALREADY required.
    // So we clear it from require.cache and require it again with our globals.
    const dom = new JSDOM("<!DOCTYPE html><html><head></head><body></body></html>", {
      url: "http://localhost/?theme=blue"
    });
    const originalWindow = global.window;
    const originalDocument = global.document;
    const originalLocalStorage = global.localStorage;

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = {
      store: {},
      setItem(key, val) { this.store[key] = val; },
      getItem(key) { return this.store[key] || null; }
    };

    delete require.cache[require.resolve("../js/theme")];
    require("../js/theme");

    expect(global.window.setTheme).to.be.a("function");

    global.window.setTheme("dark");
    expect(global.localStorage.getItem("siteTheme")).to.equal("dark");
    expect(global.document.documentElement.getAttribute("data-theme")).to.equal("dark");

    global.window = originalWindow;
    global.document = originalDocument;
    global.localStorage = originalLocalStorage;
  });
});
