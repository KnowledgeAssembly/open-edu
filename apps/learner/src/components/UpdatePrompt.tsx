import * as React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from './ui/button.js';

interface UpdatePromptProps {
  updateAvailable: boolean;
  onUpdate?: () => void;
  onDismiss?: () => void;
}

export const UpdatePrompt = React.forwardRef<HTMLDivElement, UpdatePromptProps>(
  ({ updateAvailable, onUpdate, onDismiss }, ref) => {
    if (!updateAvailable) return null;

    return (
      <div
        ref={ref}
        role="status"
        className="fixed bottom-4 right-4 z-50 rounded-lg border border-border bg-surface p-4 shadow-lg"
      >
        <p className="mb-2 text-sm font-medium">A new version is available</p>
        <div className="flex gap-2">
          <Button size="sm" onClick={onUpdate}>
            <RefreshCw className="mr-1 h-3 w-3" aria-hidden="true" />
            Update
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </div>
    );
  },
);
UpdatePrompt.displayName = 'UpdatePrompt';
