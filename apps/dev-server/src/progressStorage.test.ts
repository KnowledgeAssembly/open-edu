import { describe, it, expect, beforeEach } from 'vitest';
import { loadProgress, saveProgress, clearProgress, getStorageKey } from './progressStorage';

describe('getStorageKey', () => {
  it('builds key from id and version', () => {
    expect(getStorageKey('test-pkg', '1.0.0')).toBe('open-edu:progress:test-pkg:1.0.0');
  });
});

describe('progressStorage', () => {
  const testSnapshot = {
    packageId: 'test-pkg',
    packageVersion: '1.0.0',
    currentNodeId: 'node-1',
    visitedNodes: ['node-1'],
    scores: {},
    isCompleted: false,
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('saveProgress and loadProgress round-trips a snapshot', () => {
    saveProgress('test-pkg', '1.0.0', testSnapshot);
    const loaded = loadProgress('test-pkg', '1.0.0');
    expect(loaded).toEqual(testSnapshot);
  });

  it('loadProgress returns null when no data saved', () => {
    expect(loadProgress('test-pkg', '1.0.0')).toBeNull();
  });

  it('clearProgress removes stored data', () => {
    saveProgress('test-pkg', '1.0.0', testSnapshot);
    clearProgress('test-pkg', '1.0.0');
    expect(loadProgress('test-pkg', '1.0.0')).toBeNull();
  });

  it('handles corrupt localStorage data gracefully', () => {
    localStorage.setItem('open-edu:progress:test-pkg:1.0.0', 'not-json');
    expect(loadProgress('test-pkg', '1.0.0')).toBeNull();
  });

  it('handles missing localStorage gracefully', () => {
    const key = 'open-edu:progress:other-pkg:2.0.0';
    expect(localStorage.getItem(key)).toBeNull();
    expect(loadProgress('other-pkg', '2.0.0')).toBeNull();
  });
});
