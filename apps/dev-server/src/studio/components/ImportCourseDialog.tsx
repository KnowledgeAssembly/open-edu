import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Input,
} from '@open-edu/design-system';
import { useTranslation } from '@open-edu/i18n';
import type { StudioApi } from '../studioApi.js';

export function ImportCourseDialog({
  api,
  open,
  onOpenChange,
  onImported,
  onError,
}: {
  api: StudioApi;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [path, setPath] = useState('');
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const reset = () => {
    setPath('');
    setImporting(false);
    setStatus('idle');
    setError('');
  };

  const handleConfirm = async () => {
    const trimmed = path.trim();
    if (!trimmed || importing) return;
    setImporting(true);
    setStatus('idle');
    setError('');
    try {
      await api.importCourseFolder(trimmed);
      setStatus('success');
      onImported();
      onOpenChange(false);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : t('studio.import.invalid'));
      onError(err instanceof Error ? err.message : t('studio.errors.generic'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (importing) return;
        if (next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('studio.import.title')}</DialogTitle>
          <DialogDescription>{t('studio.import.help')}</DialogDescription>
        </DialogHeader>
        <label className="text-on-surface-variant text-sm" htmlFor="import-course-path">
          {t('studio.import.folderLabel')}
        </label>
        <Input
          id="import-course-path"
          aria-label={t('studio.import.help')}
          value={path}
          onChange={(event) => setPath(event.target.value)}
        />
        {status === 'error' ? (
          <p className="text-error text-sm" role="alert">
            {error}
          </p>
        ) : null}
        {status === 'success' ? (
          <p className="text-primary text-sm" role="status">
            {t('studio.import.success')}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            disabled={importing}
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            {t('studio.library.cancel')}
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={!path.trim() || importing}
            onClick={() => void handleConfirm()}
          >
            {t('studio.library.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
