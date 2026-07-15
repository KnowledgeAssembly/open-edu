import { describe, it, expect } from 'vitest';
import type { SvgRegion } from '../types.js';
import { screenToSvg, svgToScreen, getRegionCenter } from './coordinate.js';

function makeRegion(id: string, x: number, y: number, w: number, h: number): SvgRegion {
  return { id, element: {} as SVGElement, bbox: new DOMRect(x, y, w, h), visible: true };
}

describe('screenToSvg', () => {
  it('converts screen coords to SVG coords (800x600 screen -> 400x300 viewBox, point 400,300 -> 200,150)', () => {
    const svgBounds = new DOMRect(0, 0, 800, 600);
    const viewBox = { x: 0, y: 0, width: 400, height: 300 };
    const result = screenToSvg(400, 300, svgBounds, viewBox);
    expect(result.x).toBe(200);
    expect(result.y).toBe(150);
  });

  it('accounts for viewBox offset (50,100 offset)', () => {
    const svgBounds = new DOMRect(0, 0, 800, 600);
    const viewBox = { x: 50, y: 100, width: 400, height: 300 };
    const result = screenToSvg(400, 300, svgBounds, viewBox);
    expect(result.x).toBe(250);
    expect(result.y).toBe(250);
  });
});

describe('svgToScreen', () => {
  it('converts SVG coords to screen coords', () => {
    const svgBounds = new DOMRect(0, 0, 800, 600);
    const viewBox = { x: 0, y: 0, width: 400, height: 300 };
    const result = svgToScreen(200, 150, svgBounds, viewBox);
    expect(result.x).toBe(400);
    expect(result.y).toBe(300);
  });
});

describe('getRegionCenter', () => {
  it('returns center of bbox (10,20,40,30 -> x:30, y:35)', () => {
    const region = makeRegion('test', 10, 20, 40, 30);
    const result = getRegionCenter(region);
    expect(result.x).toBe(30);
    expect(result.y).toBe(35);
  });
});
