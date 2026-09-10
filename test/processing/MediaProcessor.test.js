import { describe, it, expect, vi } from 'vitest';
import { processMediaGroup, processAndZip } from '../../src/processing/MediaProcessor.js';
import * as ImageProcessor from '../../src/processing/ImageProcessor.js';
import * as VideoProcessor from '../../src/processing/VideoProcessor.js';
import * as CacheManager from '../../src/cache/CacheManager.js';
import * as TimezoneDetector from '../../src/parser/TimezoneDetector.js';

vi.mock('../../src/processing/ImageProcessor.js');
vi.mock('../../src/processing/VideoProcessor.js');
vi.mock('../../src/cache/CacheManager.js');
vi.mock('../../src/parser/TimezoneDetector.js');
vi.mock('../../src/ui/UIController.js');

// Helper to mock File with arrayBuffer
function createMockFile(name, ext) {
  return {
    name,
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
  };
}

describe('MediaProcessor', () => {
  describe('processMediaGroup', () => {
    it('should delegate image processing to ImageProcessor', async () => {
      const files = {
        main: { info: { ext: 'jpg', mid: '123' }, file: createMockFile('img.jpg', 'jpg') }
      };
      
      CacheManager.getFromCache.mockResolvedValue(null);
      ImageProcessor.applyPiexif.mockResolvedValue(new ArrayBuffer(8));
      
      const result = await processMediaGroup(files, { 
        metaDate: '2023-01-01', 
        metaLocation: true 
      }, null);
      
      expect(ImageProcessor.applyPiexif).toHaveBeenCalled();
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('should delegate video processing to VideoProcessor', async () => {
      const files = {
        main: { info: { ext: 'mp4', mid: '123' }, file: createMockFile('vid.mp4', 'mp4') }
      };
      
      CacheManager.getFromCache.mockResolvedValue(null);
      // Let's assume processVideoWithFFmpeg returns a File that has arrayBuffer
      VideoProcessor.processVideoWithFFmpeg.mockResolvedValue(createMockFile('out.mp4', 'mp4'));
      
      const result = await processMediaGroup(files, {});
      expect(VideoProcessor.processVideoWithFFmpeg).toHaveBeenCalled();
      expect(result).toBeInstanceOf(ArrayBuffer);
    });
  });

  describe('processAndZip', () => {
    it('should process media and add it to zip', async () => {
      TimezoneDetector.resolveMetadata.mockReturnValue({ dateRaw: '2023-01-01 12:00:00 UTC' });
      
      const files = {
        main: { info: { ext: 'jpg', prefix: '2023-01-01', mid: 'mid-123' }, file: createMockFile('img.jpg', 'jpg') }
      };
      
      const mockZip = { file: vi.fn() };
      
      CacheManager.getFromCache.mockResolvedValue(new ArrayBuffer(8));
      
      await processAndZip('mid-123', files, mockZip, {}, 0);
      
      expect(mockZip.file).toHaveBeenCalledWith('2023-01-01_mid-123.jpg', expect.any(ArrayBuffer), expect.any(Object));
    });
  });
});
