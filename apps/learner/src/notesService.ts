import MiniSearch from 'minisearch';
import { safeListNotes, safeGetNoteTags } from './notesStorage';
import type { NoteRecord } from './notesStorage';

export interface NoteSearchDocument {
  id: string;
  title: string;
  content: string;
  courseId?: string;
  lessonId?: string;
  tags?: string[];
}

export interface NoteSearchResult {
  id: string;
  title: string;
  snippet: string;
  courseId?: string;
  lessonId?: string;
}

export function buildNotesIndex(notes: NoteSearchDocument[]): MiniSearch {
  const index = new MiniSearch({
    fields: ['title', 'content', 'tags'],
    storeFields: ['title', 'content', 'courseId', 'lessonId'],
  });
  index.addAll(notes);
  return index;
}

export async function rebuildNotesIndex(): Promise<MiniSearch> {
  const notes = await safeListNotes();
  const docs: NoteSearchDocument[] = await Promise.all(
    notes.map(async (n: NoteRecord) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      courseId: n.courseId,
      lessonId: n.lessonId,
      tags: await safeGetNoteTags(n.id),
    })),
  );
  return buildNotesIndex(docs);
}

export function queryNotes(index: MiniSearch, q: string, limit = 20): NoteSearchResult[] {
  if (!q.trim()) return [];
  const hits = index.search(q, { prefix: true, fuzzy: 0.2 });
  return hits.slice(0, limit).map((h) => {
    const r = h as unknown as {
      id: string;
      title: string;
      content: string;
      courseId?: string;
      lessonId?: string;
    };
    return {
      id: r.id,
      title: r.title || '',
      snippet: makeSnippet(r.content || '', q),
      courseId: r.courseId,
      lessonId: r.lessonId,
    };
  });
}

export function makeSnippet(content: string, query: string, pad = 80): string {
  const i = content.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return content.slice(0, pad).trim();
  const start = Math.max(0, i - pad / 2);
  return (start > 0 ? '…' : '') + content.slice(start, start + pad).trim() + '…';
}
