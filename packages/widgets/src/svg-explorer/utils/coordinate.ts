import type { SvgRegion } from '../types.js';

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function screenToSvg(
  screenX: number,
  screenY: number,
  svgBounds: DOMRect,
  viewBox: ViewBox,
): { x: number; y: number } {
  return {
    x: (screenX - svgBounds.left) * (viewBox.width / svgBounds.width) + viewBox.x,
    y: (screenY - svgBounds.top) * (viewBox.height / svgBounds.height) + viewBox.y,
  };
}

export function svgToScreen(
  svgX: number,
  svgY: number,
  svgBounds: DOMRect,
  viewBox: ViewBox,
): { x: number; y: number } {
  return {
    x: (svgX - viewBox.x) * (svgBounds.width / viewBox.width) + svgBounds.left,
    y: (svgY - viewBox.y) * (svgBounds.height / viewBox.height) + svgBounds.top,
  };
}

export function getRegionCenter(region: SvgRegion): { x: number; y: number } {
  return {
    x: region.bbox.x + region.bbox.width / 2,
    y: region.bbox.y + region.bbox.height / 2,
  };
}
