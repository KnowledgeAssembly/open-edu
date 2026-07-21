import { useState, useCallback } from 'react';
import { useTranslation } from '@open-edu/i18n';
import {
  Tag,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from '@open-edu/design-system';
import { Star, Trash2 } from 'lucide-react';
import { useLiveRegion } from '@open-edu/accessibility';
import type { NoteRecord } from '../notesStorage';

export interface NoteRowProps {
  note: NoteRecord;
  tags: string[];
  onOpen: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}

export function NoteRow({
  note,
  tags,
  onOpen,
  onToggleFavorite,
  onDelete,
}: NoteRowProps): JSX.Element {
  const { t } = useTranslation();
  const { announce } = useLiveRegion();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const snippet = note.content
    ? note.content
        .replace(/[[\]!#*`>]/g, '')
        .slice(0, 120)
        .trim() + (note.content.length > 120 ? '…' : '')
    : t('notes.row.snippet.empty');

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onOpen();
      }
    },
    [onOpen],
  );

  const handleToggleFavorite = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleFavorite();
      announce(note.favorite ? t('notes.row.favorite.remove') : t('notes.row.favorite.add'));
    },
    [onToggleFavorite, note.favorite, announce, t],
  );

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    setShowDeleteDialog(false);
    onDelete();
  }, [onDelete]);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={handleKeyDown}
        className="bg-surface-container-low hover:bg-surface-container focus-visible:ring-primary flex cursor-pointer flex-col gap-1 rounded-lg border p-3 focus-visible:outline-none focus-visible:ring-2"
        data-testid="note-row"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-h3 flex-1 truncate font-semibold">
            {note.title || t('notes.editor.title.placeholder')}
          </h3>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={handleToggleFavorite}
              className="focus-visible:ring-primary rounded p-0.5 focus-visible:outline-none focus-visible:ring-2"
              aria-pressed={note.favorite}
              aria-label={
                note.favorite ? t('notes.row.favorite.remove') : t('notes.row.favorite.add')
              }
            >
              <Star
                className={`h-4 w-4 ${note.favorite ? 'fill-primary text-primary' : 'text-on-surface-variant'}`}
              />
            </button>
            <button
              onClick={handleDeleteClick}
              className="focus-visible:ring-primary rounded p-0.5 focus-visible:outline-none focus-visible:ring-2"
              aria-label={t('notes.row.delete')}
            >
              <Trash2 className="text-on-surface-variant h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="text-body-ui text-on-surface-variant line-clamp-2">{snippet}</p>
        {tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Tag key={tag} variant="secondary" className="text-label-xs">
                {tag}
              </Tag>
            ))}
          </div>
        )}
        {(note.courseId || note.lessonId) && (
          <p className="text-label-xs text-on-surface-variant mt-1">
            {note.courseId && (
              <span>
                {t('notes.editor.course.label')}: {note.courseId}
              </span>
            )}
            {note.lessonId && (
              <span>
                {' '}
                · {t('notes.editor.lesson.label')}: {note.lessonId}
              </span>
            )}
          </p>
        )}
      </div>

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
            <Button variant="destructive" onClick={handleConfirmDelete}>
              {t('notes.editor.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
