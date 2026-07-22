import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResizablePanel } from '../hooks/useResizablePanel';

describe('useResizablePanel', () => {
  const defaultOptions = {
    initialWidth: 320,
    minWidth: 280,
    maxWidth: 600,
  };

  it('returns initial width', () => {
    const { result } = renderHook(() => useResizablePanel(defaultOptions));
    expect(result.current.width).toBe(320);
  });

  it('returns panelStyle with correct width', () => {
    const { result } = renderHook(() => useResizablePanel(defaultOptions));
    expect(result.current.panelStyle).toEqual({ width: 320 });
  });

  it('isDragging is false initially', () => {
    const { result } = renderHook(() => useResizablePanel(defaultOptions));
    expect(result.current.isDragging).toBe(false);
  });

  it('clamps width to minWidth via keyboard', () => {
    const { result } = renderHook(() => useResizablePanel(defaultOptions));
    act(() => {
      result.current.handleProps.onKeyDown({
        key: 'ArrowLeft',
        preventDefault: vi.fn(),
        shiftKey: false,
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.width).toBe(310);
    act(() => {
      result.current.handleProps.onKeyDown({
        key: 'ArrowLeft',
        preventDefault: vi.fn(),
        shiftKey: true,
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.width).toBe(280);
    act(() => {
      result.current.handleProps.onKeyDown({
        key: 'ArrowLeft',
        preventDefault: vi.fn(),
        shiftKey: true,
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.width).toBe(280);
  });

  it('clamps width to maxWidth via keyboard', () => {
    const { result } = renderHook(() => useResizablePanel(defaultOptions));
    act(() => {
      result.current.handleProps.onKeyDown({
        key: 'ArrowRight',
        preventDefault: vi.fn(),
        shiftKey: true,
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.width).toBe(360);
    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current.handleProps.onKeyDown({
          key: 'ArrowRight',
          preventDefault: vi.fn(),
          shiftKey: true,
        } as unknown as React.KeyboardEvent);
      });
    }
    expect(result.current.width).toBe(600);
  });

  it('uses shift+arrow for 40px step, plain arrow for 10px step', () => {
    const { result } = renderHook(() => useResizablePanel(defaultOptions));
    act(() => {
      result.current.handleProps.onKeyDown({
        key: 'ArrowRight',
        preventDefault: vi.fn(),
        shiftKey: true,
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.width).toBe(360);
    act(() => {
      result.current.handleProps.onKeyDown({
        key: 'ArrowRight',
        preventDefault: vi.fn(),
        shiftKey: false,
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.width).toBe(370);
  });

  it('sets dragging state on mousedown and clears on mouseup', () => {
    const { result } = renderHook(() => useResizablePanel(defaultOptions));
    act(() => {
      result.current.handleProps.onMouseDown({
        clientX: 500,
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent);
    });
    expect(result.current.isDragging).toBe(true);

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'));
    });
    expect(result.current.isDragging).toBe(false);
  });

  it('calls onWidthChange after drag end', () => {
    const onWidthChange = vi.fn();
    const { result } = renderHook(() => useResizablePanel({ ...defaultOptions, onWidthChange }));
    act(() => {
      result.current.handleProps.onKeyDown({
        key: 'ArrowRight',
        preventDefault: vi.fn(),
        shiftKey: false,
      } as unknown as React.KeyboardEvent);
    });
    expect(onWidthChange).toHaveBeenCalledWith(330);
  });

  it('sets aria attributes on handle', () => {
    const { result } = renderHook(() => useResizablePanel(defaultOptions));
    const props = result.current.handleProps;
    expect(props.role).toBe('separator');
    expect(props['aria-orientation']).toBe('vertical');
    expect(props['aria-valuemin']).toBe(280);
    expect(props['aria-valuemax']).toBe(600);
    expect(props['aria-valuenow']).toBe(320);
  });
});
