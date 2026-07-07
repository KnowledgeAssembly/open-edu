import { useState, useEffect, useRef, useCallback } from 'react';
import {
  loadBreakTimerSettings,
  saveBreakTimerSettings,
  type BreakTimerSettings,
} from './breakTimerStorage';

export function useBreakTimer(): {
  isTriggered: boolean;
  mode: BreakTimerSettings['mode'];
  setMode: (mode: BreakTimerSettings['mode']) => void;
  dismiss: () => void;
} {
  const [mode, setModeState] = useState<BreakTimerSettings['mode']>(() => {
    const saved = loadBreakTimerSettings();
    return saved.mode;
  });
  const [isTriggered, setIsTriggered] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const durationMsRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(
    (newMode: BreakTimerSettings['mode']) => {
      clearTimer();
      setIsTriggered(false);
      if (newMode === 'off') return;

      durationMsRef.current = parseInt(newMode, 10) * 60 * 1000;
      startTimeRef.current = Date.now();

      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        if (elapsed >= durationMsRef.current) {
          setIsTriggered(true);
          clearTimer();
        }
      }, 10_000);
    },
    [clearTimer],
  );

  const setMode = useCallback(
    (newMode: BreakTimerSettings['mode']) => {
      setModeState(newMode);
      saveBreakTimerSettings({ mode: newMode });
      startTimer(newMode);
    },
    [startTimer],
  );

  const dismiss = useCallback(() => {
    setIsTriggered(false);
    startTimer(mode);
  }, [mode, startTimer]);

  useEffect(() => {
    startTimer(mode);
    return () => clearTimer();
  }, []);

  return { isTriggered, mode, setMode, dismiss };
}
