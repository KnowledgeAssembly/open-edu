import React, { useCallback } from 'react';
import type { SvgRegion as SvgRegionType } from './types.js';

export interface SvgRegionProps {
  region: SvgRegionType;
  selected: boolean;
  focused: boolean;
  hovered: boolean;
  interactive: boolean;
  onSelect: (regionId: string) => void;
  onHover: (regionId: string | null) => void;
  onFocus: (regionId: string | null) => void;
  ariaLabel: string;
  ariaDescription?: string;
  disabled?: boolean;
}

function SvgRegionComponent({
  region,
  selected,
  focused,
  hovered,
  interactive,
  onSelect,
  onHover,
  onFocus,
  ariaLabel,
  ariaDescription,
  disabled = false,
}: SvgRegionProps) {
  const classNames = [
    'oe-svg-region',
    selected && '--selected',
    focused && '--focus',
    hovered && '--hover',
    disabled && '--disabled',
  ]
    .filter(Boolean)
    .join(' ');

  const fillColor = selected
    ? 'var(--oe-color-selected, #3b82f6)'
    : hovered
      ? 'var(--oe-color-hover, #93c5fd)'
      : focused
        ? 'var(--oe-color-focus, #bfdbfe)'
        : 'var(--oe-color-default, transparent)';

  const style: React.CSSProperties = {
    fill: fillColor,
    cursor: interactive && !disabled ? 'pointer' : 'default',
    transition: 'fill 0.15s ease-in-out',
  };

  const handleClick = useCallback(() => {
    if (interactive && !disabled) {
      onSelect(region.id);
    }
  }, [interactive, disabled, onSelect, region.id]);

  const handleMouseEnter = useCallback(() => {
    if (interactive && !disabled) {
      onHover(region.id);
    }
  }, [interactive, disabled, onHover, region.id]);

  const handleMouseLeave = useCallback(() => {
    if (interactive && !disabled) {
      onHover(null);
    }
  }, [interactive, disabled, onHover]);

  const handleFocus = useCallback(() => {
    if (interactive && !disabled) {
      onFocus(region.id);
    }
  }, [interactive, disabled, onFocus, region.id]);

  const handleBlur = useCallback(() => {
    if (interactive && !disabled) {
      onFocus(null);
    }
  }, [interactive, disabled, onFocus]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (interactive && !disabled) {
          onSelect(region.id);
        }
      }
    },
    [interactive, disabled, onSelect, region.id],
  );

  return React.cloneElement(region.element, {
    className: classNames,
    style: { ...(region.element.style || {}), ...style },
    role: interactive ? 'button' : 'img',
    tabIndex: interactive ? 0 : undefined,
    'aria-label': ariaLabel,
    'aria-description': ariaDescription,
    'aria-pressed': interactive ? selected : undefined,
    'aria-disabled': interactive ? disabled || undefined : undefined,
    onClick: handleClick,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
  });
}

export const SvgRegion = React.memo(SvgRegionComponent);
