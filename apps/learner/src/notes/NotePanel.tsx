import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@open-edu/i18n';
import { Button } from '@open-edu/design-system';
import { ExternalLink } from 'lucide-react';
import { safeListNotes, safeSaveNote, newNoteId, nowIso } from '../notesStorage';
import type { NoteRecord } from '../notesStorage';
import { NoteEditor } from './NoteEditor';

export interface NotePanelProps {
  courseId: string;
  lessonId: string;
  onOpenInNotes?: () => void;
}

export function NotePanel({ courseId, lessonId, onOpenInNotes }: NotePanelProps): JSX.Element {
  const { t } = useTranslation();
  const [note, setNote] = useState<NoteRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const notes = await safeListNotes({ courseId, lessonId });
      if (cancelled) return;
      if (notes.length > 0) {
        setNote(notes[0]!);
      } else {
        const newNote: NoteRecord = {
          id: newNoteId(),
          title: '',
          content: '',
          favorite: false,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          courseId,
          lessonId,
        };
        await safeSaveNote(newNote);
        if (!cancelled) setNote(newNote);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId, lessonId]);

  const handleSaved = useCallback((n: NoteRecord) => {
    setNote(n);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-on-surface-variant text-body-ui">{t('notes.editor.save.saving')}</p>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <p className="text-on-surface-variant text-body-ui">{t('notes.panel.empty')}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-label-lg font-semibold">{t('notes.panel.title')}</h2>
        {onOpenInNotes && (
          <Button variant="ghost" size="sm" onClick={onOpenInNotes} className="gap-1">
            <ExternalLink className="h-3 w-3" />
            <span className="text-label-xs">{t('notes.panel.open_in_dashboard')}</span>
          </Button>
        )}
      </div>
      <NoteEditor initial={note} compact onSaved={handleSaved} />
    </div>
  );
}
