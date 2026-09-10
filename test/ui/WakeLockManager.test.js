import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestWakeLock, releaseWakeLock } from '../../src/ui/WakeLockManager.js';
import * as state from '../../src/state.js';

vi.mock('../../src/state.js');

describe('WakeLockManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should request wake lock if supported', async () => {
    const mockRequest = vi.fn().mockResolvedValue('sentinel');
    global.navigator.wakeLock = { request: mockRequest };
    
    await requestWakeLock();
    
    expect(mockRequest).toHaveBeenCalledWith('screen');
    expect(state.setWakeLockSentinel).toHaveBeenCalledWith('sentinel');
  });

  it('should not throw if wake lock is not supported', async () => {
    delete global.navigator.wakeLock;
    await expect(requestWakeLock()).resolves.not.toThrow();
  });

  it('should release wake lock', async () => {
    const mockRelease = vi.fn().mockResolvedValue(true);
    state.getWakeLockSentinel.mockReturnValue({ release: mockRelease });
    
    await releaseWakeLock();
    
    expect(mockRelease).toHaveBeenCalled();
    expect(state.setWakeLockSentinel).toHaveBeenCalledWith(null);
  });

  it('should handle wake lock release error gracefully (EC-05)', async () => {
    const mockRelease = vi.fn().mockRejectedValue(new Error('Release error'));
    state.getWakeLockSentinel.mockReturnValue({ release: mockRelease });
    
    await expect(releaseWakeLock()).resolves.not.toThrow();
    expect(state.setWakeLockSentinel).toHaveBeenCalledWith(null);
  });
});
