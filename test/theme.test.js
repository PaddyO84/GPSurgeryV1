const { expect } = require('chai');
const { JSDOM } = require('jsdom');
const { getTheme, applyTheme, setTheme } = require('../js/theme.js');

describe('Theme Management Utility (theme.js)', () => {
    let dom;
    let mockWindow;
    let mockStorage;

    beforeEach(() => {
        dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
            url: 'https://example.com/'
        });
        mockWindow = dom.window;
        mockStorage = {
            store: {},
            getItem(key) { return this.store[key] || null; },
            setItem(key, val) { this.store[key] = String(val); },
            removeItem(key) { delete this.store[key]; }
        };
    });

    describe('getTheme()', () => {
        it('should read valid theme from URL search parameters and store in localStorage', () => {
            const domWithParam = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
                url: 'https://example.com/?theme=blue'
            });
            const theme = getTheme(domWithParam.window, mockStorage);
            expect(theme).to.equal('blue');
            expect(mockStorage.getItem('siteTheme')).to.equal('blue');
        });

        it('should reject unsupported theme in URL parameter and return "default"', () => {
            const domWithUnsupported = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
                url: 'https://example.com/?theme=unsupported'
            });
            const theme = getTheme(domWithUnsupported.window, mockStorage);
            expect(theme).to.equal('default');
            expect(mockStorage.getItem('siteTheme')).to.be.null;
        });

        it('should fallback to localStorage when no URL param is present', () => {
            mockStorage.setItem('siteTheme', 'high-contrast');
            const theme = getTheme(mockWindow, mockStorage);
            expect(theme).to.equal('high-contrast');
        });

        it('should return "default" when neither URL param nor localStorage is set', () => {
            const theme = getTheme(mockWindow, mockStorage);
            expect(theme).to.equal('default');
        });

        it('should handle null/missing window and storage gracefully', () => {
            const theme = getTheme(null, null);
            expect(theme).to.equal('default');
        });
    });

    describe('applyTheme()', () => {
        it('should set data-theme attribute on documentElement when theme is valid', () => {
            applyTheme('dark', dom.window.document);
            expect(dom.window.document.documentElement.getAttribute('data-theme')).to.equal('dark');
        });

        it('should remove data-theme attribute when theme is "default"', () => {
            dom.window.document.documentElement.setAttribute('data-theme', 'dark');
            applyTheme('default', dom.window.document);
            expect(dom.window.document.documentElement.hasAttribute('data-theme')).to.be.false;
        });

        it('should remove data-theme attribute when theme is falsy or null', () => {
            dom.window.document.documentElement.setAttribute('data-theme', 'dark');
            applyTheme(null, dom.window.document);
            expect(dom.window.document.documentElement.hasAttribute('data-theme')).to.be.false;
        });

        it('should handle missing document gracefully without throwing', () => {
            expect(() => applyTheme('dark', null)).to.not.throw();
        });
    });

    describe('setTheme()', () => {
        it('should set localStorage, update DOM attribute, and update URL parameter', () => {
            setTheme('accessible', mockWindow, mockStorage, dom.window.document);
            expect(mockStorage.getItem('siteTheme')).to.equal('accessible');
            expect(dom.window.document.documentElement.getAttribute('data-theme')).to.equal('accessible');
            expect(mockWindow.location.href).to.include('theme=accessible');
        });
    });
});
