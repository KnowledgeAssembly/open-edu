import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveNote,
  getNote,
  listNotes,
  deleteNote,
  setNoteFavorite,
  addNoteTag,
  removeNoteTag,
  getNoteTags,
  listAllTags,
} from './note-store.js';
import { openDatabase, resetDatabase, DB_VERSION, type NoteRecord } from './db.js';

function makeNote(overrides: Partial<NoteRecord> = {}): NoteRecord {
  const now = new Date().toISOString();
  return {
    id: `note_${crypto.randomUUID()}`,
    title: 'Test Note',
    content: 'Test content',
    favorite: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('Note Store', () => {
  beforeEach(async () => {
    const db = await openDatabase();
    await db.clear('notes');
    await db.clear('note-tags');
    db.close();
    resetDatabase();
  });

  it('saves and retrieves a note', async () => {
    const note = makeNote();
    await saveNote(note);
    const retrieved = await getNote(note.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.title).toBe('Test Note');
    expect(retrieved!.content).toBe('Test content');
  });

  it('listNotes orders by updatedAt DESC', async () => {
    const older = makeNote({ id: 'note_1', title: 'Older', updatedAt: '2024-01-01T00:00:00.000Z' });
    const newer = makeNote({ id: 'note_2', title: 'Newer', updatedAt: '2024-06-01T00:00:00.000Z' });
    await saveNote(older);
    await saveNote(newer);
    const notes = await listNotes();
    expect(notes[0]!.title).toBe('Newer');
    expect(notes[1]!.title).toBe('Older');
  });

  it('listNotes filters by courseId', async () => {
    const noteA = makeNote({ id: 'note_a', courseId: 'math' });
    const noteB = makeNote({ id: 'note_b', courseId: 'science' });
    await saveNote(noteA);
    await saveNote(noteB);
    const mathNotes = await listNotes({ courseId: 'math' });
    expect(mathNotes).toHaveLength(1);
    expect(mathNotes[0]!.id).toBe('note_a');
  });

  it('listNotes filters by favoriteOnly', async () => {
    const fav = makeNote({ id: 'note_fav', favorite: true });
    const unfav = makeNote({ id: 'note_unfav', favorite: false });
    await saveNote(fav);
    await saveNote(unfav);
    const favorites = await listNotes({ favoriteOnly: true });
    expect(favorites).toHaveLength(1);
    expect(favorites[0]!.id).toBe('note_fav');
  });

  it('deleteNote removes note and its tags', async () => {
    const note = makeNote();
    await saveNote(note);
    await addNoteTag(note.id, 'important');
    await deleteNote(note.id);
    const retrieved = await getNote(note.id);
    expect(retrieved).toBeUndefined();
    const tags = await getNoteTags(note.id);
    expect(tags).toEqual([]);
  });

  it('setNoteFavorite toggles favorite; no-op on missing id', async () => {
    const note = makeNote({ favorite: false });
    await saveNote(note);
    await setNoteFavorite(note.id, true);
    const updated = await getNote(note.id);
    expect(updated!.favorite).toBe(true);
    await setNoteFavorite('nonexistent', true);
  });

  it('addNoteTag / removeNoteTag are idempotent and normalise', async () => {
    const note = makeNote();
    await saveNote(note);
    await addNoteTag(note.id, '#Important');
    await addNoteTag(note.id, 'important');
    const tags = await getNoteTags(note.id);
    expect(tags).toEqual(['important']);

    await removeNoteTag(note.id, 'important');
    const afterRemove = await getNoteTags(note.id);
    expect(afterRemove).toEqual([]);
  });

  it('addNoteTag rejects empty tag', async () => {
    const note = makeNote();
    await saveNote(note);
    await expect(addNoteTag(note.id, '#')).rejects.toThrow('Invalid tag');
    await expect(addNoteTag(note.id, '  ')).rejects.toThrow('Invalid tag');
  });

  it('listAllTags returns unique sorted tags', async () => {
    const n1 = makeNote({ id: 'note_x' });
    const n2 = makeNote({ id: 'note_y' });
    await saveNote(n1);
    await saveNote(n2);
    await addNoteTag(n1.id, 'zeta');
    await addNoteTag(n1.id, 'alpha');
    await addNoteTag(n2.id, 'beta');
    await addNoteTag(n2.id, 'alpha');
    const all = await listAllTags();
    expect(all).toEqual(['alpha', 'beta', 'zeta']);
  });

  it('DB version is 3 and stores exist', async () => {
    expect(DB_VERSION).toBe(3);
    const db = await openDatabase();
    const storeNames = Array.from(db.objectStoreNames);
    expect(storeNames).toContain('notes');
    expect(storeNames).toContain('note-tags');
    const tx = db.transaction('note-tags', 'readonly');
    const store = tx.objectStore('note-tags');
    expect(store.indexNames.contains('byNoteId')).toBe(true);
    db.close();
  });
});
