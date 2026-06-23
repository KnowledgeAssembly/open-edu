import { useEffect, useRef, type RefObject } from 'react';

export function useAutoFocus(deps: unknown[]): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null);
  const hasFocused = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    hasFocused.current = false;
    const handleTransition = () => {
      if (!hasFocused.current) {
        el?.focus({ preventScroll: false });
        hasFocused.current = true;
      }
    };

    const raf = requestAnimationFrame(() => {
      el?.focus({ preventScroll: false });
      hasFocused.current = true;
    });

    el.addEventListener('transitionend', handleTransition, { once: true });

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('transitionend', handleTransition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
