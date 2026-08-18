import { useRef, useState } from 'react';
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

function readFileBytes(file: File): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer().then((buffer) => new Uint8Array(buffer));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export function ImportCourseDialog({
  api,
  open,
  onOpenChange,
  onImported,
  onError,
  browserMode = false,
}: {
  api: StudioApi;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
  onError: (message: string) => void;
  browserMode?: boolean;
}) {
  const { t } = useTranslation();
  const [path, setPath] = useState('');
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setPath('');
    setImporting(false);
    setStatus('idle');
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleImportOep = async (file: File) => {
    if (importing) return;
    setImporting(true);
    setStatus('idle');
    setError('');
    try {
      const bytes = await readFileBytes(file);
      const summary = await api.importOep(bytes);
      setStatus('success');
      onImported();
      onError(t('studio.browser.importSuccess', { title: summary.title }));
      onOpenChange(false);
    } catch (err) {
      setStatus('error');
      const message = err instanceof Error ? err.message : t('studio.browser.importFailure');
      setError(message);
      onError(message);
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmFolder = async () => {
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
          <DialogTitle>
            {browserMode ? t('studio.browser.importTitle') : t('studio.import.title')}
          </DialogTitle>
          <DialogDescription>
            {browserMode ? t('studio.browser.importHelp') : t('studio.import.help')}
          </DialogDescription>
        </DialogHeader>
        {browserMode ? (
          <>
            <input
              ref={fileRef}
              id="import-course-file"
              data-testid="import-oep-input"
              type="file"
              accept=".oep,application/octet-stream"
              aria-label={t('studio.browser.importHelp')}
              className="text-on-surface-variant block w-full text-sm"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleImportOep(file);
              }}
              disabled={importing}
            />
          </>
        ) : (
          <>
            <label className="text-on-surface-variant text-sm" htmlFor="import-course-path">
              {t('studio.import.folderLabel')}
            </label>
            <Input
              id="import-course-path"
              aria-label={t('studio.import.help')}
              value={path}
              onChange={(event) => setPath(event.target.value)}
            />
          </>
        )}
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
          {!browserMode ? (
            <Button
              variant="default"
              size="sm"
              disabled={!path.trim() || importing}
              onClick={() => void handleConfirmFolder()}
            >
              {t('studio.library.confirm')}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
