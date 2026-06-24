import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { reportTelemetry } from './report';

describe('reportTelemetry', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'report-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should return valid text report for a telemetry file', () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    const filePath = path.join(tempDir, 'events.jsonl');
    fs.writeFileSync(
      filePath,
      [
        JSON.stringify({ event: 'node_open', nodeId: 'n1', timestamp: 1000, sessionId: 's1' }),
        JSON.stringify({
          event: 'node_complete',
          nodeId: 'n1',
          score: 85,
          timestamp: 2000,
          sessionId: 's1',
        }),
        JSON.stringify({ event: 'node_open', nodeId: 'n2', timestamp: 3000, sessionId: 's2' }),
      ].join('\n'),
      'utf-8',
    );

    const result = reportTelemetry(filePath);
    expect(result.success).toBe(true);
    expect(consoleLog).toHaveBeenCalled();
    consoleLog.mockRestore();
  });

  it('should return JSON report with stable keys', () => {
    const filePath = path.join(tempDir, 'events.jsonl');
    fs.writeFileSync(
      filePath,
      [
        JSON.stringify({ event: 'node_open', nodeId: 'n1', timestamp: 1000, sessionId: 's1' }),
        JSON.stringify({ event: 'node_complete', nodeId: 'n1', score: 85, timestamp: 2000 }),
      ].join('\n'),
      'utf-8',
    );

    const result = reportTelemetry(filePath, { json: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveProperty('totalEvents', 2);
      expect(result.data).toHaveProperty('byType');
      expect(result.data).toHaveProperty('nodeOpens', 1);
      expect(result.data).toHaveProperty('nodeCompletions', 1);
      expect(result.data).toHaveProperty('averageQuizScore', 85);
      expect(result.data).toHaveProperty('sessionCount', 1);
      expect(result.data).toHaveProperty('sessionIds');
      expect(result.data).toHaveProperty('file');
    }
  });

  it('should return exit code 1 for invalid telemetry file', () => {
    const filePath = path.join(tempDir, 'invalid.jsonl');
    fs.writeFileSync(filePath, 'not-valid-json\n', 'utf-8');

    const result = reportTelemetry(filePath);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe(1);
    }
  });

  it('should return error for missing file', () => {
    const filePath = path.join(tempDir, 'nonexistent.jsonl');
    const result = reportTelemetry(filePath);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('File not found');
      expect(result.code).toBe(1);
    }
  });

  it('should return JSON error for invalid file in json mode', () => {
    const filePath = path.join(tempDir, 'invalid.jsonl');
    fs.writeFileSync(filePath, 'bad json\n', 'utf-8');

    const result = reportTelemetry(filePath, { json: true });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe(1);
    }
  });

  it('should report line diagnostics for parse errors', () => {
    const filePath = path.join(tempDir, 'partial.jsonl');
    fs.writeFileSync(
      filePath,
      [
        JSON.stringify({ event: 'node_open', nodeId: 'n1', timestamp: 1000 }),
        'bad json',
        JSON.stringify({ event: 'node_complete', nodeId: 'n1', timestamp: 2000 }),
      ].join('\n'),
      'utf-8',
    );

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = reportTelemetry(filePath);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe(1);
    }
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('Line 2'),
    );
    consoleError.mockRestore();
  });
});
