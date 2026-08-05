import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimationConfigSchema } from '@open-edu/schemas';
import type { AnimationConfig, AnimationConfigInput } from '@open-edu/schemas';
import { useTranslation } from '@open-edu/i18n';
import { useLiveRegion } from '@open-edu/accessibility';

export type OasAnimationStatus = 'idle' | 'started' | 'paused' | 'completed';

export interface OasAnimationController {
  status: OasAnimationStatus;
  reducedMotion: boolean;
  currentStep: number;
  totalSteps: number;
  speed: number;
  setSpeed: (speed: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  nextStep: () => void;
  prevStep: () => void;
  /** Jump to a 0-based step index. Pass -1 for "no step revealed yet". */
  goToStep: (step: number) => void;
  handlePlayerEvent: (status: OasAnimationStatus) => void;
}

export function useOasAnimation(
  config?: AnimationConfigInput,
  onStatusChange?: (s: OasAnimationStatus) => void,
  options?: {
    /** Controlled 0-based step index. When set, overrides internal step state for reads. */
    controlledStep?: number;
    onStepChange?: (step: number) => void;
  },
): OasAnimationController {
  const { t } = useTranslation();
  const { announce } = useLiveRegion();

  const parsed = useMemo(() => AnimationConfigSchema.safeParse(config), [config]);

  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  const [status, setStatusState] = useState<OasAnimationStatus>('idle');
  const isControlled = options?.controlledStep !== undefined;
  const [internalStep, setInternalStep] = useState(0);
  const currentStep = isControlled ? (options?.controlledStep as number) : internalStep;
  const onStepChangeRef = useRef(options?.onStepChange);
  onStepChangeRef.current = options?.onStepChange;
  const [speed, setSpeedState] = useState(config?.speed ?? 1);

  const setCurrentStep = useCallback(
    (next: number) => {
      if (!isControlled) {
        setInternalStep(next);
      }
      onStepChangeRef.current?.(next);
    },
    [isControlled],
  );

  const setSpeed = useCallback((s: number) => {
    if (s > 0 && s <= 4) {
      setSpeedState(s);
    }
  }, []);

  const statusRef = useRef<OasAnimationStatus>('idle');
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  const setStatus = useCallback((next: OasAnimationStatus) => {
    if (statusRef.current === next) return;
    statusRef.current = next;
    setStatusState(next);
    onStatusChangeRef.current?.(next);
  }, []);

  const parsedConfig: AnimationConfig | undefined = parsed.success ? parsed.data : undefined;
  const totalSteps = parsedConfig ? Math.max(1, parsedConfig.effects?.length ?? 1) : 1;
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
  }, [parsed.success, setStatus, setCurrentStep]);

  const announceStep = useCallback(
    (step: number) => {
      if (step < 0) return;
      announce(
        t('runtime.animation.step_changed', {
          step: String(step + 1),
          total: String(totalSteps),
        }),
      );
    },
    [announce, t, totalSteps],
  );

  const goToStep = useCallback(
    (step: number) => {
      if (!parsed.success) return;
      const next = step < 0 ? -1 : Math.max(0, Math.min(step, totalSteps - 1));
      setCurrentStep(next);
      if (next >= 0 && valid) {
        announceStep(next);
        setStatus('started');
      } else if (next < 0) {
        setStatus('idle');
      }
    },
    [parsed.success, totalSteps, setCurrentStep, announceStep, setStatus, valid],
  );

  const nextStep = useCallback(() => {
    if (!valid) return;
    const base = currentStep < 0 ? -1 : currentStep;
    const next = Math.min(base + 1, totalSteps - 1);
    setCurrentStep(next);
    announceStep(next);
    setStatus('started');
  }, [valid, totalSteps, setStatus, announceStep, currentStep, setCurrentStep]);

  const prevStep = useCallback(() => {
    if (!valid) return;
    const next = currentStep <= 0 ? (currentStep < 0 ? -1 : 0) : currentStep - 1;
    setCurrentStep(next);
    if (next >= 0) {
      announceStep(next);
      setStatus('started');
    } else {
      setStatus('idle');
    }
  }, [valid, setStatus, announceStep, currentStep, setCurrentStep]);

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
    speed,
    setSpeed,
    play,
    pause,
    stop,
    nextStep,
    prevStep,
    goToStep,
    handlePlayerEvent,
  };
}
