import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSvgSelection } from './useSvgSelection.js';

describe('useSvgSelection', () => {
  describe('single mode', () => {
    it('selects a region in single mode (selectedIds has it, onSelect called)', () => {
      const onSelect = vi.fn();
      const onDeselect = vi.fn();
      const { result } = renderHook(() =>
        useSvgSelection({ mode: 'single', onSelect, onDeselect }),
      );

      act(() => {
        result.current.select('region-a');
      });

      expect(Array.from(result.current.selectedIds)).toEqual(['region-a']);
      expect(result.current.isSelected('region-a')).toBe(true);
      expect(onSelect).toHaveBeenCalledWith('region-a');
      expect(onDeselect).not.toHaveBeenCalled();
    });

    it('replaces selection in single mode (select A, select B -> only B selected)', () => {
      const onSelect = vi.fn();
      const onDeselect = vi.fn();
      const { result } = renderHook(() =>
        useSvgSelection({ mode: 'single', onSelect, onDeselect }),
      );

      act(() => {
        result.current.select('region-a');
      });
      act(() => {
        result.current.select('region-b');
      });

      expect(Array.from(result.current.selectedIds)).toEqual(['region-b']);
      expect(result.current.isSelected('region-b')).toBe(true);
      expect(result.current.isSelected('region-a')).toBe(false);
      expect(onSelect).toHaveBeenCalledTimes(2);
      expect(onDeselect).toHaveBeenCalledWith('region-a');
    });

    it('toggles off when selecting same region in single mode', () => {
      const onSelect = vi.fn();
      const onDeselect = vi.fn();
      const { result } = renderHook(() =>
        useSvgSelection({ mode: 'single', onSelect, onDeselect }),
      );

      act(() => {
        result.current.select('region-a');
      });
      act(() => {
        result.current.select('region-a');
      });

      expect(result.current.selectedIds.size).toBe(0);
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onDeselect).toHaveBeenCalledWith('region-a');
    });
  });

  describe('multi mode', () => {
    it('toggles selection in multi mode (select A, select B -> both, deselect A -> only B)', () => {
      const { result } = renderHook(() =>
        useSvgSelection({ mode: 'multi' }),
      );

      act(() => {
        result.current.select('region-a');
        result.current.select('region-b');
      });

      expect(result.current.selectedIds.size).toBe(2);
      expect(result.current.isSelected('region-a')).toBe(true);
      expect(result.current.isSelected('region-b')).toBe(true);

      act(() => {
        result.current.deselect('region-a');
      });

      expect(result.current.selectedIds.size).toBe(1);
      expect(result.current.isSelected('region-a')).toBe(false);
      expect(result.current.isSelected('region-b')).toBe(true);
    });
  });

  describe('none mode', () => {
    it('does nothing in none mode', () => {
      const onSelect = vi.fn();
      const onDeselect = vi.fn();
      const { result } = renderHook(() =>
        useSvgSelection({ mode: 'none', onSelect, onDeselect }),
      );

      act(() => {
        result.current.select('region-a');
        result.current.deselect('region-a');
        result.current.toggle('region-a');
        result.current.clear();
      });

      expect(result.current.selectedIds.size).toBe(0);
      expect(onSelect).not.toHaveBeenCalled();
      expect(onDeselect).not.toHaveBeenCalled();
    });
  });

  describe('common operations', () => {
    it('clears all selections', () => {
      const onDeselect = vi.fn();
      const { result } = renderHook(() =>
        useSvgSelection({ mode: 'multi', onDeselect }),
      );

      act(() => {
        result.current.select('region-a');
        result.current.select('region-b');
      });

      act(() => {
        result.current.clear();
      });

      expect(result.current.selectedIds.size).toBe(0);
      expect(onDeselect).toHaveBeenCalledWith('region-a');
      expect(onDeselect).toHaveBeenCalledWith('region-b');
    });

    it('checks isSelected correctly', () => {
      const { result } = renderHook(() =>
        useSvgSelection({ mode: 'multi' }),
      );

      expect(result.current.isSelected('region-a')).toBe(false);

      act(() => {
        result.current.select('region-a');
      });

      expect(result.current.isSelected('region-a')).toBe(true);
      expect(result.current.isSelected('region-b')).toBe(false);
    });

    it('toggle works in multi mode', () => {
      const onSelect = vi.fn();
      const onDeselect = vi.fn();
      const { result } = renderHook(() =>
        useSvgSelection({ mode: 'multi', onSelect, onDeselect }),
      );

      act(() => {
        result.current.toggle('region-a');
      });
      expect(result.current.isSelected('region-a')).toBe(true);
      expect(onSelect).toHaveBeenCalledWith('region-a');

      act(() => {
        result.current.toggle('region-a');
      });
      expect(result.current.isSelected('region-a')).toBe(false);
      expect(onDeselect).toHaveBeenCalledWith('region-a');
    });
  });
});
