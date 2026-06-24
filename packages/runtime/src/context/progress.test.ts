import { describe, it, expect } from 'vitest';
import { buildProgressSnapshot, isValidSnapshot } from './progress';
import type { ProgressSnapshot } from '@open-edu/schemas';

describe('buildProgressSnapshot', () => {
  it('builds a valid ProgressSnapshot from workflow state', () => {
    const result = buildProgressSnapshot('pkg-1', '1.0.0', {
      currentNodeId: 'node-1',
      visitedNodes: ['node-1'],
      scores: { 'node-1': 90 },
      isCompleted: false,
    });
    expect(result.packageId).toBe('pkg-1');
    expect(result.currentNodeId).toBe('node-1');
    expect(result.visitedNodes).toEqual(['node-1']);
    expect(result.scores).toEqual({ 'node-1': 90 });
    expect(result.isCompleted).toBe(false);
    expect(() => new Date(result.updatedAt)).not.toThrow();
  });

  it('defaults scores to empty object when not provided', () => {
    const result = buildProgressSnapshot('pkg-1', '1.0.0', {
      currentNodeId: 'node-1',
      visitedNodes: ['node-1'],
      scores: undefined as unknown as Record<string, number>,
      isCompleted: false,
    });
    expect(result.scores).toEqual({});
  });
});

describe('isValidSnapshot', () => {
  const validNodeIds = new Set(['node-1', 'node-2']);

  it('returns true if currentNodeId is in valid set', () => {
    const snapshot = {
      packageId: 'pkg-1',
      packageVersion: '1.0.0',
      currentNodeId: 'node-1',
      visitedNodes: ['node-1'],
      scores: {},
      isCompleted: false,
      updatedAt: '2024-01-01T00:00:00.000Z',
    } as ProgressSnapshot;
    expect(isValidSnapshot(snapshot, validNodeIds)).toBe(true);
  });

  it('returns true if snapshot is completed regardless of node ID', () => {
    const snapshot = {
      packageId: 'pkg-1',
      packageVersion: '1.0.0',
      currentNodeId: 'nonexistent',
      visitedNodes: ['node-1'],
      scores: {},
      isCompleted: true,
      updatedAt: '2024-01-01T00:00:00.000Z',
    } as ProgressSnapshot;
    expect(isValidSnapshot(snapshot, validNodeIds)).toBe(true);
  });

  it('returns false if currentNodeId is invalid and not completed', () => {
    const snapshot = {
      packageId: 'pkg-1',
      packageVersion: '1.0.0',
      currentNodeId: 'nonexistent',
      visitedNodes: ['node-1'],
      scores: {},
      isCompleted: false,
      updatedAt: '2024-01-01T00:00:00.000Z',
    } as ProgressSnapshot;
    expect(isValidSnapshot(snapshot, validNodeIds)).toBe(false);
  });
});
