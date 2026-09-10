import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scanFiles, handleDragOver, handleDragLeave, handleFolderDrop } from '../../src/scanner/FolderScanner.js';
import * as state from '../../src/state.js';
import * as UIController from '../../src/ui/UIController.js';
import { t } from '../../src/i18n.js';

vi.mock('../../src/state.js');
vi.mock('../../src/ui/UIController.js');
vi.mock('../../src/i18n.js', () => ({ t: vi.fn(k => k) }));

describe('FolderScanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.getMediaFiles.mockReturnValue([]);
    state.getUploadSources.mockReturnValue([]);
    state.getJsonFile.mockReturnValue(null);
  });

  describe('scanFiles', () => {
    it('should separate json from media files', async () => {
      const f1 = new File([''], 'memories_history.json');
      const f2 = new File([''], 'video-main.mp4');
      const f3 = new File([''], 'ignored.txt');
      
      await scanFiles([f1, f2, f3]);
      
      expect(state.setJsonFile).toHaveBeenCalledWith(f1);
      
      const mediaArg = state.setMediaFiles.mock.calls[0][0];
      expect(mediaArg).toHaveLength(1);
      expect(mediaArg[0].name).toBe('video-main.mp4');
      
      expect(UIController.updateUI).toHaveBeenCalled();
    });

    it('should deduplicate media files based on name and size', async () => {
      const existingFile = new File(['foo'], 'video-main.mp4');
      state.getMediaFiles.mockReturnValue([existingFile]);

      const newFileSame = new File(['foo'], 'video-main.mp4');
      const newFileDiff = new File(['bar'], 'video2-main.mp4');

      await scanFiles([newFileSame, newFileDiff]);
      
      const mediaArg = state.setMediaFiles.mock.calls[0][0];
      expect(mediaArg).toHaveLength(2);
      expect(mediaArg.map(f => f.name)).toContain('video-main.mp4');
      expect(mediaArg.map(f => f.name)).toContain('video2-main.mp4');
    });

    it('should track memories folder in upload sources', async () => {
      state.getMediaFiles.mockReturnValue([]);

      const file = new File([''], 'test.mp4');
      Object.defineProperty(file, 'webkitRelativePath', {
        value: 'some/path/memories/test.mp4'
      });

      await scanFiles([file]);

      expect(state.getUploadSources).toHaveBeenCalled();
      const sources = state.getUploadSources();
      expect(sources).toContainEqual({ name: 'memories' });
    });
  });
  
  describe('Drag and Drop events', () => {
    it('handleDragOver should prevent default and add class', () => {
      const e = { preventDefault: vi.fn(), currentTarget: { classList: { add: vi.fn() } } };
      handleDragOver(e);
      expect(e.preventDefault).toHaveBeenCalled();
      expect(e.currentTarget.classList.add).toHaveBeenCalledWith('dragover');
    });
    
    it('handleDragLeave should remove class if target matches', () => {
      const target = { classList: { remove: vi.fn() } };
      const e = { currentTarget: target, target };
      handleDragLeave(e);
      expect(e.currentTarget.classList.remove).toHaveBeenCalledWith('dragover');
    });
  });

  describe('handleFolderDrop', () => {
    let mockEvent;
    
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="folderList"></div>
        <div id="progressSection"></div>
        <div id="progressFill"></div>
        <div id="progressText"></div>
      `;
      
      mockEvent = {
        preventDefault: vi.fn(),
        currentTarget: { classList: { remove: vi.fn() } },
        dataTransfer: {
          items: []
        }
      };
      
      state.getIsScanning.mockReturnValue(false);
    });
    
    it('should ignore if currently scanning', async () => {
      state.getIsScanning.mockReturnValue(true);
      await handleFolderDrop(mockEvent);
      expect(state.setIsScanning).not.toHaveBeenCalled();
    });
    
    it('should parse files and folders using webkitGetAsEntry', async () => {
      const mockFileEntry = {
        isFile: true,
        isDirectory: false,
        file: vi.fn((cb) => cb(new File([''], 'test.mp4')))
      };
      
      const mockDirEntry = {
        isFile: false,
        isDirectory: true,
        createReader: () => ({
          readEntries: vi.fn()
            .mockImplementationOnce((cb) => cb([mockFileEntry]))
            .mockImplementationOnce((cb) => cb([]))
        })
      };

      mockEvent.dataTransfer.items = [
        { webkitGetAsEntry: () => mockDirEntry }
      ];

      await handleFolderDrop(mockEvent);
      
      expect(state.setIsScanning).toHaveBeenCalledWith(true);
      expect(state.setMediaFiles).toHaveBeenCalled();
    });

    it('should handle item.kind = file fallback', async () => {
      mockEvent.dataTransfer.items = [
        { 
          kind: 'file', 
          webkitGetAsEntry: () => null,
          getAsFile: () => new File([''], 'fallback.jpg')
        }
      ];

      await handleFolderDrop(mockEvent);
      
      expect(state.setIsScanning).toHaveBeenCalledWith(true);
      expect(state.setMediaFiles).toHaveBeenCalled();
    });
  });
});
