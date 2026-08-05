import { useCallback, useMemo, useReducer } from 'react';

/**
 * Shared step-sync state machine for pairing widget step reveal with OAS animation.
 *
 * Single source of truth:
 * - `revealedCount` drives ProcessExplainer (and similar) progressive reveal
 * - `animationStepIndex` drives SVG/Lottie step playback (0-based, -1 = none yet)
 *
 * Transitions:
 *   idle  --REVEAL_NEXT--> active (revealedCount=1)
 *   active --REVEAL_NEXT--> active | complete
 *   active|complete --FINISH--> complete (finished=true)
 *   * --RESET--> idle
 */
export type StepSyncPhase = 'idle' | 'active' | 'complete';

export interface StepSyncState {
  /** How many steps are revealed (0 = none, totalSteps = all). */
  revealedCount: number;
  phase: StepSyncPhase;
  finished: boolean;
}

export type StepSyncEvent =
  | { type: 'REVEAL_NEXT' }
  | { type: 'REVEAL_PREV' }
  | { type: 'GO_TO'; revealedCount: number }
  | { type: 'FINISH' }
  | { type: 'RESET' };

export interface StepSyncMachine {
  state: StepSyncState;
  totalSteps: number;
  /** 0-based index of the latest revealed animation step, or -1 when idle. */
  animationStepIndex: number;
  dispatch: (event: StepSyncEvent) => void;
  revealNext: () => void;
  revealPrev: () => void;
  goTo: (revealedCount: number) => void;
  finish: () => void;
  reset: () => void;
}

export function createInitialStepSyncState(initialRevealed = 0, totalSteps = 1): StepSyncState {
  const revealedCount = Math.max(0, Math.min(initialRevealed, totalSteps));
  if (revealedCount <= 0) {
    return { revealedCount: 0, phase: 'idle', finished: false };
  }
  if (revealedCount >= totalSteps) {
    return { revealedCount: totalSteps, phase: 'complete', finished: false };
  }
  return { revealedCount, phase: 'active', finished: false };
}

export function animationStepIndexFromRevealed(revealedCount: number): number {
  return revealedCount > 0 ? revealedCount - 1 : -1;
}

export function stepSyncReducer(
  state: StepSyncState,
  event: StepSyncEvent,
  totalSteps: number,
): StepSyncState {
  const clamp = (n: number) => Math.max(0, Math.min(n, totalSteps));

  switch (event.type) {
    case 'REVEAL_NEXT': {
      if (state.finished) return state;
      const next = clamp(state.revealedCount + 1);
      if (next === state.revealedCount) return state;
      return {
        revealedCount: next,
        phase: next >= totalSteps ? 'complete' : 'active',
        finished: false,
      };
    }
    case 'REVEAL_PREV': {
      if (state.finished) return state;
      const next = clamp(state.revealedCount - 1);
      if (next === state.revealedCount) return state;
      return {
        revealedCount: next,
        phase: next <= 0 ? 'idle' : next >= totalSteps ? 'complete' : 'active',
        finished: false,
      };
    }
    case 'GO_TO': {
      const next = clamp(event.revealedCount);
      if (next === state.revealedCount && !state.finished) {
        return {
          ...state,
          phase: next <= 0 ? 'idle' : next >= totalSteps ? 'complete' : 'active',
        };
      }
      return {
        revealedCount: next,
        phase: next <= 0 ? 'idle' : next >= totalSteps ? 'complete' : 'active',
        finished: false,
      };
    }
    case 'FINISH': {
      if (state.revealedCount < totalSteps) return state;
      return { ...state, phase: 'complete', finished: true };
    }
    case 'RESET':
      return createInitialStepSyncState(0, totalSteps);
    default:
      return state;
  }
}

export function useStepSyncMachine(
  totalSteps: number,
  initialRevealed = 0,
): StepSyncMachine {
  const safeTotal = Math.max(1, totalSteps);

  const [state, rawDispatch] = useReducer(
    (s: StepSyncState, e: StepSyncEvent) => stepSyncReducer(s, e, safeTotal),
    undefined,
    () => createInitialStepSyncState(initialRevealed, safeTotal),
  );

  const dispatch = useCallback((event: StepSyncEvent) => {
    rawDispatch(event);
  }, []);

  const revealNext = useCallback(() => dispatch({ type: 'REVEAL_NEXT' }), [dispatch]);
  const revealPrev = useCallback(() => dispatch({ type: 'REVEAL_PREV' }), [dispatch]);
  const goTo = useCallback(
    (revealedCount: number) => dispatch({ type: 'GO_TO', revealedCount }),
    [dispatch],
  );
  const finish = useCallback(() => dispatch({ type: 'FINISH' }), [dispatch]);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), [dispatch]);

  const animationStepIndex = useMemo(
    () => animationStepIndexFromRevealed(state.revealedCount),
    [state.revealedCount],
  );

  return {
    state,
    totalSteps: safeTotal,
    animationStepIndex,
    dispatch,
    revealNext,
    revealPrev,
    goTo,
    finish,
    reset,
  };
}
