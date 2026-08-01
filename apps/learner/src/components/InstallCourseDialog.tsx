import { useState, useRef, useCallback } from 'react';
import { useTranslation } from '@open-edu/i18n';
import { fileSource, urlSource } from '@open-edu/oep-distribution';
import type { CourseSource, InstallResult } from '@open-edu/oep-distribution';
import { proxyUrl } from '../oep-proxy/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@open-edu/design-system';

export interface InstallCourseDialogProps {
  open: boolean;
  onClose: () => void;
  onInstall: (source: CourseSource) => Promise<InstallResult>;
}

type InstallTab = 'file' | 'url';

export function InstallCourseDialog({
  open,
  onClose,
  onInstall,
}: InstallCourseDialogProps): JSX.Element {
  const { t } = useTranslation();
  const [tab, setTab] = useState<InstallTab>('file');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileInstall = useCallback(async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError(t('learner.install.error_no_file'));
      return;
    }
    setError(null);
    setIsInstalling(true);
    try {
      const source = fileSource(file);
      const result = await onInstall(source);
      if (result.success) {
        onClose();
      } else {
        setError(t(installErrorKey(result)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsInstalling(false);
    }
  }, [onInstall, onClose, t]);

  const handleUrlInstall = useCallback(async () => {
    if (!url.trim()) {
      setError(t('learner.install.error_no_url'));
      return;
    }
    setError(null);
    setIsInstalling(true);
    try {
      const source = urlSource(proxyUrl(url.trim()));
      const result = await onInstall(source);
      if (result.success) {
        onClose();
      } else {
        setError(t(installErrorKey(result)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsInstalling(false);
    }
  }, [url, onInstall, onClose, t]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('learner.install.title')}</DialogTitle>
          <DialogDescription>{t('learner.install.from_file')}</DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as InstallTab);
            setError(null);
          }}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">{t('learner.install.from_file')}</TabsTrigger>
            <TabsTrigger value="url">{t('learner.install.from_url')}</TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="space-y-4 pt-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".oep"
              data-testid="oep-file-input"
              className="text-caption text-on-surface file:bg-surface-container file:text-on-surface w-full file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:px-3 file:py-1.5"
            />
            <Button
              onClick={handleFileInstall}
              disabled={isInstalling}
              className="w-full"
              data-testid="install-file-button"
            >
              {isInstalling ? t('learner.install.installing') : t('learner.install.install_button')}
            </Button>
          </TabsContent>

          <TabsContent value="url" className="space-y-4 pt-4">
            <Input
              type="url"
              placeholder={t('learner.install.url_placeholder')}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              data-testid="oep-url-input"
              aria-label={t('learner.install.url_label')}
            />
            <Button
              onClick={handleUrlInstall}
              disabled={isInstalling || !url.trim()}
              className="w-full"
              data-testid="install-url-button"
            >
              {isInstalling ? t('learner.install.installing') : t('learner.install.install_button')}
            </Button>
          </TabsContent>
        </Tabs>

        {error && (
          <p className="text-error text-caption mt-2" data-testid="install-error" role="alert">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function installErrorKey(result: InstallResult): string {
  const keyMap: Record<string, string> = {
    ARCHIVE_TOO_LARGE: 'learner.install.error_archive_too_large',
    DECOMPRESSED_TOO_LARGE: 'learner.install.error_decompressed_too_large',
    MALFORMED_ARCHIVE: 'learner.install.error_malformed_archive',
    CHECKSUM_MISMATCH: 'learner.install.error_checksum_mismatch',
    MANIFEST_MISMATCH: 'learner.install.error_manifest_mismatch',
    COURSE_VALIDATION_ERROR: 'learner.install.error_course_validation',
    SOURCE_READ_ERROR: 'learner.install.error_network',
    STORAGE_ERROR: 'learner.install.error_storage',
    VERSION_DOWNGRADE: 'learner.install.error_version_downgrade',
    VERSION_SAME: 'learner.install.error_version_same',
    NOT_FOUND: 'learner.install.error_not_found',
  };
  return keyMap[result.errorCode ?? ''] ?? 'learner.install.error_unknown';
}
