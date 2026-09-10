import { describe, it, expect, vi } from 'vitest';
import { parseJsonHistory, parseMidFromUrl, parseLocation, extractMediaInfo } from '../../src/parser/JsonHistoryParser.js';
import * as state from '../../src/state.js';
import * as UIController from '../../src/ui/UIController.js';
import * as i18n from '../../src/i18n.js';

vi.mock('../../src/state.js');
vi.mock('../../src/ui/UIController.js');
vi.mock('../../src/i18n.js', () => ({ t: vi.fn(k => k) }));

describe('JsonHistoryParser', () => {
  describe('parseLocation', () => {
    it('should parse valid location', () => {
      expect(parseLocation('Latitude, Longitude: 48.8584, 2.2945')).toEqual([48.8584, 2.2945]);
      expect(parseLocation('Latitude, Longitude: -10.5, +12.3')).toEqual([-10.5, 12.3]);
    });

    it('should return nulls for invalid or missing location', () => {
      expect(parseLocation(null)).toEqual([null, null]);
      expect(parseLocation('')).toEqual([null, null]);
      expect(parseLocation('Invalid')).toEqual([null, null]);
      expect(parseLocation('Latitude, Longitude: 0, 0')).toEqual([null, null]);
    });
  });

  describe('parseMidFromUrl', () => {
    it('should extract mid from url', () => {
      const url = 'https://app.snapchat.com/memories/download?mid=A1B2C3D4-E5F6-7890-1234-567890ABCDEF&something=else';
      expect(parseMidFromUrl(url)).toBe('a1b2c3d4-e5f6-7890-1234-567890abcdef');
    });

    it('should return null if no mid', () => {
      expect(parseMidFromUrl('https://example.com')).toBeNull();
      expect(parseMidFromUrl(null)).toBeNull();
      expect(parseMidFromUrl('invalid-url')).toBeNull();
    });
  });

  describe('extractMediaInfo', () => {
    it('should extract info from standard filename', () => {
      const info = extractMediaInfo('2023-10-15_12345678-1234-1234-1234-123456789012-main.mp4');
      expect(info).toEqual({
        prefix: '2023-10-15',
        mid: '12345678-1234-1234-1234-123456789012',
        type: 'main',
        ext: 'mp4'
      });
    });

    it('should return null for invalid filename', () => {
      expect(extractMediaInfo('random-file.txt')).toBeNull();
    });
  });

  describe('parseJsonHistory', () => {
    it('should parse valid json file', async () => {
      const mockJson = {
        'Saved Media': [
          {
            Date: '2023-01-01 12:00:00 UTC',
            Location: 'Latitude, Longitude: 10.0, 20.0',
            'Download Link': 'https://x.com/?mid=mock-mid'
          }
        ]
      };
      
      const file = new File([JSON.stringify(mockJson)], 'history.json');
      state.getJsonFile.mockReturnValue(file);

      const result = await parseJsonHistory();
      expect(result.byMid['mock-mid']).toBeDefined();
      expect(result.byMid['mock-mid'].latitude).toBe(10);
      expect(result.byMid['mock-mid'].longitude).toBe(20);
      expect(result.byMid['mock-mid'].dateRaw).toBe('2023-01-01 12:00:00 UTC');
      
      // Date should have been matched by time
      const keys = Object.keys(result.byTime);
      expect(keys.length).toBe(1);
      expect(result.byTime[keys[0]].dateRaw).toBe('2023-01-01 12:00:00 UTC');
    });

    it('should handle json without Saved Media', async () => {
      const mockJson = {};
      const file = new File([JSON.stringify(mockJson)], 'history.json');
      state.getJsonFile.mockReturnValue(file);

      const result = await parseJsonHistory();
      expect(result.byMid).toEqual({});
      expect(result.byTime).toEqual({});
    });

    it('should fallback to Media Download Url if Download Link has no mid', async () => {
      const mockJson = {
        'Saved Media': [
          {
            Date: '2023-01-01 12:00:00 UTC',
            'Download Link': 'https://x.com/',
            'Media Download Url': 'https://x.com/?mid=fallback-mid'
          }
        ]
      };
      
      const file = new File([JSON.stringify(mockJson)], 'history.json');
      state.getJsonFile.mockReturnValue(file);

      const result = await parseJsonHistory();
      expect(result.byMid['fallback-mid']).toBeDefined();
    });

    it('should throw on invalid json', async () => {
      const file = new File(['{invalid json}'], 'history.json');
      state.getJsonFile.mockReturnValue(file);

      await expect(parseJsonHistory()).rejects.toThrow();
    });
  });

  describe('Empty AWS Download URLs (EC-19)', () => {
    it('should ignore item if both Download Link and Media Download Url are empty', async () => {
      const mockJson = {
        'Saved Media': [
          {
            Date: '2023-01-01 12:00:00 UTC',
            'Download Link': '',
            'Media Download Url': ''
          }
        ]
      };
      
      const file = new File([JSON.stringify(mockJson)], 'history.json');
      state.getJsonFile.mockReturnValue(file);

      const result = await parseJsonHistory();
      // Should not add to byMid
      expect(Object.keys(result.byMid).length).toBe(0);
      // But should add to byTime
      expect(Object.keys(result.byTime).length).toBe(1);
    });
  });
});
