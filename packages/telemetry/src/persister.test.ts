import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Subject } from 'rxjs';
import { JsonlPersister } from './persister';
import type { TelemetryEvent } from '@open-edu/schemas';

describe('JsonlPersister', () => {
  let tempDir: string;
  let filePath: string;
  let subject: Subject<TelemetryEvent>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telemetry-test-'));
    filePath = path.join(tempDir, 'events.jsonl');
    subject = new Subject<TelemetryEvent>();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should write events to a JSONL file', async () => {
    const persister = new JsonlPersister(subject.asObservable(), filePath);
    const event1: TelemetryEvent = { event: 'node_open', nodeId: 'n1', timestamp: 1000 };
    const event2: TelemetryEvent = { event: 'node_complete', nodeId: 'n1', score: 85, timestamp: 2000 };
    subject.next(event1);
    subject.next(event2);
    subject.complete();
    await persister.flush();
    await persister.close();

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!)).toEqual(event1);
    expect(JSON.parse(lines[1]!)).toEqual(event2);
  });

  it('should append to an existing file', async () => {
    fs.writeFileSync(filePath, '{"existing":true}\n', 'utf-8');
    const persister = new JsonlPersister(subject.asObservable(), filePath);
    const event: TelemetryEvent = { event: 'node_open', nodeId: 'n1', timestamp: 1000 };
    subject.next(event);
    subject.complete();
    await persister.flush();
    await persister.close();

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(2);
  });

  it('should handle empty event stream', async () => {
    const persister = new JsonlPersister(subject.asObservable(), filePath);
    subject.complete();
    await persister.flush();
    await persister.close();

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toBe('');
  });
});
