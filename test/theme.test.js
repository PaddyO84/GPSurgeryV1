const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');

describe('Theme module tests (js/theme.js)', () => {
  let context;

  beforeEach(() => {
    let localStorageStore = {};
    let attributes = {};

    const localStorage = {
      getItem: (key) => localStorageStore[key] || null,
      setItem: (key, value) => { localStorageStore[key] = String(value); },
      removeItem: (key) => { delete localStorageStore[key]; },
      clear: () => { localStorageStore = {}; }
    };

    const documentElement = {
      setAttribute: (name, val) => { attributes[name] = String(val); },
      removeAttribute: (name) => { delete attributes[name]; },
      getAttribute: (name) => attributes[name] || null
    };

    const document = {
      documentElement
    };

    const historyPushed = [];
    const history = {
      pushState: (state, title, url) => historyPushed.push({ state, title, url })
    };

    const location = {
      search: '',
      href: 'http://localhost/',
      toString: () => 'http://localhost/' + (location.search || '')
    };

    const window = {
      location,
      localStorage,
      document,
      history
    };

    context = vm.createContext({
      window,
      document,
      localStorage,
      URL: global.URL,
      URLSearchParams: global.URLSearchParams,
      attributes,
      localStorageStore,
      historyPushed,
      console
    });
  });

  test('Item 13: getTheme reads theme from URL parameter and saves to localStorage', () => {
    context.window.location.search = '?theme=blue';
    const themeCode = fs.readFileSync('js/theme.js', 'utf8');
    vm.runInContext(themeCode, context);

    assert.equal(context.localStorageStore['siteTheme'], 'blue');
    assert.equal(context.attributes['data-theme'], 'blue');
  });

  test('Item 13: getTheme falls back to localStorage when no URL param is present', () => {
    context.localStorageStore['siteTheme'] = 'teal';
    context.window.location.search = '';
    const themeCode = fs.readFileSync('js/theme.js', 'utf8');
    vm.runInContext(themeCode, context);

    assert.equal(context.attributes['data-theme'], 'teal');
  });

  test('Item 14: applyTheme removes data-theme attribute if theme is default or unset', () => {
    context.localStorageStore['siteTheme'] = 'default';
    context.window.location.search = '';
    const themeCode = fs.readFileSync('js/theme.js', 'utf8');
    vm.runInContext(themeCode, context);

    assert.equal(context.attributes['data-theme'], undefined);
  });

  test('Item 12: window.setTheme updates localStorage, applies theme attribute, and updates window history', () => {
    const themeCode = fs.readFileSync('js/theme.js', 'utf8');
    vm.runInContext(themeCode, context);

    // Call window.setTheme
    context.window.setTheme('dark');

    assert.equal(context.localStorageStore['siteTheme'], 'dark');
    assert.equal(context.attributes['data-theme'], 'dark');
    assert.equal(context.historyPushed.length, 1);
  });
});
