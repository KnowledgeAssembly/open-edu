import { useEffect, useCallback, useRef, type RefObject } from 'react';

export interface FocusTrapOptions {
  enabled: boolean;
  returnFocusOnDeactivate?: boolean;
}

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  { enabled, returnFocusOnDeactivate = true }: FocusTrapOptions,
): void {
  const previouslyFocused = useRef<Element | null>(null);

  const trapFocus = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;

      const focusable = container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [containerRef],
  );

  useEffect(() => {
    if (!enabled) {
      if (returnFocusOnDeactivate && previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus();
      }
      return;
    }

    previouslyFocused.current = document.activeElement;

    const container = containerRef.current;
    if (container) {
      const firstFocusable = container.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      firstFocusable?.focus();
    }

    document.addEventListener('keydown', trapFocus);
    return () => {
      document.removeEventListener('keydown', trapFocus);
      if (returnFocusOnDeactivate && previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus();
      }
    };
  }, [enabled, trapFocus, containerRef, returnFocusOnDeactivate]);
}
