import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { SvgRegion } from '../types.js';
import { useSvgKeyboard } from './useSvgKeyboard.js';

function makeRegions(ids: string[]): Map<string, SvgRegion> {
  return new Map(
    ids.map((id, i) => [
      id,
      {
        id,
        element: {} as SVGElement,
        bbox: new DOMRect(i * 100, 0, 80, 60),
        visible: true,
      } as SvgRegion,
    ]),
  );
}

function createEvent(key: string, shiftKey = false): React.KeyboardEvent {
  return {
    key,
    shiftKey,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as React.KeyboardEvent;
}

describe('useSvgKeyboard', () => {
  it('moves focus right with ArrowRight (a -> b)', () => {
    const onFocus = vi.fn();
    const { result } = renderHook(() =>
      useSvgKeyboard({
        regions: makeRegions(['a', 'b', 'c']),
        focusedId: 'a',
        onFocus,
      }),
    );

    result.current.handleKeyDown(createEvent('ArrowRight'));

    expect(onFocus).toHaveBeenCalledWith('b');
  });

  it('moves focus left with ArrowLeft (b -> a)', () => {
    const onFocus = vi.fn();
    const { result } = renderHook(() =>
      useSvgKeyboard({
        regions: makeRegions(['a', 'b', 'c']),
        focusedId: 'b',
        onFocus,
      }),
    );

    result.current.handleKeyDown(createEvent('ArrowLeft'));

    expect(onFocus).toHaveBeenCalledWith('a');
  });

  it('wraps around at the end (c -> a)', () => {
    const onFocus = vi.fn();
    const { result } = renderHook(() =>
      useSvgKeyboard({
        regions: makeRegions(['a', 'b', 'c']),
        focusedId: 'c',
        onFocus,
      }),
    );

    result.current.handleKeyDown(createEvent('ArrowRight'));

    expect(onFocus).toHaveBeenCalledWith('a');
  });

  it('wraps around at the start (a -> c)', () => {
    const onFocus = vi.fn();
    const { result } = renderHook(() =>
      useSvgKeyboard({
        regions: makeRegions(['a', 'b', 'c']),
        focusedId: 'a',
        onFocus,
      }),
    );

    result.current.handleKeyDown(createEvent('ArrowLeft'));

    expect(onFocus).toHaveBeenCalledWith('c');
  });

  it('calls onSelect on Enter', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useSvgKeyboard({
        regions: makeRegions(['a', 'b']),
        focusedId: 'a',
        onSelect,
      }),
    );

    result.current.handleKeyDown(createEvent('Enter'));

    expect(onSelect).toHaveBeenCalledWith('a');
  });

  it('calls onSelect on Space', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useSvgKeyboard({
        regions: makeRegions(['a', 'b']),
        focusedId: 'a',
        onSelect,
      }),
    );

    result.current.handleKeyDown(createEvent(' '));

    expect(onSelect).toHaveBeenCalledWith('a');
  });

  it('calls onZoomIn on +', () => {
    const onZoomIn = vi.fn();
    const { result } = renderHook(() =>
      useSvgKeyboard({
        regions: makeRegions(['a', 'b']),
        focusedId: 'a',
        onZoomIn,
      }),
    );

    result.current.handleKeyDown(createEvent('+'));

    expect(onZoomIn).toHaveBeenCalled();
  });

  it('calls onZoomIn on =', () => {
    const onZoomIn = vi.fn();
    const { result } = renderHook(() =>
      useSvgKeyboard({
        regions: makeRegions(['a', 'b']),
        focusedId: 'a',
        onZoomIn,
      }),
    );

    result.current.handleKeyDown(createEvent('='));

    expect(onZoomIn).toHaveBeenCalled();
  });

  it('calls onZoomOut on -', () => {
    const onZoomOut = vi.fn();
    const { result } = renderHook(() =>
      useSvgKeyboard({
        regions: makeRegions(['a', 'b']),
        focusedId: 'a',
        onZoomOut,
      }),
    );

    result.current.handleKeyDown(createEvent('-'));

    expect(onZoomOut).toHaveBeenCalled();
  });

  it('calls onEscape on Escape', () => {
    const onEscape = vi.fn();
    const { result } = renderHook(() =>
      useSvgKeyboard({
        regions: makeRegions(['a', 'b']),
        focusedId: 'a',
        onEscape,
      }),
    );

    result.current.handleKeyDown(createEvent('Escape'));

    expect(onEscape).toHaveBeenCalled();
  });

  it('calls onZoomReset on Home', () => {
    const onZoomReset = vi.fn();
    const { result } = renderHook(() =>
      useSvgKeyboard({
        regions: makeRegions(['a', 'b']),
        focusedId: 'a',
        onZoomReset,
      }),
    );

    result.current.handleKeyDown(createEvent('Home'));

    expect(onZoomReset).toHaveBeenCalled();
  });

  it('moves focus forward on Tab (a -> b)', () => {
    const onFocus = vi.fn();
    const { result } = renderHook(() =>
      useSvgKeyboard({
        regions: makeRegions(['a', 'b', 'c']),
        focusedId: 'a',
        onFocus,
      }),
    );

    result.current.handleKeyDown(createEvent('Tab'));

    expect(onFocus).toHaveBeenCalledWith('b');
  });

  it('moves focus backward on Shift+Tab (b -> a)', () => {
    const onFocus = vi.fn();
    const { result } = renderHook(() =>
      useSvgKeyboard({
        regions: makeRegions(['a', 'b', 'c']),
        focusedId: 'b',
        onFocus,
      }),
    );

    result.current.handleKeyDown(createEvent('Tab', true));

    expect(onFocus).toHaveBeenCalledWith('a');
  });

  it('wraps around on Shift+Tab at start (a -> c)', () => {
    const onFocus = vi.fn();
    const { result } = renderHook(() =>
      useSvgKeyboard({
        regions: makeRegions(['a', 'b', 'c']),
        focusedId: 'a',
        onFocus,
      }),
    );

    result.current.handleKeyDown(createEvent('Tab', true));

    expect(onFocus).toHaveBeenCalledWith('c');
  });
});
