import { useState, useEffect } from 'react';
import { useTranslation } from '@open-edu/i18n';
import { safeGetNote } from '../notesStorage';
import type { NoteRecord } from '../notesStorage';
import { NoteEditor } from './NoteEditor';
import type { AppView } from '../AppShell';

export interface NoteEditorPageProps {
  noteId: string;
  onNavigate: (view: AppView) => void;
}

export function NoteEditorPage({ noteId, onNavigate }: NoteEditorPageProps): JSX.Element {
  const { t } = useTranslation();
  const [note, setNote] = useState<NoteRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const n = await safeGetNote(noteId);
      if (!cancelled) {
        setNote(n);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [noteId]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-on-surface-variant">{t('notes.editor.save.saving')}</p>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-on-surface-variant">{t('notes.search.no_results')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col p-4 sm:p-6">
      <NoteEditor initial={note} onDeleted={() => onNavigate({ view: 'notes' })} />
    </div>
  );
}
