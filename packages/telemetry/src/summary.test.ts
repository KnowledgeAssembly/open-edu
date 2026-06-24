import { describe, it, expect } from 'vitest';
import { createSummary } from './summary';
import type { TelemetryEvent } from '@open-edu/schemas';

describe('createSummary', () => {
  it('should return zero-state for empty events', () => {
    const summary = createSummary([]);
    expect(summary.totalEvents).toBe(0);
    expect(summary.byType).toEqual({});
    expect(summary.nodeOpens).toBe(0);
    expect(summary.nodeCompletions).toBe(0);
    expect(summary.averageQuizScore).toBeNull();
    expect(summary.sessionCount).toBe(0);
    expect(summary.sessionIds).toEqual([]);
  });

  it('should count events by type', () => {
    const events: TelemetryEvent[] = [
      { event: 'node_open', nodeId: 'n1', timestamp: 1000 },
      { event: 'node_complete', nodeId: 'n1', timestamp: 2000 },
      { event: 'node_open', nodeId: 'n2', timestamp: 3000 },
      { event: 'quiz_answered', nodeId: 'n1', optionId: 'a', correct: true, timestamp: 4000 },
    ];

    const summary = createSummary(events);
    expect(summary.totalEvents).toBe(4);
    expect(summary.byType).toEqual({
      node_open: 2,
      node_complete: 1,
      quiz_answered: 1,
    });
    expect(summary.nodeOpens).toBe(2);
    expect(summary.nodeCompletions).toBe(1);
  });

  it('should calculate average quiz score from node_complete events', () => {
    const events: TelemetryEvent[] = [
      { event: 'node_complete', nodeId: 'n1', score: 80, timestamp: 1000 },
      { event: 'node_complete', nodeId: 'n2', score: 90, timestamp: 2000 },
      { event: 'node_complete', nodeId: 'n3', score: 70, timestamp: 3000 },
    ];

    const summary = createSummary(events);
    expect(summary.averageQuizScore).toBe(80);
  });

  it('should handle node_complete events without score', () => {
    const events: TelemetryEvent[] = [
      { event: 'node_complete', nodeId: 'n1', timestamp: 1000 },
      { event: 'node_complete', nodeId: 'n2', score: 90, timestamp: 2000 },
    ];

    const summary = createSummary(events);
    expect(summary.averageQuizScore).toBe(90);
  });

  it('should count unique sessions', () => {
    const events: TelemetryEvent[] = [
      { event: 'node_open', nodeId: 'n1', timestamp: 1000, sessionId: 'sess-1' },
      { event: 'node_open', nodeId: 'n2', timestamp: 2000, sessionId: 'sess-1' },
      { event: 'node_open', nodeId: 'n3', timestamp: 3000, sessionId: 'sess-2' },
      { event: 'node_open', nodeId: 'n4', timestamp: 4000 },
    ];

    const summary = createSummary(events);
    expect(summary.sessionCount).toBe(2);
    expect(summary.sessionIds).toEqual(['sess-1', 'sess-2']);
  });

  it('should handle null average when no scores present', () => {
    const events: TelemetryEvent[] = [
      { event: 'node_open', nodeId: 'n1', timestamp: 1000 },
      { event: 'node_complete', nodeId: 'n1', timestamp: 2000 },
    ];

    const summary = createSummary(events);
    expect(summary.averageQuizScore).toBeNull();
  });
});
