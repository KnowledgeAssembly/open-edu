import type { CourseWorkspace } from '@open-edu/storage';
import type { StudioApi } from './studioApi.js';

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

/**
 * Adapt the local (Vite server) `StudioApi` to the `CourseWorkspace` contract so
 * `applyChangeSet` / `createTransaction` work over the filesystem-backed package
 * API. The whole-file API provides no directory listing or metadata, so `list`
 * is unsupported and `stat` reports files only; directory-aware operations
 * (snapshot of a directory) are not used by the item-draft transaction.
 */
export function createStudioApiWorkspace(api: StudioApi): CourseWorkspace {
  return {
    async list() {
      throw new Error('Directory listing is not supported over the local Studio API');
    },
    async exists(path) {
      try {
        await api.readFile(path);
        return true;
      } catch {
        return false;
      }
    },
    async read(path) {
      const file = await api.readFile(path);
      return TEXT_ENCODER.encode(file.content);
    },
    async readText(path) {
      return (await api.readFile(path)).content;
    },
    async write(path, data) {
      await api.writeFile(path, TEXT_DECODER.decode(data));
    },
    async writeText(path, content) {
      await api.writeFile(path, content);
    },
    async delete(path) {
      await api.deleteFile(path);
    },
    async move(from, to) {
      const content = (await api.readFile(from)).content;
      await api.writeFile(to, content);
      await api.deleteFile(from);
    },
    async copy(from, to) {
      const content = (await api.readFile(from)).content;
      await api.writeFile(to, content);
    },
    async stat(path) {
      const file = await api.readFile(path);
      return {
        path,
        kind: 'file',
        size: TEXT_ENCODER.encode(file.content).length,
        modifiedAt: Date.now(),
      };
    },
  };
}
