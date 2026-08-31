import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkspaceUnavailableError } from './errors.js';
import { getOpfsRoot } from './opfs-availability.js';

function stubNavigatorStorage(getDirectory: unknown): void {
  vi.stubGlobal(
    'navigator',
    getDirectory === undefined
      ? {}
      : { storage: { getDirectory: getDirectory as () => Promise<FileSystemDirectoryHandle> } },
  );
}

describe('getOpfsRoot', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the root when navigator.storage.getDirectory is available', async () => {
    const root = {} as FileSystemDirectoryHandle;
    stubNavigatorStorage(async () => root);
    await expect(getOpfsRoot()).resolves.toBe(root);
  });

  it('throws WorkspaceUnavailableError when getDirectory is missing', async () => {
    stubNavigatorStorage(undefined);
    await expect(getOpfsRoot()).rejects.toBeInstanceOf(WorkspaceUnavailableError);
  });

  it('throws WorkspaceUnavailableError when navigator.storage is missing', async () => {
    vi.stubGlobal('navigator', {});
    await expect(getOpfsRoot()).rejects.toBeInstanceOf(WorkspaceUnavailableError);
  });

  it('throws WorkspaceUnavailableError when getDirectory rejects with a security error', async () => {
    const err = new DOMException('denied', 'NotAllowedError');
    stubNavigatorStorage(async () => {
      throw err;
    });
    await expect(getOpfsRoot()).rejects.toBeInstanceOf(WorkspaceUnavailableError);
  });

  it('throws WorkspaceUnavailableError with cause when quota is exceeded', async () => {
    const err = new DOMException('quota', 'QuotaExceededError');
    stubNavigatorStorage(async () => {
      throw err;
    });
    await expect(getOpfsRoot()).rejects.toMatchObject({
      cause: err,
    });
    await expect(getOpfsRoot()).rejects.toBeInstanceOf(WorkspaceUnavailableError);
  });
});
