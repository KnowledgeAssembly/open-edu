import { describe, it, expect } from 'vitest';
import { WorkspaceError, WorkspaceNotFoundError, WorkspacePathError } from './errors.js';
import type { CourseWorkspace } from './types.js';

export interface WorkspaceTestContext {
  workspace: CourseWorkspace;
}

export type WorkspaceFactory = () => Promise<CourseWorkspace> | CourseWorkspace;

/**
 * Shared behavioral contract for every `CourseWorkspace` backend. All
 * assertions go through the interface so MemoryWorkspace, OPFSWorkspace, and
 * future backends (CloudWorkspace, GitWorkspace) are guaranteed equivalent.
 */
export function runWorkspaceContractTests(name: string, makeWorkspace: WorkspaceFactory): void {
  describe(`CourseWorkspace contract: ${name}`, () => {
    let ws: CourseWorkspace;

    beforeEach(async () => {
      ws = await makeWorkspace();
    });

    it('creates and reads a file', async () => {
      await ws.writeText('notes.md', '# Hello');
      expect(await ws.readText('notes.md')).toBe('# Hello');
    });

    it('overwrites a file with the latest content', async () => {
      await ws.writeText('notes.md', 'one');
      await ws.writeText('notes.md', 'two');
      expect(await ws.readText('notes.md')).toBe('two');
    });

    it('deletes a file and removes it from listings', async () => {
      await ws.writeText('nodes/lesson.md', '# L');
      await ws.writeText('nodes/quiz.json', '{}');
      await ws.delete('nodes/lesson.md');
      expect(await ws.exists('nodes/lesson.md')).toBe(false);
      const listing = await ws.list('nodes');
      expect(listing.map((e) => e.name)).toEqual(['quiz.json']);
    });

    it('lists directory contents', async () => {
      await ws.writeText('package.json', '{}');
      await ws.writeText('nodes/lesson.md', '# L');
      const root = await ws.list('');
      expect(root.map((e) => e.path).sort()).toEqual(['nodes', 'package.json']);
    });

    it('nests directories and lists only direct children', async () => {
      await ws.writeText('nodes/01/lesson.md', '# L');
      await ws.writeText('nodes/02/lesson.md', '# L2');
      const nodes = await ws.list('nodes');
      expect(nodes.map((e) => e.name).sort()).toEqual(['01', '02']);
      expect(nodes.every((e) => e.kind === 'directory')).toBe(true);
    });

    it('moves a file', async () => {
      await ws.writeText('a.md', '# A');
      await ws.move('a.md', 'b.md');
      expect(await ws.exists('a.md')).toBe(false);
      expect(await ws.readText('b.md')).toBe('# A');
    });

    it('copies a file leaving the source intact', async () => {
      await ws.writeText('a.md', '# A');
      await ws.copy('a.md', 'b.md');
      expect(await ws.readText('a.md')).toBe('# A');
      expect(await ws.readText('b.md')).toBe('# A');
    });

    it('stats a file', async () => {
      await ws.writeText('notes.md', 'hello');
      const stat = await ws.stat('notes.md');
      expect(stat.path).toBe('notes.md');
      expect(stat.kind).toBe('file');
      expect(stat.size).toBe(5);
    });

    it('round-trips binary content', async () => {
      const bytes = new Uint8Array([0, 137, 80, 255, 1, 2]);
      await ws.write('assets/pic.png', bytes);
      const out = await ws.read('assets/pic.png');
      expect(out).toEqual(bytes);
    });

    it('reads UTF-8 text and rejects binary as text', async () => {
      await ws.writeText('hello.txt', 'héllo ☃');
      expect(await ws.readText('hello.txt')).toBe('héllo ☃');
      await ws.write('pic.png', new Uint8Array([137, 80, 78, 71, 0, 1, 2]));
      await expect(ws.readText('pic.png')).rejects.toBeInstanceOf(WorkspaceError);
    });

    it('throws WorkspaceNotFoundError for missing files', async () => {
      await expect(ws.read('missing.md')).rejects.toBeInstanceOf(WorkspaceNotFoundError);
      await expect(ws.readText('missing.md')).rejects.toBeInstanceOf(WorkspaceNotFoundError);
      await expect(ws.stat('missing.md')).rejects.toBeInstanceOf(WorkspaceNotFoundError);
      await expect(ws.delete('missing.md')).rejects.toBeInstanceOf(WorkspaceNotFoundError);
      await expect(ws.list('missing')).rejects.toBeInstanceOf(WorkspaceNotFoundError);
    });

    it('rejects invalid paths', async () => {
      const unsafe = ['/etc/passwd', 'C:/windows', '../x.md', 'nodes/../x.md', 'a\0bad'];
      for (const p of unsafe) {
        await expect(ws.write(p, new Uint8Array()), p).rejects.toBeInstanceOf(WorkspacePathError);
        await expect(ws.read(p), p).rejects.toBeInstanceOf(WorkspacePathError);
        await expect(ws.writeText(p, 'x'), p).rejects.toBeInstanceOf(WorkspacePathError);
      }
    });

    it('reports exists without throwing', async () => {
      expect(await ws.exists('nodes/lesson.md')).toBe(false);
      await ws.writeText('nodes/lesson.md', '# L');
      expect(await ws.exists('nodes/lesson.md')).toBe(true);
    });
  });
}
