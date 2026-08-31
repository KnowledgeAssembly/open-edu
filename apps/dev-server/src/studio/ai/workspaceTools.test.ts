import { describe, it, expect, vi } from 'vitest';
import { MemoryWorkspace } from '@open-edu/storage';
import {
  createWorkspaceTools,
  type SearchResult,
  type WorkspaceSearchLike,
} from './workspaceTools.js';

const enc = (s: string) => new TextEncoder().encode(s);
const dec = (b: Uint8Array) => new TextDecoder().decode(b);

describe('createWorkspaceTools', () => {
  it('reads and lists through the workspace', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('nodes/lesson.md', '# Lesson');
    await ws.writeText('package.json', '{}');
    const tools = createWorkspaceTools({ workspace: ws });
    const readSpy = vi.spyOn(ws, 'readText');
    expect((await tools.read('nodes/lesson.md')).content).toBe('# Lesson');
    expect((await tools.list('nodes')).map((e) => e.path)).toEqual(['nodes/lesson.md']);
    expect(readSpy).toHaveBeenCalledWith('nodes/lesson.md');
  });

  it('stages writes through the transaction without touching the workspace first', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('keep.md', 'keep');
    const writeSpy = vi.spyOn(ws, 'write');
    const tools = createWorkspaceTools({ workspace: ws });

    await tools.create('new.md', 'hello');
    await tools.update('new.md', 'hello2');
    expect(writeSpy).not.toHaveBeenCalled();

    const preview = await tools.preview();
    expect(preview).not.toBeNull();
    // The second write is analyzed against pre-apply state (file still new).
    expect(preview!.changes.map((c) => c.operation)).toEqual(['create', 'create']);

    const result = await tools.apply();
    expect(result.ok).toBe(true);
    expect(dec((await ws.read('new.md'))!)).toBe('hello2');
    expect(await ws.readText('keep.md')).toBe('keep');
  });

  it('discard leaves the workspace unchanged', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('keep.md', 'keep');
    const tools = createWorkspaceTools({ workspace: ws });
    await tools.create('new.md', 'hello');
    await tools.delete('keep.md');
    await tools.discard();
    expect(await ws.exists('new.md')).toBe(false);
    expect(await ws.readText('keep.md')).toBe('keep');
  });

  it('delete and move are staged as transaction ops', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('a.md', 'a');
    const tools = createWorkspaceTools({ workspace: ws });
    await tools.move('a.md', 'b.md');
    const preview = await tools.preview();
    expect(preview!.changes[0]!.operation).toBe('move');
    expect(await ws.exists('a.md')).toBe(true);
    const result = await tools.apply();
    expect(result.ok).toBe(true);
    expect(await ws.readText('b.md')).toBe('a');
    expect(await ws.exists('a.md')).toBe(false);
  });

  it('delegates search to the injected search service', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('nodes/lesson.md', '# Water');
    const search: WorkspaceSearchLike = {
      search: vi.fn(
        async (q: string): Promise<SearchResult[]> => [
          { path: 'nodes/lesson.md', matchType: 'fulltext', snippet: q },
        ],
      ),
    };
    const tools = createWorkspaceTools({ workspace: ws, search });
    const results = await tools.search('water');
    expect(search.search).toHaveBeenCalledWith('water');
    expect(results[0]!.path).toBe('nodes/lesson.md');
  });

  it('fallback search matches filenames and paths only', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('nodes/lesson.md', '# Water');
    await ws.write('assets/water.png', enc('img'));
    const tools = createWorkspaceTools({ workspace: ws });
    const results = await tools.search('water');
    // The fallback indexes names/paths, not content (full-text is Phase 11).
    expect(results.map((r) => r.path)).toEqual(['assets/water.png']);
  });
});
