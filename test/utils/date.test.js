import { describe, it, expect } from 'vitest';
import { parseSnapchatDate, degToDms } from '../../src/utils/date.js';

describe('date utils', () => {
  describe('parseSnapchatDate', () => {
    it('should correctly parse standard UTC dates', () => {
      const date = parseSnapchatDate('2023-10-15 14:30:00 UTC');
      expect(date).toBeInstanceOf(Date);
      expect(date.toISOString()).toBe('2023-10-15T14:30:00.000Z');
    });

    it('should return null for empty string', () => {
      expect(parseSnapchatDate('')).toBeNull();
      expect(parseSnapchatDate(null)).toBeNull();
      expect(parseSnapchatDate(undefined)).toBeNull();
    });

    it('should return null for invalid date string', () => {
      expect(parseSnapchatDate('invalid date string')).toBeNull();
    });
    
    it('should fallback correctly for dashed format (safari edge case)', () => {
      // The function tries new Date() first, which might parse dashed dates anyway,
      // but we test that a valid Date is produced.
      const date = parseSnapchatDate('2023-10-15 14:30:00');
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).not.toBeNaN();
    });

    it('should use fallback parsing when ISO string conversion fails', () => {
      // '2023/10/15T14:30:00Z' is invalid in V8, but '2023/10/15 14:30:00 GMT' is valid.
      // This will trigger the fallback parsing path.
      const date = parseSnapchatDate('2023/10/15 14:30:00 GMT');
      expect(date).toBeInstanceOf(Date);
      expect(date.toISOString()).toBe('2023-10-15T14:30:00.000Z');
    });
  });

  describe('degToDms', () => {
    it('should convert positive degrees to DMS format for EXIF', () => {
      // 48.8584 degrees -> 48 degrees, 51 minutes, 30.24 seconds
      const result = degToDms(48.8584);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual([48, 1]); 
      expect(result[1]).toEqual([51, 1]); 
      // Math.round((0.8584 * 60 - 51) * 60 * 10000)
      // 0.8584 * 60 = 51.504 => 51 min
      // 0.504 * 60 = 30.24 => 302400 / 10000
      expect(result[2][0]).toBeCloseTo(302400, -2);
      expect(result[2][1]).toEqual(10000);
    });
    
    it('should handle negative degrees (absolute value used)', () => {
      const positive = degToDms(48.8584);
      const negative = degToDms(-48.8584);
      expect(positive).toEqual(negative);
    });

    it('should handle zero degrees', () => {
      const result = degToDms(0);
      expect(result).toEqual([[0, 1], [0, 1], [0, 10000]]);
    });
  });
});
