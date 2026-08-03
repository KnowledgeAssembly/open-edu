import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimationConfigSchema } from '@open-edu/schemas';
import type { AnimationConfig } from '@open-edu/schemas';
import { useTranslation } from '@open-edu/i18n';
import { useLiveRegion } from '@open-edu/accessibility';

export type OasAnimationStatus = 'idle' | 'started' | 'paused' | 'completed';

export interface OasAnimationController {
  status: OasAnimationStatus;
  reducedMotion: boolean;
  currentStep: number;
  totalSteps: number;
  play: () => void;
  pause: () => void;
  stop: () => void;
  nextStep: () => void;
  prevStep: () => void;
  handlePlayerEvent: (status: OasAnimationStatus) => void;
}

export function useOasAnimation(
  config?: AnimationConfig,
  onStatusChange?: (s: OasAnimationStatus) => void,
): OasAnimationController {
  const { t } = useTranslation();
  const { announce } = useLiveRegion();

  const parsed = useMemo(() => AnimationConfigSchema.safeParse(config), [config]);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [status, setStatusState] = useState<OasAnimationStatus>('idle');
  const [currentStep, setCurrentStep] = useState(0);

  const statusRef = useRef<OasAnimationStatus>('idle');
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  const setStatus = useCallback((next: OasAnimationStatus) => {
    if (statusRef.current === next) return;
    statusRef.current = next;
    setStatusState(next);
    onStatusChangeRef.current?.(next);
  }, []);

  const totalSteps = parsed.success ? Math.max(1, parsed.data.effects?.length ?? 1) : 1;
  const valid = parsed.success && !reducedMotion;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);

  useEffect(() => {
    if (reducedMotion && parsed.success) {
      setStatus('completed');
    }
  }, [reducedMotion, parsed.success, setStatus]);

  const play = useCallback(() => {
    if (!valid) return;
    setStatus('started');
  }, [valid, setStatus]);

  const pause = useCallback(() => {
    if (!valid) return;
    setStatus('paused');
  }, [valid, setStatus]);

  const stop = useCallback(() => {
    if (!parsed.success) return;
    setCurrentStep(0);
    setStatus('idle');
  }, [parsed.success, setStatus]);

  const announceStep = useCallback(
    (step: number) => {
      announce(
        t('runtime.animation.step_changed', {
          step: String(step + 1),
          total: String(totalSteps),
        }),
      );
    },
    [announce, t, totalSteps],
  );

  const nextStep = useCallback(() => {
    if (!valid) return;
    setCurrentStep((step) => {
      const next = Math.min(step + 1, totalSteps - 1);
      return next;
    });
    announceStep(currentStep);
    setStatus('started');
  }, [valid, totalSteps, setStatus, announceStep, currentStep]);

  const prevStep = useCallback(() => {
    if (!valid) return;
    setCurrentStep((step) => Math.max(step - 1, 0));
    announceStep(currentStep);
    setStatus('started');
  }, [valid, setStatus, announceStep, currentStep]);

  const handlePlayerEvent = useCallback(
    (s: OasAnimationStatus) => {
      setStatus(s);
      if (s === 'completed') {
        announce(t('runtime.animation.completed'));
      }
      if (s === 'started') {
        announceStep(currentStep);
      }
    },
    [setStatus, announce, t, currentStep, announceStep],
  );

  return {
    status,
    reducedMotion,
    currentStep,
    totalSteps,
    play,
    pause,
    stop,
    nextStep,
    prevStep,
    handlePlayerEvent,
  };
}
