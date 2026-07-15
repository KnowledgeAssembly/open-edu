import { useState, useCallback } from 'react';

export interface UseSvgSelectionOptions {
  mode: 'single' | 'multi' | 'none';
  onSelect?: (regionId: string) => void;
  onDeselect?: (regionId: string) => void;
}

export interface UseSvgSelectionResult {
  selectedIds: Set<string>;
  select: (regionId: string) => void;
  deselect: (regionId: string) => void;
  toggle: (regionId: string) => void;
  clear: () => void;
  isSelected: (regionId: string) => boolean;
}

export function useSvgSelection(options: UseSvgSelectionOptions): UseSvgSelectionResult {
  const { mode, onSelect, onDeselect } = options;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const select = useCallback(
    (regionId: string) => {
      if (mode === 'none') return;
      setSelectedIds((prev) => {
        if (mode === 'single') {
          const prevId = prev.values().next().value;
          if (prevId === regionId) {
            onDeselect?.(regionId);
            return new Set();
          }
          if (prevId !== undefined) {
            onDeselect?.(prevId);
          }
          onSelect?.(regionId);
          return new Set([regionId]);
        }
        if (!prev.has(regionId)) {
          onSelect?.(regionId);
          return new Set(prev).add(regionId);
        }
        return prev;
      });
    },
    [mode, onSelect, onDeselect],
  );

  const deselect = useCallback(
    (regionId: string) => {
      if (mode === 'none') return;
      setSelectedIds((prev) => {
        if (!prev.has(regionId)) return prev;
        onDeselect?.(regionId);
        const next = new Set(prev);
        next.delete(regionId);
        return next;
      });
    },
    [mode, onDeselect],
  );

  const toggle = useCallback(
    (regionId: string) => {
      if (mode === 'none') return;
      setSelectedIds((prev) => {
        if (prev.has(regionId)) {
          onDeselect?.(regionId);
          const next = new Set(prev);
          next.delete(regionId);
          return next;
        }
        if (mode === 'single') {
          const prevId = prev.values().next().value;
          if (prevId !== undefined) {
            onDeselect?.(prevId);
          }
        }
        onSelect?.(regionId);
        return mode === 'single' ? new Set([regionId]) : new Set(prev).add(regionId);
      });
    },
    [mode, onSelect, onDeselect],
  );

  const clear = useCallback(() => {
    if (mode === 'none') return;
    setSelectedIds((prev) => {
      for (const id of prev) {
        onDeselect?.(id);
      }
      return new Set();
    });
  }, [mode, onDeselect]);

  const isSelected = useCallback(
    (regionId: string) => selectedIds.has(regionId),
    [selectedIds],
  );

  return { selectedIds, select, deselect, toggle, clear, isSelected };
}
