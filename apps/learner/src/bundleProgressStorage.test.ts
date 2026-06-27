import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAllBundleProgress,
  getBundleProgress,
  saveBundleProgress,
} from './bundleProgressStorage';
import type { BundleProgressSnapshot } from '@open-edu/schemas';

beforeEach(() => {
  localStorage.clear();
});

const mockSnapshot: BundleProgressSnapshot = {
  bundleId: 'test-bundle',
  bundleVersion: '1.0.0',
  moduleStatuses: { 'mod-a': 'completed', 'mod-b': 'unlocked' },
  moduleProgress: {},
  updatedAt: new Date().toISOString(),
};

describe('bundleProgressStorage', () => {
  it('should return empty object when no progress saved', () => {
    expect(getAllBundleProgress()).toEqual({});
  });

  it('should save and retrieve bundle progress', () => {
    saveBundleProgress('test-bundle', mockSnapshot);
    const result = getBundleProgress('test-bundle');
    expect(result).not.toBeNull();
    expect(result!.bundleId).toBe('test-bundle');
    expect(result!.moduleStatuses['mod-a']).toBe('completed');
  });

  it('should return null for nonexistent bundle', () => {
    expect(getBundleProgress('nonexistent')).toBeNull();
  });

  it('should handle corrupted localStorage gracefully', () => {
    localStorage.setItem('open-edu-bundle-progress', '{corrupted');
    expect(getAllBundleProgress()).toEqual({});
  });

  it('should overwrite existing progress', () => {
    saveBundleProgress('test-bundle', mockSnapshot);
    const updated: BundleProgressSnapshot = {
      bundleId: 'test-bundle',
      bundleVersion: '1.0.0',
      moduleStatuses: { 'mod-a': 'completed', 'mod-b': 'completed' },
      moduleProgress: {},
      updatedAt: new Date().toISOString(),
    };
    saveBundleProgress('test-bundle', updated);
    const result = getBundleProgress('test-bundle');
    expect(result!.moduleStatuses['mod-b']).toBe('completed');
  });
});
