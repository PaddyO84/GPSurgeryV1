import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

function createMockElement(tagName = 'div', className = '') {
  const classes = new Set(className.split(' ').filter(Boolean));
  const attributes = new Map();
  const listeners = new Map();

  const element = {
    tagName: tagName.toUpperCase(),
    classList: {
      contains: (c) => classes.has(c),
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      toggle: (c) => {
        if (classes.has(c)) {
          classes.delete(c);
          return false;
        } else {
          classes.add(c);
          return true;
        }
      }
    },
    setAttribute: (key, val) => attributes.set(key, String(val)),
    getAttribute: (key) => attributes.get(key) || null,
    hasAttribute: (key) => attributes.has(key),
    removeAttribute: (key) => attributes.delete(key),
    addEventListener: (event, handler) => {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(handler);
    },
    dispatchEvent: (event) => {
      const handlers = listeners.get(event.type) || [];
      for (const handler of handlers) {
        handler(event);
      }
    },
    nextElementSibling: null,
    previousElementSibling: null,
    style: {}
  };

  return element;
}

test('main.js - Dropdown keyboard toggle and aria-expanded synchronization', () => {
  const trigger = createMockElement('span', 'dropdown-trigger');
  const content = createMockElement('div', 'dropdown-content');
  trigger.nextElementSibling = content;
  content.previousElementSibling = trigger;

  const docListeners = new Map();
  const mockDocument = {
    addEventListener: (event, handler) => {
      if (!docListeners.has(event)) docListeners.set(event, []);
      docListeners.get(event).push(handler);
    },
    querySelector: () => null,
    querySelectorAll: (selector) => {
      if (selector === '.dropdown-trigger') return [trigger];
      if (selector === '.dropdown-content') return [content];
      return [];
    },
    getElementsByClassName: () => []
  };

  const mockWindow = {
    innerWidth: 1024
  };

  global.window = mockWindow;
  global.document = mockDocument;

  // Load and execute js/main.js
  const mainJsCode = fs.readFileSync(path.resolve('./js/main.js'), 'utf8');
  eval(mainJsCode);

  // Trigger DOMContentLoaded
  const domLoadedHandlers = docListeners.get('DOMContentLoaded') || [];
  for (const handler of domLoadedHandlers) {
    handler();
  }

  // 1. Initial state should have aria-expanded="false"
  assert.strictEqual(trigger.getAttribute('aria-expanded'), 'false', 'Initial aria-expanded should be false');
  assert.strictEqual(content.classList.contains('show'), false, 'Initial dropdown should not have show class');

  // 2. Press Enter to open
  let defaultPrevented = false;
  trigger.dispatchEvent({
    type: 'keydown',
    key: 'Enter',
    preventDefault: () => { defaultPrevented = true; }
  });

  assert.strictEqual(defaultPrevented, true, 'Enter key should prevent default');
  assert.strictEqual(content.classList.contains('show'), true, 'Enter key should add show class');
  assert.strictEqual(trigger.getAttribute('aria-expanded'), 'true', 'Enter key should set aria-expanded to true');

  // 3. Press Enter again to close
  defaultPrevented = false;
  trigger.dispatchEvent({
    type: 'keydown',
    key: 'Enter',
    preventDefault: () => { defaultPrevented = true; }
  });

  assert.strictEqual(defaultPrevented, true, 'Second Enter key should prevent default');
  assert.strictEqual(content.classList.contains('show'), false, 'Second Enter key should remove show class');
  assert.strictEqual(trigger.getAttribute('aria-expanded'), 'false', 'Second Enter key should set aria-expanded to false');

  // 4. Press Space to open
  defaultPrevented = false;
  trigger.dispatchEvent({
    type: 'keydown',
    key: ' ',
    preventDefault: () => { defaultPrevented = true; }
  });

  assert.strictEqual(defaultPrevented, true, 'Space key should prevent default');
  assert.strictEqual(content.classList.contains('show'), true, 'Space key should add show class');
  assert.strictEqual(trigger.getAttribute('aria-expanded'), 'true', 'Space key should set aria-expanded to true');

  // 5. Press Space again to close
  defaultPrevented = false;
  trigger.dispatchEvent({
    type: 'keydown',
    key: ' ',
    preventDefault: () => { defaultPrevented = true; }
  });

  assert.strictEqual(defaultPrevented, true, 'Second Space key should prevent default');
  assert.strictEqual(content.classList.contains('show'), false, 'Second Space key should remove show class');
  assert.strictEqual(trigger.getAttribute('aria-expanded'), 'false', 'Second Space key should set aria-expanded to false');

  // 6. Non-activation keys (e.g. Tab, ArrowDown) should not toggle
  defaultPrevented = false;
  trigger.dispatchEvent({
    type: 'keydown',
    key: 'Tab',
    preventDefault: () => { defaultPrevented = true; }
  });

  assert.strictEqual(defaultPrevented, false, 'Tab key should not prevent default');
  assert.strictEqual(content.classList.contains('show'), false, 'Tab key should not open dropdown');
  assert.strictEqual(trigger.getAttribute('aria-expanded'), 'false', 'Tab key should not change aria-expanded');
});
