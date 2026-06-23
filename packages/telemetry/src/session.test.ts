import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelemetrySession } from './session';
import type { TelemetryEvent } from '@open-edu/schemas';
import type { Persister } from './types';

function createMockPersister(): Persister {
  return {
    write: vi.fn().mockResolvedValue(undefined),
    flush: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

describe('TelemetrySession', () => {
  let session: TelemetrySession;
  let persister: Persister;

  beforeEach(() => {
    persister = createMockPersister();
    session = new TelemetrySession({ persister });
  });

  it('should generate a sessionId on start()', () => {
    const id = session.start();
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
    expect(session.sessionId).toBe(id);
  });

  it('should be active after start()', () => {
    session.start();
    expect(session.isActive).toBe(true);
  });

  it('should not be active before start()', () => {
    expect(session.isActive).toBe(false);
  });

  it('should not be active after stop()', async () => {
    session.start();
    await session.stop();
    expect(session.isActive).toBe(false);
  });

  it('should emit events tagged with sessionId and timestamp', () => {
    session.start();
    const result = session.emit({ event: 'node_open', nodeId: 'n1' });
    expect(result.success).toBe(true);
    expect(result.event!.sessionId).toBe(session.sessionId);
    expect(result.event!.timestamp).toBeGreaterThan(0);
  });

  it('should reject emit() before start()', () => {
    const result = session.emit({ event: 'node_open', nodeId: 'n1' });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject emit() after stop()', async () => {
    session.start();
    await session.stop();
    const result = session.emit({ event: 'node_open', nodeId: 'n1' });
    expect(result.success).toBe(false);
  });

  it('should pass events through to the persister', () => {
    session.start();
    session.emit({ event: 'node_open', nodeId: 'n1' });
    expect(persister.write).toHaveBeenCalledTimes(1);
    const written = persister.write.mock.calls[0]![0] as TelemetryEvent;
    expect(written.event).toBe('node_open');
    expect(written.nodeId).toBe('n1');
  });

  it('should flush and close persister on stop()', async () => {
    session.start();
    await session.stop();
    expect(persister.flush).toHaveBeenCalledTimes(1);
    expect(persister.close).toHaveBeenCalledTimes(1);
  });

  it('should expose events$ observable', () => {
    session.start();
    const events: any[] = [];
    const sub = session.events$.subscribe((e) => events.push(e));
    session.emit({ event: 'node_open', nodeId: 'n1' });
    expect(events).toHaveLength(1);
    sub.unsubscribe();
  });

  it('should return sessionId as null before start', () => {
    expect(session.sessionId).toBeNull();
  });
});
