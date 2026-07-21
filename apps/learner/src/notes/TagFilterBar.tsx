import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@open-edu/i18n';
import { Tag, Input, Button } from '@open-edu/design-system';
import { useLiveRegion } from '@open-edu/accessibility';
import {
  safeGetNoteTags,
  safeAddNoteTag,
  safeRemoveNoteTag,
  safeListAllTags,
} from '../notesStorage';

export interface TagFilterBarProps {
  mode: 'edit' | 'filter';
  noteId?: string;
  activeTag?: string;
  onActiveTagChange?: (tag: string | null) => void;
  className?: string;
}

export function TagFilterBar({
  mode,
  noteId,
  activeTag,
  onActiveTagChange,
  className,
}: TagFilterBarProps): JSX.Element {
  const { t } = useTranslation();
  const { announce } = useLiveRegion();
  const [tags, setTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (mode === 'edit' && noteId) {
      void safeGetNoteTags(noteId).then(setTags);
    }
    if (mode === 'filter') {
      void safeListAllTags().then(setAllTags);
    }
  }, [mode, noteId]);

  const handleAddTag = useCallback(async () => {
    const trimmed = newTag.trim().toLowerCase().replace(/^#/, '');
    if (!trimmed || !noteId) return;
    const ok = await safeAddNoteTag(noteId, trimmed);
    if (ok) {
      setTags((prev) => [...prev.filter((t) => t !== trimmed), trimmed].sort());
      announce(`${t('notes.editor.tags.add')}: ${trimmed}`);
    }
    setNewTag('');
  }, [newTag, noteId, announce, t]);

  const handleRemoveTag = useCallback(
    async (tag: string) => {
      if (!noteId) return;
      const ok = await safeRemoveNoteTag(noteId, tag);
      if (ok) {
        setTags((prev) => prev.filter((t) => t !== tag));
        announce(`${t('notes.editor.tags.remove')}: ${tag}`);
      }
    },
    [noteId, announce, t],
  );

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void handleAddTag();
      }
    },
    [handleAddTag],
  );

  if (mode === 'edit') {
    return (
      <div
        className={`flex flex-col gap-2 ${className ?? ''}`}
        role="group"
        aria-label={t('notes.editor.tags.label')}
      >
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1" aria-label={t('notes.tag.aria.list')}>
            {tags.map((tag) => (
              <Tag key={tag} variant="secondary" onRemove={() => void handleRemoveTag(tag)}>
                {tag}
              </Tag>
            ))}
          </div>
        )}
        <div className="flex gap-1">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder={t('notes.editor.tags.placeholder')}
            className="text-body-ui h-8"
            aria-label={t('notes.editor.tags.add')}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleAddTag()}
            aria-label={t('notes.editor.tags.add')}
          >
            {t('notes.editor.tags.add')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2" role="group" aria-label={t('notes.tag.filter.title')}>
      <div className="flex flex-wrap gap-1" aria-label={t('notes.tag.aria.filter')}>
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => onActiveTagChange?.(activeTag === tag ? null : tag)}
            className={`focus-visible:ring-primary text-label-xs rounded-full px-2.5 py-0.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 ${
              activeTag === tag
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
      {activeTag && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onActiveTagChange?.(null)}
          className="self-start"
        >
          {t('notes.tag.filter.clear')}
        </Button>
      )}
    </div>
  );
}
