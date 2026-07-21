import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@open-edu/i18n';
import { PageHeader, EmptyState, Button } from '@open-edu/design-system';
import { Plus } from 'lucide-react';
import {
  safeListNotes,
  safeSaveNote,
  safeGetNoteTags,
  safeSetFavorite,
  safeDeleteNote,
  newNoteId,
  nowIso,
} from '../notesStorage';
import type { NoteRecord } from '../notesStorage';
import { NotesSearchPanel } from './NotesSearchPanel';
import { NoteRow } from './NoteRow';
import { TagFilterBar } from './TagFilterBar';
import type { AppView } from '../AppShell';

export interface NotesDashboardPageProps {
  onNavigate: (view: AppView) => void;
}

export function NotesDashboardPage({ onNavigate }: NotesDashboardPageProps): JSX.Element {
  const { t } = useTranslation();
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [tagsMap, setTagsMap] = useState<Record<string, string[]>>({});
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    const all = await safeListNotes();
    setNotes(all);
    const map: Record<string, string[]> = {};
    for (const n of all) {
      map[n.id] = await safeGetNoteTags(n.id);
    }
    setTagsMap(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const handleCreate = useCallback(async () => {
    const id = newNoteId();
    const note: NoteRecord = {
      id,
      title: '',
      content: '',
      favorite: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await safeSaveNote(note);
    onNavigate({ view: 'note-editor', noteId: id });
  }, [onNavigate]);

  const handleToggleFavorite = useCallback(
    async (id: string, current: boolean) => {
      await safeSetFavorite(id, !current);
      void loadNotes();
    },
    [loadNotes],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await safeDeleteNote(id);
      void loadNotes();
    },
    [loadNotes],
  );

  const recent = notes.filter((n) => !n.favorite).slice(0, 6);
  const favorites = notes.filter((n) => n.favorite).slice(0, 10);
  const tagged = activeTag ? notes.filter((n) => (tagsMap[n.id] ?? []).includes(activeTag)) : [];

  if (loading) {
    return (
      <div data-testid="notes-page" className="flex flex-1 items-center justify-center p-8">
        <p className="text-on-surface-variant">{t('notes.editor.save.saving')}</p>
      </div>
    );
  }

  return (
    <div data-testid="notes-page" className="flex h-full w-full flex-col">
      <PageHeader title={t('notes.dashboard.title')} subtitle={t('notes.dashboard.subtitle')} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <NotesSearchPanel
                onOpenNote={(id) => onNavigate({ view: 'note-editor', noteId: id })}
              />
            </div>
            <Button onClick={handleCreate} className="shrink-0 gap-1">
              <Plus className="h-4 w-4" />
              {t('notes.dashboard.create')}
            </Button>
          </div>

          {notes.length === 0 ? (
            <EmptyState
              heading={t('notes.dashboard.empty.title')}
              description={t('notes.dashboard.empty.body')}
              action={
                <Button onClick={handleCreate}>
                  <Plus className="mr-1 h-4 w-4" />
                  {t('notes.dashboard.create')}
                </Button>
              }
            />
          ) : (
            <>
              <section>
                <h2 className="text-h4 mb-3 font-semibold">
                  {t('notes.dashboard.section.recent')}
                </h2>
                {recent.length > 0 ? (
                  <div
                    data-testid="notes-recent-list"
                    className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    {recent.map((n) => (
                      <NoteRow
                        key={n.id}
                        note={n}
                        tags={tagsMap[n.id] ?? []}
                        onOpen={() => onNavigate({ view: 'note-editor', noteId: n.id })}
                        onToggleFavorite={() => void handleToggleFavorite(n.id, n.favorite)}
                        onDelete={() => void handleDelete(n.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-on-surface-variant text-body-ui">
                    {t('notes.dashboard.empty.body')}
                  </p>
                )}
              </section>

              {favorites.length > 0 && (
                <section>
                  <h2 className="text-h4 mb-3 font-semibold">
                    {t('notes.dashboard.section.favorites')}
                  </h2>
                  <div
                    data-testid="notes-favorites-list"
                    className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    {favorites.map((n) => (
                      <NoteRow
                        key={n.id}
                        note={n}
                        tags={tagsMap[n.id] ?? []}
                        onOpen={() => onNavigate({ view: 'note-editor', noteId: n.id })}
                        onToggleFavorite={() => void handleToggleFavorite(n.id, n.favorite)}
                        onDelete={() => void handleDelete(n.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h2 className="text-h4 mb-3 font-semibold">{t('notes.dashboard.section.tags')}</h2>
                <TagFilterBar
                  mode="filter"
                  activeTag={activeTag ?? undefined}
                  onActiveTagChange={setActiveTag}
                />
                {activeTag && tagged.length > 0 && (
                  <div
                    data-testid="notes-tags-list"
                    className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    {tagged.map((n) => (
                      <NoteRow
                        key={n.id}
                        note={n}
                        tags={tagsMap[n.id] ?? []}
                        onOpen={() => onNavigate({ view: 'note-editor', noteId: n.id })}
                        onToggleFavorite={() => void handleToggleFavorite(n.id, n.favorite)}
                        onDelete={() => void handleDelete(n.id)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
