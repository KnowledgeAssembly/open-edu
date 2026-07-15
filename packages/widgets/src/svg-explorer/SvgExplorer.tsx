import { useState, useRef, useCallback } from 'react';
import type { SvgExplorerConfig, SvgExplorerEvent } from './types.js';
import { useSvgLoader } from './hooks/useSvgLoader.js';
import { useSvgSelection } from './hooks/useSvgSelection.js';
import { useSvgZoom } from './hooks/useSvgZoom.js';
import { useSvgKeyboard } from './hooks/useSvgKeyboard.js';
import { SvgRegion } from './SvgRegion.js';

export interface SvgExplorerProps extends Omit<SvgExplorerConfig, 'src' | 'labels' | 'layers'> {
  src: string;
  onEvent: (event: SvgExplorerEvent) => void;
  className?: string;
}

export function SvgExplorer(props: SvgExplorerProps) {
  const {
    src,
    regions: regionConfigs,
    selection = 'single',
    zoom: zoomConfig,
    onEvent,
    className,
  } = props;

  const regionIds = regionConfigs.map((r) => r.id);
  const regionMetaMap = new Map(regionConfigs.map((r) => [r.id, r]));

  const { loading, error, svgElement, regions, viewBox } = useSvgLoader({ src, regionIds });

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback(
    (regionId: string) => onEvent({ type: 'region:select', regionId }),
    [onEvent],
  );
  const handleDeselect = useCallback(
    (regionId: string) => onEvent({ type: 'region:deselect', regionId }),
    [onEvent],
  );

  const { select, clear, isSelected } = useSvgSelection({
    mode: selection,
    onSelect: handleSelect,
    onDeselect: handleDeselect,
  });

  const zoomEnabled = zoomConfig?.enabled ?? false;
  const { zoom, zoomIn, zoomOut, reset } = useSvgZoom({
    min: zoomConfig?.min,
    max: zoomConfig?.max,
    step: zoomConfig?.step,
    onZoomChange: (level) => onEvent({ type: 'zoom:change', level }),
  });

  const handleEscape = useCallback(() => {
    clear();
    onEvent({ type: 'region:focus', regionId: null });
  }, [clear, onEvent]);

  const { handleKeyDown } = useSvgKeyboard({
    regions,
    focusedId,
    onSelect: (id) => {
      select(id);
      onEvent({ type: 'region:select', regionId: id });
    },
    onFocus: (id) => {
      setFocusedId(id);
      onEvent({ type: 'region:focus', regionId: id });
    },
    onEscape: handleEscape,
    onZoomIn: zoomEnabled ? zoomIn : undefined,
    onZoomOut: zoomEnabled ? zoomOut : undefined,
    onZoomReset: zoomEnabled ? reset : undefined,
  });

  if (loading) {
    return (
      <div role="status" aria-label="Loading SVG" className="p-4 text-center">
        <span className="text-on-surface-variant">Loading map...</span>
      </div>
    );
  }

  if (error || !svgElement) {
    return (
      <div role="alert" className="p-4 text-center">
        <span className="text-error">Failed to load map: {error}</span>
      </div>
    );
  }

  const interactive = selection !== 'none';

  return (
    <div
      ref={svgContainerRef}
      role="group"
      aria-label="SVG Explorer"
      className={`relative overflow-hidden ${className ?? ''}`}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <svg
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role={interactive ? 'application' : 'img'}
        aria-label="Interactive map"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          transition: 'transform 200ms ease-in-out',
        }}
      >
        {Array.from(regions.values()).map((region) => {
          const meta = regionMetaMap.get(region.id);
          return (
            <SvgRegion
              key={region.id}
              region={region}
              selected={isSelected(region.id)}
              focused={focusedId === region.id}
              hovered={hoveredId === region.id}
              interactive={interactive}
              onSelect={select}
              onHover={setHoveredId}
              onFocus={setFocusedId}
              ariaLabel={meta?.name ?? region.id}
              ariaDescription={meta?.description}
            />
          );
        })}
      </svg>

      {zoomEnabled && (
        <div
          className="absolute bottom-2 right-2 flex gap-1"
          role="toolbar"
          aria-label="Zoom controls"
        >
          <button
            onClick={zoomIn}
            aria-label="Zoom in"
            className="bg-surface-container hover:bg-surface-container-high rounded px-2 py-1 text-sm"
          >
            +
          </button>
          <button
            onClick={zoomOut}
            aria-label="Zoom out"
            className="bg-surface-container hover:bg-surface-container-high rounded px-2 py-1 text-sm"
          >
            −
          </button>
          <button
            onClick={reset}
            aria-label="Reset zoom"
            className="bg-surface-container hover:bg-surface-container-high rounded px-2 py-1 text-sm"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
