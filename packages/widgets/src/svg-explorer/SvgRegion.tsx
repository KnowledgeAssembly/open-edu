import React, { useCallback, useMemo } from 'react';
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

function createReactElementFromDom(el: SVGElement): React.ReactElement | null {
  const tagName = el.tagName.toLowerCase();
  const props: Record<string, unknown> = {};
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes.item(i);
    if (attr && attr.name !== 'class' && attr.name !== 'id' && attr.name !== 'style') {
      props[attr.name] = attr.value;
    }
  }
  return React.createElement(tagName, props);
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
  const baseElement = useMemo(() => {
    try {
      const el = region.element;
      return createReactElementFromDom(el);
    } catch {
      return null;
    }
  }, [region.element]);

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

  const style: Record<string, string> = {
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

  if (!baseElement) {
    return null;
  }

  return React.cloneElement(baseElement, {
    className: classNames,
    style,
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
