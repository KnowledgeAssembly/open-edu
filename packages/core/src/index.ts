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
export type { ErrorDiagnostics } from './errors.js';
export { lintPackage } from './content-lint.js';
export type { LintWarning, LintResult } from './content-lint.js';
export { loadManifest } from './manifest.js';
export { loadWorkflow } from './workflow.js';
export { loadRewards } from './rewards.js';
export { loadNodes } from './nodes.js';
export { resolveAssets, resolveAssetPath } from './assets.js';
export { computeFileHash, verifyIntegrity } from './integrity.js';
export type {
  IntegrityResult,
  IntegrityMismatch,
  BuildManifest,
  BuildManifestEntry,
} from './integrity.js';
