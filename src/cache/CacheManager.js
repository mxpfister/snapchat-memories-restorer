
export const dbName = 'MemoriesRestorerDB';
export const storeName = 'processedFiles';

const QUOTA_THRESHOLD = 0.7; // Stop cache writes at 70% quota utilization

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(storeName);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Check if there is enough storage quota to cache a buffer of the given size.
 * Returns false if quota would be exceeded or API is unavailable.
 */
export async function hasQuotaSpace(bufferSize) {
  try {
    if (!navigator.storage?.estimate) return true;
    const { usage, quota } = await navigator.storage.estimate();
    return (usage + bufferSize) < quota * QUOTA_THRESHOLD;
  } catch {
    return true;
  }
}

export async function saveToCache(mid, buffer) {
  // Quota pre-check: don't even attempt if we're near the limit
  const bufferSize = buffer.byteLength || buffer.length || 0;
  if (!await hasQuotaSpace(bufferSize)) {
    return false;
  }

  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(buffer, mid);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
    tx.onabort = () => resolve(false);
  });
}

export async function getFromCache(mid) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(mid);
    req.onsuccess = () => resolve(req.result);
    req.onerror = reject;
  });
}

export async function clearCache() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).clear();
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
}

/**
 * Request persistent storage to increase quota limits.
 * Should be called once at the start of processing.
 */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist) {
      const granted = await navigator.storage.persist();
      return granted;
    }
  } catch {
    // Ignore - not all browsers support this
  }
  return false;
}
