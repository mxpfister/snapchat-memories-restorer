import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateUI, updateStatus, addLog, updateCompatibilityWarning } from '../../src/ui/UIController.js';
import * as state from '../../src/state.js';
import * as i18n from '../../src/i18n.js';

vi.mock('../../src/state.js');
vi.mock('../../src/i18n.js', () => ({ t: vi.fn(k => k) }));

describe('UIController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="folderList"></div>
      <button id="processBtn"></button>
      <div id="statusBox"></div>
    `;
    
    state.getJsonFile.mockReturnValue(null);
    state.getMediaFiles.mockReturnValue([]);
    state.getUploadSources.mockReturnValue([]);
    state.getStatusLog.mockReturnValue([]);
  });

  describe('updateUI', () => {
    it('should disable button if no json and no media', () => {
      updateUI();
      expect(document.getElementById('processBtn').disabled).toBe(true);
      expect(document.getElementById('folderList').innerHTML).toContain('invalidFolder');
    });

    it('should enable button if json and media exist', () => {
      state.getJsonFile.mockReturnValue({ size: 100 });
      state.getMediaFiles.mockReturnValue([{ size: 50 }]);
      
      updateUI();
      
      expect(document.getElementById('processBtn').disabled).toBe(false);
      expect(document.getElementById('folderList').innerHTML).toContain('jsonFoundHtml');
    });
  });

  describe('addLog and updateStatus', () => {
    it('should add a log and render it', () => {
      const logs = [];
      state.getStatusLog.mockReturnValue(logs);
      
      addLog('test message', 'ok');
      
      expect(logs).toHaveLength(1);
      expect(logs[0].msg).toBe('test message');
      expect(document.getElementById('statusBox').innerHTML).toContain('status-item--ok');
      expect(document.getElementById('statusBox').innerHTML).toContain('test message');
    });
  });

  describe('updateCompatibilityWarning (EC-24)', () => {
    it('should show mobile warning', () => {
      document.body.innerHTML += `<div id="compatWarning"></div><div id="compatWarningList"></div>`;
      
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true
      });
      
      
      updateCompatibilityWarning();
      
      const el = document.getElementById('compatWarning');
      expect(el.hidden).toBe(false);
      expect(document.getElementById('compatWarningList').innerHTML).toContain('mobileWarning');
      
      Object.defineProperty(navigator, 'userAgent', { value: originalUserAgent });
    });
  });
});
