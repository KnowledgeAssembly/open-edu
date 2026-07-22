import { useEffect, useRef } from 'react';
import { useTranslation } from '@open-edu/i18n';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from '@open-edu/design-system';
import { AlertTriangle } from 'lucide-react';

export interface ResetConfirmDialogProps {
  open: boolean;
  isBundle: boolean;
  courseTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ResetConfirmDialog({
  open,
  isBundle,
  courseTitle,
  onConfirm,
  onCancel,
}: ResetConfirmDialogProps): JSX.Element {
  const { t } = useTranslation();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => cancelRef.current?.focus(), 0);
    }
  }, [open]);

  const descriptionKey = isBundle
    ? 'reset.confirm_bundle_description'
    : 'reset.confirm_description';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent
        role="alertdialog"
        aria-labelledby="reset-dialog-title"
        aria-describedby="reset-dialog-description"
        className="sm:max-w-md"
      >
        <DialogHeader>
          <div className="mb-4 flex items-center gap-3">
            <div className="bg-error/10 flex h-10 w-10 items-center justify-center rounded-full">
              <AlertTriangle className="text-error h-5 w-5" />
            </div>
            <DialogTitle id="reset-dialog-title" className="text-h2 font-display">
              {t('reset.confirm_title')}
            </DialogTitle>
          </div>
        </DialogHeader>
        <DialogDescription id="reset-dialog-description" data-testid="reset-dialog-description">
          {t(descriptionKey)}
        </DialogDescription>
        <DialogFooter className="mt-6">
          <Button
            ref={cancelRef}
            variant="outline"
            onClick={onCancel}
            data-testid="reset-cancel-button"
          >
            {t('reset.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            data-testid="reset-confirm-button"
          >
            {t('reset.confirm_button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
