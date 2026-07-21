import { openDatabase, type NoteRecord, type NoteTagRecord } from './db.js';

export async function saveNote(note: NoteRecord): Promise<void> {
  const db = await openDatabase();
  await db.put('notes', note);
}

export async function getNote(id: string): Promise<NoteRecord | undefined> {
  const db = await openDatabase();
  return db.get('notes', id);
}

export async function listNotes(opts?: {
  courseId?: string;
  lessonId?: string;
  favoriteOnly?: boolean;
}): Promise<NoteRecord[]> {
  const db = await openDatabase();
  let notes = await db.getAll('notes');
  if (opts?.courseId) {
    notes = notes.filter((n) => n.courseId === opts.courseId);
  }
  if (opts?.lessonId) {
    notes = notes.filter((n) => n.lessonId === opts.lessonId);
  }
  if (opts?.favoriteOnly) {
    notes = notes.filter((n) => n.favorite);
  }
  notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return notes;
}

export async function deleteNote(id: string): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(['notes', 'note-tags'], 'readwrite');
  await tx.objectStore('notes').delete(id);
  const tagStore = tx.objectStore('note-tags');
  const byNoteId = tagStore.index('byNoteId');
  let cursor = await byNoteId.openCursor(IDBKeyRange.only(id));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function bulkPutNotes(notes: NoteRecord[]): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('notes', 'readwrite');
  for (const note of notes) {
    await tx.objectStore('notes').put(note);
  }
  await tx.done;
}

export async function deleteNotesByLesson(courseId: string, lessonId: string): Promise<void> {
  const db = await openDatabase();
  const notes = await listNotes({ courseId, lessonId });
  const tx = db.transaction(['notes', 'note-tags'], 'readwrite');
  for (const note of notes) {
    await tx.objectStore('notes').delete(note.id);
    const tagStore = tx.objectStore('note-tags');
    const byNoteId = tagStore.index('byNoteId');
    let cursor = await byNoteId.openCursor(IDBKeyRange.only(note.id));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
  }
  await tx.done;
}

export async function setNoteFavorite(id: string, favorite: boolean): Promise<void> {
  const db = await openDatabase();
  const note = await db.get('notes', id);
  if (!note) return;
  note.favorite = favorite;
  note.updatedAt = new Date().toISOString();
  await db.put('notes', note);
}

export async function getNoteTags(noteId: string): Promise<string[]> {
  const db = await openDatabase();
  const tagStore = db.transaction('note-tags').objectStore('note-tags');
  const byNoteId = tagStore.index('byNoteId');
  const tags: NoteTagRecord[] = await byNoteId.getAll(IDBKeyRange.only(noteId));
  return tags.map((t) => t.tag).sort();
}

export async function addNoteTag(noteId: string, tag: string): Promise<void> {
  const normalized = tag.trim().toLowerCase().replace(/^#/, '');
  if (normalized.length === 0) throw new Error('Invalid tag');
  const db = await openDatabase();
  const record: NoteTagRecord = { noteId, tag: normalized };
  await db.put('note-tags', record);
}

export async function removeNoteTag(noteId: string, tag: string): Promise<void> {
  const db = await openDatabase();
  await db.delete('note-tags', [noteId, tag]);
}

export async function listAllTags(): Promise<string[]> {
  const db = await openDatabase();
  const all: NoteTagRecord[] = await db.getAll('note-tags');
  const unique = [...new Set(all.map((t) => t.tag))];
  return unique.sort();
}
