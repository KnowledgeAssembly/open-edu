import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Spinner,
  EmptyState,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Input,
  PageHeader,
} from '@open-edu/design-system';
import { FolderOpen, Copy, Pencil, Archive, Upload, Plus, FileDown } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import { ImportCourseDialog } from './ImportCourseDialog.js';
import type { StudioApi } from '../studioApi.js';
import type { LibraryEntry } from '../library/types.js';

function slugId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type RenameTarget = LibraryEntry | null;
type ArchiveTarget = LibraryEntry | null;

export function LibraryView({
  api,
  onOpen,
  onCreateUnit,
  onError,
}: {
  api: StudioApi;
  onOpen: (relativePath: string) => void;
  onCreateUnit: () => void;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [workspace, setWorkspace] = useState('');
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<RenameTarget>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<ArchiveTarget>(null);
  const [archiving, setArchiving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const result = await api.getLibrary();
      setWorkspace(result.workspace);
      setEntries(result.entries);
    } catch (err) {
      onError(err instanceof Error ? err.message : t('studio.errors.generic'));
    } finally {
      setLoading(false);
    }
  }, [api, onError, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleOpenRename = (entry: LibraryEntry) => {
    setRenameTarget(entry);
    setRenameValue(entry.title);
  };

  const handleConfirmRename = async () => {
    if (!renameTarget) return;
    setRenaming(true);
    try {
      await api.renameCourse(renameTarget.relativePath, renameValue.trim());
      setRenameTarget(null);
      await refresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : t('studio.errors.generic'));
    } finally {
      setRenaming(false);
    }
  };

  const handleConfirmArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await api.archiveCourse(archiveTarget.relativePath);
      setArchiveTarget(null);
      await refresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : t('studio.errors.generic'));
    } finally {
      setArchiving(false);
    }
  };

  const handleDuplicate = async (entry: LibraryEntry) => {
    const newId = `${slugId(entry.id)}-copy`;
    const newTitle = t('studio.library.duplicateName', { title: entry.title });
    try {
      await api.duplicateCourse(entry.relativePath, newId, newTitle);
      await refresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : t('studio.errors.generic'));
    }
  };

  const handleExportUnit = async (entry: LibraryEntry) => {
    try {
      const { blob, fileName } = await api.exportUnitOep(entry.relativePath);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      onError(err instanceof Error ? err.message : t('studio.errors.generic'));
    }
  };

  const actions = (entry: LibraryEntry) => (
    <div className="flex flex-wrap items-center gap-2">
      {entry.kind === 'course' ? (
        <Button variant="default" size="sm" onClick={() => onOpen(entry.relativePath)}>
          <FolderOpen className="mr-1.5 h-4 w-4" />
          {t('studio.library.open')}
        </Button>
      ) : null}
      {entry.kind === 'unit' ? (
        <Button variant="outline" size="sm" onClick={() => void handleExportUnit(entry)}>
          <FileDown className="mr-1.5 h-4 w-4" />
          {t('studio.unit.exportOep')}
        </Button>
      ) : null}
      {entry.kind === 'course' ? (
        <Button variant="ghost" size="sm" onClick={() => void handleDuplicate(entry)}>
          <Copy className="mr-1.5 h-4 w-4" />
          {t('studio.library.duplicate')}
        </Button>
      ) : null}
      <Button variant="ghost" size="sm" onClick={() => handleOpenRename(entry)}>
        <Pencil className="mr-1.5 h-4 w-4" />
        {t('studio.library.rename')}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setArchiveTarget(entry)}>
        <Archive className="mr-1.5 h-4 w-4" />
        {t('studio.library.archive')}
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Spinner aria-label={t('studio.library.loading')} />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 p-6">
        <div>
          <PageHeader title={t('studio.library.title')} subtitle={t('studio.library.lede')} />
          <p className="text-on-surface-variant mt-1 text-sm">
            {t('studio.library.workspace', { workspace })}
          </p>
        </div>
        <EmptyState
          heading={t('studio.library.empty')}
          description={t('studio.library.emptyDescription')}
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="default" size="sm" onClick={() => setImportOpen(true)}>
                <Upload className="mr-1.5 h-4 w-4" />
                {t('studio.library.import')}
              </Button>
              <Button variant="outline" size="sm" onClick={onCreateUnit}>
                <Plus className="mr-1.5 h-4 w-4" />
                {t('studio.library.newUnit')}
              </Button>
            </div>
          }
        />
        <ImportCourseDialog
          api={api}
          open={importOpen}
          onOpenChange={setImportOpen}
          onImported={() => void refresh()}
          onError={onError}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div>
        <PageHeader title={t('studio.library.title')} subtitle={t('studio.library.lede')} />
        <p className="text-on-surface-variant mt-1 text-sm">
          {t('studio.library.workspace', { workspace })}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="default" size="sm" onClick={() => setImportOpen(true)}>
          <Upload className="mr-1.5 h-4 w-4" />
          {t('studio.library.import')}
        </Button>
        <Button variant="outline" size="sm" onClick={onCreateUnit}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t('studio.library.newUnit')}
        </Button>
      </div>

      <section aria-labelledby="studio-library-active-heading">
        <h2 id="studio-library-active-heading" className="text-h2 text-on-surface sr-only mb-4">
          {t('studio.library.title')}
        </h2>
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.relativePath}>
              <Card className="border-outline-variant bg-surface">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-on-surface font-semibold">{entry.title}</span>
                      <Badge variant="secondary">
                        {entry.kind === 'unit'
                          ? t('studio.library.kind.unit')
                          : t('studio.library.kind.course')}
                      </Badge>
                    </div>
                    <p className="text-on-surface-variant mt-1 text-xs">
                      {entry.relativePath}
                      <span className="ml-2">v{entry.version}</span>
                    </p>
                  </div>
                  {actions(entry)}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <ImportCourseDialog
        api={api}
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => void refresh()}
        onError={onError}
      />

      <Dialog
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open && !renaming) setRenameTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('studio.library.renameDialogTitle')}</DialogTitle>
            <DialogDescription>{t('studio.library.renameLabel')}</DialogDescription>
          </DialogHeader>
          <Input
            id="library-rename-input"
            aria-label={t('studio.library.renameLabel')}
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              disabled={renaming}
              onClick={() => setRenameTarget(null)}
            >
              {t('studio.library.cancel')}
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={!renameValue.trim() || renaming}
              onClick={() => void handleConfirmRename()}
            >
              {t('studio.library.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open && !archiving) setArchiveTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('studio.library.archiveDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('studio.library.archiveDialogLede', { title: archiveTarget?.title ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              disabled={archiving}
              onClick={() => setArchiveTarget(null)}
            >
              {t('studio.library.cancel')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={archiving}
              onClick={() => void handleConfirmArchive()}
            >
              {t('studio.library.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
