import type { SvgRegion, SvgLoadResult } from '../types.js';

const INTERACTIVE_TAGS = new Set(['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline']);

function parseSvgDoc(
  svgString: string
): { svgElement: SVGSVGElement; allElements: Element[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`Invalid SVG: ${parseError.textContent}`);
  }

  const svgElement = doc.documentElement as unknown as SVGSVGElement;
  const allElements = Array.from(svgElement.querySelectorAll('[id]'));

  return { svgElement, allElements };
}

function extractRegions(allElements: Element[]): Map<string, SvgRegion> {
  const regions = new Map<string, SvgRegion>();

  for (const el of allElements) {
    if (!INTERACTIVE_TAGS.has(el.tagName.toLowerCase())) continue;

    const id = el.getAttribute('id')!;
    let bbox: DOMRect;
    try {
      const svgEl = el as unknown as SVGGraphicsElement;
      bbox = svgEl.getBBox();
    } catch {
      bbox = getBBoxFromAttributes(el);
    }

    regions.set(id, {
      id,
      element: el as unknown as SVGElement,
      bbox: new DOMRect(bbox.x, bbox.y, bbox.width, bbox.height),
      visible: true,
    });
  }

  return regions;
}

export function extractRegionsFromSvg(svgString: string): Map<string, SvgRegion> {
  const { allElements } = parseSvgDoc(svgString);
  return extractRegions(allElements);
}

function getBBoxFromAttributes(el: Element): DOMRect {
  const tag = el.tagName.toLowerCase();

  if (tag === 'rect') {
    const x = parseFloat(el.getAttribute('x') ?? '0');
    const y = parseFloat(el.getAttribute('y') ?? '0');
    const width = parseFloat(el.getAttribute('width') ?? '0');
    const height = parseFloat(el.getAttribute('height') ?? '0');
    return new DOMRect(x, y, width, height);
  }

  if (tag === 'circle') {
    const cx = parseFloat(el.getAttribute('cx') ?? '0');
    const cy = parseFloat(el.getAttribute('cy') ?? '0');
    const r = parseFloat(el.getAttribute('r') ?? '0');
    return new DOMRect(cx - r, cy - r, r * 2, r * 2);
  }

  if (tag === 'ellipse') {
    const cx = parseFloat(el.getAttribute('cx') ?? '0');
    const cy = parseFloat(el.getAttribute('cy') ?? '0');
    const rx = parseFloat(el.getAttribute('rx') ?? '0');
    const ry = parseFloat(el.getAttribute('ry') ?? '0');
    return new DOMRect(cx - rx, cy - ry, rx * 2, ry * 2);
  }

  return new DOMRect(0, 0, 0, 0);
}

function parseViewBox(svgElement: SVGSVGElement): { x: number; y: number; width: number; height: number } {
  const viewBox = svgElement.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
      return { x: parts[0]!, y: parts[1]!, width: parts[2]!, height: parts[3]! };
    }
  }
  return { x: 0, y: 0, width: 100, height: 100 };
}

export function parseSvgRegions(
  svgString: string,
  regionIds: string[]
): SvgLoadResult {
  const { svgElement, allElements } = parseSvgDoc(svgString);
  const viewBox = parseViewBox(svgElement);

  const regions = new Map<string, SvgRegion>();
  const idSet = new Set(regionIds);

  for (const el of allElements) {
    if (!INTERACTIVE_TAGS.has(el.tagName.toLowerCase())) continue;

    const id = el.getAttribute('id')!;
    if (!idSet.has(id)) continue;

    let bbox: DOMRect;
    try {
      const svgEl = el as unknown as SVGGraphicsElement;
      bbox = svgEl.getBBox();
    } catch {
      bbox = getBBoxFromAttributes(el);
    }

    regions.set(id, {
      id,
      element: el as unknown as SVGElement,
      bbox: new DOMRect(bbox.x, bbox.y, bbox.width, bbox.height),
      visible: true,
    });
  }

  return { svgElement, regions, viewBox };
}
