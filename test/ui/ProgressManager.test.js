import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateProgress } from '../../src/ui/ProgressManager.js';
import * as state from '../../src/state.js';

vi.mock('../../src/state.js');

describe('ProgressManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="progressFill"></div>
      <div id="progressText"></div>
    `;
    state.getCurrentLanguage.mockReturnValue('en');
  });

  it('should update progress DOM elements and title', () => {
    state.getProcessingStartTime.mockReturnValue(Date.now() - 60000); // exactly 1 minute ago
    
    updateProgress(50, 100);
    
    expect(document.getElementById('progressFill').style.width).toBe('50%');
    expect(document.getElementById('progressFill').getAttribute('aria-valuenow')).toBe('50');
    
    const text = document.getElementById('progressText').textContent;
    expect(text).toContain('50%');
    // Math.ceil might result in 1 or 2 depending on millisecond execution time
    expect(text).toMatch(/~(1|2) min remaining/);
    expect(document.title).toContain('(50%)');
  });

  it('should handle zero total correctly', () => {
    updateProgress(0, 0);
    expect(document.getElementById('progressFill').style.width).toBe('0%');
  });

  it('should use German translation for remaining time if language is de', () => {
    state.getProcessingStartTime.mockReturnValue(Date.now() - 60000);
    state.getCurrentLanguage.mockReturnValue('de');
    
    updateProgress(50, 100);
    
    const text = document.getElementById('progressText').textContent;
    expect(text).toMatch(/Min\. verbleibend/);
    expect(document.title).toContain('Verarbeitung');
  });
});
