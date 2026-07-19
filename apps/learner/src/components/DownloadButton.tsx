import * as React from 'react';
import { Download, Trash2 } from 'lucide-react';
import { Button } from './ui/button.js';

interface DownloadButtonProps {
  courseId: string;
  isDownloaded: boolean;
  onDownload?: (courseId: string) => void;
  onDelete?: (courseId: string) => void;
  disabled?: boolean;
}

export const DownloadButton = React.forwardRef<HTMLButtonElement, DownloadButtonProps>(
  ({ courseId, isDownloaded, onDownload, onDelete, disabled }, ref) => {
    if (isDownloaded) {
      return (
        <Button
          ref={ref}
          variant="ghost"
          size="sm"
          onClick={() => onDelete?.(courseId)}
          disabled={disabled}
          aria-label="Remove downloaded course"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          <span className="ml-1">Remove</span>
        </Button>
      );
    }

    return (
      <Button
        ref={ref}
        variant="outline"
        size="sm"
        onClick={() => onDownload?.(courseId)}
        disabled={disabled}
        aria-label="Download course for offline use"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        <span className="ml-1">Download</span>
      </Button>
    );
  },
);
DownloadButton.displayName = 'DownloadButton';
