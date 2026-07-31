import { Button, cn } from '@open-edu/design-system';
import { Sparkles } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';

export interface ReaderToolbarProps {
  onOpen: () => void;
  hasUnread?: boolean;
  className?: string;
}

function isMacPlatform(): boolean {
  try {
    return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform ?? '');
  } catch {
    return false;
  }
}

export function ReaderToolbar({
  onOpen,
  hasUnread = false,
  className,
}: ReaderToolbarProps): JSX.Element {
  const { t } = useTranslation();
  const mac = isMacPlatform();

  return (
    <div
      className={cn(
        'border-outline-variant bg-surface flex items-center gap-2 border-b px-4 py-1.5',
        className,
      )}
      data-testid="reader-toolbar"
    >
      <Button variant="ghost" size="sm" onClick={onOpen} className="gap-1.5">
        <Sparkles className="h-4 w-4" />
        {t('learner.reader_toolbar.label')}
      </Button>
      <span
        className="bg-surface-container text-on-surface-variant border-outline-variant text-caption rounded border px-1.5 py-0.5"
        aria-hidden="true"
      >
        {mac
          ? t('learner.reader_toolbar.shortcut_mac')
          : t('learner.reader_toolbar.shortcut_other')}
      </span>
      {hasUnread && (
        <span
          className="bg-primary h-2 w-2 rounded-full"
          role="img"
          aria-label={t('learner.reader_toolbar.unread')}
        />
      )}
    </div>
  );
}
