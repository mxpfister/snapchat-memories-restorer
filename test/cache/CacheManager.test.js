import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openDB, saveToCache, getFromCache, clearCache } from '../../src/cache/CacheManager.js';

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

    // Auto-trigger success when indexedDB.open is called
    vi.spyOn(global.indexedDB, 'open').mockImplementation(() => {
      setTimeout(() => {
        if (mockRequest.onsuccess) mockRequest.onsuccess();
      }, 0);
      return mockRequest;
    });
  });

  it('should save to cache', async () => {
    const promise = saveToCache('mid-123', new ArrayBuffer(8));
    
    setTimeout(() => {
      mockTransaction.oncomplete();
    }, 10);
    
    await promise;
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
});
