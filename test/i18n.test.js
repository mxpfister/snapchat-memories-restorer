import { describe, it, expect, vi, beforeEach } from 'vitest';
import { t, setLanguage, initLanguage, updatePageLanguage } from '../src/i18n.js';
import * as state from '../src/state.js';

vi.mock('../src/state.js', () => {
  let lang = 'en';
  return {
    getCurrentLanguage: vi.fn(() => lang),
    setCurrentLanguage: vi.fn((l) => { lang = l; }),
  };
});

// Mock localStorage globally for the tests
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
})();
Object.defineProperty(global, 'localStorage', { value: mockLocalStorage });

describe('i18n', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    state.setCurrentLanguage('en');
  });

  it('t() should translate simple keys', () => {
    state.setCurrentLanguage('en');
    expect(t('localPrivate')).toBe('Local & Private');
    
    state.setCurrentLanguage('de');
    expect(t('localPrivate')).toBe('Lokal & Privat');
  });

  it('t() should replace parameters', () => {
    state.setCurrentLanguage('en');
    expect(t('jsonParsed', { count: 5 })).toBe('5 entries parsed from JSON');
  });

  it('t() should return key if translation is missing', () => {
    expect(t('missing_key')).toBe('missing_key');
  });
  
  it('setLanguage() should update state and localStorage', () => {
    document.body.innerHTML = `
      <button id="langEnBtn"></button>
      <button id="langDeBtn"></button>
      <div id="compatWarning"><h3></h3></div>
    `;
    
    // Test for 'de'
    setLanguage('de');
    expect(state.getCurrentLanguage()).toBe('de');
    expect(localStorage.getItem('lang')).toBe('de');
    expect(document.getElementById('langDeBtn').classList.contains('active')).toBe(true);
    expect(document.getElementById('langDeBtn').getAttribute('aria-pressed')).toBe('true');
    expect(document.getElementById('langEnBtn').getAttribute('aria-pressed')).toBe('false');
    
    // Test for 'en'
    setLanguage('en');
    expect(state.getCurrentLanguage()).toBe('en');
    expect(localStorage.getItem('lang')).toBe('en');
    expect(document.getElementById('langEnBtn').classList.contains('active')).toBe(true);
    expect(document.getElementById('langEnBtn').getAttribute('aria-pressed')).toBe('true');
    expect(document.getElementById('langDeBtn').getAttribute('aria-pressed')).toBe('false');
  });

  it('initLanguage() should load from localStorage', () => {
    document.body.innerHTML = `
      <button id="langEnBtn"></button>
      <button id="langDeBtn"></button>
    `;
    localStorage.setItem('lang', 'de');
    initLanguage();
    expect(state.getCurrentLanguage()).toBe('de');
  });

  it('initLanguage() should default to en if not set or invalid', () => {
    document.body.innerHTML = '';
    initLanguage();
    expect(state.getCurrentLanguage()).toBe('en');

    localStorage.setItem('lang', 'invalid');
    initLanguage();
    expect(state.getCurrentLanguage()).toBe('en');
  });

  it('updatePageLanguage() should update all DOM elements when present', () => {
    document.body.innerHTML = `
      <div class="header-badge"><span></span></div>
      <h1></h1>
      <div class="header"><p></p></div>
      <div id="compatWarning"><h3></h3></div>
      <section>
        <h2>💡</h2>
        <p></p>
        <ul><li></li><li></li><li></li></ul>
      </section>
      <section>
        <h2>How do I</h2>
        <p></p>
      </section>
      <section>
        <h2>Select Snapchat</h2>
        <p></p>
        <div class="upload-zone">
          <strong></strong>
          <span></span>
        </div>
      </section>
      <section>
        <h2>Processing</h2>
        <p></p>
        <div class="progress-section"></div>
        <div class="actions">
          <button class="btn btn-secondary"></button>
          <button class="btn btn-primary"></button>
        </div>
      </section>
      <footer>
        <p></p>
        <p></p>
        <p></p>
      </footer>
    `;
    
    state.setCurrentLanguage('en');
    updatePageLanguage();
    
    // Check a few elements to ensure it ran successfully
    expect(document.querySelector('h1').textContent).toBe(t('pageTitle'));
    expect(document.querySelector('footer p').innerHTML).toContain(t('privacy100'));
    
    // Run for German as well to cover ternary language conditions
    state.setCurrentLanguage('de');
    updatePageLanguage();
    expect(document.querySelector('h1').textContent).toBe(t('pageTitle'));
  });
});
