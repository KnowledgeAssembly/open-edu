import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  getAllBundleProgress,
  getBundleProgress,
  saveBundleProgress,
} from '../bundleProgressStorage';
import { resetDatabase } from '@open-edu/storage';

describe('bundleProgressStorage (IndexedDB)', () => {
  beforeEach(() => {
    resetDatabase();
  });

  it('returns empty data initially', async () => {
    const all = await getAllBundleProgress();
    expect(all).toEqual({});
  });

  it('saves and retrieves bundle progress', async () => {
    const snapshot = { completedModuleIds: ['m1'], currentModuleId: 'm2' };
    await saveBundleProgress('bundle-1', snapshot as any);
    const result = await getBundleProgress('bundle-1');
    expect(result).toEqual(snapshot);
  });

  it('overwrites existing bundle progress', async () => {
    await saveBundleProgress('bundle-1', { currentModuleId: 'a' } as any);
    await saveBundleProgress('bundle-1', { currentModuleId: 'b' } as any);
    const result = await getBundleProgress('bundle-1');
    expect(result).toEqual({ currentModuleId: 'b' });
  });

  it('returns null for unknown bundle', async () => {
    const result = await getBundleProgress('nonexistent');
    expect(result).toBeNull();
  });

  it('handles multiple bundles independently', async () => {
    await saveBundleProgress('bundle-1', { currentModuleId: 'a' } as any);
    await saveBundleProgress('bundle-2', { currentModuleId: 'b' } as any);
    const all = await getAllBundleProgress();
    expect(Object.keys(all)).toHaveLength(2);
    expect(all['bundle-1']).toEqual({ currentModuleId: 'a' });
    expect(all['bundle-2']).toEqual({ currentModuleId: 'b' });
  });

  it('does not leak into regular course progress', async () => {
    await saveBundleProgress('bundle-1', { currentModuleId: 'a' } as any);
    const { getProgress } = await import('@open-edu/storage');
    const record = await getProgress('bundle-1', '__bundle__');
    expect(record).toBeDefined();
    const regularRecord = await getProgress('bundle-1', 'lesson-1');
    expect(regularRecord).toBeUndefined();
  });
});
