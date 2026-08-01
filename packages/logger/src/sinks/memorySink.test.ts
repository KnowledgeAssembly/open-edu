import { describe, it, expect } from 'vitest';
import { MemorySink } from './memorySink.js';
import type { LogEntry } from '../types.js';

function makeEntry(level: string, scope: string, message: string): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level: level as LogEntry['level'],
    scope,
    message,
  };
}

describe('MemorySink', () => {
  it('stores entries and retrieves them', () => {
    const sink = new MemorySink({ capacity: 10 });
    sink.write(makeEntry('info', 'test', 'hello'));
    sink.write(makeEntry('warn', 'test', 'world'));

    expect(sink.entries()).toHaveLength(2);
    expect(sink.count).toBe(2);
    expect(sink.totalWritten).toBe(2);
  });

  it('respects capacity with circular overwrite', () => {
    const sink = new MemorySink({ capacity: 3 });
    for (let i = 0; i < 10; i++) {
      sink.write(makeEntry('info', 'test', `msg-${i}`));
    }

    expect(sink.entries()).toHaveLength(3);
    expect(sink.count).toBe(3);
    expect(sink.totalWritten).toBe(10);

    const entries = sink.entries();
    expect(entries[0]!.message).toBe('msg-7');
    expect(entries[1]!.message).toBe('msg-8');
    expect(entries[2]!.message).toBe('msg-9');
  });

  it('filters by level', () => {
    const sink = new MemorySink();
    sink.write(makeEntry('info', 't', 'a'));
    sink.write(makeEntry('warn', 't', 'b'));
    sink.write(makeEntry('error', 't', 'c'));
    sink.write(makeEntry('info', 't', 'd'));

    const errors = sink.entriesByLevel('error');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toBe('c');
  });

  it('filters by scope prefix', () => {
    const sink = new MemorySink();
    sink.write(makeEntry('info', 'core:loader', 'a'));
    sink.write(makeEntry('info', 'core:validator', 'b'));
    sink.write(makeEntry('info', 'pipeline:extract', 'c'));

    const coreEntries = sink.entriesByScope('core');
    expect(coreEntries).toHaveLength(2);
  });

  it('returns recent entries', () => {
    const sink = new MemorySink({ capacity: 100 });
    for (let i = 0; i < 10; i++) {
      sink.write(makeEntry('info', 'test', `msg-${i}`));
    }

    const recent = sink.recent(3);
    expect(recent).toHaveLength(3);
    expect(recent[0]!.message).toBe('msg-7');
    expect(recent[2]!.message).toBe('msg-9');
  });

  it('clear resets all state', () => {
    const sink = new MemorySink();
    sink.write(makeEntry('info', 'test', 'hello'));
    sink.clear();

    expect(sink.entries()).toHaveLength(0);
    expect(sink.count).toBe(0);
    expect(sink.totalWritten).toBe(0);
  });
});
