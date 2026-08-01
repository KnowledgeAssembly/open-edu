import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConsoleSink } from './consoleSink.js';
import type { LogEntry } from '../types.js';

describe('ConsoleSink', () => {
  let originalLog: typeof console.log;
  let originalError: typeof console.error;
  let originalWarn: typeof console.warn;
  let originalDebug: typeof console.debug;

  beforeEach(() => {
    originalLog = console.log;
    originalError = console.error;
    originalWarn = console.warn;
    originalDebug = console.debug;
    console.log = vi.fn();
    console.error = vi.fn();
    console.warn = vi.fn();
    console.debug = vi.fn();
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
    console.debug = originalDebug;
  });

  const makeEntry = (overrides: Partial<LogEntry> = {}): LogEntry => ({
    timestamp: new Date().toISOString(),
    level: 'info' as const,
    scope: 'test',
    message: 'test message',
    ...overrides,
  });

  it('calls console.log for info', () => {
    const sink = new ConsoleSink();
    sink.write(makeEntry({ level: 'info' }));
    expect(console.log).toHaveBeenCalled();
  });

  it('calls console.error for error', () => {
    const sink = new ConsoleSink();
    sink.write(makeEntry({ level: 'error' }));
    expect(console.error).toHaveBeenCalled();
  });

  it('calls console.warn for warn', () => {
    const sink = new ConsoleSink();
    sink.write(makeEntry({ level: 'warn' }));
    expect(console.warn).toHaveBeenCalled();
  });

  it('calls console.debug for debug', () => {
    const sink = new ConsoleSink();
    sink.write(makeEntry({ level: 'debug' }));
    expect(console.debug).toHaveBeenCalled();
  });

  it('includes scope in output', () => {
    const sink = new ConsoleSink();
    sink.write(makeEntry({ scope: 'my-module' }));
    const call = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(call).toContain('my-module');
  });

  it('includes message in output', () => {
    const sink = new ConsoleSink();
    sink.write(makeEntry({ message: 'hello world' }));
    const call = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(call).toContain('hello world');
  });
});
