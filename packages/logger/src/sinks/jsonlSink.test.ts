import { describe, it, expect, afterEach } from 'vitest';
import { unlink, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { JsonlSink } from './jsonlSink.js';
import type { LogEntry } from '../types.js';

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level: 'info',
    scope: 'test',
    message: 'hello',
    ...overrides,
  };
}

describe('JsonlSink', () => {
  const filePath = join(tmpdir(), `oe-logger-test-${Date.now()}.jsonl`);

  afterEach(async () => {
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  });

  it('writes entries as JSONL', async () => {
    const sink = new JsonlSink({ filePath, flushIntervalMs: 50 });

    sink.write(makeEntry({ message: 'first' }));
    sink.write(makeEntry({ message: 'second' }));

    await sink.close();

    const content = await readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n');

    expect(lines.length).toBe(2);
    const first = JSON.parse(lines[0]!);
    expect(first.message).toBe('first');
    const second = JSON.parse(lines[1]!);
    expect(second.message).toBe('second');
  });

  it('flushes periodically', async () => {
    const sink = new JsonlSink({ filePath, flushIntervalMs: 10 });

    sink.write(makeEntry({ message: 'auto-flush' }));

    await new Promise((resolve) => setTimeout(resolve, 100));

    const content = await readFile(filePath, 'utf-8');
    expect(content.trim()).toBeTruthy();

    await sink.close();
  });

  it('does not write after close', async () => {
    const sink = new JsonlSink({ filePath, flushIntervalMs: 100 });

    await sink.close();
    sink.write(makeEntry({ message: 'after-close' }));

    const exists = existsSync(filePath);
    if (exists) {
      const content = await readFile(filePath, 'utf-8');
      expect(content.trim()).toBe('');
    }
  });
});
