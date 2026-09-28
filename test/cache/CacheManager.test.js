import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openDB, saveToCache, getFromCache, clearCache, hasQuotaSpace, requestPersistentStorage } from '../../src/cache/CacheManager.js';

describe('CacheManager', () => {
  let mockStore;
  let mockTransaction;
  let mockDb;

  beforeEach(() => {
    mockStore = {
      put: vi.fn(),
      get: vi.fn(() => ({ onsuccess: null, onerror: null, result: 'mock-buffer' })),
      clear: vi.fn(),
    };
    
    mockTransaction = {
      objectStore: vi.fn(() => mockStore),
      oncomplete: null,
      onerror: null,
      onabort: null,
    };
    
    mockDb = {
      transaction: vi.fn(() => mockTransaction),
    };

    const mockRequest = {
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
      result: mockDb
    };

    global.indexedDB = {
      open: vi.fn(() => mockRequest)
    };

    // Mock navigator.storage.estimate to allow caching in tests
    global.navigator.storage = {
      estimate: vi.fn().mockResolvedValue({ usage: 0, quota: 1000000000 }),
      persist: vi.fn().mockResolvedValue(true),
    };

    // Auto-trigger success when indexedDB.open is called
    vi.spyOn(global.indexedDB, 'open').mockImplementation(() => {
      setTimeout(() => {
        if (mockRequest.onsuccess) mockRequest.onsuccess();
      }, 0);
      return mockRequest;
    });
  });

  it('should save to cache and return true', async () => {
    const promise = saveToCache('mid-123', new ArrayBuffer(8));
    
    setTimeout(() => {
      mockTransaction.oncomplete();
    }, 10);
    
    const result = await promise;
    expect(result).toBe(true);
    expect(mockDb.transaction).toHaveBeenCalledWith('processedFiles', 'readwrite');
    expect(mockStore.put).toHaveBeenCalledWith(expect.any(ArrayBuffer), 'mid-123');
  });

  it('should get from cache', async () => {
    const promise = getFromCache('mid-123');
    
    setTimeout(() => {
      const getReq = mockStore.get.mock.results[0].value;
      if (getReq.onsuccess) getReq.onsuccess();
    }, 10);
    
    const res = await promise;
    expect(mockDb.transaction).toHaveBeenCalledWith('processedFiles', 'readonly');
    expect(mockStore.get).toHaveBeenCalledWith('mid-123');
    expect(res).toBe('mock-buffer');
  });

  it('should clear cache', async () => {
    const promise = clearCache();
    
    setTimeout(() => {
      mockTransaction.oncomplete();
    }, 10);
    
    await promise;
    expect(mockDb.transaction).toHaveBeenCalledWith('processedFiles', 'readwrite');
    expect(mockStore.clear).toHaveBeenCalled();
  });
  it('should create object store on upgradeneeded', async () => {
    const mockDbObj = {
      createObjectStore: vi.fn()
    };
    const mockReq = {
      result: null
    };
    global.indexedDB.open.mockImplementation(() => {
      setTimeout(() => {
        if (mockReq.onupgradeneeded) {
          mockReq.onupgradeneeded({ target: { result: mockDbObj } });
        }
        if (mockReq.onsuccess) {
          mockReq.result = mockDbObj;
          mockReq.onsuccess();
        }
      }, 0);
      return mockReq;
    });

    await openDB();
    expect(mockDbObj.createObjectStore).toHaveBeenCalledWith('processedFiles');
  });

  it('should reject if openDB fails (EC-16)', async () => {
    const mockReq = {
      result: null
    };
    global.indexedDB.open.mockImplementation(() => {
      setTimeout(() => {
        if (mockReq.onerror) {
          mockReq.error = new Error('IndexedDB error');
          mockReq.onerror();
        }
      }, 0);
      return mockReq;
    });

    await expect(saveToCache('mid-123', new ArrayBuffer(8))).rejects.toThrow('IndexedDB error');
  });

  it('should return false when quota is near limit', async () => {
    global.navigator.storage = {
      estimate: vi.fn().mockResolvedValue({ usage: 800, quota: 1000 }),
    };
    const result = await saveToCache('mid-123', new ArrayBuffer(8));
    expect(result).toBe(false);
    // Should not even attempt to open the DB
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('should resolve false on transaction error instead of rejecting', async () => {
    const promise = saveToCache('mid-123', new ArrayBuffer(8));
    
    setTimeout(() => {
      mockTransaction.onerror();
    }, 10);
    
    const result = await promise;
    expect(result).toBe(false);
  });

  it('should resolve false on transaction abort', async () => {
    const promise = saveToCache('mid-123', new ArrayBuffer(8));
    
    setTimeout(() => {
      mockTransaction.onabort();
    }, 10);
    
    const result = await promise;
    expect(result).toBe(false);
  });
});

describe('hasQuotaSpace', () => {
  it('should return true when enough space is available', async () => {
    global.navigator.storage = {
      estimate: vi.fn().mockResolvedValue({ usage: 100, quota: 1000 }),
    };
    expect(await hasQuotaSpace(100)).toBe(true);
  });

  it('should return false when near quota limit', async () => {
    global.navigator.storage = {
      estimate: vi.fn().mockResolvedValue({ usage: 750, quota: 1000 }),
    };
    expect(await hasQuotaSpace(100)).toBe(false);
  });

  it('should return true when API is unavailable', async () => {
    global.navigator.storage = undefined;
    expect(await hasQuotaSpace(100)).toBe(true);
  });

  it('should return true when estimate throws', async () => {
    global.navigator.storage = {
      estimate: vi.fn().mockRejectedValue(new Error('fail')),
    };
    expect(await hasQuotaSpace(100)).toBe(true);
  });
});

describe('requestPersistentStorage', () => {
  it('should request persistent storage and return result', async () => {
    global.navigator.storage = {
      persist: vi.fn().mockResolvedValue(true),
    };
    expect(await requestPersistentStorage()).toBe(true);
    expect(navigator.storage.persist).toHaveBeenCalled();
  });

  it('should return false when not granted', async () => {
    global.navigator.storage = {
      persist: vi.fn().mockResolvedValue(false),
    };
    expect(await requestPersistentStorage()).toBe(false);
  });

  it('should return false when API is unavailable', async () => {
    global.navigator.storage = undefined;
    expect(await requestPersistentStorage()).toBe(false);
  });

  it('should return false when persist throws', async () => {
    global.navigator.storage = {
      persist: vi.fn().mockRejectedValue(new Error('fail')),
    };
    expect(await requestPersistentStorage()).toBe(false);
  });
});
