import { describe, it, expect, beforeEach } from 'vitest';
import * as state from '../src/state.js';

describe('state module', () => {
  beforeEach(() => {
    // Reset state before each test if needed
    state.setIsAborted(false);
    state.setJsonFile(null);
  });

  it('should get and set all primitive and complex values', () => {
    // isAborted
    expect(state.getIsAborted()).toBe(false);
    state.setIsAborted(true);
    expect(state.getIsAborted()).toBe(true);

    // currentLanguage
    expect(state.getCurrentLanguage()).toBe('en');
    state.setCurrentLanguage('de');
    expect(state.getCurrentLanguage()).toBe('de');

    // jsonFile
    const fakeFile = new File([''], 'test.json');
    expect(state.getJsonFile()).toBe(null);
    state.setJsonFile(fakeFile);
    expect(state.getJsonFile()).toBe(fakeFile);

    // mediaFiles
    expect(state.getMediaFiles()).toEqual([]);
    const files = [fakeFile];
    state.setMediaFiles(files);
    expect(state.getMediaFiles()).toBe(files);

    // statusLog
    expect(state.getStatusLog()).toEqual([]);
    state.setStatusLog(['error']);
    expect(state.getStatusLog()).toEqual(['error']);

    // isScanning
    expect(state.getIsScanning()).toBe(false);
    state.setIsScanning(true);
    expect(state.getIsScanning()).toBe(true);

    // uploadSources
    expect(state.getUploadSources()).toEqual([]);
    state.setUploadSources(['source1']);
    expect(state.getUploadSources()).toEqual(['source1']);

    // wakeLockSentinel
    expect(state.getWakeLockSentinel()).toBe(null);
    state.setWakeLockSentinel('sentinel');
    expect(state.getWakeLockSentinel()).toBe('sentinel');

    // processingStartTime
    expect(state.getProcessingStartTime()).toBe(null);
    const now = Date.now();
    state.setProcessingStartTime(now);
    expect(state.getProcessingStartTime()).toBe(now);

    // ffmpegInstance
    expect(state.getFfmpegInstance()).toBe(null);
    state.setFfmpegInstance('ffmpeg');
    expect(state.getFfmpegInstance()).toBe('ffmpeg');

    // currentProcessingName
    expect(state.getCurrentProcessingName()).toBe('');
    state.setCurrentProcessingName('test.mp4');
    expect(state.getCurrentProcessingName()).toBe('test.mp4');

    // ffmpegBlobs
    expect(state.getFfmpegBlobs()).toBe(null);
    state.setFfmpegBlobs('blobs');
    expect(state.getFfmpegBlobs()).toBe('blobs');

    // ffmpegLoadError
    expect(state.getFfmpegLoadError()).toBe(null);
    state.setFfmpegLoadError('error');
    expect(state.getFfmpegLoadError()).toBe('error');
  });
});
