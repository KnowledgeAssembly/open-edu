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
