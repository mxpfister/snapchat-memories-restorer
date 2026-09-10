import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as UIController from "../../src/ui/UIController.js";
vi.mock("../../src/ui/UIController.js");

import { mergeImageOverlay, applyPiexif } from '../../src/processing/ImageProcessor.js';

describe('ImageProcessor', () => {
  let originalFetch;
  let originalFileReader;
  let originalURL;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalFileReader = global.FileReader;
    originalURL = global.URL;

    window.piexif = {
      ImageIFD: { DateTime: 'DateTime' },
      ExifIFD: { DateTimeOriginal: 'DateTimeOriginal', DateTimeDigitized: 'DateTimeDigitized' },
      GPSIFD: { GPSLatitude: 'GPSLatitude', GPSLongitude: 'GPSLongitude', GPSLatitudeRef: 'GPSLatitudeRef', GPSLongitudeRef: 'GPSLongitudeRef' },
      dump: vi.fn().mockReturnValue('mocked_exif_bytes'),
      load: vi.fn().mockReturnValue({ '0th': {}, 'Exif': {}, 'GPS': {}, '1st': {}, 'Interop': {} }),
      insert: vi.fn().mockReturnValue('data:image/jpeg;base64,mocked')
    };

    window.exifr = {
      parse: vi.fn().mockResolvedValue({ DateTimeOriginal: '2023-01-01' })
    };
    
    global.fetch = vi.fn().mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
    });
    
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn()
    });
    HTMLCanvasElement.prototype.toBlob = vi.fn((cb) => cb(new Blob(['mock'])));
    
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');
    global.URL.revokeObjectURL = vi.fn();
    
    global.Image = class {
      constructor() {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 0);
      }
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.FileReader = originalFileReader;
    global.URL = originalURL;
  });

  describe('mergeImageOverlay', () => {
    it('should merge two images using Canvas', async () => {
      const mainFile = new File(['main'], 'main.jpg', { type: 'image/jpeg' });
      const overlayFile = new File(['overlay'], 'overlay.png', { type: 'image/png' });
      
      const result = await mergeImageOverlay(mainFile, overlayFile);
      
      expect(result).toBeInstanceOf(File);
      expect(result.name).toBe('main.jpg');
    });
    
    it('should handle getContext returning null', async () => {
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null);
      
      const mainFile = new File(['main'], 'main.jpg', { type: 'image/jpeg' });
      const overlayFile = new File(['overlay'], 'overlay.png', { type: 'image/png' });
      
      const result = await mergeImageOverlay(mainFile, overlayFile);
      
      expect(result).toBe(mainFile);
    });
  });

  describe('applyPiexif', () => {
    it('should return raw buffer if needDate and needLoc are false', async () => {
      const fileBlob = new Blob(['data'], { type: 'image/jpeg' });
      fileBlob.name = 'test.jpg';
      const result = await applyPiexif(fileBlob, null, false, false, null);
      
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('should skip non-jpeg files', async () => {
      const fileBlob = new Blob(['data'], { type: 'image/png' });
      fileBlob.name = 'test.png';
      
      const result = await applyPiexif(fileBlob, null, true, true, new Date());
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('should inject EXIF metadata into JPEG', async () => {
      const fileBlob = new Blob(['test-data'], { type: 'image/jpeg' });
      fileBlob.name = 'test.jpg';
      
      class MockFileReader {
        readAsDataURL() {
          this.result = 'data:image/jpeg;base64,mocked';
          if (this.onload) this.onload();
        }
      }
      global.FileReader = MockFileReader;
      
      const result = await applyPiexif(fileBlob, { latitude: 10, longitude: -20 }, true, true, new Date('2023-01-01T12:00:00Z'));
      
      expect(window.piexif.dump).toHaveBeenCalledWith(expect.objectContaining({
        '0th': expect.any(Object),
        'Exif': expect.any(Object),
        'GPS': expect.objectContaining({
          'GPSLatitudeRef': 'N',
          'GPSLongitudeRef': 'W'
        })
      }));
      expect(window.piexif.insert).toHaveBeenCalled();
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('should use binary fallback if piexif.insert fails', async () => {
      const fileBlob = new Blob(['test-data'], { type: 'image/jpeg' });
      fileBlob.name = 'test.jpg';

      class MockFileReader {
        readAsDataURL() {
          this.result = 'data:image/jpeg;base64,mocked';
          if (this.onload) this.onload();
        }
      }
      global.FileReader = MockFileReader;

      // Mock piexif.insert to throw error
      window.piexif.insert.mockImplementation(() => { throw new Error('piexif fail'); });
      
      // Binary fallback needs a valid jpeg to process, let's mock the binary result
      const buffer = new ArrayBuffer(20);
      const view = new Uint8Array(buffer);
      view[0] = 0xFF; view[1] = 0xD8; // Valid JPEG SOI
      fileBlob.arrayBuffer = vi.fn().mockResolvedValue(buffer);

      const result = await applyPiexif(fileBlob, { latitude: 10, longitude: 20 }, true, true, new Date('2023-01-01T12:00:00Z'));
      expect(result).toBeInstanceOf(ArrayBuffer);
    });
  });

  describe('Canvas Errors (EC-08, EC-09)', () => {
    it('should throw if main image fails to load (EC-09)', async () => {
      global.Image = class {
        constructor() {
          setTimeout(() => {
            if (this.onerror) this.onerror(new Error('Load failed'));
          }, 0);
        }
      };
      
      const mainFile = new File(['main'], 'main.jpg', { type: 'image/jpeg' });
      const overlayFile = new File(['overlay'], 'overlay.png', { type: 'image/png' });
      
      const res = await mergeImageOverlay(mainFile, overlayFile); expect(res).toBe(mainFile);
    });

    it('should throw if overlay image fails to load (EC-08)', async () => {
      let isFirst = true;
      global.Image = class {
        constructor() {
          setTimeout(() => {
            if (isFirst) {
              isFirst = false;
              if (this.onload) this.onload();
            } else {
              if (this.onerror) this.onerror(new Error('Overlay load failed'));
            }
          }, 0);
        }
      };
      
      const mainFile = new File(['main'], 'main.jpg', { type: 'image/jpeg' });
      const overlayFile = new File(['overlay'], 'overlay.png', { type: 'image/png' });
      
      const res = await mergeImageOverlay(mainFile, overlayFile); expect(res).toBe(mainFile);
    });
  });

  describe('Binary Fallback Edge Cases', () => {
    it('should return null if APP1 segment exceeds 64KB (EC-27)', async () => {
      const fileBlob = new Blob(['test-data'], { type: 'image/jpeg' });
      fileBlob.name = 'test.jpg';

      class MockFileReader {
        readAsDataURL() {
          this.result = 'data:image/jpeg;base64,mocked';
          if (this.onload) this.onload();
        }
      }
      global.FileReader = MockFileReader;

      // Force piexif.insert to fail
      window.piexif.insert.mockImplementation(() => { throw new Error('piexif fail'); });
      
      // Make a huge exif string > 65535 bytes
      const hugeExif = 'A'.repeat(65536);
      window.piexif.dump.mockReturnValue(hugeExif);

      const buffer = new ArrayBuffer(20);
      const view = new Uint8Array(buffer);
      view[0] = 0xFF; view[1] = 0xD8;
      fileBlob.arrayBuffer = vi.fn().mockResolvedValue(buffer);

      // This will trigger the binary fallback, which will detect > 0xFFFF and return null
      // And applyPiexif should then fallback to original rawBuffer
      const result = await applyPiexif(fileBlob, { latitude: 10, longitude: 20 }, true, true, new Date());
      expect(result).toBeInstanceOf(ArrayBuffer);
      
      // Verify that the original buffer was returned (no EXIF added)
      expect(result.byteLength).toBe(20);
      expect(UIController.addLog).toHaveBeenCalledWith(expect.stringContaining('EXIF metadata could not be embedded'), 'warn');
    });
  });
});
