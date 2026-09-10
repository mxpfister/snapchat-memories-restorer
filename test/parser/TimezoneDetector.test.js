import { describe, it, expect, vi } from 'vitest';
import { detectTimezoneOffset, resolveMetadata } from '../../src/parser/TimezoneDetector.js';
import * as JsonHistoryParser from '../../src/parser/JsonHistoryParser.js';

describe('TimezoneDetector', () => {
  describe('detectTimezoneOffset', () => {
    it('should calculate offset correctly based on sample files and history', () => {
      // Mock extractMediaInfo to return a prefix based on filename
      vi.spyOn(JsonHistoryParser, 'extractMediaInfo').mockImplementation((name) => {
        const match = name.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) return { prefix: match[1] };
        return null;
      });

      const history = {
        byTime: {
          // JSON time: 2023-01-01T12:00:00.000Z (epoch: 1672574400000)
          '1672574400000': { dateRaw: '2023-01-01 12:00:00 UTC' },
        }
      };

      // File modified time is 2 hours earlier -> implies UTC+2 timezone offset needed to match
      const fileEpoch = 1672574400000 - (2 * 3600 * 1000); 
      const sampleFiles = [
        { name: '2023-01-01-123-main.jpg', lastModified: fileEpoch }
      ];

      const offset = detectTimezoneOffset(sampleFiles, history);
      
      // Expected offset should be +2 hours (7200000 ms) because the closest diff is 2 hours.
      // diff = jsonTime - fileTime = 1672574400000 - (1672574400000 - 2*3600*1000) = +7200000
      expect(offset).toBe(7200000);
      
      vi.restoreAllMocks();
    });

    it('should return 0 if no diffs can be calculated', () => {
      const history = { byTime: {} };
      const sampleFiles = [];
      expect(detectTimezoneOffset(sampleFiles, history)).toBe(0);
    });
  });

  describe('resolveMetadata', () => {
    it('should return metadata by mid match first', () => {
      const history = {
        byMid: { 'mid-123': { dateRaw: '2023-01-01 12:00:00 UTC' } },
        byTime: {}
      };
      const files = { main: { file: { lastModified: 100 }, info: { prefix: '2023-01-01' } } };
      
      const result = resolveMetadata('mid-123', files, history, 0);
      expect(result).toEqual({ dateRaw: '2023-01-01 12:00:00 UTC' });
    });

    it('should return metadata by time match if mid not found', () => {
      const history = {
        byMid: {},
        byTime: {
          '1000': { dateRaw: '2023-01-01 12:00:00 UTC' } // Close enough to 1005 (diff 5)
        }
      };
      const files = { main: { file: { lastModified: 1005 }, info: { prefix: '2023-01-01' } } };
      
      const result = resolveMetadata('unknown-mid', files, history, 0);
      expect(result).toEqual({ dateRaw: '2023-01-01 12:00:00 UTC' });
    });
    
    it('should fallback to prefix when neither mid nor time matches', () => {
      const history = {
        byMid: {},
        byTime: {
          '1000000': { dateRaw: '2023-01-01 12:00:00 UTC' } // Too far from 1005
        }
      };
      const files = { main: { file: { lastModified: 1005 }, info: { prefix: '2023-01-01' } } };
      
      const result = resolveMetadata('unknown-mid', files, history, 0);
      expect(result).toEqual({ 
        dateRaw: '2023-01-01 12:00:00 UTC',
        latitude: null,
        longitude: null,
      });
    });
    it('should return null when prefix is missing', () => {
      const history = {
        byMid: {},
        byTime: {}
      };
      const files = { main: { file: { lastModified: 1005 }, info: { prefix: null } } };
      
      const result = resolveMetadata('unknown-mid', files, history, 0);
      expect(result).toBeNull();
    });
  });

  describe('Sanity Check (EC-22)', () => {
    it('should ignore offsets larger than 15 hours', () => {
      vi.spyOn(JsonHistoryParser, 'extractMediaInfo').mockImplementation((name) => {
        const match = name.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) return { prefix: match[1] };
        return null;
      });

      const history = {
        byTime: {
          '1672574400000': { dateRaw: '2023-01-01 12:00:00 UTC' },
        }
      };

      // 16 hours difference
      const fileEpoch = 1672574400000 - (16 * 3600 * 1000); 
      const sampleFiles = [
        { name: '2023-01-01-123-main.jpg', lastModified: fileEpoch }
      ];

      const offset = detectTimezoneOffset(sampleFiles, history);
      
      // Should be 0 since the only diff is > 15h
      expect(offset).toBe(0);
      
      vi.restoreAllMocks();
    });
  });
});
