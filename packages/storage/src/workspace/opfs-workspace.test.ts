import { describe, it, expect } from 'vitest';
import { WorkspaceConflictError, WorkspaceNotFoundError } from './errors.js';
import { OPFSWorkspace } from './opfs-workspace.js';
import { createFakeOpfsRoot, FakeDirHandle } from '../__tests__/fake-opfs.js';
import { runWorkspaceContractTests } from './contract.js';

function makeOpfsWorkspace(): OPFSWorkspace {
  return new OPFSWorkspace(createFakeOpfsRoot() as unknown as FileSystemDirectoryHandle);
}

runWorkspaceContractTests('OPFSWorkspace (fake root)', makeOpfsWorkspace);

describe('OPFSWorkspace', () => {
  it('moves directories across parents via copy + delete', async () => {
    const ws = makeOpfsWorkspace();
    await ws.writeText('src/a.md', 'a');
    await ws.writeText('src/sub/b.md', 'b');
    await ws.move('src', 'dst');
    expect(await ws.readText('dst/a.md')).toBe('a');
    expect(await ws.readText('dst/sub/b.md')).toBe('b');
    expect(await ws.exists('src')).toBe(false);
  });

  it('copies directories recursively', async () => {
    const ws = makeOpfsWorkspace();
    await ws.writeText('src/a.md', 'a');
    await ws.writeText('src/sub/b.md', 'b');
    await ws.copy('src', 'dst');
    expect(await ws.readText('dst/sub/b.md')).toBe('b');
    expect(await ws.exists('src/a.md')).toBe(true);
    await expect(ws.copy('src', 'dst')).rejects.toBeInstanceOf(WorkspaceConflictError);
  });

  it('renames in place using handle.move when the parent is unchanged', async () => {
    const ws = makeOpfsWorkspace();
    await ws.writeText('nodes/lesson.md', '# L');
    await ws.move('nodes/lesson.md', 'nodes/renamed.md');
    expect(await ws.readText('nodes/renamed.md')).toBe('# L');
    expect(await ws.exists('nodes/lesson.md')).toBe(false);
  });

  it('throws conflict when a move destination exists', async () => {
    const ws = makeOpfsWorkspace();
    await ws.writeText('a.md', 'a');
    await ws.writeText('b.md', 'b');
    await expect(ws.move('a.md', 'b.md')).rejects.toBeInstanceOf(WorkspaceConflictError);
  });

  it('rejects missing sources and missing parents', async () => {
    const ws = makeOpfsWorkspace();
    await expect(ws.move('missing.md', 'b.md')).rejects.toBeInstanceOf(WorkspaceNotFoundError);
    await expect(ws.read('no/dir/file.md')).rejects.toBeInstanceOf(WorkspaceNotFoundError);
    await expect(ws.list('no/dir')).rejects.toBeInstanceOf(WorkspaceNotFoundError);
  });

  it('writes create empty parent directories that list as directories', async () => {
    const ws = makeOpfsWorkspace();
    await ws.writeText('a/deep/path.txt', 'x');
    const a = await ws.list('a');
    expect(a.map((e) => e.name)).toEqual(['deep']);
    expect((await ws.list('a/deep')).map((e) => e.name)).toEqual(['path.txt']);
  });

  it('rejects paths that traverse outside the workspace root', async () => {
    const ws = makeOpfsWorkspace();
    await expect(ws.read('../escape.md')).rejects.toBeInstanceOf(Error);
    await expect(ws.write('/abs.md', new Uint8Array())).rejects.toBeInstanceOf(Error);
    await expect(ws.writeText('nodes/../../escape.md', 'x')).rejects.toBeInstanceOf(Error);
  });
});

describe('OPFSWorkspace.open', () => {
  it('creates the course root via the availability probe', async () => {
    const root = createFakeOpfsRoot();
    vi.stubGlobal('navigator', {
      storage: { getDirectory: async () => root as unknown as FileSystemDirectoryHandle },
    });
    try {
      const ws = await OPFSWorkspace.open('course-1');
      await ws.writeText('package.json', '{}');
      expect(await ws.readText('package.json')).toBe('{}');
      const courses = (await root.getDirectoryHandle('openedu')).getDirectoryHandle('courses');
      const course = await courses;
      expect(course).toBeInstanceOf(FakeDirHandle);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
