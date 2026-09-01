import { describe, it, expect, beforeEach } from 'vitest';
import { openDatabase, resetDatabase } from '../db.js';
import { listFileIndexRecords, listAllFileIndexRecords } from '../file-index-store.js';
import { MemoryWorkspace } from './memory-workspace.js';
import { buildFileIndexFromWorkspace, rebuildFileIndex } from './index-builder.js';

describe('file index builder', () => {
  beforeEach(async () => {
    resetDatabase();
    const db = await openDatabase();
    await db.clear('files');
    db.close();
    resetDatabase();
  });

  it('builds metadata records from a workspace without storing content', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('package.json', '{"id":"x"}');
    await ws.writeText('nodes/lesson.md', '# Lesson');
    await ws.write('assets/pic.png', new Uint8Array([137, 80, 78, 71]));

    const records = await buildFileIndexFromWorkspace(ws, 'ws-1');
    expect(records.map((r) => r.path).sort()).toEqual([
      'assets/pic.png',
      'nodes/lesson.md',
      'package.json',
    ]);
    expect(records.every((r) => r.size > 0 || r.path === 'assets/pic.png')).toBe(true);
    for (const record of records) {
      expect('data' in record).toBe(false);
      expect(record.hash).toHaveLength(64);
    }
  });

  it('excludes derived .openu data from the index', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('package.json', '{}');
    await ws.writeText('.openu/manifest.json', '{"workspaceId":"w"}');
    const records = await buildFileIndexFromWorkspace(ws, 'ws-1');
    expect(records.map((r) => r.path)).toEqual(['package.json']);
  });

  it('rebuilding clears and rewrites the persisted index without touching the course', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('package.json', '{}');
    await ws.writeText('nodes/lesson.md', '# L');
    await rebuildFileIndex(ws, 'ws-r');
    expect((await listFileIndexRecords('ws-r')).map((r) => r.path).sort()).toEqual([
      'nodes/lesson.md',
      'package.json',
    ]);

    await ws.writeText('nodes/quiz.json', '{}');
    const rebuilt = await rebuildFileIndex(ws, 'ws-r');
    expect(rebuilt.map((r) => r.path).sort()).toEqual([
      'nodes/lesson.md',
      'nodes/quiz.json',
      'package.json',
    ]);
    expect(await listFileIndexRecords('ws-r')).toHaveLength(3);

    // The course workspace itself is unaffected by index operations.
    expect(await ws.readText('nodes/lesson.md')).toBe('# L');
    expect(await ws.readText('package.json')).toBe('{}');
    expect(await listAllFileIndexRecords()).toHaveLength(3);
  });
});
