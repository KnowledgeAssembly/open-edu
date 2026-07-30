export {
  type OepExtraction,
  type OepExtractedModule,
  type PackageInspection,
  type BundleInspection,
  type InstallResult,
  type InstallErrorCode,
  type CourseSource,
  type SourceKind,
  type ZipSecurityOptions,
  DEFAULT_MAX_ARCHIVE_BYTES,
  DEFAULT_MAX_DECOMPRESSED_BYTES,
  DEFAULT_ZIP_SECURITY,
  OEP_CONTENT_ROOT,
  BUNDLE_DIR,
  BUNDLE_MODULES_DIR,
} from './types.js';

export type { Catalog, CatalogPackageEntry, CatalogVersionEntry } from '@open-edu/schemas';

export { computeSha256 } from './checksum.js';
export { OepReader } from './oep-reader.js';
export {
  OepWriter,
  type OepBuildInput,
  type OepBundleBuildInput,
  type OepBuildResult,
} from './oep-writer.js';
export { validateZipEntry, validateZipArchive, SecurityViolationError } from './zip-security.js';
export {
  InstallCoordinator,
  type StorageAdapter,
  type StoredCourseRecord,
  type ResolvedInstallData,
  type ResolvedModuleData,
} from './install-coordinator.js';
export { fileSource, urlSource, catalogSource } from './source-adapters.js';
export {
  fetchCatalog,
  parseCatalog,
  findPackageInCatalog,
  findVersionInCatalog,
  CatalogLoadError,
} from './catalog-loader.js';
export { semverGreaterThan, semverEquals, parseSemver } from './version-compare.js';
