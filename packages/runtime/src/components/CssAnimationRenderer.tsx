import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { AnimationEffectConfig } from '@open-edu/schemas';
import { oasDurationVar } from '@open-edu/design-system';
import { animationsCss } from '../styles/animations.css.js';

export interface CssAnimationRendererProps {
  effects: AnimationEffectConfig[];
  children: ReactNode;
  reducedMotion: boolean;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

export const effectToClass: Record<string, string> = {
  fade: 'oas-animate-fade',
  slide: 'oas-animate-slide',
  highlight: 'oas-animate-highlight',
  pulse: 'oas-animate-pulse',
  glow: 'oas-animate-glow',
  badge: 'oas-animate-badge',
  confetti: 'oas-animate-confetti',
  sparkle: 'oas-animate-sparkle',
  celebrate: 'oas-animate-celebrate',
};

const effectToDuration: Record<string, string> = {
  fade: oasDurationVar('normal'),
  slide: oasDurationVar('normal'),
  highlight: oasDurationVar('slow'),
  pulse: oasDurationVar('fast'),
  glow: oasDurationVar('slow'),
  badge: oasDurationVar('slow'),
  // Per-iteration durations — must match animations.css.ts so iteration-count is not multiplied
  confetti: '600ms',
  sparkle: oasDurationVar('normal'),
  celebrate: oasDurationVar('slow'),
};

let cssInjected = false;

function ensureAnimationsCss(): void {
  if (cssInjected || typeof document === 'undefined') return;
  cssInjected = true;
  const style = document.createElement('style');
  style.dataset.oasAnimations = 'true';
  style.textContent = animationsCss;
  document.head.appendChild(style);
}

export function CssAnimationRenderer({
  effects,
  children,
  reducedMotion,
  speed = 1,
  className,
  onComplete,
}: CssAnimationRendererProps): JSX.Element {
  useEffect(() => {
    ensureAnimationsCss();
  }, []);

  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const notifyComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current?.();
  }, []);

  // Stabilize completion resets on semantic effect changes only — parents often pass new
  // array/callback identities each render (e.g. .filter() in OasAnimationWrapper).
  const effectsKey = effects.map((e) => `${e.target}:${e.effect}:${e.step ?? ''}`).join('|');
  const hasMappableEffect = effects.some((e) => effectToClass[e.effect]);

  useEffect(() => {
    completedRef.current = false;
    if (!onCompleteRef.current) return;
    if (reducedMotion || !hasMappableEffect) {
      notifyComplete();
    }
  }, [effectsKey, hasMappableEffect, reducedMotion, notifyComplete]);

  const animationStyles = useMemo(() => {
    if (reducedMotion || effects.length === 0) return undefined;

    const primary = effects.find((e) => effectToClass[e.effect]);
    if (!primary) return undefined;

    const styles: Record<string, string> = {};
    const duration = primary.duration
      ? typeof primary.duration === 'number'
        ? `${primary.duration}ms`
        : oasDurationVar(primary.duration)
      : (effectToDuration[primary.effect] ?? oasDurationVar('normal'));

    const adjustedDuration =
      speed !== 1
        ? duration.replace(/(\d+)ms/, (_, ms) => `${Math.round(Number(ms) / speed)}ms`)
        : duration;

    if (adjustedDuration) styles.animationDuration = adjustedDuration;
    if (primary.delay) styles.animationDelay = `${primary.delay}ms`;
    if (primary.easing) styles.animationTimingFunction = primary.easing;

    return Object.keys(styles).length > 0 ? styles : undefined;
  }, [effects, reducedMotion, speed]);

  const primaryEffect = effects.find((e) => effectToClass[e.effect]);
  const animationClass = reducedMotion || !primaryEffect ? '' : effectToClass[primaryEffect.effect];

  return (
    <div
      className={`${animationClass} ${className ?? ''}`.trim()}
      style={animationStyles}
      data-testid="css-animation-renderer"
      onAnimationEnd={onComplete ? () => notifyComplete() : undefined}
    >
      {children}
    </div>
  );
}
