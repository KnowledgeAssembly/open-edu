import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@open-edu/i18n';
import { Input } from '@open-edu/design-system';
import { useLiveRegion } from '@open-edu/accessibility';
import { safeListNotes, safeGetNoteTags } from '../notesStorage';
import type { NoteRecord } from '../notesStorage';
import { buildNotesIndex, queryNotes, type NoteSearchResult } from '../notesService';

export interface NotesSearchPanelProps {
  onOpenNote: (id: string) => void;
}

export function NotesSearchPanel({ onOpenNote }: NotesSearchPanelProps): JSX.Element {
  const { t } = useTranslation();
  const { announce } = useLiveRegion();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NoteSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announceRef = useRef(announce);
  announceRef.current = announce;

  useEffect(() => {
    if (!query.trim()) {
      if (results.length > 0) setResults([]);
      if (searched) setSearched(false);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const notes = await safeListNotes();
      const docs = await Promise.all(
        notes.map(async (n: NoteRecord) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          courseId: n.courseId,
          lessonId: n.lessonId,
          tags: await safeGetNoteTags(n.id),
        })),
      );
      const index = buildNotesIndex(docs);
      const hits = queryNotes(index, query);
      setResults(hits);
      setSearched(true);
      announceRef.current(t('notes.search.results.aria', { count: String(hits.length) }));
    }, 200);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, t]);

  const handleSelect = useCallback(
    (id: string) => {
      onOpenNote(id);
      setQuery('');
      setResults([]);
      setSearched(false);
    },
    [onOpenNote],
  );

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="notes-search" className="sr-only">
        {t('notes.search.label')}
      </label>
      <Input
        id="notes-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('notes.search.placeholder')}
        aria-controls="notes-search-results"
        aria-expanded={results.length > 0}
        className="w-full"
      />
      <div
        id="notes-search-results"
        role="listbox"
        aria-label={t('notes.search.label')}
        className="flex flex-col gap-1"
      >
        {results.map((r) => (
          <button
            key={r.id}
            role="option"
            onClick={() => handleSelect(r.id)}
            className="bg-surface-container-low hover:bg-surface-container focus-visible:ring-primary flex flex-col rounded-lg p-3 text-left focus-visible:outline-none focus-visible:ring-2"
          >
            <span className="text-label font-semibold">
              {r.title || t('notes.editor.title.placeholder')}
            </span>
            <span className="text-body-ui text-on-surface-variant">
              {r.snippet || t('notes.search.snippet.empty')}
            </span>
            {(r.courseId || r.lessonId) && (
              <span className="text-label-xs text-on-surface-variant mt-0.5">
                {r.courseId && <span>{r.courseId}</span>}
                {r.lessonId && <span> · {r.lessonId}</span>}
              </span>
            )}
          </button>
        ))}
        {searched && results.length === 0 && (
          <p className="text-on-surface-variant text-body-ui py-2 text-center">
            {t('notes.search.no_results')}
          </p>
        )}
      </div>
    </div>
  );
}
