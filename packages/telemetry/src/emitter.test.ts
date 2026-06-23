import { describe, it, expect } from 'vitest';
import { TelemetryEmitter } from './emitter';
import { TelemetryEventSchema } from '@open-edu/schemas';

describe('TelemetryEmitter', () => {
  it('should emit a valid event and return success', () => {
    const emitter = new TelemetryEmitter();
    const result = emitter.emit({ event: 'node_open', nodeId: 'n1' } as any);
    expect(result.success).toBe(true);
    expect(result.event).toBeDefined();
    expect(result.event!.event).toBe('node_open');
  });

  it('should reject an invalid event', () => {
    const emitter = new TelemetryEmitter();
    const result = emitter.emit({ event: 'node_open' } as any);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should push events to the observable', () => {
    const emitter = new TelemetryEmitter();
    const events: any[] = [];
    const sub = emitter.events$.subscribe((e) => events.push(e));
    emitter.emit({ event: 'node_open', nodeId: 'n1' } as any);
    emitter.emit({ event: 'node_complete', nodeId: 'n1', score: 85 } as any);
    expect(events).toHaveLength(2);
    expect(events[0]!.event).toBe('node_open');
    expect(events[1]!.event).toBe('node_complete');
    sub.unsubscribe();
  });

  it('should stamp timestamp on emitted events', () => {
    const emitter = new TelemetryEmitter();
    const result = emitter.emit({ event: 'node_open', nodeId: 'n1' } as any);
    expect(result.event!.timestamp).toBeGreaterThan(0);
  });

  it('should stop emitting after complete()', () => {
    const emitter = new TelemetryEmitter();
    const events: any[] = [];
    const sub = emitter.events$.subscribe((e) => events.push(e));
    emitter.complete();
    emitter.emit({ event: 'node_open', nodeId: 'n1' } as any);
    expect(events).toHaveLength(0);
    sub.unsubscribe();
  });

  it('should not throw on double complete()', () => {
    const emitter = new TelemetryEmitter();
    emitter.complete();
    expect(() => emitter.complete()).not.toThrow();
  });

  it('should accept a custom schema', () => {
    const schema = TelemetryEventSchema;
    const emitter = new TelemetryEmitter(schema);
    const result = emitter.emit({ event: 'node_open', nodeId: 'n1' } as any);
    expect(result.success).toBe(true);
  });
});
