import { describe, it, expect, vi, beforeEach } from 'vitest';
import { asyncPool } from '../../src/utils/async-pool.js';
import * as state from '../../src/state.js';
import * as i18n from '../../src/i18n.js';

vi.mock('../../src/state.js', () => ({
  getIsAborted: vi.fn(),
}));

vi.mock('../../src/i18n.js', () => ({
  t: vi.fn((key) => key), // return the key itself
}));

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

describe('async-pool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.getIsAborted.mockReturnValue(false);
  });

  it('should process all items', async () => {
    const items = [1, 2, 3, 4, 5];
    const results = [];
    const processor = async (item) => {
      await sleep(10);
      results.push(item * 2);
      return item * 2;
    };

    const out = await asyncPool(items, processor, 2);
    expect(out).toEqual([2, 4, 6, 8, 10]);
    // The order of results pushed might vary slightly based on timing, 
    // but with constant sleep and sequential start, they usually preserve order.
    expect(results).toHaveLength(5);
  });

  it('should limit concurrency', async () => {
    const items = [1, 2, 3];
    let maxRunning = 0;
    let running = 0;

    const processor = async () => {
      running++;
      if (running > maxRunning) maxRunning = running;
      await sleep(20);
      running--;
    };

    await asyncPool(items, processor, 2);
    expect(maxRunning).toBe(2);
  });

  it('should abort if getIsAborted returns true', async () => {
    const items = [1, 2, 3];
    const processor = async (item) => {
      if (item === 2) {
        state.getIsAborted.mockReturnValue(true);
      }
      await sleep(10);
    };

    await expect(asyncPool(items, processor, 1)).rejects.toThrow('abortedByUser');
  });
});
