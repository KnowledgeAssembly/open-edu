# SVG Engine Design Spec

> Review of `docs/svg-engine-spec.md` adapted to fit the existing OpenEdu widget system.

## Overview

Build a reusable SVG interaction engine (`core.svg-explorer`) as a module within `@open-edu/widgets`, then upgrade the existing `social.map` widget to consume it. The engine powers interactive SVG experiences — maps, diagrams, infographics, floor plans — while the map widget adds geography-specific features on top.

**Scope (v1):**

- Core SVG loading, parsing, and rendering
- Region selection (single/multi)
- Zoom/pan (mouse, touch, keyboard)
- 3 interaction modes: observe, identify, explore
- Keyboard navigation + screen reader support
- Theme-aware visual states via `--oe-*` tokens
- Backward-compatible `social.map` upgrade

**Deferred:**

- Asset pipeline (GeoJSON → SVG)
- Compare, label, quiz modes
- Layer system
- Map package format (`@open-edu/maps-*`)

## Architecture

```
social.map (widget)
  └─► SvgExplorer (engine module)
        ├─► useSvgLoader    — fetch + parse SVG files
        ├─► useSvgSelection — region selection model
        ├─► useSvgZoom      — zoom/pan transforms
        ├─► useSvgKeyboard  — keyboard navigation
        └─► SvgRegion       — individual region component
```

SvgExplorer lives inside `packages/widgets/src/svg-explorer/` as an internal module. It is NOT a separate package — it's a shared utility that multiple widgets can import.

## File Structure

```
packages/widgets/src/
  svg-explorer/
    index.ts                    # Public exports
    types.ts                    # Interfaces + Zod schemas
    SvgExplorer.tsx             # Main React component
    SvgExplorer.test.tsx        # Engine tests
    SvgRegion.tsx               # Individual interactive region
    hooks/
      useSvgLoader.ts           # Load + parse external SVG files
      useSvgLoader.test.ts
      useSvgSelection.ts        # Selection model (single/multi/none)
      useSvgSelection.test.ts
      useSvgZoom.ts             # Zoom/pan with bounds
      useSvgZoom.test.ts
      useSvgKeyboard.ts         # Keyboard navigation across regions
      useSvgKeyboard.test.ts
    utils/
      svg-parsing.ts            # DOMParser-based SVG region extraction
      svg-parsing.test.ts
      coordinate.ts             # Screen <-> SVG coordinate transforms
      coordinate.test.ts
  builtins/SocialMap/
    SocialMap.tsx               # Upgraded to use SvgExplorer
    SocialMap.test.tsx           # Updated tests
```

## Core Interfaces

### SvgExplorerConfig

```ts
interface SvgExplorerConfig {
  src: string; // URL to .svg file, or inline SVG string
  regions: RegionConfig[]; // metadata per interactive region
  selection?: 'single' | 'multi' | 'none'; // default: 'single'
  zoom?: {
    enabled?: boolean; // default: false
    min?: number; // default: 0.5
    max?: number; // default: 3
    step?: number; // default: 0.25
  };
  pan?: {
    enabled?: boolean; // default: false
  };
  labels?: {
    mode?: 'auto' | 'tooltip' | 'none'; // default: 'tooltip'
  };
  layers?: LayerConfig[];
}

interface RegionConfig {
  id: string; // matches <path id="..."/> in SVG
  name: string;
  description?: string;
  capital?: string;
  aliases?: string[];
  metadata?: Record<string, unknown>;
}

interface LayerConfig {
  id: string;
  name: string;
  svgSelector: string; // CSS selector for SVG group
  defaultVisible?: boolean;
}
```

### SvgExplorerState

```ts
interface SvgExplorerState {
  selectedIds: Set<string>;
  focusedId: string | null;
  hoveredId: string | null;
  zoom: number;
  pan: { x: number; y: number };
  activeLayer: string | null;
  loaded: boolean;
  error: string | null;
}
```

### SvgRegion (parsed from SVG)

```ts
interface SvgRegion {
  id: string;
  element: SVGElement; // original <path>, <rect>, etc.
  bbox: DOMRect; // bounding box in SVG coordinates
  visible: boolean;
}
```

### Events

```ts
type SvgExplorerEvent =
  | { type: 'region:select'; regionId: string; multi?: boolean }
  | { type: 'region:deselect'; regionId: string }
  | { type: 'region:hover'; regionId: string | null }
  | { type: 'region:focus'; regionId: string | null }
  | { type: 'zoom:change'; level: number }
  | { type: 'pan:change'; offset: { x: number; y: number } }
  | { type: 'layer:toggle'; layerId: string; visible: boolean };
```

## SVG Loading Strategy

1. `useSvgLoader(src)` fetches the SVG file via `fetch(src)`
2. Parses response as text, creates a `DOMParser`
3. Extracts all elements with `id` attributes that match `RegionConfig[].id`
4. Builds `SvgRegion[]` with bounding boxes via `getBBox()`
5. Returns the parsed SVG element + regions map
6. For inline SVG strings (backward compat), skips fetch and goes straight to parsing

**Fallback:** If `src` fails to load, show an error state with the widget's `WidgetError` component.

## Visual States (Theme-Aware)

All states use CSS classes applied to SVG region elements:

| State     | CSS Class                  | Token                                                   |
| --------- | -------------------------- | ------------------------------------------------------- |
| Default   | `oe-svg-region`            | `fill: var(--oe-color-surface-variant)`                 |
| Hover     | `oe-svg-region--hover`     | `fill: var(--oe-color-primary-container)`               |
| Focused   | `oe-svg-region--focus`     | `stroke: var(--oe-focus-ring-color); stroke-width: 2px` |
| Selected  | `oe-svg-region--selected`  | `fill: var(--oe-color-primary)`                         |
| Correct   | `oe-svg-region--correct`   | `fill: var(--oe-color-success)`                         |
| Incorrect | `oe-svg-region--incorrect` | `fill: var(--oe-color-error)`                           |
| Disabled  | `oe-svg-region--disabled`  | `opacity: 0.5`                                          |
| Visited   | `oe-svg-region--visited`   | `fill: var(--oe-color-secondary-container)`             |

CSS defined in the SvgExplorer component using Tailwind `@apply` or inline styles with CSS variables (since SVG `fill` doesn't support Tailwind classes directly).

## Keyboard Navigation

- **Tab**: Move focus to next region (or first region on initial tab)
- **Shift+Tab**: Move focus to previous region
- **Arrow keys**: Move focus spatially (nearest region in direction)
- **Enter/Space**: Select focused region
- **Escape**: Clear selection
- **+/=**: Zoom in
- **-**: Zoom out
- **Home**: Reset zoom to fit
- **End**: Reset zoom to 100%

Focus managed via `tabIndex={0}` on interactive regions and a `focusedId` state.

## Screen Reader Support

- SVG container: `role="img"` (observe) or `role="application"` (interactive)
- Each region: `role="button"` with `aria-label="{name}. {description}"`
- Selected state: `aria-pressed="true"`
- Live region for feedback: `role="status"`, `aria-live="polite"`
- Zoom level announced: `aria-label="Zoom level: {level}%"`

## Backward Compatibility

The upgraded `social.map` supports both configs:

**New config (SVG file):**

```json
{
  "widget": "social.map",
  "config": {
    "svgSrc": "maps/india.svg",
    "regions": [{ "id": "odisha", "name": "Odisha" }],
    "mode": "identify",
    "targetRegion": "odisha"
  }
}
```

**Legacy config (inline SVG paths):**

```json
{
  "widget": "social.map",
  "config": {
    "regions": [{ "id": "odisha", "name": "Odisha", "path": "M..." }],
    "interactive": true,
    "targetRegion": "odisha"
  }
}
```

Detection: if `config.svgSrc` is present, use SvgExplorer. Otherwise, fall back to current inline SVG rendering.

## Testing Strategy

- **Unit tests** for each hook (useSvgLoader, useSvgSelection, useSvgZoom, useSvgKeyboard)
- **Unit tests** for SVG parsing utilities
- **Component tests** for SvgExplorer and SvgRegion
- **Integration tests** for SocialMap with both legacy and new configs
- **Accessibility tests** using axe-core (via `@open-edu/design-system/test-utils`)
- **All tests use Vitest** per project convention

## Dependencies

- `@open-edu/design-system` — `cn()` utility, tokens
- `@open-edu/widgets` types — `WidgetRenderProps`, `WidgetDefinitionV2`
- React 18 — no new dependencies
- No external SVG libraries (D3, etc.) — pure DOM API + React
