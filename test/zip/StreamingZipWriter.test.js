import { describe, it, expect, vi } from 'vitest';
import { StreamingZipWriter, crc32 } from '../../src/zip/StreamingZipWriter.js';

describe('StreamingZipWriter', () => {
  describe('crc32', () => {
    it('should calculate crc32 for string correctly', () => {
      const data = new TextEncoder().encode('Hello World');
      // "Hello World" crc32 is 1243066710
      expect(crc32(data)).toBe(1243066710);
    });
  });

  describe('StreamingZipWriter class', () => {
    it('should write file header, content, and finalize correctly', async () => {
      const chunks = [];
      const mockWritable = {
        write: vi.fn(async (chunk) => {
          chunks.push(new Uint8Array(chunk));
        }),
        close: vi.fn(async () => {})
      };

      const writer = new StreamingZipWriter(mockWritable);
      const fileData = new TextEncoder().encode('Hello World');
      const date = new Date('2023-01-01T12:00:00Z');
      
      await writer.addFile('test.txt', fileData, date);
      
      expect(writer.entries).toHaveLength(1);
      expect(writer.entries[0].name).toEqual(new TextEncoder().encode('test.txt'));
      expect(writer.entries[0].crc).toBe(1243066710);
      expect(writer.entries[0].size).toBe(11n);
      
      const expectedDosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
      const expectedDosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
      expect(writer.entries[0].dosTime).toBe(expectedDosTime);
      expect(writer.entries[0].dosDate).toBe(expectedDosDate);
      
      expect(mockWritable.write).toHaveBeenCalledTimes(2); // Header + chunk

      await writer.finalize();
      
      expect(mockWritable.close).toHaveBeenCalledTimes(1);
      
      // Total writes = 2 (addFile) + 1 (CD) + 1 (ZIP64 EOCD) + 1 (ZIP64 Locator) + 1 (EOCD) = 6
      expect(mockWritable.write).toHaveBeenCalledTimes(6);
    });
    it('should handle ArrayBuffer data correctly', async () => {
      const mockWritable = {
        write: vi.fn(async () => {}),
        close: vi.fn(async () => {})
      };
      const writer = new StreamingZipWriter(mockWritable);
      const buffer = new ArrayBuffer(4);
      new Uint8Array(buffer).set([1, 2, 3, 4]);
      await writer.addFile('test.bin', buffer);
      expect(writer.entries).toHaveLength(1);
    });

    it('should write correct EOCD values when entries count > 0xFFFF', async () => {
      const chunks = [];
      const mockWritable = {
        write: vi.fn(async (chunk) => {
          chunks.push(new Uint8Array(chunk));
        }),
        close: vi.fn(async () => {})
      };

      const writer = new StreamingZipWriter(mockWritable);
      
      // Manually mock entries to be > 65535
      // Each entry needs properties accessed in finalize()
      const mockEntry = {
        name: new TextEncoder().encode('mock.txt'),
        size: 100n,
        crc: 12345,
        offset: 0n,
        dosTime: 0,
        dosDate: 0
      };
      writer.entries = Array(65536).fill(mockEntry);

      await writer.finalize();
      
      const eocdChunk = chunks[chunks.length - 1];
      const ev = new DataView(eocdChunk.buffer, eocdChunk.byteOffset, eocdChunk.byteLength);
      // EOCD signature should be present at start
      expect(ev.getUint32(0, true)).toBe(0x06054b50);
      // Should cap total entries on disk and total entries to 0xFFFF
      expect(ev.getUint16(8, true)).toBe(0xFFFF);
      expect(ev.getUint16(10, true)).toBe(0xFFFF);
    });
  });
});
