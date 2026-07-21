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
  deleteNotesByLesson,
  type NoteRecord,
} from '@open-edu/storage';

export type { NoteRecord };

export function newNoteId(): string {
  return `note_${crypto.randomUUID()}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export async function safeSaveNote(n: NoteRecord): Promise<boolean> {
  try {
    await saveNote(n);
    return true;
  } catch {
    return false;
  }
}

export async function safeGetNote(id: string): Promise<NoteRecord | null> {
  try {
    const n = await getNote(id);
    return n ?? null;
  } catch {
    return null;
  }
}

export async function safeListNotes(opts?: {
  courseId?: string;
  lessonId?: string;
  favoriteOnly?: boolean;
}): Promise<NoteRecord[]> {
  try {
    return await listNotes(opts);
  } catch {
    return [];
  }
}

export async function safeDeleteNote(id: string): Promise<boolean> {
  try {
    await deleteNote(id);
    return true;
  } catch {
    return false;
  }
}

export async function safeSetFavorite(id: string, fav: boolean): Promise<boolean> {
  try {
    await setNoteFavorite(id, fav);
    return true;
  } catch {
    return false;
  }
}

export async function safeAddNoteTag(id: string, tag: string): Promise<boolean> {
  try {
    await addNoteTag(id, tag);
    return true;
  } catch {
    return false;
  }
}

export async function safeRemoveNoteTag(id: string, tag: string): Promise<boolean> {
  try {
    await removeNoteTag(id, tag);
    return true;
  } catch {
    return false;
  }
}

export async function safeGetNoteTags(id: string): Promise<string[]> {
  try {
    return await getNoteTags(id);
  } catch {
    return [];
  }
}

export async function safeListAllTags(): Promise<string[]> {
  try {
    return await listAllTags();
  } catch {
    return [];
  }
}

export async function safeDeleteNotesForLesson(
  courseId: string,
  lessonId: string,
): Promise<boolean> {
  try {
    await deleteNotesByLesson(courseId, lessonId);
    return true;
  } catch {
    return false;
  }
}
