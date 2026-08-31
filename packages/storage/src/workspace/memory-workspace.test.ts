import { describe, it, expect } from 'vitest';
import {
  WorkspaceConflictError,
  WorkspaceError,
  WorkspaceNotFoundError,
  WorkspacePathError,
} from './errors.js';
import { MemoryWorkspace } from './memory-workspace.js';

const enc = (s: string) => new TextEncoder().encode(s);

describe('MemoryWorkspace', () => {
  it('writes, reads, overwrites and reads the latest content', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('notes.txt', 'first');
    await expect(ws.readText('notes.txt')).resolves.toBe('first');
    await ws.writeText('notes.txt', 'second');
    await expect(ws.readText('notes.txt')).resolves.toBe('second');
  });

  it('round-trips binary content', async () => {
    const ws = new MemoryWorkspace();
    const bytes = new Uint8Array([0, 137, 80, 255, 1, 2, 3]);
    await ws.write('assets/pic.png', bytes);
    const out = await ws.read('assets/pic.png');
    expect(out).toEqual(bytes);
    expect(out).not.toBe(bytes);
  });

  it('lists only direct children of a nested directory', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('nodes/01/lesson.md', '# L');
    await ws.writeText('nodes/01/quiz.json', '{}');
    await ws.writeText('nodes/02/lesson.md', '# L2');
    await ws.writeText('package.json', '{}');

    const root = await ws.list('');
    expect(root.map((e) => e.path)).toEqual(['nodes', 'package.json']);
    const nodes = await ws.list('nodes');
    expect(nodes.map((e) => e.path)).toEqual(['nodes/01', 'nodes/02']);
    expect(nodes.every((e) => e.kind === 'directory')).toBe(true);
    const one = await ws.list('nodes/01');
    expect(one.map((e) => e.path).sort()).toEqual(['nodes/01/lesson.md', 'nodes/01/quiz.json']);
    expect(one.every((e) => e.kind === 'file')).toBe(true);
  });

  it('deleting a file removes it from its parent listing', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('nodes/lesson.md', '# L');
    await ws.writeText('nodes/quiz.json', '{}');
    await ws.delete('nodes/lesson.md');
    const listing = await ws.list('nodes');
    expect(listing.map((e) => e.path)).toEqual(['nodes/quiz.json']);
    await expect(ws.read('nodes/lesson.md')).rejects.toBeInstanceOf(WorkspaceNotFoundError);
  });

  it('deleting a directory removes all descendant files', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('nodes/a.md', 'a');
    await ws.writeText('nodes/sub/b.md', 'b');
    await ws.delete('nodes');
    expect(await ws.exists('nodes')).toBe(false);
    await expect(ws.list('nodes')).rejects.toBeInstanceOf(WorkspaceNotFoundError);
  });

  it('moves files and directories (SPEC §15.1 semantics)', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('src/a.md', 'a');
    await ws.writeText('src/sub/b.md', 'b');
    await ws.move('src/a.md', 'dst/a.md');
    expect(await ws.readText('dst/a.md')).toBe('a');
    expect(await ws.exists('src/a.md')).toBe(false);
    expect((await ws.list('src')).map((e) => e.name)).toEqual(['sub']);

    await ws.move('src/sub', 'dst/copy');
    expect(await ws.readText('dst/copy/b.md')).toBe('b');
    expect(await ws.list('src')).toEqual([]);

    await expect(ws.move('dst/a.md', 'dst/a.md')).resolves.toBeUndefined();
    await expect(ws.move('missing.md', 'x.md')).rejects.toBeInstanceOf(WorkspaceNotFoundError);
    await expect(ws.move('dst/a.md', 'dst/copy/b.md')).rejects.toBeInstanceOf(
      WorkspaceConflictError,
    );
    await expect(ws.move('dst/a.md', 'dst/a.md/nested')).rejects.toBeInstanceOf(WorkspacePathError);
  });

  it('copies files and directories deeply', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('src/a.md', 'a');
    await ws.writeText('src/sub/b.md', 'b');
    await ws.copy('src', 'dst');
    expect(await ws.readText('dst/a.md')).toBe('a');
    expect(await ws.readText('dst/sub/b.md')).toBe('b');
    expect(await ws.exists('src/a.md')).toBe(true);
    await expect(ws.copy('src', 'dst')).rejects.toBeInstanceOf(WorkspaceConflictError);
    await expect(ws.copy('missing', 'x')).rejects.toBeInstanceOf(WorkspaceNotFoundError);
  });

  it('reports file stats', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('notes.txt', 'hello');
    const stat = await ws.stat('notes.txt');
    expect(stat.path).toBe('notes.txt');
    expect(stat.kind).toBe('file');
    expect(stat.size).toBe(5);
    expect(typeof stat.modifiedAt).toBe('number');
    await ws.writeText('nodes/lesson.md', '# L');
    const dir = await ws.stat('nodes');
    expect(dir.kind).toBe('directory');
    await expect(ws.stat('nope.txt')).rejects.toBeInstanceOf(WorkspaceNotFoundError);
  });

  it('exists never throws', async () => {
    const ws = new MemoryWorkspace();
    expect(await ws.exists('nodes/lesson.md')).toBe(false);
    await ws.writeText('nodes/lesson.md', '# L');
    expect(await ws.exists('nodes/lesson.md')).toBe(true);
    expect(await ws.exists('nodes')).toBe(true);
    expect(await ws.exists('')).toBe(true);
  });

  it('throws on missing reads, deletes, and lists', async () => {
    const ws = new MemoryWorkspace();
    await expect(ws.read('nope.txt')).rejects.toBeInstanceOf(WorkspaceNotFoundError);
    await expect(ws.readText('nope.txt')).rejects.toBeInstanceOf(WorkspaceNotFoundError);
    await expect(ws.stat('nope.txt')).rejects.toBeInstanceOf(WorkspaceNotFoundError);
    await expect(ws.delete('nope.txt')).rejects.toBeInstanceOf(WorkspaceNotFoundError);
    await expect(ws.list('nope')).rejects.toBeInstanceOf(WorkspaceNotFoundError);
  });

  it('throws on reading binary files as text', async () => {
    const ws = new MemoryWorkspace();
    await ws.write('pic.png', new Uint8Array([137, 80, 78, 71, 0, 1, 2]));
    await expect(ws.readText('pic.png')).rejects.toBeInstanceOf(WorkspaceError);
  });

  it('rejects unsafe and colliding paths', async () => {
    const ws = new MemoryWorkspace();
    const unsafe = [
      '/etc/passwd',
      'C:/windows/system32',
      '../escape.png',
      'nodes/../escape.md',
      'a/./b.md',
      'nodes/a\0bad.md',
      'nodes/./a.md',
    ];
    for (const p of unsafe) {
      await expect(ws.write(p, enc('x')), p).rejects.toBeInstanceOf(WorkspacePathError);
    }
    await expect(ws.writeText('', 'x')).rejects.toBeInstanceOf(WorkspacePathError);
  });

  it('rejects writing over a directory or beneath a file', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('nodes/lesson.md', '# L');
    await expect(ws.writeText('nodes', 'x')).rejects.toBeInstanceOf(WorkspaceConflictError);
    await expect(ws.writeText('nodes/lesson.md/sub.md', 'x')).rejects.toBeInstanceOf(
      WorkspaceConflictError,
    );
  });

  it('normalizes backslashes and duplicate normalized-path collisions on write', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('nodes\\lesson.md', '# L');
    expect(await ws.exists('nodes/lesson.md')).toBe(true);
    // Writing the same normalized path is an overwrite, not a collision:
    await ws.writeText('nodes/lesson.md', '# L2');
    expect(await ws.readText('nodes/lesson.md')).toBe('# L2');
  });
});
