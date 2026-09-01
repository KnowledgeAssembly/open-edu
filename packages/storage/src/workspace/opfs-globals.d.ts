/**
 * Ambient OPFS type additions. The bundled DOM lib (TS 5.9) exposes OPFS
 * handles but omits `FileSystemDirectoryHandle.entries()` and
 * `FileSystemHandle.move()` even though both are standardized; declare them
 * here so the workspace adapter can use them directly.
 */

interface FileSystemHandle {
  move(dest: string | FileSystemDirectoryHandle): Promise<void>;
}

interface FileSystemDirectoryHandle {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
}
