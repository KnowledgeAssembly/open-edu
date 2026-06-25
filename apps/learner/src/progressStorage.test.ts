import { describe, it, expect, vi } from 'vitest';
import { getAllProgress, getProgress, saveProgress } from './progressStorage';
import type { ProgressSnapshot } from '@open-edu/schemas';

const snapshot: ProgressSnapshot = {
  packageId: 'pkg1',
  packageVersion: '1.0.0',
  currentNodeId: 'nodes/lesson-01.md',
  visitedNodes: ['nodes/lesson-01.md'],
  scores: {},
  isCompleted: false,
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const snapshotV2: ProgressSnapshot = {
  packageId: 'pkg1',
  packageVersion: '1.0.0',
  currentNodeId: 'nodes/lesson-02.md',
  visitedNodes: ['nodes/lesson-01.md', 'nodes/lesson-02.md'],
  scores: {},
  isCompleted: false,
  updatedAt: '2024-01-02T00:00:00.000Z',
};

const snapshotPkg2: ProgressSnapshot = {
  packageId: 'pkg2',
  packageVersion: '2.0.0',
  currentNodeId: 'nodes/chapter-01.md',
  visitedNodes: ['nodes/chapter-01.md'],
  scores: {},
  isCompleted: false,
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('progressStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('save and retrieve', () => {
    saveProgress('pkg1', snapshot);
    const result = getProgress('pkg1');
    expect(result).toEqual(snapshot);
  });

  it('multiple packages', () => {
    saveProgress('pkg1', snapshot);
    saveProgress('pkg2', snapshotPkg2);
    const all = getAllProgress();
    expect(all['pkg1']).toEqual(snapshot);
    expect(all['pkg2']).toEqual(snapshotPkg2);
  });

  it('missing key returns null', () => {
    expect(getProgress('nonexistent')).toBeNull();
  });

  it('corrupted data returns empty object', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('{invalid json}');
    expect(getAllProgress()).toEqual({});
  });

  it('overwrite returns latest', () => {
    saveProgress('pkg1', snapshot);
    saveProgress('pkg1', snapshotV2);
    expect(getProgress('pkg1')).toEqual(snapshotV2);
  });
});
