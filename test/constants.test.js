import { describe, it, expect } from 'vitest';
import { MAIN_RE, OVERLAY_RE, IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } from '../src/constants.js';

describe('constants', () => {
  it('MAIN_RE should match main media files and reject invalid formats', () => {
    const match = '2023-10-15_12345678-1234-1234-1234-123456789012-main.mp4'.match(MAIN_RE);
    expect(match).toBeTruthy();
    expect(match.groups.prefix).toBe('2023-10-15');
    expect(match.groups.mid).toBe('12345678-1234-1234-1234-123456789012');
    expect(match.groups.ext).toBe('mp4');

    // Negative tests
    expect('2023-10-15_abcd-main.mp4'.match(MAIN_RE)).toBeFalsy(); // MID too short
    expect('123-main.mp4'.match(MAIN_RE)).toBeFalsy(); // Missing prefix
    expect('2023-10-15_12345678-1234-1234-1234-123456789012-overlay.mp4'.match(MAIN_RE)).toBeFalsy(); // overlay instead of main
  });

  it('OVERLAY_RE should match overlay media files and reject invalid formats', () => {
    const match = '2023-10-15_12345678-1234-1234-1234-123456789012-overlay.png'.match(OVERLAY_RE);
    expect(match).toBeTruthy();
    expect(match.groups.prefix).toBe('2023-10-15');
    expect(match.groups.mid).toBe('12345678-1234-1234-1234-123456789012');
    expect(match.groups.ext).toBe('png');

    // Negative tests
    expect('2023-10-15_abcd-overlay.png'.match(OVERLAY_RE)).toBeFalsy(); // MID too short
    expect('123-overlay.png'.match(OVERLAY_RE)).toBeFalsy(); // Missing prefix
    expect('2023-10-15_12345678-1234-1234-1234-123456789012-main.png'.match(OVERLAY_RE)).toBeFalsy(); // main instead of overlay
  });

  it('IMAGE_EXTENSIONS should contain valid image types', () => {
    expect(IMAGE_EXTENSIONS.has('jpg')).toBe(true);
    expect(IMAGE_EXTENSIONS.has('png')).toBe(true);
    expect(IMAGE_EXTENSIONS.has('mp4')).toBe(false);
  });

  it('VIDEO_EXTENSIONS should contain valid video types', () => {
    expect(VIDEO_EXTENSIONS.has('mp4')).toBe(true);
    expect(VIDEO_EXTENSIONS.has('mov')).toBe(true);
    expect(VIDEO_EXTENSIONS.has('jpg')).toBe(false);
  });
});
