import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useObserveMode } from './use-observe-mode';

describe('useObserveMode', () => {
  it('shows acknowledge button when isObserve is true and not acknowledged', () => {
    const { result } = renderHook(() =>
      useObserveMode({
        isObserve: true,
        onComplete: vi.fn(),
        onInteract: vi.fn(),
        widgetId: 'test-widget',
      }),
    );
    expect(result.current.showAcknowledgeButton).toBe(true);
    expect(result.current.acknowledged).toBe(false);
  });

  it('hides acknowledge button when isObserve is false', () => {
    const { result } = renderHook(() =>
      useObserveMode({
        isObserve: false,
        onComplete: vi.fn(),
        onInteract: vi.fn(),
        widgetId: 'test-widget',
      }),
    );
    expect(result.current.showAcknowledgeButton).toBe(false);
  });

  it('hides acknowledge button after acknowledge is clicked', () => {
    const { result } = renderHook(() =>
      useObserveMode({
        isObserve: true,
        onComplete: vi.fn(),
        onInteract: vi.fn(),
        widgetId: 'test-widget',
      }),
    );

    act(() => {
      result.current.handleAcknowledge();
    });

    expect(result.current.showAcknowledgeButton).toBe(false);
    expect(result.current.acknowledged).toBe(true);
  });

  it('calls onComplete with 100 when acknowledge is clicked', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useObserveMode({
        isObserve: true,
        onComplete,
        onInteract: vi.fn(),
        widgetId: 'test-widget',
      }),
    );

    act(() => {
      result.current.handleAcknowledge();
    });

    expect(onComplete).toHaveBeenCalledWith(100);
  });

  it('calls onInteract with correct data when acknowledge is clicked', () => {
    const onInteract = vi.fn();
    const { result } = renderHook(() =>
      useObserveMode({
        isObserve: true,
        onComplete: vi.fn(),
        onInteract,
        widgetId: 'my-widget',
      }),
    );

    act(() => {
      result.current.handleAcknowledge();
    });

    expect(onInteract).toHaveBeenCalledWith({
      type: 'widget.interaction',
      action: 'observe',
      observed: true,
      correct: true,
      widgetId: 'my-widget',
      acknowledged: true,
    });
  });

  it('calls onComplete even when not in observe mode', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useObserveMode({
        isObserve: false,
        onComplete,
        onInteract: vi.fn(),
        widgetId: 'test-widget',
      }),
    );

    act(() => {
      result.current.handleAcknowledge();
    });

    expect(onComplete).toHaveBeenCalledWith(100);
  });
});
