import type { ZipSecurityOptions } from './types.js';
import { DEFAULT_ZIP_SECURITY } from './types.js';

export class SecurityViolationError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'SecurityViolationError';
  }
}

export function validateZipEntry(
  entryPath: string,
  uncompressedSize: number,
  _options: ZipSecurityOptions = DEFAULT_ZIP_SECURITY,
): void {
  if (entryPath.includes('\\')) {
    throw new SecurityViolationError(
      'PATH_TRAVERSAL',
      `Backslash in ZIP entry path: "${entryPath}"`,
    );
  }

  if (entryPath.startsWith('/')) {
    throw new SecurityViolationError(
      'PATH_TRAVERSAL',
      `Absolute path in ZIP entry: "${entryPath}"`,
    );
  }

  const segments = entryPath.split('/');
  for (const segment of segments) {
    if (segment === '..') {
      throw new SecurityViolationError(
        'PATH_TRAVERSAL',
        `Parent directory traversal in ZIP entry: "${entryPath}"`,
      );
    }
    if (segment === '.' || segment === '') {
      continue;
    }
  }

  if (!isFinite(uncompressedSize) || uncompressedSize < 0) {
    throw new SecurityViolationError(
      'MALFORMED_ARCHIVE',
      `Invalid uncompressed size for "${entryPath}"`,
    );
  }
}

export function validateZipArchive(
  archiveSize: number,
  entries: Array<{ path: string; size: number }>,
  options: ZipSecurityOptions = DEFAULT_ZIP_SECURITY,
): void {
  if (archiveSize > options.maxArchiveBytes) {
    throw new SecurityViolationError(
      'ARCHIVE_TOO_LARGE',
      `Archive size ${archiveSize} exceeds limit ${options.maxArchiveBytes}`,
    );
  }

  let totalDecompressed = 0;
  for (const entry of entries) {
    validateZipEntry(entry.path, entry.size, options);
    totalDecompressed += entry.size;
    if (totalDecompressed > options.maxDecompressedBytes) {
      throw new SecurityViolationError(
        'DECOMPRESSED_TOO_LARGE',
        `Total decompressed size ${totalDecompressed} exceeds limit ${options.maxDecompressedBytes}`,
      );
    }
  }
}
