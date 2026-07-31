import { describe, it, expect } from 'vitest';
import { TelemetryEventSchema } from './telemetry';

describe('TelemetryEventSchema', () => {
  const ts = 1782142445000;

  it('should accept a node_open event', () => {
    expect(
      TelemetryEventSchema.parse({ timestamp: ts, event: 'node_open', nodeId: 'lesson-01' }),
    ).toEqual({ timestamp: ts, event: 'node_open', nodeId: 'lesson-01' });
  });

  it('should accept a node_open event with type and sessionId', () => {
    expect(
      TelemetryEventSchema.parse({
        timestamp: ts,
        event: 'node_open',
        nodeId: 'lesson-01',
        type: 'lesson',
        sessionId: 'sess_abc',
      }),
    ).toMatchObject({ type: 'lesson', sessionId: 'sess_abc' });
  });

  it('should accept a node_complete event without score', () => {
    expect(
      TelemetryEventSchema.parse({ timestamp: ts, event: 'node_complete', nodeId: 'lesson-01' }),
    ).toMatchObject({ event: 'node_complete' });
  });

  it('should accept a node_complete event with score', () => {
    expect(
      TelemetryEventSchema.parse({
        timestamp: ts,
        event: 'node_complete',
        nodeId: 'quiz-01',
        score: 85,
      }),
    ).toMatchObject({ score: 85 });
  });

  it('should reject a node_complete event with score over 100', () => {
    expect(() =>
      TelemetryEventSchema.parse({
        timestamp: ts,
        event: 'node_complete',
        nodeId: 'quiz-01',
        score: 101,
      }),
    ).toThrow();
  });

  it('should reject a node_complete event with negative score', () => {
    expect(() =>
      TelemetryEventSchema.parse({
        timestamp: ts,
        event: 'node_complete',
        nodeId: 'quiz-01',
        score: -1,
      }),
    ).toThrow();
  });

  it('should accept a quiz_answered event', () => {
    expect(
      TelemetryEventSchema.parse({
        timestamp: ts,
        event: 'quiz_answered',
        nodeId: 'quiz-01',
        optionId: 'b',
        correct: true,
      }),
    ).toMatchObject({ optionId: 'b', correct: true });
  });

  it('should accept a hint_triggered event', () => {
    expect(
      TelemetryEventSchema.parse({
        timestamp: ts,
        event: 'hint_triggered',
        nodeId: 'quiz-01',
      }),
    ).toMatchObject({ event: 'hint_triggered' });
  });

  it('should accept a widget_interaction event', () => {
    expect(
      TelemetryEventSchema.parse({
        timestamp: ts,
        event: 'widget_interaction',
        widgetId: 'fraction-slider',
        action: 'slide',
        data: { value: 3 },
      }),
    ).toMatchObject({ widgetId: 'fraction-slider', action: 'slide', data: { value: 3 } });
  });

  it('should accept a minimal widget_interaction event', () => {
    expect(
      TelemetryEventSchema.parse({
        timestamp: ts,
        event: 'widget_interaction',
        widgetId: 'fraction-slider',
      }),
    ).toMatchObject({ event: 'widget_interaction' });
  });

  it('should accept a route_triggered event', () => {
    expect(
      TelemetryEventSchema.parse({
        timestamp: ts,
        event: 'route_triggered',
        from: 'quiz-01',
        to: 'COMPLETED',
        reason: 'score >= 80',
      }),
    ).toMatchObject({ from: 'quiz-01', to: 'COMPLETED', reason: 'score >= 80' });
  });

  it('should accept a route_triggered event without reason', () => {
    expect(
      TelemetryEventSchema.parse({
        timestamp: ts,
        event: 'route_triggered',
        from: 'quiz-01',
        to: 'COMPLETED',
      }),
    ).toMatchObject({ from: 'quiz-01', to: 'COMPLETED' });
  });

  it('should reject unknown event type', () => {
    expect(() => TelemetryEventSchema.parse({ timestamp: ts, event: 'unknown_event' })).toThrow();
  });

  it('should reject event without required fields for its type', () => {
    expect(() => TelemetryEventSchema.parse({ timestamp: ts, event: 'node_open' })).toThrow();
  });

  it('should reject negative timestamp', () => {
    expect(() =>
      TelemetryEventSchema.parse({
        timestamp: -1,
        event: 'node_open',
        nodeId: 'test',
      }),
    ).toThrow();
  });

  it('should reject zero timestamp', () => {
    expect(() =>
      TelemetryEventSchema.parse({
        timestamp: 0,
        event: 'node_open',
        nodeId: 'test',
      }),
    ).toThrow();
  });

  it('accepts a module_complete event', () => {
    const result = TelemetryEventSchema.safeParse({
      event: 'module_complete',
      moduleId: 'mod-a',
      sessionId: 's1',
      timestamp: ts,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a bundle_complete event', () => {
    const result = TelemetryEventSchema.safeParse({
      event: 'bundle_complete',
      bundleId: 'bundle-1',
      sessionId: 's1',
      timestamp: ts,
    });
    expect(result.success).toBe(true);
  });
});
