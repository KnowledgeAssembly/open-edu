import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSvgZoom } from './useSvgZoom.js';

describe('useSvgZoom', () => {
  it('starts at zoom level 1', () => {
    const { result } = renderHook(() => useSvgZoom());
    expect(result.current.zoom).toBe(1);
  });

  it('zooms in by step (1 -> 1.25)', () => {
    const { result } = renderHook(() => useSvgZoom({ step: 0.25 }));
    act(() => {
      result.current.zoomIn();
    });
    expect(result.current.zoom).toBe(1.25);
  });

  it('zooms out by step (1 -> 0.75)', () => {
    const { result } = renderHook(() => useSvgZoom({ step: 0.25 }));
    act(() => {
      result.current.zoomOut();
    });
    expect(result.current.zoom).toBe(0.75);
  });

  it('clamps to max', () => {
    const { result } = renderHook(() => useSvgZoom({ min: 0.5, max: 2, step: 1 }));
    act(() => {
      result.current.zoomIn();
    });
    expect(result.current.zoom).toBe(2);
    act(() => {
      result.current.zoomIn();
    });
    expect(result.current.zoom).toBe(2);
  });

  it('clamps to min', () => {
    const { result } = renderHook(() => useSvgZoom({ min: 0.5, max: 3, step: 1 }));
    act(() => {
      result.current.zoomOut();
    });
    expect(result.current.zoom).toBe(0.5);
    act(() => {
      result.current.zoomOut();
    });
    expect(result.current.zoom).toBe(0.5);
  });

  it('resets to 1', () => {
    const { result } = renderHook(() => useSvgZoom());
    act(() => {
      result.current.zoomIn();
      result.current.zoomIn();
    });
    expect(result.current.zoom).toBeGreaterThan(1);
    act(() => {
      result.current.reset();
    });
    expect(result.current.zoom).toBe(1);
  });

  it('calls onZoomChange callback', () => {
    const onZoomChange = vi.fn();
    const { result } = renderHook(() => useSvgZoom({ onZoomChange }));
    act(() => {
      result.current.zoomIn();
    });
    expect(onZoomChange).toHaveBeenCalledWith(1.25);

    act(() => {
      result.current.setZoom(2);
    });
    expect(onZoomChange).toHaveBeenCalledWith(2);
  });
});
