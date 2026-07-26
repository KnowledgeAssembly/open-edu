import type { DistributionManifest } from '@open-edu/schemas';

export { type DistributionManifest } from '@open-edu/schemas';
export type { PackageManifest } from '@open-edu/schemas';

export interface OepExtraction {
  manifest: DistributionManifest;
  courseManifest: Record<string, unknown>;
  nodes: Record<string, string>;
  assets: Record<string, Uint8Array>;
  rawEntries: Record<string, Uint8Array>;
}

export interface PackageInspection {
  id: string;
  version: string;
  title: string;
  checksum: { algorithm: 'sha256'; value: string };
  signatureStatus: string;
}

export type InstallErrorCode =
  | 'SOURCE_READ_ERROR'
  | 'ARCHIVE_TOO_LARGE'
  | 'DECOMPRESSED_TOO_LARGE'
  | 'MALFORMED_ARCHIVE'
  | 'PATH_TRAVERSAL'
  | 'MISSING_MANIFEST'
  | 'INVALID_MANIFEST'
  | 'CHECKSUM_MISMATCH'
  | 'MISSING_COURSE_DIR'
  | 'COURSE_VALIDATION_ERROR'
  | 'MANIFEST_MISMATCH'
  | 'STORAGE_ERROR'
  | 'VERSION_DOWNGRADE'
  | 'VERSION_SAME'
  | 'CATALOG_FETCH_ERROR'
  | 'CATALOG_PARSE_ERROR'
  | 'NOT_FOUND';

export interface InstallResult {
  success: boolean;
  courseId: string;
  version: string;
  errorCode?: InstallErrorCode;
  errorMessage?: string;
}

export type SourceKind = 'file' | 'url' | 'catalog';

export interface CourseSource {
  kind: SourceKind;
  label: string;
  getBytes(signal?: AbortSignal): Promise<Uint8Array>;
}

export const DEFAULT_MAX_ARCHIVE_BYTES = 100 * 1024 * 1024; // 100 MiB
export const DEFAULT_MAX_DECOMPRESSED_BYTES = 500 * 1024 * 1024; // 500 MiB

export interface ZipSecurityOptions {
  maxArchiveBytes: number;
  maxDecompressedBytes: number;
}

export const DEFAULT_ZIP_SECURITY: ZipSecurityOptions = {
  maxArchiveBytes: DEFAULT_MAX_ARCHIVE_BYTES,
  maxDecompressedBytes: DEFAULT_MAX_DECOMPRESSED_BYTES,
};

export const OEP_CONTENT_ROOT = 'course/';
