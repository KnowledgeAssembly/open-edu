export {
  listReleases,
  getReleaseByTag,
  fetchAssetBytes,
  parseReleaseTag,
  parseChecksums,
} from './github.js';
export type { GithubRelease, GithubReleaseAsset } from './github.js';
export { loadCourseDirs, loadMetadataMap, validateMetadataDir } from './metadata.js';
export type { LoadedMetadata } from './metadata.js';
export { buildCatalog, validateCatalogData, compareVersions } from './catalog-builder.js';
export type { BuildCatalogOptions } from './catalog-builder.js';
export { validateRelease } from './validate-release.js';
export type { ValidateReleaseOptions, ReleaseValidationResult } from './validate-release.js';
export { generateSchemas } from './schemas.js';
