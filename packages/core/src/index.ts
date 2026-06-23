export const CORE_VERSION = '0.1.0';

export { loadPackage } from './loader.js';
export type { LoadOptions } from './loader.js';
export type { LoadedPackage, LoadedNode } from './types.js';
export {
  PackageLoadError,
  ManifestValidationError,
  NodeLoadError,
  AssetNotFoundError,
  WorkflowValidationError,
  RewardsValidationError,
  WorkflowRouteError,
  EntryNodeNotFoundError,
} from './errors.js';
export { loadManifest } from './manifest.js';
export { loadWorkflow } from './workflow.js';
export { loadRewards } from './rewards.js';
export { loadNodes } from './nodes.js';
export { resolveAssets, resolveAssetPath } from './assets.js';
