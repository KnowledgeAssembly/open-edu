import { describe, it, expect } from 'vitest';
import { MemoryWorkspace, createChangeSet } from '@open-edu/storage';
import { diffText, diffChangeSet } from './changeSet.js';
import { applyChangeSet } from './applyChangeSet.js';

const enc = (s: string) => new TextEncoder().encode(s);

describe('diffText', () => {
  it('marks added, removed, and context lines', () => {
    const lines = diffText('a\nb\nc', 'a\nB\nc');
    expect(lines).toContainEqual({ type: 'context', text: 'a' });
    expect(lines).toContainEqual({ type: 'removed', text: 'b' });
    expect(lines).toContainEqual({ type: 'added', text: 'B' });
    expect(lines).toContainEqual({ type: 'context', text: 'c' });
  });
});

describe('diffChangeSet', () => {
  it('produces markers for text updates, new files, deletes, and moves', async () => {
    const ws = new MemoryWorkspace();
    const changeSet = createChangeSet('ai', 'test changes', [
      {
        path: 'nodes/lesson.md',
        operation: 'update',
        previousContent: enc('Old'),
        newContent: enc('New'),
      },
      { path: 'nodes/new.json', operation: 'create', newContent: enc('{}') },
      { path: 'nodes/old.md', operation: 'delete', previousContent: enc('gone') },
      {
        path: 'nodes/x.md',
        operation: 'move',
        from: 'nodes/x.md',
        to: 'nodes/y.md',
        previousContent: enc('x'),
      },
    ]);
    const diffs = await diffChangeSet(changeSet, ws);
    expect(diffs[0]).toMatchObject({ marker: 'modified', header: '~ nodes/lesson.md' });
    expect(diffs[1]).toMatchObject({ marker: 'added', header: '+ nodes/new.json' });
    expect(diffs[2]).toMatchObject({ marker: 'deleted', header: '- nodes/old.md' });
    expect(diffs[3]).toMatchObject({ marker: 'modified', header: '~ nodes/x.md → nodes/y.md' });
    expect(diffs[0]!.lines!.some((l) => l.type === 'removed' && l.text === 'Old')).toBe(true);
    expect(diffs[0]!.lines!.some((l) => l.type === 'added' && l.text === 'New')).toBe(true);
  });

  it('marks binary file changes without a line diff', async () => {
    const ws = new MemoryWorkspace();
    const changeSet = createChangeSet('ai', 'binary', [
      {
        path: 'assets/pic.png',
        operation: 'update',
        previousContent: new Uint8Array([137, 80, 78, 71]),
        newContent: new Uint8Array([1, 2, 3]),
      },
    ]);
    const diffs = await diffChangeSet(changeSet, ws);
    expect(diffs[0]!.binary).toBe(true);
    expect(diffs[0]!.header).toContain('Binary file changed');
    expect(diffs[0]!.lines).toBeUndefined();
  });
});

describe('applyChangeSet', () => {
  it('commits a multi-file ChangeSet atomically', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('keep.md', 'keep');
    const changeSet = createChangeSet('ai', 'add lesson', [
      { path: 'nodes/lesson.md', operation: 'create', newContent: enc('# New Lesson') },
      {
        path: 'package.json',
        operation: 'update',
        previousContent: enc('{}'),
        newContent: enc('{"title":"x"}'),
      },
    ]);
    const result = await applyChangeSet(changeSet, ws);
    expect(result.success).toBe(true);
    expect(await ws.readText('nodes/lesson.md')).toBe('# New Lesson');
    expect(await ws.readText('package.json')).toBe('{"title":"x"}');
    expect(await ws.readText('keep.md')).toBe('keep');
  });

  it('fails atomically leaving no partial canonical state on bad input', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('keep.md', 'keep');
    const changeSet = createChangeSet('ai', 'broken', [
      { path: 'nodes/a.md', operation: 'create', newContent: enc('a') },
      { path: 'nodes/missing.md', operation: 'delete' },
    ]);
    // Deleting a missing file fails before the apply phase: no partial state.
    const result = await applyChangeSet(changeSet, ws);
    expect(result.success).toBe(false);
    expect(await ws.exists('nodes/a.md')).toBe(false);
    expect(await ws.readText('keep.md')).toBe('keep');
  });

  it('units: decodes binary content written through the transaction', async () => {
    const ws = new MemoryWorkspace();
    const changeSet = createChangeSet('ai', 'binary', [
      { path: 'assets/blob.bin', operation: 'create', newContent: new Uint8Array([0, 255, 128]) },
    ]);
    const result = await applyChangeSet(changeSet, ws);
    expect(result.success).toBe(true);
    expect(await ws.read('assets/blob.bin')).toEqual(new Uint8Array([0, 255, 128]));
  });
});
