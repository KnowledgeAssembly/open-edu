import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { openDatabase, resetDatabase, type StoredStudioDraft } from '../db.js';
import {
  saveStudioDraft,
  getStudioDraft,
  listStudioDrafts,
  listStudioDraftsByCourse,
  deleteStudioDraft,
} from '../studio-draft-store.js';

function makeDraft(id: string, courseId = 'course-a'): StoredStudioDraft {
  return {
    id,
    courseId,
    version: '1.0.0',
    title: `Draft ${id}`,
    files: [
      { path: 'package.json', data: new TextEncoder().encode('{}').buffer },
      { path: 'nodes/lesson.md', data: new TextEncoder().encode('# Lesson').buffer },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('studio-draft-store', () => {
  beforeEach(async () => {
    resetDatabase();
    const db = await openDatabase();
    await db.clear('studio-drafts');
    db.close();
    resetDatabase();
  });

  it('saves and reads a draft', async () => {
    await saveStudioDraft(makeDraft('d1'));
    const loaded = await getStudioDraft('d1');
    expect(loaded).toBeDefined();
    expect(loaded!.title).toBe('Draft d1');
  });

  it('lists all drafts', async () => {
    await saveStudioDraft(makeDraft('d1', 'course-a'));
    await saveStudioDraft(makeDraft('d2', 'course-b'));
    expect((await listStudioDrafts()).map((d) => d.id).sort()).toEqual(['d1', 'd2']);
  });

  it('lists drafts filtered by course', async () => {
    await saveStudioDraft(makeDraft('d1', 'course-a'));
    await saveStudioDraft(makeDraft('d2', 'course-a'));
    await saveStudioDraft(makeDraft('d3', 'course-b'));
    const courseDrafts = await listStudioDraftsByCourse('course-a');
    expect(courseDrafts.map((d) => d.id).sort()).toEqual(['d1', 'd2']);
  });

  it('persists binary draft file bytes as ArrayBuffer', async () => {
    const draft = makeDraft('d-bin');
    draft.files.push({ path: 'assets/pic.png', data: new Uint8Array([1, 2, 3]).buffer });
    await saveStudioDraft(draft);
    const loaded = await getStudioDraft('d-bin');
    const buf = loaded!.files.find((f) => f.path === 'assets/pic.png')!.data;
    expect(new Uint8Array(buf)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('deletes a draft', async () => {
    await saveStudioDraft(makeDraft('d-del'));
    await deleteStudioDraft('d-del');
    expect(await getStudioDraft('d-del')).toBeUndefined();
  });
});
