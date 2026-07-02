import { useState, useEffect } from 'react';

export const motionTokens = {
  durationFast: '100ms',
  durationNormal: '200ms',
  durationSlow: '300ms',
  easingEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easingEaseOut: 'cubic-bezier(0, 0, 0.15, 1)',
  easingEaseIn: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

export const motionSafe = (animations: string) => `
@media (prefers-reduced-motion: no-preference) {
  ${animations}
}
[style*="--oe-reduced-motion: reduce"] *,
[style*="--oe-reduced-motion: reduce"] *::before,
[style*="--oe-reduced-motion: reduce"] *::after {
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  transition-duration: 0s !important;
}
`;

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      getComputedStyle(document.documentElement).getPropertyValue('--oe-reduced-motion').trim() ===
      'reduce'
    );
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue('--oe-reduced-motion')
        .trim();
      setReduced(value === 'reduce');
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    });

    return () => observer.disconnect();
  }, []);

  return reduced;
}
