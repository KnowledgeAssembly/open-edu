import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { readJsonl } from './reader';

describe('readJsonl', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reader-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should parse valid JSONL into telemetry events', () => {
    const filePath = path.join(tempDir, 'events.jsonl');
    fs.writeFileSync(
      filePath,
      [
        JSON.stringify({ event: 'node_open', nodeId: 'n1', timestamp: 1000 }),
        JSON.stringify({ event: 'node_complete', nodeId: 'n1', score: 85, timestamp: 2000 }),
        '',
      ].join('\n'),
      'utf-8',
    );

    const result = readJsonl(filePath);
    expect(result.events).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.events[0]!.event).toBe('node_open');
    expect(result.events[1]!.event).toBe('node_complete');
    expect((result.events[1] as { score: number }).score).toBe(85);
  });

  it('should skip blank lines', () => {
    const filePath = path.join(tempDir, 'blank.jsonl');
    fs.writeFileSync(
      filePath,
      [
        JSON.stringify({ event: 'node_open', nodeId: 'n1', timestamp: 1000 }),
        '',
        '',
        JSON.stringify({ event: 'node_complete', nodeId: 'n1', timestamp: 2000 }),
        '',
      ].join('\n'),
      'utf-8',
    );

    const result = readJsonl(filePath);
    expect(result.events).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it('should report line number for invalid JSON', () => {
    const filePath = path.join(tempDir, 'invalid.jsonl');
    fs.writeFileSync(
      filePath,
      [
        JSON.stringify({ event: 'node_open', nodeId: 'n1', timestamp: 1000 }),
        'not-valid-json',
        JSON.stringify({ event: 'node_complete', nodeId: 'n1', timestamp: 2000 }),
      ].join('\n'),
      'utf-8',
    );

    const result = readJsonl(filePath);
    expect(result.events).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.line).toBe(2);
    expect(result.errors[0]!.error).toBe('Invalid JSON');
  });

  it('should report validation errors for invalid event structure', () => {
    const filePath = path.join(tempDir, 'bad-structure.jsonl');
    fs.writeFileSync(
      filePath,
      JSON.stringify({ event: 'unknown_event', nodeId: 'n1', timestamp: 1000 }),
      'utf-8',
    );

    const result = readJsonl(filePath);
    expect(result.events).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.line).toBe(1);
    expect(result.errors[0]!.error).toContain('event');
  });

  it('should handle empty file', () => {
    const filePath = path.join(tempDir, 'empty.jsonl');
    fs.writeFileSync(filePath, '', 'utf-8');

    const result = readJsonl(filePath);
    expect(result.events).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('should handle file with only blank lines', () => {
    const filePath = path.join(tempDir, 'blanks-only.jsonl');
    fs.writeFileSync(filePath, '\n\n\n', 'utf-8');

    const result = readJsonl(filePath);
    expect(result.events).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });
});
