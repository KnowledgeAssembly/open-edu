import * as React from 'react';
import { Download } from 'lucide-react';
import { Button } from './ui/button.js';
import { useTranslation } from '@open-edu/i18n';

interface InstallPromptProps {
  isInstallable: boolean;
  isInstalled: boolean;
  onInstall?: () => void;
}

export const InstallPrompt = React.forwardRef<HTMLDivElement, InstallPromptProps>(
  ({ isInstallable, isInstalled, onInstall }, ref) => {
    const { t } = useTranslation();
    if (isInstalled || !isInstallable) return null;

    return (
      <div ref={ref} role="status" className="border-border bg-surface rounded-lg border p-4">
        <p className="text-body-ui mb-2 font-medium">{t('learner.install.prompt')}</p>
        <Button size="sm" onClick={onInstall} aria-label={t('learner.install.aria')}>
          <Download className="mr-1 h-3 w-3" aria-hidden="true" />
          {t('learner.install.button')}
        </Button>
      </div>
    );
  },
);
InstallPrompt.displayName = 'InstallPrompt';
