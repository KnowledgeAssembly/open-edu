import { useRef, useEffect } from 'react';
import { FocusTrap } from '@open-edu/accessibility';

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
  const stayRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      stayRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onStay();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onStay]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-warning-title"
      data-testid="exit-warning-dialog"
    >
      <FocusTrap active={open}>
        <div className="bg-surface text-on-surface rounded-xl shadow-xl border border-outline-variant p-6 max-w-sm mx-4 w-full">
          <h2 id="exit-warning-title" className="text-lg font-bold m-0 mb-2">
            Leave this course?
          </h2>
          <p className="text-sm text-on-surface-variant mb-6">
            You&apos;re in the middle of a lesson. Are you sure you want to leave?
          </p>
          <div className="flex justify-end gap-3">
            <button
              ref={stayRef}
              type="button"
              onClick={onStay}
              className="px-4 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface font-semibold text-sm cursor-pointer hover:bg-surface-variant"
              data-testid="exit-warning-stay"
            >
              Stay
            </button>
            <button
              type="button"
              onClick={onLeave}
              className="px-4 py-2 rounded-lg border-none bg-error text-on-error font-semibold text-sm cursor-pointer hover:opacity-90"
              data-testid="exit-warning-leave"
            >
              Leave
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
