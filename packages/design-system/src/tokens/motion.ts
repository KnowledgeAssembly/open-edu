import { useState, useEffect } from 'react';

export const motionTokens = {
  durationInstant: '0ms',
  durationFast: '100ms',
  durationNormal: '200ms',
  durationSlow: '300ms',
  easingEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easingEaseOut: 'cubic-bezier(0, 0, 0.15, 1)',
  easingEaseIn: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

export type OasDurationName = 'instant' | 'fast' | 'normal' | 'slow';

const oasDurations: Record<OasDurationName, string> = {
  instant: motionTokens.durationInstant,
  fast: motionTokens.durationFast,
  normal: motionTokens.durationNormal,
  slow: motionTokens.durationSlow,
};

export function oasDurationToMs(duration: OasDurationName | number): string {
  if (typeof duration === 'number') return `${duration}ms`;
  return oasDurations[duration];
}

export function oasDurationVar(duration: OasDurationName | number): string {
  if (typeof duration === 'number') return `${duration}ms`;
  return `var(--oe-motion-duration-${duration})`;
}

export interface LottieThemeColorMap {
  [variable: string]: string;
}

export function lottieThemeColors(
  colors: Record<string, string>,
  prefix = '--oe-color-',
): LottieThemeColorMap {
  const result: LottieThemeColorMap = {};
  for (const [name, value] of Object.entries(colors)) {
    result[`${prefix}${name}`] = value;
  }
  return result;
}

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
