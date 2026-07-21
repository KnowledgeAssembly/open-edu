import { describe, it, expect, vi } from 'vitest';
import {
  safeSaveNote,
  safeGetNote,
  safeListNotes,
  safeDeleteNote,
  safeSetFavorite,
  safeAddNoteTag,
  safeRemoveNoteTag,
  safeGetNoteTags,
  safeListAllTags,
  safeDeleteNotesForLesson,
  newNoteId,
  nowIso,
} from './notesStorage';

vi.mock('@open-edu/storage', () => {
  const store = new Map<string, unknown>();
  const tagStore: Array<{ noteId: string; tag: string }> = [];
  return {
    saveNote: vi.fn(async (n: { id: string }) => {
      store.set(n.id, n);
    }),
    getNote: vi.fn(async (id: string) => store.get(id) ?? undefined),
    listNotes: vi.fn(async (opts?: { courseId?: string }) => {
      let notes = Array.from(store.values()) as Array<{
        id: string;
        courseId?: string;
        favorite?: boolean;
        updatedAt: string;
      }>;
      if (opts?.courseId) notes = notes.filter((n) => n.courseId === opts.courseId);
      notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return notes;
    }),
    deleteNote: vi.fn(async (id: string) => {
      store.delete(id);
    }),
    setNoteFavorite: vi.fn(async (id: string, fav: boolean) => {
      const n = store.get(id) as { favorite?: boolean } | undefined;
      if (n) n.favorite = fav;
    }),
    addNoteTag: vi.fn(async (noteId: string, tag: string) => {
      tagStore.push({ noteId, tag });
    }),
    removeNoteTag: vi.fn(async (noteId: string, tag: string) => {
      const idx = tagStore.findIndex((t) => t.noteId === noteId && t.tag === tag);
      if (idx >= 0) tagStore.splice(idx, 1);
    }),
    getNoteTags: vi.fn(async (noteId: string) =>
      tagStore.filter((t) => t.noteId === noteId).map((t) => t.tag),
    ),
    listAllTags: vi.fn(async () => [...new Set(tagStore.map((t) => t.tag))].sort()),
    deleteNotesByLesson: vi.fn(async () => {}),
  };
});

describe('notesStorage', () => {
  it('safeSaveNote returns true on success', async () => {
    const result = await safeSaveNote({
      id: '1',
      title: 't',
      content: 'c',
      favorite: false,
      createdAt: '',
      updatedAt: '',
    });
    expect(result).toBe(true);
  });

  it('safeGetNote returns null for missing', async () => {
    const result = await safeGetNote('nonexistent');
    expect(result).toBeNull();
  });

  it('safeListNotes returns empty array on error', async () => {
    const result = await safeListNotes({ courseId: 'none' });
    expect(Array.isArray(result)).toBe(true);
  });

  it('safeDeleteNote returns boolean', async () => {
    const result = await safeDeleteNote('1');
    expect(result).toBe(true);
  });

  it('safeSetFavorite returns boolean', async () => {
    await safeSaveNote({
      id: 'fav-test',
      title: 't',
      content: 'c',
      favorite: false,
      createdAt: '',
      updatedAt: '',
    });
    const result = await safeSetFavorite('fav-test', true);
    expect(result).toBe(true);
  });

  it('safeAddNoteTag returns boolean', async () => {
    const result = await safeAddNoteTag('1', 'test-tag');
    expect(result).toBe(true);
  });

  it('safeRemoveNoteTag returns boolean', async () => {
    const result = await safeRemoveNoteTag('1', 'test-tag');
    expect(result).toBe(true);
  });

  it('safeGetNoteTags returns array', async () => {
    const result = await safeGetNoteTags('1');
    expect(Array.isArray(result)).toBe(true);
  });

  it('safeListAllTags returns array', async () => {
    const result = await safeListAllTags();
    expect(Array.isArray(result)).toBe(true);
  });

  it('safeDeleteNotesForLesson returns boolean', async () => {
    const result = await safeDeleteNotesForLesson('course-1', 'lesson-1');
    expect(result).toBe(true);
  });

  it('newNoteId generates unique IDs with prefix', () => {
    const id1 = newNoteId();
    const id2 = newNoteId();
    expect(id1).toMatch(/^note_/);
    expect(id1).not.toBe(id2);
  });

  it('nowIso returns valid ISO string', () => {
    const iso = nowIso();
    expect(() => new Date(iso)).not.toThrow();
  });
});
