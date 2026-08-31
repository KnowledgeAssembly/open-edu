import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { MemoryWorkspace } from '@open-edu/storage';
import { openDatabase, resetDatabase } from '@open-edu/storage';
import { createWorkspaceSearch } from './workspaceSearch.js';
import {
  clearWorkspaceSearchIndexes,
  getWorkspaceSearchIndex,
  listWorkspaceSearchIndexes,
  saveWorkspaceSearchIndex,
} from '@open-edu/storage';

const png = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);

describe('workspace search', () => {
  it('matches filenames, paths, headings, and full text', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('nodes/lesson.md', '# The Water Cycle\n\nWater moves between states.');
    await ws.writeText('nodes/quiz.json', '{"question":"What freezes water?"}');
    await ws.write('assets/water.png', png);
    await ws.writeText('package.json', '{"title":"Water Course"}');
    await ws.writeText('.openu/manifest.json', '{"workspaceId":"w"}');
    const search = createWorkspaceSearch(ws);

    const query = await search.search('water');
    expect(query.map((r) => r.matchType)).toContain('heading');
    expect(query.map((r) => r.matchType)).toContain('fulltext');
    expect(query.map((r) => r.matchType)).toContain('filename');
    expect(query.some((r) => r.path === 'assets/water.png' && r.matchType === 'filename')).toBe(
      true,
    );
    // Binary assets are matched by name/path only, never loaded as text.
    const pngMatches = query.filter((r) => r.path === 'assets/water.png');
    expect(pngMatches.every((r) => r.matchType !== 'fulltext')).toBe(true);
    // Derived .openu data is never indexed.
    expect(query.some((r) => r.path.startsWith('.openu'))).toBe(false);
  });

  it('matches by path for asset names and returns an empty result for a miss', async () => {
    const ws = new MemoryWorkspace();
    await ws.write('assets/diagram.png', png);
    const search = createWorkspaceSearch(ws);
    expect((await search.search('diagram')).map((r) => r.path)).toEqual(['assets/diagram.png']);
    expect(await search.search('nonexistentzzz')).toEqual([]);
    expect(await search.search('   ')).toEqual([]);
  });
});

describe('persisted search index', () => {
  beforeEach(async () => {
    resetDatabase();
    const db = await openDatabase();
    await db.clear('searchIndex');
    db.close();
    resetDatabase();
  });

  it('is derived data: saving never touches the course and deleting it is safe', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('nodes/lesson.md', '# Water');
    const search = createWorkspaceSearch(ws);

    await saveWorkspaceSearchIndex({
      id: 'idx-1',
      workspaceId: 'ws-s',
      updatedAt: Date.now(),
      data: { n: 1 },
    });
    await saveWorkspaceSearchIndex({ id: 'idx-2', workspaceId: 'ws-s', updatedAt: Date.now() });
    expect((await listWorkspaceSearchIndexes('ws-s')).map((r) => r.id).sort()).toEqual([
      'idx-1',
      'idx-2',
    ]);
    expect((await getWorkspaceSearchIndex('idx-1'))?.data?.n).toBe(1);

    await clearWorkspaceSearchIndexes('ws-s');
    expect(await listWorkspaceSearchIndexes('ws-s')).toEqual([]);

    // The course itself is unaffected by index lifecycle.
    expect((await search.search('water'))[0]!.path).toBe('nodes/lesson.md');
    expect(await ws.readText('nodes/lesson.md')).toBe('# Water');
  });
});
