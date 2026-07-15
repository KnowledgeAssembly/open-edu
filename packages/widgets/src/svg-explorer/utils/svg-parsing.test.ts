import { describe, it, expect } from 'vitest';
import { parseSvgRegions, extractRegionsFromSvg } from './svg-parsing.js';

function createSvgString(paths: Array<{ id: string; d?: string }>): string {
  const elements = paths
    .map((p) => `<path id="${p.id}" d="${p.d ?? 'M0 0L10 10'}"/>`)
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${elements}</svg>`;
}

describe('parseSvgRegions', () => {
  it('parses SVG string and extracts regions by id', () => {
    const svg = createSvgString([
      { id: 'odisha' },
      { id: 'karnataka' },
      { id: 'maharashtra' },
    ]);
    const result = parseSvgRegions(svg, ['odisha', 'karnataka', 'maharashtra']);
    expect(result.regions.size).toBe(3);
    expect(result.regions.has('odisha')).toBe(true);
    expect(result.regions.has('karnataka')).toBe(true);
    expect(result.regions.has('maharashtra')).toBe(true);
  });

  it('ignores elements not in the requested id list', () => {
    const svg = createSvgString([
      { id: 'odisha' },
      { id: 'background' },
    ]);
    const result = parseSvgRegions(svg, ['odisha']);
    expect(result.regions.size).toBe(1);
    expect(result.regions.has('odisha')).toBe(true);
    expect(result.regions.has('background')).toBe(false);
  });

  it('returns bounding boxes for each region', () => {
    const svg = createSvgString([{ id: 'region1' }]);
    const result = parseSvgRegions(svg, ['region1']);
    const region = result.regions.get('region1');
    expect(region).toBeDefined();
    expect(region!.bbox).toBeDefined();
    expect(region!.bbox.width).toBeGreaterThanOrEqual(0);
  });

  it('parses viewBox from SVG root', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 20 300 400">
      <path id="a" d="M0 0L10 10"/>
    </svg>`;
    const result = parseSvgRegions(svg, ['a']);
    expect(result.viewBox).toEqual({ x: 10, y: 20, width: 300, height: 400 });
  });

  it('handles missing viewBox with default', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <path id="a" d="M0 0L10 10"/>
    </svg>`;
    const result = parseSvgRegions(svg, ['a']);
    expect(result.viewBox).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });

  it('throws on invalid SVG', () => {
    expect(() => parseSvgRegions('not svg', ['a'])).toThrow();
  });
});

describe('extractRegionsFromSvg', () => {
  it('returns the parsed SVGSVGElement', () => {
    const svg = createSvgString([{ id: 'a' }]);
    const result = extractRegionsFromSvg(svg);
    expect(result.svgElement).toBeInstanceOf(SVGSVGElement);
  });

  it('finds path, rect, circle, and polygon elements with ids', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path id="p1" d="M0 0L10 10"/>
      <rect id="r1" x="0" y="0" width="10" height="10"/>
      <circle id="c1" cx="5" cy="5" r="5"/>
      <polygon id="pg1" points="0,0 10,0 5,10"/>
      <g id="g1"><path id="nested" d="M0 0L5 5"/></g>
    </svg>`;
    const result = extractRegionsFromSvg(svg);
    expect(result.size).toBe(5);
  });
});
