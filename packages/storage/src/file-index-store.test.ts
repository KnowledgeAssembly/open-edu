import { describe, it, expect, beforeEach } from 'vitest';
import { openDatabase, resetDatabase, type IndexedFile } from './db.js';
import {
  clearFileIndex,
  deleteFileIndexRecord,
  getFileIndexRecord,
  listAllFileIndexRecords,
  listFileIndexRecords,
  putFileIndexRecord,
} from './file-index-store.js';

function makeRecord(workspaceId: string, path: string): IndexedFile {
  return {
    id: `${workspaceId}:${path}`,
    workspaceId,
    path,
    size: 123,
    modifiedAt: 1,
  };
}

describe('file-index-store', () => {
  beforeEach(async () => {
    resetDatabase();
    const db = await openDatabase();
    await db.clear('files');
    db.close();
    resetDatabase();
  });

  it('stores metadata records with no content field', async () => {
    const record = makeRecord('ws-1', 'nodes/lesson.md');
    await putFileIndexRecord(record);
    const loaded = await getFileIndexRecord(record.id);
    expect(loaded).toMatchObject({
      workspaceId: 'ws-1',
      path: 'nodes/lesson.md',
      size: 123,
      modifiedAt: 1,
    });
    expect('data' in (loaded as Record<string, unknown> & IndexedFile)).toBe(false);
    expect('content' in (loaded as Record<string, unknown> & IndexedFile)).toBe(false);
  });

  it('lists records by workspace', async () => {
    await putFileIndexRecord(makeRecord('ws-a', 'a.md'));
    await putFileIndexRecord(makeRecord('ws-a', 'b.md'));
    await putFileIndexRecord(makeRecord('ws-b', 'c.md'));
    expect((await listFileIndexRecords('ws-a')).map((r) => r.path).sort()).toEqual([
      'a.md',
      'b.md',
    ]);
    expect((await listFileIndexRecords('ws-b')).map((r) => r.path)).toEqual(['c.md']);
  });

  it('deletes a single record and clears a workspace', async () => {
    await putFileIndexRecord(makeRecord('ws-a', 'a.md'));
    await putFileIndexRecord(makeRecord('ws-a', 'b.md'));
    await deleteFileIndexRecord('ws-a:a.md');
    expect((await listFileIndexRecords('ws-a')).map((r) => r.path)).toEqual(['b.md']);

    await putFileIndexRecord(makeRecord('ws-b', 'c.md'));
    await clearFileIndex('ws-a');
    expect(await listFileIndexRecords('ws-a')).toEqual([]);
    expect(await listAllFileIndexRecords()).toHaveLength(1);
  });
});
