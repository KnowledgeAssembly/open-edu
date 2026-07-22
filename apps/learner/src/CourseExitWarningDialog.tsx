import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@open-edu/design-system';
import { useTranslation } from '@open-edu/i18n';

export interface CourseExitWarningDialogProps {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
}

export function CourseExitWarningDialog({
  open,
  onStay,
  onLeave,
}: CourseExitWarningDialogProps): JSX.Element | null {
  const { t } = useTranslation();
  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onStay();
      }}
    >
      <DialogContent data-testid="exit-warning-dialog">
        <DialogHeader>
          <DialogTitle>{t('learner.course.leave_warning')}</DialogTitle>
          <DialogDescription>
            {t('learner.course.leave_warning_description')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onStay} data-testid="exit-warning-stay">
            {t('learner.course.leave_warning_stay')}
          </Button>
          <Button variant="destructive" onClick={onLeave} data-testid="exit-warning-leave">
            {t('learner.course.leave_warning_leave')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
