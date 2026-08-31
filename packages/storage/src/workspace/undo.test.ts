import { describe, it, expect, beforeEach } from 'vitest';
import { openDatabase, resetDatabase } from '../db.js';
import {
  clearHistory,
  deleteHistoryEntry,
  getHistoryEntry,
  listAllHistory,
  listHistory,
  saveHistoryEntry,
  type HistoryEntry,
} from '../history-store.js';
import { MemoryWorkspace } from './memory-workspace.js';
import { createTransaction } from './transaction.js';
import { undo, redo } from './undo.js';
import { createChangeSet } from './change.js';

const enc = (s: string) => new TextEncoder().encode(s);
const dec = (b: Uint8Array) => new TextDecoder().decode(b);

function makeEntry(id: string, workspaceId: string, timestamp = Date.now()): HistoryEntry {
  return {
    id,
    workspaceId,
    timestamp,
    source: 'ai',
    description: 'test',
    changes: [
      {
        path: 'nodes/lesson.md',
        operation: 'create',
        newContent: enc('# L'),
      },
    ],
  };
}

describe('history-store', () => {
  beforeEach(async () => {
    resetDatabase();
    const db = await openDatabase();
    await db.clear('history');
    db.close();
    resetDatabase();
  });

  it('saves and lists history entries per workspace', async () => {
    await saveHistoryEntry(makeEntry('h1', 'ws-1', 100));
    await saveHistoryEntry({ ...makeEntry('h2', 'ws-1', 300), description: 'later' });
    await saveHistoryEntry(makeEntry('h3', 'ws-2', 200));
    expect((await listHistory('ws-1')).map((e) => e.id)).toEqual(['h2', 'h1']);
    expect(await listAllHistory()).toHaveLength(3);
    const h1 = await getHistoryEntry('h1');
    expect(h1!.changes[0]!.operation).toBe('create');
  });

  it('deletes and clears entries', async () => {
    await saveHistoryEntry(makeEntry('h1', 'ws-1'));
    await deleteHistoryEntry('h1');
    expect(await getHistoryEntry('h1')).toBeUndefined();
    await saveHistoryEntry(makeEntry('h2', 'ws-1'));
    await clearHistory('ws-1');
    expect(await listHistory('ws-1')).toEqual([]);
  });

  it('records a history entry when a transaction commits with a workspaceId', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('a.md', 'original');
    const tx = createTransaction(ws, {
      workspaceId: 'ws-commit',
      source: 'ai',
      description: 'AI edit',
    });
    tx.write('a.md', enc('edited'));
    tx.write('b.md', enc('new'));
    const result = await tx.commit();
    expect(result.success).toBe(true);

    const history = await listHistory('ws-commit');
    expect(history).toHaveLength(1);
    expect(history[0]!.source).toBe('ai');
    expect(history[0]!.description).toBe('AI edit');
    expect(history[0]!.changes.map((c) => c.path).sort()).toEqual(['a.md', 'b.md']);
  });

  it('does not record history when no workspaceId is provided', async () => {
    const ws = new MemoryWorkspace();
    const tx = createTransaction(ws);
    tx.write('a.md', enc('x'));
    await tx.commit();
    expect(await listAllHistory()).toEqual([]);
  });
});

describe('undo/redo', () => {
  beforeEach(async () => {
    resetDatabase();
    const db = await openDatabase();
    await db.clear('history');
    db.close();
    resetDatabase();
  });

  it('undo restores prior content and redo reapplies it', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('a.md', 'original');
    const changeSet = createChangeSet('ai', 'edit a', [
      {
        path: 'a.md',
        operation: 'update',
        previousContent: enc('original'),
        newContent: enc('edited'),
      },
    ]);
    await saveHistoryEntry({
      id: 'h-u',
      workspaceId: 'ws-undo',
      timestamp: changeSet.createdAt,
      source: 'ai',
      description: changeSet.description,
      changes: changeSet.changes,
    });

    const undone = await undo(ws, 'h-u');
    expect(undone.success).toBe(true);
    expect(await ws.readText('a.md')).toBe('original');

    const redone = await redo(ws, 'h-u');
    expect(redone.success).toBe(true);
    expect(await ws.readText('a.md')).toBe('edited');
  });

  it('undoing a create deletes the file and redo recreates it', async () => {
    const ws = new MemoryWorkspace();
    await saveHistoryEntry(makeEntry('h-c', 'ws-x'));
    // Simulate the committed state: file created.
    await ws.writeText('nodes/lesson.md', '# L');
    await undo(ws, 'h-c');
    expect(await ws.exists('nodes/lesson.md')).toBe(false);
    await redo(ws, 'h-c');
    expect(dec(await ws.read('nodes/lesson.md'))).toBe('# L');
  });

  it('returns an error for a missing history entry', async () => {
    const ws = new MemoryWorkspace();
    expect((await undo(ws, 'nope')).success).toBe(false);
    expect((await redo(ws, 'nope')).success).toBe(false);
  });
});
