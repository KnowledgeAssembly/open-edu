import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@open-edu/design-system';
import { Button } from '@open-edu/design-system';

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
  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onStay();
      }}
    >
      <DialogContent data-testid="exit-warning-dialog">
        <DialogHeader>
          <DialogTitle>Leave this course?</DialogTitle>
          <DialogDescription>
            Your progress up to this point has been saved. You can resume from where you left off.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onStay} data-testid="exit-warning-stay">
            Stay
          </Button>
          <Button variant="destructive" onClick={onLeave} data-testid="exit-warning-leave">
            Leave Course
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
