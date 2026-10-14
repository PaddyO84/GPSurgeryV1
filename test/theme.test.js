const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

function createMockEnvironment(url = 'http://localhost/') {
  const store = {};
  const localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };

  const attributes = {};
  const documentElement = {
    setAttribute: (attr, val) => { attributes[attr] = String(val); },
    removeAttribute: (attr) => { delete attributes[attr]; },
    getAttribute: (attr) => attributes[attr] || null
  };

  const historyState = [];
  const history = {
    pushState: (state, title, url) => { historyState.push({ state, title, url }); }
  };

  const windowObj = {
    location: new URL(url),
    localStorage,
    document: {
      documentElement
    },
    history
  };

  return { windowObj, attributes, store, historyState };
}

test('theme.js - getTheme, applyTheme, and window.setTheme', async (t) => {
  const themeJsCode = fs.readFileSync(path.join(__dirname, '../js/theme.js'), 'utf8');

  await t.test('should default to "default" theme when no param or localStorage', () => {
    const { windowObj, attributes } = createMockEnvironment('http://localhost/');
    const fn = new Function('window', 'document', 'localStorage', 'URLSearchParams', 'URL', themeJsCode);
    fn(windowObj, windowObj.document, windowObj.localStorage, URLSearchParams, URL);

    assert.strictEqual(attributes['data-theme'], undefined);
  });

  await t.test('should read theme from URL parameter and set in localStorage', () => {
    const { windowObj, attributes, store } = createMockEnvironment('http://localhost/?theme=blue');
    const fn = new Function('window', 'document', 'localStorage', 'URLSearchParams', 'URL', themeJsCode);
    fn(windowObj, windowObj.document, windowObj.localStorage, URLSearchParams, URL);

    assert.strictEqual(store['siteTheme'], 'blue');
    assert.strictEqual(attributes['data-theme'], 'blue');
  });

  await t.test('should read theme from localStorage when URL param is missing', () => {
    const { windowObj, attributes, store } = createMockEnvironment('http://localhost/');
    store['siteTheme'] = 'teal';
    const fn = new Function('window', 'document', 'localStorage', 'URLSearchParams', 'URL', themeJsCode);
    fn(windowObj, windowObj.document, windowObj.localStorage, URLSearchParams, URL);

    assert.strictEqual(attributes['data-theme'], 'teal');
  });

  await t.test('window.setTheme should update localStorage, document attribute and push history state', () => {
    const { windowObj, attributes, store, historyState } = createMockEnvironment('http://localhost/');
    const fn = new Function('window', 'document', 'localStorage', 'URLSearchParams', 'URL', themeJsCode);
    fn(windowObj, windowObj.document, windowObj.localStorage, URLSearchParams, URL);

    assert.strictEqual(typeof windowObj.setTheme, 'function');
    windowObj.setTheme('dark');

    assert.strictEqual(store['siteTheme'], 'dark');
    assert.strictEqual(attributes['data-theme'], 'dark');
    assert.strictEqual(historyState.length, 1);
    assert.strictEqual(historyState[0].url.toString(), 'http://localhost/?theme=dark');
  });

  await t.test('window.setTheme("default") should remove data-theme attribute', () => {
    const { windowObj, attributes, store } = createMockEnvironment('http://localhost/?theme=blue');
    const fn = new Function('window', 'document', 'localStorage', 'URLSearchParams', 'URL', themeJsCode);
    fn(windowObj, windowObj.document, windowObj.localStorage, URLSearchParams, URL);

    assert.strictEqual(attributes['data-theme'], 'blue');
    windowObj.setTheme('default');
    assert.strictEqual(attributes['data-theme'], undefined);
    assert.strictEqual(store['siteTheme'], 'default');
  });
});
