import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as i18n from '../src/i18n.js';
import * as FolderScanner from '../src/scanner/FolderScanner.js';
import * as state from '../src/state.js';
import * as UIController from '../src/ui/UIController.js';
import * as WakeLockManager from '../src/ui/WakeLockManager.js';

vi.mock('../src/i18n.js');
vi.mock('../src/scanner/FolderScanner.js');
vi.mock('../src/state.js');
vi.mock('../src/ui/UIController.js');
vi.mock('../src/ui/WakeLockManager.js', () => ({ releaseWakeLock: vi.fn().mockResolvedValue() }));

describe('main', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="folderZone"></div>
      <input id="folderInput" type="file" />
      <button id="clearBtn"></button>
      <button id="processBtn"></button>
      <button id="langEnBtn"></button>
      <button id="langDeBtn"></button>
      <div id="folderList"></div>
      <div id="statusBox"></div>
      <div id="progressSection"></div>
      <div id="progressFill"></div>
      <div id="progressText"></div>
    `;
    
    // Clear modules cache to re-execute main.js
    vi.resetModules();
  });

  it('should initialize event listeners on DOMContentLoaded', async () => {
    // Import main to attach listeners
    await import('../src/main.js');
    
    // Dispatch DOMContentLoaded
    document.dispatchEvent(new Event('DOMContentLoaded'));
    
    expect(i18n.initLanguage).toHaveBeenCalled();
    
    // Test language buttons
    const langEnBtn = document.getElementById('langEnBtn');
    langEnBtn.click();
    expect(i18n.setLanguage).toHaveBeenCalledWith('en');
    
    // Test folder zone drag over
    const folderZone = document.getElementById('folderZone');
    folderZone.dispatchEvent(new Event('dragover'));
    expect(FolderScanner.handleDragOver).toHaveBeenCalled();
    
    // Test clear button
    const clearBtn = document.getElementById('clearBtn');
    clearBtn.click();
    expect(state.setIsAborted).toHaveBeenCalledWith(true);
  });
  
  it('should handle file input change', async () => {
    await import('../src/main.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    
    state.getIsScanning.mockReturnValue(false);
    
    const folderInput = document.getElementById('folderInput');
    // Mock files
    Object.defineProperty(folderInput, 'files', {
      value: [new File([''], 'test.mp4')]
    });
    
    const changeEvent = new Event('change');
    folderInput.dispatchEvent(changeEvent);
    
    expect(state.setIsScanning).toHaveBeenCalledWith(true);
    
    // Wait for the async setTimeout
    await new Promise(r => setTimeout(r, 60));
    
    expect(FolderScanner.scanFiles).toHaveBeenCalled();
    expect(state.setIsScanning).toHaveBeenCalledWith(false);
  });
});
