import { describe, it, expect } from 'vitest';
import { ProgressSnapshotSchema, WidgetAnswerSchema } from './progress';

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

describe('WidgetAnswerSchema', () => {
  it('validates a correct widget answer', () => {
    const result = WidgetAnswerSchema.parse({
      type: 'widget',
      widgetId: 'open-edu.matching',
      widgetVersion: '0.1.0',
      data: { connections: { a: 'b' }, submitted: true },
      score: 100,
    });
    expect(result.type).toBe('widget');
    expect(result.widgetId).toBe('open-edu.matching');
  });

  it('rejects missing widgetId', () => {
    expect(() => WidgetAnswerSchema.parse({ type: 'widget', data: {} })).toThrow();
  });

  it('accepts minimal answer (no score, no version)', () => {
    const result = WidgetAnswerSchema.parse({
      type: 'widget',
      widgetId: 'open-edu.test',
      data: 'just a string',
    });
    expect(result.data).toBe('just a string');
    expect(result.score).toBeUndefined();
  });

  it('rejects wrong discriminator type', () => {
    expect(() => WidgetAnswerSchema.parse({ type: 'quiz', widgetId: 'x', data: {} })).toThrow();
  });

  it('accepts provenance fields', () => {
    const result = WidgetAnswerSchema.parse({
      type: 'widget',
      widgetId: 'core.multiple-choice',
      widgetVersion: '1.0.0',
      data: {},
      intendedWidgetId: 'community.example.quiz',
      intendedWidgetVersion: '2.0.0',
      renderedWidgetId: 'core.multiple-choice',
      renderedWidgetVersion: '1.0.0',
      renderedViaFallback: true,
    });
    expect(result.renderedViaFallback).toBe(true);
    expect(result.intendedWidgetId).toBe('community.example.quiz');
  });

  it('still accepts answers without provenance (existing packages)', () => {
    const result = WidgetAnswerSchema.parse({
      type: 'widget',
      widgetId: 'open-edu.matching',
      data: {},
    });
    expect(result.renderedViaFallback).toBeUndefined();
  });
});
