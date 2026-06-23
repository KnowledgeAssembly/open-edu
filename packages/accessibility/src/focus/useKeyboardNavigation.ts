import { useEffect, useCallback, type RefObject } from 'react';

export interface KeyboardNavigationOptions {
  vertical?: boolean;
  horizontal?: boolean;
  loop?: boolean;
  selector?: string;
  onActivate?: (element: HTMLElement) => void;
}

export function useKeyboardNavigation(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  options: KeyboardNavigationOptions = {},
): void {
  const {
    vertical = true,
    horizontal = false,
    loop = true,
    selector = '[role="radio"], [role="option"], [role="tab"], [data-nav-item]',
    onActivate,
  } = options;

  const getItems = useCallback((): HTMLElement[] => {
    const container = containerRef.current;
    if (!container) return [];
    return Array.from(container.querySelectorAll<HTMLElement>(selector));
  }, [containerRef, selector]);

  const focusItem = useCallback(
    (index: number) => {
      const items = getItems();
      const clamped = loop
        ? ((index % items.length) + items.length) % items.length
        : Math.max(0, Math.min(index, items.length - 1));
      items[clamped]?.focus();
    },
    [getItems, loop],
  );

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const items = getItems();
      if (items.length === 0) return;

      const currentIndex = items.indexOf(document.activeElement as HTMLElement);
      if (currentIndex === -1) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          items[0]?.focus();
          e.preventDefault();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          if (vertical) {
            focusItem(currentIndex + 1);
            e.preventDefault();
          }
          break;
        case 'ArrowUp':
          if (vertical) {
            focusItem(currentIndex - 1);
            e.preventDefault();
          }
          break;
        case 'ArrowRight':
          if (horizontal) {
            focusItem(currentIndex + 1);
            e.preventDefault();
          }
          break;
        case 'ArrowLeft':
          if (horizontal) {
            focusItem(currentIndex - 1);
            e.preventDefault();
          }
          break;
        case 'Enter':
        case ' ':
          if (onActivate && document.activeElement instanceof HTMLElement) {
            onActivate(document.activeElement);
            e.preventDefault();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, getItems, focusItem, vertical, horizontal, onActivate]);
}
