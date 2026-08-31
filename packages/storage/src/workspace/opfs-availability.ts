import { WorkspaceUnavailableError } from './errors.js';

/** OPFS API is absent entirely (incognito, non-secure context, unsupported). */
export class OpfsUnsupportedError extends WorkspaceUnavailableError {}

/** OPFS exists but is out of space. */
export class OpfsQuotaError extends WorkspaceUnavailableError {}

/**
 * Probe for a usable OPFS root. The underlying API may be absent (incognito,
 * storage-disabled, non-secure context) or reject with a quota/security error;
 * callers must be able to distinguish "unsupported" from "unavailable" from
 * "out of space" (SPEC §47.1).
 */
export function getOpfsRoot(): Promise<FileSystemDirectoryHandle> {
  const storageApi = (
    globalThis as {
      navigator?: { storage?: { getDirectory?: () => Promise<FileSystemDirectoryHandle> } };
    }
  ).navigator?.storage;
  if (!storageApi || typeof storageApi.getDirectory !== 'function') {
    return Promise.reject(new OpfsUnsupportedError('OPFS is not available'));
  }
  return storageApi.getDirectory().catch((err: unknown) => {
    const name = (err as { name?: string }).name ?? 'Error';
    if (name === 'QuotaExceededError') {
      throw new OpfsQuotaError('OPFS storage quota exceeded', { cause: err });
    }
    throw new WorkspaceUnavailableError('OPFS is not available', { cause: err });
  });
}
