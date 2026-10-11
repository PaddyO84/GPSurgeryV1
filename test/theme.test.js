import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

function createMockEnvironment(initialUrl = 'http://localhost/index.html') {
  const store = new Map();
  const attributes = new Map();
  const urlObj = new URL(initialUrl);

  const localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };

  const documentElement = {
    setAttribute: (key, val) => attributes.set(key, String(val)),
    removeAttribute: (key) => attributes.delete(key),
    getAttribute: (key) => attributes.get(key) || null
  };

  const window = {
    location: {
      search: urlObj.search,
      href: urlObj.href,
      toString: () => urlObj.href
    },
    history: {
      pushState: (_data, _title, url) => {
        window.location.href = url.toString();
      }
    },
    localStorage,
    document: { documentElement }
  };

  return { window, store, attributes };
}

test('Theme JS - default theme when no setting', () => {
  const env = createMockEnvironment();
  global.window = env.window;
  global.document = env.window.document;
  global.localStorage = env.window.localStorage;
  global.URLSearchParams = URLSearchParams;
  global.URL = URL;

  const code = fs.readFileSync(path.resolve('./js/theme.js'), 'utf8');
  eval(code);

  assert.strictEqual(env.attributes.get('data-theme'), undefined);
});

test('Theme JS - setTheme sets attribute, localStorage and updates URL', () => {
  const env = createMockEnvironment();
  global.window = env.window;
  global.document = env.window.document;
  global.localStorage = env.window.localStorage;
  global.URLSearchParams = URLSearchParams;
  global.URL = URL;

  const code = fs.readFileSync(path.resolve('./js/theme.js'), 'utf8');
  eval(code);

  assert.strictEqual(typeof env.window.setTheme, 'function');
  env.window.setTheme('blue');

  assert.strictEqual(env.attributes.get('data-theme'), 'blue');
  assert.strictEqual(env.store.get('siteTheme'), 'blue');
  assert.ok(env.window.location.href.includes('theme=blue'));
});

test('Theme JS - reads theme from URL parameter', () => {
  const env = createMockEnvironment('http://localhost/index.html?theme=teal');
  global.window = env.window;
  global.document = env.window.document;
  global.localStorage = env.window.localStorage;
  global.URLSearchParams = URLSearchParams;
  global.URL = URL;

  const code = fs.readFileSync(path.resolve('./js/theme.js'), 'utf8');
  eval(code);

  assert.strictEqual(env.attributes.get('data-theme'), 'teal');
  assert.strictEqual(env.store.get('siteTheme'), 'teal');
});
