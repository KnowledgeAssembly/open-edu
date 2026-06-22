export const CORE_VERSION = '0.1.0';

export { loadPackage } from './loader';
export type { LoadOptions } from './loader';
export type { LoadedPackage, LoadedNode } from './types';
export {
  PackageLoadError,
  ManifestValidationError,
  NodeLoadError,
  AssetNotFoundError,
  WorkflowValidationError,
  RewardsValidationError,
  WorkflowRouteError,
  EntryNodeNotFoundError,
} from './errors';
export { loadManifest } from './manifest';
export { loadWorkflow } from './workflow';
export { loadRewards } from './rewards';
export { loadNodes } from './nodes';
export { resolveAssets, resolveAssetPath } from './assets';
