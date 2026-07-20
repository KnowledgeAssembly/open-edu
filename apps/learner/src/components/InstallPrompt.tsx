import * as React from 'react';
import { Download } from 'lucide-react';
import { Button } from './ui/button.js';

interface InstallPromptProps {
  isInstallable: boolean;
  isInstalled: boolean;
  onInstall?: () => void;
}

export const InstallPrompt = React.forwardRef<HTMLDivElement, InstallPromptProps>(
  ({ isInstallable, isInstalled, onInstall }, ref) => {
    if (isInstalled || !isInstallable) return null;

    return (
      <div
        ref={ref}
        role="status"
        className="rounded-lg border border-border bg-surface p-4"
      >
        <p className="mb-2 text-sm font-medium">Install OpenEdu for offline access</p>
        <Button size="sm" onClick={onInstall} aria-label="Install OpenEdu app">
          <Download className="mr-1 h-3 w-3" aria-hidden="true" />
          Install App
        </Button>
      </div>
    );
  },
);
InstallPrompt.displayName = 'InstallPrompt';
