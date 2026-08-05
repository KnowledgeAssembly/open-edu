import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useStepSyncMachine,
  stepSyncReducer,
  createInitialStepSyncState,
  animationStepIndexFromRevealed,
} from '../useStepSyncMachine.js';

describe('stepSyncReducer', () => {
  it('starts idle with zero revealed', () => {
    const state = createInitialStepSyncState(0, 4);
    expect(state).toEqual({ revealedCount: 0, phase: 'idle', finished: false });
  });

  it('REVEAL_NEXT advances through active to complete', () => {
    let state = createInitialStepSyncState(0, 3);
    state = stepSyncReducer(state, { type: 'REVEAL_NEXT' }, 3);
    expect(state).toEqual({ revealedCount: 1, phase: 'active', finished: false });

    state = stepSyncReducer(state, { type: 'REVEAL_NEXT' }, 3);
    expect(state.revealedCount).toBe(2);
    expect(state.phase).toBe('active');

    state = stepSyncReducer(state, { type: 'REVEAL_NEXT' }, 3);
    expect(state).toEqual({ revealedCount: 3, phase: 'complete', finished: false });

    state = stepSyncReducer(state, { type: 'REVEAL_NEXT' }, 3);
    expect(state.revealedCount).toBe(3);
  });

  it('GO_TO jumps and FINISH requires all steps', () => {
    let state = createInitialStepSyncState(0, 4);
    state = stepSyncReducer(state, { type: 'GO_TO', revealedCount: 2 }, 4);
    expect(state.phase).toBe('active');
    expect(state.revealedCount).toBe(2);

    state = stepSyncReducer(state, { type: 'FINISH' }, 4);
    expect(state.finished).toBe(false);

    state = stepSyncReducer(state, { type: 'GO_TO', revealedCount: 4 }, 4);
    state = stepSyncReducer(state, { type: 'FINISH' }, 4);
    expect(state.finished).toBe(true);
    expect(state.phase).toBe('complete');
  });

  it('RESET returns to idle', () => {
    let state = createInitialStepSyncState(3, 3);
    state = stepSyncReducer(state, { type: 'FINISH' }, 3);
    state = stepSyncReducer(state, { type: 'RESET' }, 3);
    expect(state).toEqual({ revealedCount: 0, phase: 'idle', finished: false });
  });

  it('maps revealedCount to animation step index', () => {
    expect(animationStepIndexFromRevealed(0)).toBe(-1);
    expect(animationStepIndexFromRevealed(1)).toBe(0);
    expect(animationStepIndexFromRevealed(4)).toBe(3);
  });
});

describe('useStepSyncMachine', () => {
  it('exposes revealNext and animationStepIndex in lockstep', () => {
    const { result } = renderHook(() => useStepSyncMachine(4));

    expect(result.current.state.phase).toBe('idle');
    expect(result.current.animationStepIndex).toBe(-1);

    act(() => result.current.revealNext());
    expect(result.current.state.revealedCount).toBe(1);
    expect(result.current.animationStepIndex).toBe(0);
    expect(result.current.state.phase).toBe('active');

    act(() => result.current.revealNext());
    expect(result.current.state.revealedCount).toBe(2);
    expect(result.current.animationStepIndex).toBe(1);
  });

  it('goTo sets both reveal and animation index', () => {
    const { result } = renderHook(() => useStepSyncMachine(4));
    act(() => result.current.goTo(3));
    expect(result.current.state.revealedCount).toBe(3);
    expect(result.current.animationStepIndex).toBe(2);
  });
});
