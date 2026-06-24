import { describe, it, expect } from 'vitest';
import { ProgressSnapshotSchema } from './progress';

describe('ProgressSnapshotSchema', () => {
  it('valid snapshot passes validation', () => {
    const result = ProgressSnapshotSchema.parse({
      packageId: 'pkg-1',
      packageVersion: '1.0.0',
      currentNodeId: 'node-1',
      visitedNodes: ['node-1'],
      scores: { 'node-1': 85 },
      isCompleted: false,
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    expect(result.packageId).toBe('pkg-1');
    expect(result.scores['node-1']).toBe(85);
  });

  it('invalid currentNodeId (empty) fails', () => {
    expect(() =>
      ProgressSnapshotSchema.parse({
        packageId: 'pkg-1',
        packageVersion: '1.0.0',
        currentNodeId: '',
        visitedNodes: ['node-1'],
        updatedAt: '2024-01-01T00:00:00.000Z',
      }),
    ).toThrow();
  });

  it('invalid visitedNodes (empty string) fails', () => {
    expect(() =>
      ProgressSnapshotSchema.parse({
        packageId: 'pkg-1',
        packageVersion: '1.0.0',
        currentNodeId: 'node-1',
        visitedNodes: [''],
        updatedAt: '2024-01-01T00:00:00.000Z',
      }),
    ).toThrow();
  });

  it('isCompleted defaults to false', () => {
    const result = ProgressSnapshotSchema.parse({
      packageId: 'pkg-1',
      packageVersion: '1.0.0',
      currentNodeId: 'node-1',
      visitedNodes: ['node-1'],
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    expect(result.isCompleted).toBe(false);
  });

  it('scores default to empty object', () => {
    const result = ProgressSnapshotSchema.parse({
      packageId: 'pkg-1',
      packageVersion: '1.0.0',
      currentNodeId: 'node-1',
      visitedNodes: ['node-1'],
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    expect(result.scores).toEqual({});
  });
});
