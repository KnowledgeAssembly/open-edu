# SVG Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable SVG interaction engine and upgrade the `social.map` widget to load external SVG files with interactive regions.

**Architecture:** Two-layer system — `SvgExplorer` engine module handles SVG loading, selection, zoom/pan, and keyboard navigation. `social.map` widget consumes the engine and adds map-specific features (labels, tooltips, legend, observe/identify/explore modes).

**Tech Stack:** React 18, TypeScript, Vitest, @open-edu/design-system (cn, tokens), Zod 3.x, DOMParser API

---

## File Map

| File                                                              | Purpose                                               |
| ----------------------------------------------------------------- | ----------------------------------------------------- |
| `packages/widgets/src/svg-explorer/types.ts`                      | Interfaces + Zod schemas for SvgExplorer config/state |
| `packages/widgets/src/svg-explorer/utils/svg-parsing.ts`          | DOMParser-based SVG region extraction                 |
| `packages/widgets/src/svg-explorer/utils/svg-parsing.test.ts`     | Tests for SVG parsing                                 |
| `packages/widgets/src/svg-explorer/utils/coordinate.ts`           | Screen ↔ SVG coordinate transforms                    |
| `packages/widgets/src/svg-explorer/utils/coordinate.test.ts`      | Tests for coordinate utils                            |
| `packages/widgets/src/svg-explorer/hooks/useSvgLoader.ts`         | Fetch + parse external SVG files                      |
| `packages/widgets/src/svg-explorer/hooks/useSvgLoader.test.ts`    | Tests for SVG loader                                  |
| `packages/widgets/src/svg-explorer/hooks/useSvgSelection.ts`      | Region selection model                                |
| `packages/widgets/src/svg-explorer/hooks/useSvgSelection.test.ts` | Tests for selection                                   |
| `packages/widgets/src/svg-explorer/hooks/useSvgZoom.ts`           | Zoom/pan with bounds                                  |
| `packages/widgets/src/svg-explorer/hooks/useSvgZoom.test.ts`      | Tests for zoom                                        |
| `packages/widgets/src/svg-explorer/hooks/useSvgKeyboard.ts`       | Keyboard navigation                                   |
| `packages/widgets/src/svg-explorer/hooks/useSvgKeyboard.test.ts`  | Tests for keyboard nav                                |
| `packages/widgets/src/svg-explorer/SvgRegion.tsx`                 | Individual interactive SVG region                     |
| `packages/widgets/src/svg-explorer/SvgExplorer.tsx`               | Main engine component                                 |
| `packages/widgets/src/svg-explorer/SvgExplorer.test.tsx`          | Engine component tests                                |
| `packages/widgets/src/svg-explorer/index.ts`                      | Public exports                                        |
| `packages/widgets/src/builtins/SocialMap/SocialMap.tsx`           | Upgraded widget (modify existing)                     |
| `packages/widgets/src/builtins/SocialMap/SocialMap.test.tsx`      | Updated tests (modify existing)                       |

---

## Task 1: Types and Schemas

**Files:**

- Create: `packages/widgets/src/svg-explorer/types.ts`

- [ ] **Step 1: Create types.ts with all interfaces and Zod schemas**

```ts
import { z } from 'zod';

// --- Region Config ---

export const RegionConfigSchema = z.object({
  id: z.string().min(1).max(256),
  name: z.string().min(1).max(512),
  description: z.string().max(2048).optional(),
  capital: z.string().max(256).optional(),
  aliases: z.array(z.string().min(1).max(128)).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type RegionConfig = z.infer<typeof RegionConfigSchema>;

// --- Layer Config ---

export const LayerConfigSchema = z.object({
  id: z.string().min(1).max(256),
  name: z.string().min(1).max(512),
  svgSelector: z.string().min(1).max(1024),
  defaultVisible: z.boolean().optional(),
});

export type LayerConfig = z.infer<typeof LayerConfigSchema>;

// --- Zoom Config ---

export const ZoomConfigSchema = z.object({
  enabled: z.boolean().optional(),
  min: z.number().min(0.1).max(1).optional(),
  max: z.number().min(1).max(10).optional(),
  step: z.number().min(0.05).max(1).optional(),
});

export type ZoomConfig = z.infer<typeof ZoomConfigSchema>;

// --- Pan Config ---

export const PanConfigSchema = z.object({
  enabled: z.boolean().optional(),
});

export type PanConfig = z.infer<typeof PanConfigSchema>;

// --- Label Config ---

export const LabelConfigSchema = z.object({
  mode: z.enum(['auto', 'tooltip', 'none']).optional(),
});

export type LabelConfig = z.infer<typeof LabelConfigSchema>;

// --- Selection Mode ---

export const SelectionModeSchema = z.enum(['single', 'multi', 'none']);

export type SelectionMode = z.infer<typeof SelectionModeSchema>;

// --- Full Explorer Config ---

export const SvgExplorerConfigSchema = z.object({
  src: z.string().min(1).max(2048),
  regions: z.array(RegionConfigSchema).min(1),
  selection: SelectionModeSchema.optional(),
  zoom: ZoomConfigSchema.optional(),
  pan: PanConfigSchema.optional(),
  labels: LabelConfigSchema.optional(),
  layers: z.array(LayerConfigSchema).optional(),
});

export type SvgExplorerConfig = z.infer<typeof SvgExplorerConfigSchema>;

// --- Parsed Region (from SVG DOM) ---

export interface SvgRegion {
  id: string;
  element: SVGElement;
  bbox: DOMRect;
  visible: boolean;
}

// --- Explorer State ---

export interface SvgExplorerState {
  selectedIds: Set<string>;
  focusedId: string | null;
  hoveredId: string | null;
  zoom: number;
  pan: { x: number; y: number };
  activeLayer: string | null;
  loaded: boolean;
  error: string | null;
}

// --- Explorer Events ---

export type SvgExplorerEvent =
  | { type: 'region:select'; regionId: string; multi?: boolean }
  | { type: 'region:deselect'; regionId: string }
  | { type: 'region:hover'; regionId: string | null }
  | { type: 'region:focus'; regionId: string | null }
  | { type: 'zoom:change'; level: number }
  | { type: 'pan:change'; offset: { x: number; y: number } }
  | { type: 'layer:toggle'; layerId: string; visible: boolean };

// --- Loader Result ---

export interface SvgLoadResult {
  svgElement: SVGSVGElement;
  regions: Map<string, SvgRegion>;
  viewBox: { x: number; y: number; width: number; height: number };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm --filter @open-edu/widgets exec tsc --noEmit --pretty`
Expected: PASS (no errors in types.ts)

- [ ] **Step 3: Commit**

```bash
git add packages/widgets/src/svg-explorer/types.ts
git commit -m "feat(widgets): add SVG explorer type definitions and Zod schemas"
```

---

## Task 2: SVG Parsing Utilities

**Files:**

- Create: `packages/widgets/src/svg-explorer/utils/svg-parsing.ts`
- Create: `packages/widgets/src/svg-explorer/utils/svg-parsing.test.ts`

- [ ] **Step 1: Write failing tests for SVG parsing**

```ts
// packages/widgets/src/svg-explorer/utils/svg-parsing.test.ts
import { describe, it, expect } from 'vitest';
import { parseSvgRegions, extractRegionsFromSvg } from './svg-parsing.js';

function createSvgString(paths: Array<{ id: string; d?: string }>): string {
  const elements = paths.map((p) => `<path id="${p.id}" d="${p.d ?? 'M0 0L10 10'}"/>`).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${elements}</svg>`;
}

describe('parseSvgRegions', () => {
  it('parses SVG string and extracts regions by id', () => {
    const svg = createSvgString([{ id: 'odisha' }, { id: 'karnataka' }, { id: 'maharashtra' }]);
    const result = parseSvgRegions(svg, ['odisha', 'karnataka', 'maharashtra']);
    expect(result.regions.size).toBe(3);
    expect(result.regions.has('odisha')).toBe(true);
    expect(result.regions.has('karnataka')).toBe(true);
    expect(result.regions.has('maharashtra')).toBe(true);
  });

  it('ignores elements not in the requested id list', () => {
    const svg = createSvgString([{ id: 'odisha' }, { id: 'background' }]);
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @open-edu/widgets exec vitest run packages/widgets/src/svg-explorer/utils/svg-parsing.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement svg-parsing.ts**

```ts
// packages/widgets/src/svg-explorer/utils/svg-parsing.ts
import type { SvgRegion, SvgLoadResult } from '../types.js';

const INTERACTIVE_TAGS = new Set(['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline']);

export function extractRegionsFromSvg(svgString: string): Map<string, SvgRegion> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`Invalid SVG: ${parseError.textContent}`);
  }

  const svgElement = doc.documentElement as unknown as SVGSVGElement;
  const regions = new Map<string, SvgRegion>();

  const allElements = svgElement.querySelectorAll('[id]');
  for (const el of Array.from(allElements)) {
    if (!INTERACTIVE_TAGS.has(el.tagName.toLowerCase())) continue;

    const id = el.getAttribute('id')!;
    let bbox: DOMRect;
    try {
      // getBBox works on elements in an SVG document
      const svgEl = el as unknown as SVGGraphicsElement;
      bbox = svgEl.getBBox();
    } catch {
      // Fallback: try to extract from attributes
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

  // Fallback for path/polygon/polyline
  return new DOMRect(0, 0, 0, 0);
}

function parseViewBox(svgElement: SVGSVGElement): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const viewBox = svgElement.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
      return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
    }
  }
  return { x: 0, y: 0, width: 100, height: 100 };
}

export function parseSvgRegions(svgString: string, regionIds: string[]): SvgLoadResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`Invalid SVG: ${parseError.textContent}`);
  }

  const svgElement = doc.documentElement as unknown as SVGSVGElement;
  const viewBox = parseViewBox(svgElement);

  const regions = new Map<string, SvgRegion>();
  const idSet = new Set(regionIds);

  const allElements = svgElement.querySelectorAll('[id]');
  for (const el of Array.from(allElements)) {
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @open-edu/widgets exec vitest run packages/widgets/src/svg-explorer/utils/svg-parsing.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/widgets/src/svg-explorer/utils/svg-parsing.ts packages/widgets/src/svg-explorer/utils/svg-parsing.test.ts
git commit -m "feat(widgets): add SVG parsing utilities for region extraction"
```

---

## Task 3: Coordinate Utilities

**Files:**

- Create: `packages/widgets/src/svg-explorer/utils/coordinate.ts`
- Create: `packages/widgets/src/svg-explorer/utils/coordinate.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// packages/widgets/src/svg-explorer/utils/coordinate.test.ts
import { describe, it, expect } from 'vitest';
import { screenToSvg, svgToScreen, getRegionCenter } from './coordinate.js';
import type { SvgRegion } from '../types.js';

function makeRegion(id: string, x: number, y: number, w: number, h: number): SvgRegion {
  return {
    id,
    element: {} as SVGElement,
    bbox: new DOMRect(x, y, w, h),
    visible: true,
  };
}

describe('screenToSvg', () => {
  it('converts screen coordinates to SVG coordinates', () => {
    const svgBounds = new DOMRect(0, 0, 800, 600);
    const viewBox = { x: 0, y: 0, width: 400, height: 300 };
    const point = screenToSvg(400, 300, svgBounds, viewBox);
    expect(point.x).toBe(200);
    expect(point.y).toBe(150);
  });

  it('accounts for viewBox offset', () => {
    const svgBounds = new DOMRect(0, 0, 800, 600);
    const viewBox = { x: 50, y: 100, width: 400, height: 300 };
    const point = screenToSvg(400, 300, svgBounds, viewBox);
    expect(point.x).toBe(250);
    expect(point.y).toBe(250);
  });
});

describe('svgToScreen', () => {
  it('converts SVG coordinates to screen coordinates', () => {
    const svgBounds = new DOMRect(0, 0, 800, 600);
    const viewBox = { x: 0, y: 0, width: 400, height: 300 };
    const point = svgToScreen(200, 150, svgBounds, viewBox);
    expect(point.x).toBe(400);
    expect(point.y).toBe(300);
  });
});

describe('getRegionCenter', () => {
  it('returns the center of a region bbox', () => {
    const region = makeRegion('test', 10, 20, 40, 30);
    const center = getRegionCenter(region);
    expect(center.x).toBe(30);
    expect(center.y).toBe(35);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @open-edu/widgets exec vitest run packages/widgets/src/svg-explorer/utils/coordinate.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement coordinate.ts**

```ts
// packages/widgets/src/svg-explorer/utils/coordinate.ts
import type { SvgRegion } from '../types.js';

interface ViewBox {
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
  const scaleX = viewBox.width / svgBounds.width;
  const scaleY = viewBox.height / svgBounds.height;

  return {
    x: (screenX - svgBounds.left) * scaleX + viewBox.x,
    y: (screenY - svgBounds.top) * scaleY + viewBox.y,
  };
}

export function svgToScreen(
  svgX: number,
  svgY: number,
  svgBounds: DOMRect,
  viewBox: ViewBox,
): { x: number; y: number } {
  const scaleX = svgBounds.width / viewBox.width;
  const scaleY = svgBounds.height / viewBox.height;

  return {
    x: (svgX - viewBox.x) * scaleX + svgBounds.left,
    y: (svgY - viewBox.y) * scaleY + svgBounds.top,
  };
}

export function getRegionCenter(region: SvgRegion): { x: number; y: number } {
  return {
    x: region.bbox.x + region.bbox.width / 2,
    y: region.bbox.y + region.bbox.height / 2,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @open-edu/widgets exec vitest run packages/widgets/src/svg-explorer/utils/coordinate.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/widgets/src/svg-explorer/utils/coordinate.ts packages/widgets/src/svg-explorer/utils/coordinate.test.ts
git commit -m "feat(widgets): add SVG coordinate transformation utilities"
```

---

## Task 4: useSvgLoader Hook

**Files:**

- Create: `packages/widgets/src/svg-explorer/hooks/useSvgLoader.ts`
- Create: `packages/widgets/src/svg-explorer/hooks/useSvgLoader.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// packages/widgets/src/svg-explorer/hooks/useSvgLoader.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSvgLoader } from './useSvgLoader.js';

const MOCK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
  <path id="region1" d="M10 10L100 10L100 100L10 100Z"/>
  <path id="region2" d="M150 150L250 150L250 250L150 250Z"/>
  <rect id="background" x="0" y="0" width="600" height="400" fill="#eee"/>
</svg>`;

describe('useSvgLoader', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads SVG from URL and parses regions', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(MOCK_SVG, { status: 200 }));

    const { result } = renderHook(() =>
      useSvgLoader({ src: '/maps/test.svg', regionIds: ['region1', 'region2'] }),
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.regions.size).toBe(2);
    expect(result.current.svgElement).toBeDefined();
    expect(result.current.viewBox).toEqual({ x: 0, y: 0, width: 600, height: 400 });
  });

  it('loads SVG from inline string', async () => {
    const { result } = renderHook(() => useSvgLoader({ src: MOCK_SVG, regionIds: ['region1'] }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.regions.size).toBe(1);
    expect(result.current.regions.has('region1')).toBe(true);
  });

  it('sets error on fetch failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 404, statusText: 'Not Found' }),
    );

    const { result } = renderHook(() =>
      useSvgLoader({ src: '/maps/missing.svg', regionIds: ['a'] }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  it('sets error on invalid SVG content', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('not svg content', { status: 200 }),
    );

    const { result } = renderHook(() => useSvgLoader({ src: '/maps/bad.svg', regionIds: ['a'] }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @open-edu/widgets exec vitest run packages/widgets/src/svg-explorer/hooks/useSvgLoader.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement useSvgLoader.ts**

```ts
// packages/widgets/src/svg-explorer/hooks/useSvgLoader.ts
import { useState, useEffect } from 'react';
import { parseSvgRegions } from '../utils/svg-parsing.js';
import type { SvgRegion } from '../types.js';

interface UseSvgLoaderOptions {
  src: string;
  regionIds: string[];
}

interface UseSvgLoaderResult {
  loading: boolean;
  error: string | null;
  svgElement: SVGSVGElement | null;
  regions: Map<string, SvgRegion>;
  viewBox: { x: number; y: number; width: number; height: number };
}

function isInlineSvg(src: string): boolean {
  return src.trimStart().startsWith('<svg');
}

export function useSvgLoader(options: UseSvgLoaderOptions): UseSvgLoaderResult {
  const { src, regionIds } = options;

  const [state, setState] = useState<UseSvgLoaderResult>({
    loading: true,
    error: null,
    svgElement: null,
    regions: new Map(),
    viewBox: { x: 0, y: 0, width: 100, height: 100 },
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        let svgString: string;

        if (isInlineSvg(src)) {
          svgString = src;
        } else {
          const response = await fetch(src);
          if (!response.ok) {
            throw new Error(`Failed to load SVG: ${response.status} ${response.statusText}`);
          }
          svgString = await response.text();
        }

        if (cancelled) return;

        const result = parseSvgRegions(svgString, regionIds);

        setState({
          loading: false,
          error: null,
          svgElement: result.svgElement,
          regions: result.regions,
          viewBox: result.viewBox,
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error loading SVG',
          svgElement: null,
          regions: new Map(),
          viewBox: { x: 0, y: 0, width: 100, height: 100 },
        });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [src, regionIds.join(',')]);

  return state;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @open-edu/widgets exec vitest run packages/widgets/src/svg-explorer/hooks/useSvgLoader.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/widgets/src/svg-explorer/hooks/useSvgLoader.ts packages/widgets/src/svg-explorer/hooks/useSvgLoader.test.ts
git commit -m "feat(widgets): add useSvgLoader hook for external SVG loading"
```

---

## Task 5: useSvgSelection Hook

**Files:**

- Create: `packages/widgets/src/svg-explorer/hooks/useSvgSelection.ts`
- Create: `packages/widgets/src/svg-explorer/hooks/useSvgSelection.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// packages/widgets/src/svg-explorer/hooks/useSvgSelection.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSvgSelection } from './useSvgSelection.js';

describe('useSvgSelection', () => {
  it('selects a region in single mode', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() => useSvgSelection({ mode: 'single', onSelect }));

    act(() => result.current.select('odisha'));

    expect(result.current.selectedIds).toEqual(new Set(['odisha']));
    expect(onSelect).toHaveBeenCalledWith('odisha');
  });

  it('replaces selection in single mode', () => {
    const { result } = renderHook(() => useSvgSelection({ mode: 'single', onSelect: vi.fn() }));

    act(() => result.current.select('odisha'));
    act(() => result.current.select('karnataka'));

    expect(result.current.selectedIds).toEqual(new Set(['karnataka']));
  });

  it('toggles selection in multi mode', () => {
    const { result } = renderHook(() => useSvgSelection({ mode: 'multi', onSelect: vi.fn() }));

    act(() => result.current.select('odisha'));
    act(() => result.current.select('karnataka'));

    expect(result.current.selectedIds).toEqual(new Set(['odisha', 'karnataka']));

    act(() => result.current.deselect('odisha'));

    expect(result.current.selectedIds).toEqual(new Set(['karnataka']));
  });

  it('toggles off when selecting same region in single mode', () => {
    const { result } = renderHook(() => useSvgSelection({ mode: 'single', onSelect: vi.fn() }));

    act(() => result.current.select('odisha'));
    act(() => result.current.select('odisha'));

    expect(result.current.selectedIds).toEqual(new Set());
  });

  it('clears all selections', () => {
    const { result } = renderHook(() => useSvgSelection({ mode: 'multi', onSelect: vi.fn() }));

    act(() => result.current.select('odisha'));
    act(() => result.current.select('karnataka'));
    act(() => result.current.clear());

    expect(result.current.selectedIds).toEqual(new Set());
  });

  it('does nothing in none mode', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() => useSvgSelection({ mode: 'none', onSelect }));

    act(() => result.current.select('odisha'));

    expect(result.current.selectedIds).toEqual(new Set());
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('checks isSelected correctly', () => {
    const { result } = renderHook(() => useSvgSelection({ mode: 'multi', onSelect: vi.fn() }));

    act(() => result.current.select('odisha'));

    expect(result.current.isSelected('odisha')).toBe(true);
    expect(result.current.isSelected('karnataka')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @open-edu/widgets exec vitest run packages/widgets/src/svg-explorer/hooks/useSvgSelection.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement useSvgSelection.ts**

```ts
// packages/widgets/src/svg-explorer/hooks/useSvgSelection.ts
import { useState, useCallback } from 'react';
import type { SelectionMode } from '../types.js';

interface UseSvgSelectionOptions {
  mode: SelectionMode;
  onSelect?: (regionId: string) => void;
  onDeselect?: (regionId: string) => void;
}

interface UseSvgSelectionResult {
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
        const next = new Set(mode === 'single' ? [] : prev);

        if (prev.has(regionId)) {
          // Toggle off
          onDeselect?.(regionId);
          return new Set();
        }

        next.add(regionId);
        onSelect?.(regionId);
        return next;
      });
    },
    [mode, onSelect, onDeselect],
  );

  const deselect = useCallback(
    (regionId: string) => {
      setSelectedIds((prev) => {
        if (!prev.has(prev)) return prev;
        const next = new Set(prev);
        next.delete(regionId);
        onDeselect?.(regionId);
        return next;
      });
    },
    [onDeselect],
  );

  const toggle = useCallback(
    (regionId: string) => {
      if (selectedIds.has(regionId)) {
        deselect(regionId);
      } else {
        select(regionId);
      }
    },
    [selectedIds, select, deselect],
  );

  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((regionId: string) => selectedIds.has(regionId), [selectedIds]);

  return { selectedIds, select, deselect, toggle, clear, isSelected };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @open-edu/widgets exec vitest run packages/widgets/src/svg-explorer/hooks/useSvgSelection.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/widgets/src/svg-explorer/hooks/useSvgSelection.ts packages/widgets/src/svg-explorer/hooks/useSvgSelection.test.ts
git commit -m "feat(widgets): add useSvgSelection hook with single/multi/none modes"
```

---

## Task 6: useSvgZoom Hook

**Files:**

- Create: `packages/widgets/src/svg-explorer/hooks/useSvgZoom.ts`
- Create: `packages/widgets/src/svg-explorer/hooks/useSvgZoom.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// packages/widgets/src/svg-explorer/hooks/useSvgZoom.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSvgZoom } from './useSvgZoom.js';

describe('useSvgZoom', () => {
  it('starts at zoom level 1', () => {
    const { result } = renderHook(() => useSvgZoom({ min: 0.5, max: 3, step: 0.25 }));
    expect(result.current.zoom).toBe(1);
  });

  it('zooms in by step', () => {
    const { result } = renderHook(() => useSvgZoom({ min: 0.5, max: 3, step: 0.25 }));
    act(() => result.current.zoomIn());
    expect(result.current.zoom).toBe(1.25);
  });

  it('zooms out by step', () => {
    const { result } = renderHook(() => useSvgZoom({ min: 0.5, max: 3, step: 0.25 }));
    act(() => result.current.zoomOut());
    expect(result.current.zoom).toBe(0.75);
  });

  it('clamps to max', () => {
    const { result } = renderHook(() => useSvgZoom({ min: 0.5, max: 2, step: 0.5 }));
    act(() => result.current.zoomIn());
    act(() => result.current.zoomIn());
    act(() => result.current.zoomIn());
    expect(result.current.zoom).toBe(2);
  });

  it('clamps to min', () => {
    const { result } = renderHook(() => useSvgZoom({ min: 0.5, max: 3, step: 0.5 }));
    act(() => result.current.zoomOut());
    act(() => result.current.zoomOut());
    act(() => result.current.zoomOut());
    expect(result.current.zoom).toBe(0.5);
  });

  it('resets to 1', () => {
    const { result } = renderHook(() => useSvgZoom({ min: 0.5, max: 3, step: 0.25 }));
    act(() => result.current.zoomIn());
    act(() => result.current.zoomIn());
    act(() => result.current.reset());
    expect(result.current.zoom).toBe(1);
  });

  it('calls onZoomChange callback', () => {
    const onZoomChange = vi.fn();
    const { result } = renderHook(() => useSvgZoom({ min: 0.5, max: 3, step: 0.25, onZoomChange }));
    act(() => result.current.zoomIn());
    expect(onZoomChange).toHaveBeenCalledWith(1.25);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @open-edu/widgets exec vitest run packages/widgets/src/svg-explorer/hooks/useSvgZoom.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement useSvgZoom.ts**

```ts
// packages/widgets/src/svg-explorer/hooks/useSvgZoom.ts
import { useState, useCallback } from 'react';

interface UseSvgZoomOptions {
  min?: number;
  max?: number;
  step?: number;
  initial?: number;
  onZoomChange?: (level: number) => void;
}

interface UseSvgZoomResult {
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  setZoom: (level: number) => void;
  reset: () => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function useSvgZoom(options: UseSvgZoomOptions = {}): UseSvgZoomResult {
  const { min = 0.5, max = 3, step = 0.25, initial = 1, onZoomChange } = options;

  const [zoom, setZoomState] = useState(initial);

  const setZoom = useCallback(
    (level: number) => {
      const clamped = clamp(level, min, max);
      setZoomState(clamped);
      onZoomChange?.(clamped);
    },
    [min, max, onZoomChange],
  );

  const zoomIn = useCallback(() => {
    setZoom(zoom + step);
  }, [zoom, step, setZoom]);

  const zoomOut = useCallback(() => {
    setZoom(zoom - step);
  }, [zoom, step, setZoom]);

  const reset = useCallback(() => {
    setZoom(initial);
  }, [initial, setZoom]);

  return { zoom, zoomIn, zoomOut, setZoom, reset };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @open-edu/widgets exec vitest run packages/widgets/src/svg-explorer/hooks/useSvgZoom.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/widgets/src/svg-explorer/hooks/useSvgZoom.ts packages/widgets/src/svg-explorer/hooks/useSvgZoom.test.ts
git commit -m "feat(widgets): add useSvgZoom hook with bounds clamping"
```

---

## Task 7: useSvgKeyboard Hook

**Files:**

- Create: `packages/widgets/src/svg-explorer/hooks/useSvgKeyboard.ts`
- Create: `packages/widgets/src/svg-explorer/hooks/useSvgKeyboard.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// packages/widgets/src/svg-explorer/hooks/useSvgKeyboard.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSvgKeyboard } from './useSvgKeyboard.js';

function makeRegions(ids: string[]) {
  return new Map(
    ids.map((id) => ({
      id,
      element: {} as SVGElement,
      bbox: new DOMRect(ids.indexOf(id) * 100, 0, 80, 60),
      visible: true,
    })),
  );
}

describe('useSvgKeyboard', () => {
  it('moves focus right with ArrowRight', () => {
    const onFocus = vi.fn();
    const regions = makeRegions(['a', 'b', 'c']);
    const { result } = renderHook(() => useSvgKeyboard({ regions, focusedId: 'a', onFocus }));

    act(() => {
      result.current.handleKeyDown({
        key: 'ArrowRight',
        preventDefault: vi.fn(),
      } as React.KeyboardEvent);
    });

    expect(onFocus).toHaveBeenCalledWith('b');
  });

  it('moves focus left with ArrowLeft', () => {
    const onFocus = vi.fn();
    const regions = makeRegions(['a', 'b', 'c']);
    const { result } = renderHook(() => useSvgKeyboard({ regions, focusedId: 'b', onFocus }));

    act(() => {
      result.current.handleKeyDown({
        key: 'ArrowLeft',
        preventDefault: vi.fn(),
      } as React.KeyboardEvent);
    });

    expect(onFocus).toHaveBeenCalledWith('a');
  });

  it('wraps around at the end', () => {
    const onFocus = vi.fn();
    const regions = makeRegions(['a', 'b', 'c']);
    const { result } = renderHook(() => useSvgKeyboard({ regions, focusedId: 'c', onFocus }));

    act(() => {
      result.current.handleKeyDown({
        key: 'ArrowRight',
        preventDefault: vi.fn(),
      } as React.KeyboardEvent);
    });

    expect(onFocus).toHaveBeenCalledWith('a');
  });

  it('calls onSelect on Enter', () => {
    const onSelect = vi.fn();
    const regions = makeRegions(['a']);
    const { result } = renderHook(() => useSvgKeyboard({ regions, focusedId: 'a', onSelect }));

    act(() => {
      result.current.handleKeyDown({
        key: 'Enter',
        preventDefault: vi.fn(),
      } as React.KeyboardEvent);
    });

    expect(onSelect).toHaveBeenCalledWith('a');
  });

  it('calls onSelect on Space', () => {
    const onSelect = vi.fn();
    const regions = makeRegions(['a']);
    const { result } = renderHook(() => useSvgKeyboard({ regions, focusedId: 'a', onSelect }));

    act(() => {
      result.current.handleKeyDown({
        key: ' ',
        preventDefault: vi.fn(),
      } as React.KeyboardEvent);
    });

    expect(onSelect).toHaveBeenCalledWith('a');
  });

  it('calls onZoomIn on +', () => {
    const onZoomIn = vi.fn();
    const regions = makeRegions(['a']);
    const { result } = renderHook(() => useSvgKeyboard({ regions, focusedId: null, onZoomIn }));

    act(() => {
      result.current.handleKeyDown({
        key: '+',
        preventDefault: vi.fn(),
      } as React.KeyboardEvent);
    });

    expect(onZoomIn).toHaveBeenCalled();
  });

  it('calls onEscape on Escape', () => {
    const onEscape = vi.fn();
    const regions = makeRegions(['a']);
    const { result } = renderHook(() => useSvgKeyboard({ regions, focusedId: null, onEscape }));

    act(() => {
      result.current.handleKeyDown({
        key: 'Escape',
        preventDefault: vi.fn(),
      } as React.KeyboardEvent);
    });

    expect(onEscape).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @open-edu/widgets exec vitest run packages/widgets/src/svg-explorer/hooks/useSvgKeyboard.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement useSvgKeyboard.ts**

```ts
// packages/widgets/src/svg-explorer/hooks/useSvgKeyboard.ts
import { useCallback } from 'react';
import type { SvgRegion } from '../types.js';
import { getRegionCenter } from '../utils/coordinate.js';

interface UseSvgKeyboardOptions {
  regions: Map<string, SvgRegion>;
  focusedId: string | null;
  onSelect?: (regionId: string) => void;
  onFocus?: (regionId: string) => void;
  onEscape?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
}

interface UseSvgKeyboardResult {
  handleKeyDown: (event: React.KeyboardEvent) => void;
}

function sortBySpatialOrder(regions: Map<string, SvgRegion>): SvgRegion[] {
  return Array.from(regions.values()).sort((a, b) => {
    const centerA = getRegionCenter(a);
    const centerB = getRegionCenter(b);
    // Sort by row first (top to bottom), then by column (left to right)
    if (Math.abs(centerA.y - centerB.y) > 20) {
      return centerA.y - centerB.y;
    }
    return centerA.x - centerB.x;
  });
}

function findNearest(
  regions: SvgRegion[],
  currentId: string | null,
  direction: 'ArrowRight' | 'ArrowLeft' | 'ArrowDown' | 'ArrowUp',
): string | null {
  if (regions.length === 0) return null;

  const sorted = sortBySpatialOrder(new Map(regions.map((r) => [r.id, r])));

  if (!currentId) return sorted[0]?.id ?? null;

  const currentIndex = sorted.findIndex((r) => r.id === currentId);
  if (currentIndex === -1) return sorted[0]?.id ?? null;

  const currentCenter = getRegionCenter(sorted[currentIndex]);

  // Filter to regions in the direction
  const candidates = regions.filter((r) => {
    if (r.id === currentId) return false;
    const center = getRegionCenter(r);
    switch (direction) {
      case 'ArrowRight':
        return center.x > currentCenter.x + 5;
      case 'ArrowLeft':
        return center.x < currentCenter.x - 5;
      case 'ArrowDown':
        return center.y > currentCenter.y + 5;
      case 'ArrowUp':
        return center.y < currentCenter.y - 5;
    }
  });

  if (candidates.length === 0) {
    // Wrap around
    switch (direction) {
      case 'ArrowRight':
      case 'ArrowDown':
        return sorted[0]?.id ?? null;
      case 'ArrowLeft':
      case 'ArrowUp':
        return sorted[sorted.length - 1]?.id ?? null;
    }
  }

  // Pick nearest candidate
  let nearest = candidates[0];
  let minDist = Infinity;
  for (const c of candidates) {
    const center = getRegionCenter(c);
    const dx = center.x - currentCenter.x;
    const dy = center.y - currentCenter.y;
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      minDist = dist;
      nearest = c;
    }
  }

  return nearest?.id ?? null;
}

export function useSvgKeyboard(options: UseSvgKeyboardOptions): UseSvgKeyboardResult {
  const { regions, focusedId, onSelect, onFocus, onEscape, onZoomIn, onZoomOut, onZoomReset } =
    options;

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const { key } = event;
      const regionList = Array.from(regions.values());

      switch (key) {
        case 'ArrowRight':
        case 'ArrowLeft':
        case 'ArrowDown':
        case 'ArrowUp': {
          event.preventDefault();
          const nextId = findNearest(regionList, focusedId, key);
          if (nextId) onFocus?.(nextId);
          break;
        }
        case 'Enter':
        case ' ': {
          event.preventDefault();
          if (focusedId) onSelect?.(focusedId);
          break;
        }
        case 'Escape': {
          event.preventDefault();
          onEscape?.();
          break;
        }
        case '+':
        case '=': {
          event.preventDefault();
          onZoomIn?.();
          break;
        }
        case '-': {
          event.preventDefault();
          onZoomOut?.();
          break;
        }
        case 'Home': {
          event.preventDefault();
          onZoomReset?.();
          break;
        }
      }
    },
    [regions, focusedId, onSelect, onFocus, onEscape, onZoomIn, onZoomOut, onZoomReset],
  );

  return { handleKeyDown };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @open-edu/widgets exec vitest run packages/widgets/src/svg-explorer/hooks/useSvgKeyboard.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/widgets/src/svg-explorer/hooks/useSvgKeyboard.ts packages/widgets/src/svg-explorer/hooks/useSvgKeyboard.test.ts
git commit -m "feat(widgets): add useSvgKeyboard hook for spatial keyboard navigation"
```

---

## Task 8: SvgRegion Component

**Files:**

- Create: `packages/widgets/src/svg-explorer/SvgRegion.tsx`

- [ ] **Step 1: Implement SvgRegion.tsx**

```tsx
// packages/widgets/src/svg-explorer/SvgRegion.tsx
import React, { useCallback } from 'react';
import { cn } from '@open-edu/design-system';
import type { SvgRegion as SvgRegionType } from './types.js';

interface SvgRegionProps {
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

export const SvgRegion: React.FC<SvgRegionProps> = React.memo(function SvgRegion({
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
}) {
  const handleClick = useCallback(() => {
    if (!disabled && interactive) {
      onSelect(region.id);
    }
  }, [region.id, disabled, interactive, onSelect]);

  const handleMouseEnter = useCallback(() => {
    if (!disabled) onHover(region.id);
  }, [region.id, disabled, onHover]);

  const handleMouseLeave = useCallback(() => {
    onHover(null);
  }, [onHover]);

  const handleFocus = useCallback(() => {
    onFocus(region.id);
  }, [region.id, onFocus]);

  const handleBlur = useCallback(() => {
    onFocus(null);
  }, [onFocus]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (!disabled) onSelect(region.id);
      }
    },
    [region.id, disabled, onSelect],
  );

  // Clone the original SVG element and add interactive attributes
  const element = region.element as React.SVGProps<SVGElement>;

  return React.cloneElement(element as React.ReactElement, {
    className: cn(
      'oe-svg-region',
      selected && 'oe-svg-region--selected',
      focused && 'oe-svg-region--focus',
      hovered && 'oe-svg-region--hover',
      disabled && 'oe-svg-region--disabled',
    ),
    style: {
      cursor: interactive && !disabled ? 'pointer' : 'default',
      transition: 'fill 150ms ease-in-out',
      fill: selected
        ? 'var(--oe-color-primary)'
        : hovered
          ? 'var(--oe-color-primary-container)'
          : 'var(--oe-color-surface-variant)',
      opacity: disabled ? 0.5 : 1,
      outline: focused ? '2px solid var(--oe-focus-ring-color)' : 'none',
      outlineOffset: '2px',
    } as React.CSSProperties,
    role: interactive ? 'button' : 'img',
    tabIndex: interactive ? 0 : undefined,
    'aria-label': ariaLabel,
    'aria-description': ariaDescription,
    'aria-pressed': interactive ? selected : undefined,
    'aria-disabled': disabled || undefined,
    onClick: interactive ? handleClick : undefined,
    onMouseEnter: interactive ? handleMouseEnter : undefined,
    onMouseLeave: interactive ? handleMouseLeave : undefined,
    onFocus: interactive ? handleFocus : undefined,
    onBlur: interactive ? handleBlur : undefined,
    onKeyDown: interactive ? handleKeyDown : undefined,
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add packages/widgets/src/svg-explorer/SvgRegion.tsx
git commit -m "feat(widgets): add SvgRegion interactive region component"
```

---

## Task 9: SvgExplorer Component

**Files:**

- Create: `packages/widgets/src/svg-explorer/SvgExplorer.tsx`
- Create: `packages/widgets/src/svg-explorer/SvgExplorer.test.tsx`

- [ ] **Step 1: Write failing component tests**

```tsx
// packages/widgets/src/svg-explorer/SvgExplorer.test.tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SvgExplorer } from './SvgExplorer.js';

const MOCK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
  <path id="odisha" d="M10 10L100 10L100 100L10 100Z"/>
  <path id="karnataka" d="M150 150L250 150L250 250L150 250Z"/>
</svg>`;

describe('SvgExplorer', () => {
  it('renders loading state initially', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(MOCK_SVG, { status: 200 }));

    render(
      <SvgExplorer
        src="/maps/test.svg"
        regions={[
          { id: 'odisha', name: 'Odisha' },
          { id: 'karnataka', name: 'Karnataka' },
        ]}
        onEvent={vi.fn()}
      />,
    );

    expect(screen.getByText(/loading/i)).toBeTruthy();
  });

  it('renders regions after loading', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(MOCK_SVG, { status: 200 }));

    render(
      <SvgExplorer
        src="/maps/test.svg"
        regions={[
          { id: 'odisha', name: 'Odisha' },
          { id: 'karnataka', name: 'Karnataka' },
        ]}
        onEvent={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).toBeNull();
    });

    expect(screen.getByRole('group', { name: /svg explorer/i })).toBeTruthy();
  });

  it('emits region:select event on click', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(MOCK_SVG, { status: 200 }));

    const onEvent = vi.fn();

    render(
      <SvgExplorer
        src="/maps/test.svg"
        regions={[{ id: 'odisha', name: 'Odisha' }]}
        selection="single"
        onEvent={onEvent}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).toBeNull();
    });

    const region = screen.getByRole('button', { name: /odisha/i });
    fireEvent.click(region);

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'region:select', regionId: 'odisha' }),
    );
  });

  it('renders error state on fetch failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));

    render(
      <SvgExplorer src="/maps/missing.svg" regions={[{ id: 'a', name: 'A' }]} onEvent={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @open-edu/widgets exec vitest run packages/widgets/src/svg-explorer/SvgExplorer.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement SvgExplorer.tsx**

```tsx
// packages/widgets/src/svg-explorer/SvgExplorer.tsx
import React, { useCallback, useState, useRef } from 'react';
import { cn } from '@open-edu/design-system';
import { useSvgLoader } from './hooks/useSvgLoader.js';
import { useSvgSelection } from './hooks/useSvgSelection.js';
import { useSvgZoom } from './hooks/useSvgZoom.js';
import { useSvgKeyboard } from './hooks/useSvgKeyboard.js';
import { SvgRegion } from './SvgRegion.js';
import type { SvgExplorerConfig, SvgExplorerEvent, RegionConfig } from './types.js';

interface SvgExplorerProps extends Omit<SvgExplorerConfig, 'src' | 'labels' | 'layers'> {
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

  const { loading, error, svgElement, regions, viewBox } = useSvgLoader({
    src,
    regionIds,
  });

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback(
    (regionId: string) => {
      onEvent({ type: 'region:select', regionId });
    },
    [onEvent],
  );

  const handleDeselect = useCallback(
    (regionId: string) => {
      onEvent({ type: 'region:deselect', regionId });
    },
    [onEvent],
  );

  const { selectedIds, select, clear, isSelected } = useSvgSelection({
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
      <div role="status" aria-label="Loading SVG" className={cn('p-4 text-center', className)}>
        <span className="text-on-surface-variant">Loading map...</span>
      </div>
    );
  }

  if (error || !svgElement) {
    return (
      <div role="alert" className={cn('p-4 text-center', className)}>
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
      className={cn('relative overflow-hidden', className)}
      onKeyDown={handleKeyDown}
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

      {/* Zoom controls */}
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @open-edu/widgets exec vitest run packages/widgets/src/svg-explorer/SvgExplorer.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/widgets/src/svg-explorer/SvgExplorer.tsx packages/widgets/src/svg-explorer/SvgExplorer.test.tsx
git commit -m "feat(widgets): add SvgExplorer main engine component"
```

---

## Task 10: Public Exports

**Files:**

- Create: `packages/widgets/src/svg-explorer/index.ts`

- [ ] **Step 1: Create index.ts**

```ts
// packages/widgets/src/svg-explorer/index.ts
export { SvgExplorer } from './SvgExplorer.js';
export { SvgRegion } from './SvgRegion.js';
export { useSvgLoader } from './hooks/useSvgLoader.js';
export { useSvgSelection } from './hooks/useSvgSelection.js';
export { useSvgZoom } from './hooks/useSvgZoom.js';
export { useSvgKeyboard } from './hooks/useSvgKeyboard.js';
export { parseSvgRegions, extractRegionsFromSvg } from './utils/svg-parsing.js';
export { screenToSvg, svgToScreen, getRegionCenter } from './utils/coordinate.js';
export type {
  SvgExplorerConfig,
  SvgExplorerState,
  SvgExplorerEvent,
  RegionConfig,
  LayerConfig,
  ZoomConfig,
  PanConfig,
  LabelConfig,
  SelectionMode,
  SvgRegion as SvgRegionType,
  SvgLoadResult,
} from './types.js';
```

- [ ] **Step 2: Add export to package barrel**

Modify `packages/widgets/src/index.ts` to add:

```ts
export * as svgExplorer from './svg-explorer/index.js';
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm --filter @open-edu/widgets exec tsc --noEmit --pretty`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/widgets/src/svg-explorer/index.ts packages/widgets/src/index.ts
git commit -m "feat(widgets): add SVG explorer public exports"
```

---

## Task 11: Upgrade SocialMap Widget

**Files:**

- Modify: `packages/widgets/src/builtins/SocialMap/SocialMap.tsx`
- Modify: `packages/widgets/src/builtins/SocialMap/SocialMap.test.tsx`

- [ ] **Step 1: Read current SocialMap.tsx**

Read the current file to understand the exact code to modify.

- [ ] **Step 2: Add `svgSrc` to config schema**

Add `svgSrc: z.string().max(2048).optional()` to `socialMapSchema`.

- [ ] **Step 3: Update SocialMap component to use SvgExplorer when svgSrc is present**

At the top of the component, check if `config.svgSrc` is present. If yes, render `<SvgExplorer>` with the appropriate props. If no, fall back to current inline SVG rendering.

```tsx
// Key addition at the top of SocialMapComponent:
if (config.svgSrc) {
  return (
    <SvgExplorer
      src={config.svgSrc}
      regions={config.regions.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        capital: r.capital,
        aliases: r.aliases,
        metadata: r.metadata,
      }))}
      selection={config.interactive ? 'single' : 'none'}
      zoom={config.zoom ? { enabled: true } : undefined}
      onEvent={(event) => {
        if (event.type === 'region:select') {
          emitInteraction({
            type: 'widget.interaction',
            widgetId: 'social.map',
            action: 'select',
            regionId: event.regionId,
          });
          if (config.targetRegion && event.regionId === config.targetRegion) {
            complete(100, { selectedRegion: event.regionId });
          }
        }
      }}
    />
  );
}
// ... rest of existing inline SVG code unchanged
```

- [ ] **Step 4: Add tests for the svgSrc code path**

```tsx
// Add to SocialMap.test.tsx:

it('renders SvgExplorer when svgSrc is provided', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
        <path id="odisha" d="M10 10L100 10L100 100L10 100Z"/>
      </svg>`,
      { status: 200 },
    ),
  );

  render(
    <SocialMapComponent
      nodeId="test-1"
      config={{
        svgSrc: '/maps/india.svg',
        regions: [{ id: 'odisha', name: 'Odisha' }],
      }}
      emitInteraction={vi.fn()}
      complete={vi.fn()}
    />,
  );

  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).toBeNull();
  });

  expect(screen.getByRole('group', { name: /svg explorer/i })).toBeTruthy();
});
```

- [ ] **Step 5: Run all SocialMap tests**

Run: `pnpm --filter @open-edu/widgets exec vitest run packages/widgets/src/builtins/SocialMap/SocialMap.test.tsx`
Expected: PASS

- [ ] **Step 6: Run full widget test suite**

Run: `pnpm --filter @open-edu/widgets exec vitest run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/widgets/src/builtins/SocialMap/SocialMap.tsx packages/widgets/src/builtins/SocialMap/SocialMap.test.tsx
git commit -m "feat(widgets): upgrade social.map to support external SVG files via SvgExplorer"
```

---

## Task 12: Verify Everything

- [ ] **Step 1: Type-check all packages**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 2: Lint all packages**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 3: Run all tests**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 4: Format check**

Run: `pnpm format:check`
Expected: PASS (or auto-fix with `pnpm format`)

- [ ] **Step 5: Final commit if formatting needed**

```bash
git add -A
git commit -m "chore(widgets): format SVG explorer files"
```
