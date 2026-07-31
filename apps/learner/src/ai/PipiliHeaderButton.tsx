import {
  Button,
  cn,
  headerIconButtonClasses,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@open-edu/design-system';
import { Sparkles } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';

export interface PipiliHeaderButtonProps {
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

export function PipiliHeaderButton({
  onOpen,
  hasUnread = false,
  className,
}: PipiliHeaderButtonProps): JSX.Element {
  const { t } = useTranslation();
  const shortcut = isMacPlatform()
    ? t('learner.reader_toolbar.shortcut_mac')
    : t('learner.reader_toolbar.shortcut_other');

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onOpen}
            aria-label={t('learner.reader_toolbar.label')}
            data-testid="pipili-header-button"
            className={cn(headerIconButtonClasses, className)}
          >
            <Sparkles className="h-4 w-4" />
            {hasUnread && (
              <span
                className="bg-primary absolute right-1 top-1 h-2 w-2 rounded-full"
                role="img"
                aria-label={t('learner.reader_toolbar.unread')}
              />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          {t('learner.reader_toolbar.tooltip', { shortcut })}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
