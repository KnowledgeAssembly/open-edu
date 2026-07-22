import { describe, it, expect, beforeEach } from 'vitest';
import { openDatabase } from '../db.js';
import { saveNote, listNotes, deleteNotesByCourse } from '../note-store.js';
import type { NoteRecord } from '../db.js';

describe('note-store', () => {
  beforeEach(async () => {
    const db = await openDatabase();
    await db.clear('notes');
    await db.clear('note-tags');
  });

  it('deleteNotesByCourse removes notes for a specific course', async () => {
    const noteA: NoteRecord = {
      id: 'note-a',
      title: 'Note A',
      content: 'Content A',
      favorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      courseId: 'course-x',
      lessonId: 'lesson-1',
    };
    const noteB: NoteRecord = {
      id: 'note-b',
      title: 'Note B',
      content: 'Content B',
      favorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      courseId: 'course-y',
      lessonId: 'lesson-1',
    };

    await saveNote(noteA);
    await saveNote(noteB);

    await deleteNotesByCourse('course-x');

    const remaining = await listNotes();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.id).toBe('note-b');
  });

  it('deleteNotesByCourse is a no-op for course with no notes', async () => {
    await expect(deleteNotesByCourse('no-notes-course')).resolves.toBeUndefined();
  });
});
