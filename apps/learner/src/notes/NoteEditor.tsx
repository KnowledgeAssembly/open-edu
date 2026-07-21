import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from '@open-edu/i18n';
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@open-edu/design-system';
import { Trash2, Download } from 'lucide-react';
import { useLiveRegion } from '@open-edu/accessibility';
import type { NoteRecord } from '../notesStorage';
import { safeSaveNote, safeDeleteNote } from '../notesStorage';
import { useDebouncedAutosave, type SaveStatus } from './useDebouncedAutosave';
import { TagFilterBar } from './TagFilterBar';
import { ExportDialog } from './ExportDialog';

export interface NoteEditorProps {
  initial: NoteRecord;
  compact?: boolean;
  onSaved?: (n: NoteRecord) => void;
  onDeleted?: (id: string) => void;
}

export function NoteEditor({ initial, compact, onSaved, onDeleted }: NoteEditorProps): JSX.Element {
  const { t } = useTranslation();
  const { announce } = useLiveRegion();
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);
  const [note, setNote] = useState<NoteRecord>(initial);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const prevStatusRef = useRef<SaveStatus>('idle');

  const handleSave = useCallback(
    async (n: NoteRecord): Promise<boolean> => {
      const ok = await safeSaveNote(n);
      if (ok) onSaved?.(n);
      return ok;
    },
    [onSaved],
  );

  const { status, flush } = useDebouncedAutosave(note, handleSave);

  useEffect(() => {
    const s = status;
    if (s === 'saving' && prevStatusRef.current !== 'saving') {
      announce(t('notes.editor.save.saving'));
    } else if (s === 'saved' && prevStatusRef.current !== 'saved') {
      announce(t('notes.editor.save.saved'));
    } else if (s === 'failed' && prevStatusRef.current !== 'failed') {
      announce(t('notes.editor.save.failed'), 'assertive');
    }
    prevStatusRef.current = s;
  }, [status, announce, t]);

  useEffect(() => {
    setNote((prev: NoteRecord) => ({ ...prev, title, content }));
  }, [title, content]);

  const handleDelete = useCallback(async () => {
    await flush();
    await safeDeleteNote(note.id);
    onDeleted?.(note.id);
  }, [note.id, flush, onDeleted]);

  const statusLabel =
    status === 'saving'
      ? t('notes.editor.save.saving')
      : status === 'saved'
        ? t('notes.editor.save.saved')
        : status === 'failed'
          ? t('notes.editor.save.failed')
          : '';

  return (
    <div className={`flex flex-col ${compact ? 'gap-2' : 'gap-4'} min-h-0 flex-1`}>
      <div className="flex items-center justify-between gap-2">
        {!compact && (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('notes.editor.title.placeholder')}
            className="text-h3 flex-1 border-none bg-transparent font-semibold"
            aria-label={t('notes.editor.title.placeholder')}
          />
        )}
        <div className="flex shrink-0 items-center gap-1">
          {statusLabel && (
            <span
              aria-live="polite"
              className={`text-label-xs ${
                status === 'saving'
                  ? 'text-on-surface-variant'
                  : status === 'saved'
                    ? 'text-success'
                    : 'text-destructive'
              }`}
            >
              {statusLabel}
            </span>
          )}
          {!compact && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowExportDialog(true)}
              aria-label={t('notes.editor.export')}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDeleteDialog(true)}
            aria-label={t('notes.editor.delete')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {compact && (
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('notes.editor.title.placeholder')}
          className="text-body-ui w-full font-medium"
          aria-label={t('notes.editor.title.placeholder')}
        />
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('notes.editor.body.placeholder')}
          aria-label={t('notes.editor.body.label')}
          className="bg-surface text-on-surface text-body-ui min-h-[200px] w-full flex-1 resize-none border-0 p-2 font-mono focus:outline-none"
        />
      </div>

      <TagFilterBar mode="edit" noteId={note.id} className="shrink-0" />

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('notes.dashboard.delete.confirm')}</DialogTitle>
            <DialogDescription>{t('notes.dashboard.delete.confirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {t('notes.export.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t('notes.editor.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExportDialog open={showExportDialog} onOpenChange={setShowExportDialog} note={note} />
    </div>
  );
}
