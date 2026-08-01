import { describe, it, expect, vi } from 'vitest';
import { TelemetryBridgeSink } from './telemetryBridgeSink.js';
import type { LogEntry } from '../types.js';

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level: 'warn',
    scope: 'test',
    message: 'test',
    ...overrides,
  };
}

describe('TelemetryBridgeSink', () => {
  it('forwards warn entries to handler', () => {
    const handler = vi.fn();
    const sink = new TelemetryBridgeSink({ onDiagnostic: handler });

    sink.write(makeEntry({ level: 'warn' }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ level: 'warn' }));
  });

  it('forwards error entries to handler', () => {
    const handler = vi.fn();
    const sink = new TelemetryBridgeSink({ onDiagnostic: handler });

    sink.write(makeEntry({ level: 'error' }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not forward info/debug entries by default', () => {
    const handler = vi.fn();
    const sink = new TelemetryBridgeSink({ onDiagnostic: handler });

    sink.write(makeEntry({ level: 'info' }));
    sink.write(makeEntry({ level: 'debug' }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('respects custom levels filter', () => {
    const handler = vi.fn();
    const sink = new TelemetryBridgeSink({ onDiagnostic: handler, levels: ['error'] });

    sink.write(makeEntry({ level: 'warn' }));
    sink.write(makeEntry({ level: 'error' }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ level: 'error' }));
  });
});
