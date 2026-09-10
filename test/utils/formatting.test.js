import { describe, it, expect } from 'vitest';
import { formatBytes, escapeHtml } from '../../src/utils/formatting.js';

describe('formatting utils', () => {
  describe('formatBytes', () => {
    it('should format 0 bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('should format KB', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
    });

    it('should format MB', () => {
      expect(formatBytes(1048576)).toBe('1 MB');
    });

    it('should format GB', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should handle extremely large values by capping at PB', () => {
      const veryLarge = Math.pow(1024, 6); // EB (Exabytes), which is larger than PB
      expect(formatBytes(veryLarge)).toBe('1024 PB');
    });
  });

  describe('escapeHtml', () => {
    it('should escape malicious characters', () => {
      expect(escapeHtml('<script>alert("XSS")</script>&')).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;&amp;');
      expect(escapeHtml("Tom's Diner")).toBe('Tom&#039;s Diner');
    });
  });
});
