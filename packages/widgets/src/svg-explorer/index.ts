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
