import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processVideoWithFFmpeg, getFFmpeg } from '../../src/processing/VideoProcessor.js';
import * as state from '../../src/state.js';
import * as UIController from '../../src/ui/UIController.js';

vi.mock('../../src/state.js');
vi.mock('../../src/ui/UIController.js');
vi.mock('../../src/i18n.js', () => ({ t: vi.fn(k => k) }));

describe('VideoProcessor', () => {
  let mockFfmpegInstance;
  let mockExec;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockExec = vi.fn().mockResolvedValue(0);
    
    mockFfmpegInstance = {
      on: vi.fn(),
      load: vi.fn().mockResolvedValue(),
      writeFile: vi.fn().mockResolvedValue(),
      readFile: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      exec: mockExec,
      deleteFile: vi.fn().mockResolvedValue(),
      terminate: vi.fn()
    };
    
    window.FFmpegWASM = {
      FFmpeg: vi.fn(() => mockFfmpegInstance)
    };
    
    window.FFmpegUtil = {
      fetchFile: vi.fn().mockResolvedValue(new Uint8Array([1])),
      toBlobURL: vi.fn().mockResolvedValue('blob:mock')
    };

    state.getFfmpegInstance.mockReturnValue(null);
    state.getFfmpegBlobs.mockReturnValue({
      coreBlobURL: 'core',
      wasmBlobURL: 'wasm',
      workerBlobURL: 'worker'
    });
  });

  describe('getFFmpeg', () => {
    it('should initialize and return ffmpeg instance', async () => {
      const ffmpeg = await getFFmpeg();
      expect(ffmpeg).toBeDefined();
      expect(window.FFmpegWASM.FFmpeg).toHaveBeenCalled();
      expect(state.setFfmpegInstance).toHaveBeenCalledWith(mockFfmpegInstance);
    });

    it('should return existing instance if available', async () => {
      state.getFfmpegInstance.mockReturnValue(mockFfmpegInstance);
      const ffmpeg = await getFFmpeg();
      expect(ffmpeg).toBe(mockFfmpegInstance);
      expect(window.FFmpegWASM.FFmpeg).not.toHaveBeenCalled();
    });

    it('should throw on FFmpeg WASM load error (EC-07)', async () => {
      mockFfmpegInstance.load.mockRejectedValue(new Error('Load Error'));
      await expect(getFFmpeg()).rejects.toThrow('Load Error');
    });
  });

  describe('processVideoWithFFmpeg', () => {
    it('should process video without overlay', async () => {
      state.getFfmpegInstance.mockReturnValue(mockFfmpegInstance);
      const mainFile = new File(['data'], 'main.mp4', { type: 'video/mp4' });
      
      const result = await processVideoWithFFmpeg(mainFile, null, false, false, null, null);
      
      expect(result).toBeInstanceOf(File);
      expect(mockFfmpegInstance.writeFile).toHaveBeenCalled();
      expect(mockFfmpegInstance.exec).toHaveBeenCalled();
      
      const execArgs = mockExec.mock.calls[0][0];
      expect(execArgs).toContain('-c:v');
      expect(execArgs).toContain('copy');
    });

    it('should process video with overlay', async () => {
      state.getFfmpegInstance.mockReturnValue(mockFfmpegInstance);
      const mainFile = new File(['data'], 'main.mp4', { type: 'video/mp4' });
      const overlayFile = new File(['overlay'], 'overlay.png', { type: 'image/png' });
      
      const result = await processVideoWithFFmpeg(mainFile, overlayFile, false, false, null, null);
      
      expect(result).toBeInstanceOf(File);
      expect(mockFfmpegInstance.writeFile).toHaveBeenCalledTimes(2);
      
      const execArgs = mockExec.mock.calls[0][0];
      expect(execArgs).toContain('-filter_complex');
      expect(execArgs).toContain('libx264');
    });

    it('should throw error if ffmpeg exec fails', async () => {
      state.getFfmpegInstance.mockReturnValue(mockFfmpegInstance);
      mockExec.mockResolvedValue(1); // non-zero exit code
      
      const mainFile = new File(['data'], 'main.mp4', { type: 'video/mp4' });
      
      await expect(processVideoWithFFmpeg(mainFile, null, false, false, null, null)).rejects.toThrow();
      expect(state.setFfmpegInstance).toHaveBeenCalledWith(null);
    });

    it('should trigger timeout if exec takes too long (EC-12)', async () => {
      state.getFfmpegInstance.mockReturnValue(mockFfmpegInstance);
      
      // Delay exec heavily
      mockExec.mockImplementation(() => new Promise(() => {})); // Hang forever
      
      // We can't easily mock the internal getVideoTimeout returning a tiny value without hacking.
      // Wait, we can't easily trigger the timeout unless we wait for 60 seconds...
      // Let's use vi.useFakeTimers() to advance time.
      vi.useFakeTimers();
      const mainFile = new File(['data'], 'main.mp4', { type: 'video/mp4' });
      const processPromise = processVideoWithFFmpeg(mainFile, null, false, false, null, null);
      
      const expectPromise = expect(processPromise).rejects.toThrow(/ffmpegTimeout/i);
      await vi.runAllTimersAsync();
      await expectPromise;
      
      vi.useRealTimers();
    });

    it('should add metadata to both global and video streams (EC-28)', async () => {
      state.getFfmpegInstance.mockReturnValue(mockFfmpegInstance);
      const mainFile = new File(['data'], 'main.mp4', { type: 'video/mp4' });
      
      const meta = { dateRaw: '2023-01-01T12:00:00Z', latitude: 10, longitude: 20 };
      const date = new Date(meta.dateRaw);
      await processVideoWithFFmpeg(mainFile, null, true, true, date, meta);
      
      const execArgs = mockExec.mock.calls[0][0];
      // EC-28: Ensure both metadata tags are used
      expect(execArgs).toContain('-metadata');
      expect(execArgs).toContain('-metadata:s:v:0');
      // Verify location formatting
      expect(execArgs).toContain('location=+10.0000+20.0000/');
      // Verify date formatting
      expect(execArgs).toContain('creation_time=2023-01-01T12:00:00.000Z');
    });
  });
});
