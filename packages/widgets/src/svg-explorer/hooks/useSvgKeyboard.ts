import { useMemo, useCallback } from 'react';
import type { SvgRegion } from '../types.js';
import { getRegionCenter } from '../utils/coordinate.js';

export interface UseSvgKeyboardOptions {
  regions: Map<string, SvgRegion>;
  focusedId: string | null;
  onSelect?: (regionId: string) => void;
  onFocus?: (regionId: string) => void;
  onEscape?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
}

export interface UseSvgKeyboardResult {
  handleKeyDown: (event: React.KeyboardEvent) => void;
}

function findNearest(
  regions: Map<string, SvgRegion>,
  sortedIds: string[],
  currentId: string,
  direction: 'prev' | 'next',
): string | null {
  const currentCenter = getRegionCenter(regions.get(currentId)!);
  const currentIndex = sortedIds.indexOf(currentId);

  if (direction === 'next') {
    const right = sortedIds
      .filter((id) => id !== currentId)
      .filter((id) => getRegionCenter(regions.get(id)!).x > currentCenter.x)
      .sort((a, b) => getRegionCenter(regions.get(a)!).x - getRegionCenter(regions.get(b)!).x);

    if (right.length > 0) return right[0]!;
    if (currentIndex >= 0 && currentIndex < sortedIds.length - 1)
      return sortedIds[currentIndex + 1]!;
    return sortedIds[0]!;
  }

  const left = sortedIds
    .filter((id) => id !== currentId)
    .filter((id) => getRegionCenter(regions.get(id)!).x < currentCenter.x)
    .sort((a, b) => getRegionCenter(regions.get(b)!).x - getRegionCenter(regions.get(a)!).x);

  if (left.length > 0) return left[0]!;
  if (currentIndex > 0) return sortedIds[currentIndex - 1]!;
  return sortedIds[sortedIds.length - 1]!;
}

export function useSvgKeyboard(options: UseSvgKeyboardOptions): UseSvgKeyboardResult {
  const { regions, focusedId, onSelect, onFocus, onEscape, onZoomIn, onZoomOut, onZoomReset } =
    options;

  const sortedIds = useMemo(() => {
    return Array.from(regions.entries())
      .filter(([, r]) => r.visible)
      .sort(([, a], [, b]) => {
        const ca = getRegionCenter(a);
        const cb = getRegionCenter(b);
        return ca.y - cb.y || ca.x - cb.x;
      })
      .map(([id]) => id);
  }, [regions]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowRight': {
          if (!focusedId || sortedIds.length === 0) return;
          event.preventDefault();
          const next = findNearest(regions, sortedIds, focusedId, 'next');
          if (next) onFocus?.(next);
          break;
        }
        case 'ArrowLeft': {
          if (!focusedId || sortedIds.length === 0) return;
          event.preventDefault();
          const prev = findNearest(regions, sortedIds, focusedId, 'prev');
          if (prev) onFocus?.(prev);
          break;
        }
        case 'ArrowDown':
        case 'Tab': {
          if (!focusedId || sortedIds.length === 0) return;
          event.preventDefault();
          const currentIndex = sortedIds.indexOf(focusedId);
          if (event.shiftKey) {
            if (currentIndex > 0) {
              onFocus?.(sortedIds[currentIndex - 1]!);
            } else {
              onFocus?.(sortedIds[sortedIds.length - 1]!);
            }
          } else {
            if (currentIndex >= 0 && currentIndex < sortedIds.length - 1) {
              onFocus?.(sortedIds[currentIndex + 1]!);
            } else {
              onFocus?.(sortedIds[0]!);
            }
          }
          break;
        }
        case 'ArrowUp': {
          if (!focusedId || sortedIds.length === 0) return;
          event.preventDefault();
          const currentIndex = sortedIds.indexOf(focusedId);
          if (currentIndex > 0) {
            onFocus?.(sortedIds[currentIndex - 1]!);
          } else {
            onFocus?.(sortedIds[sortedIds.length - 1]!);
          }
          break;
        }
        case 'Enter':
        case ' ':
          if (focusedId) {
            event.preventDefault();
            onSelect?.(focusedId);
          }
          break;
        case 'Escape':
          event.preventDefault();
          onEscape?.();
          break;
        case '+':
        case '=':
          event.preventDefault();
          onZoomIn?.();
          break;
        case '-':
          event.preventDefault();
          onZoomOut?.();
          break;
        case 'Home':
          event.preventDefault();
          onZoomReset?.();
          break;
      }
    },
    [regions, sortedIds, focusedId, onSelect, onFocus, onEscape, onZoomIn, onZoomOut, onZoomReset],
  );

  return { handleKeyDown };
}
