import {
  WorkspaceConflictError,
  WorkspaceError,
  WorkspaceNotFoundError,
  WorkspacePathError,
  WorkspaceUnavailableError,
} from './errors.js';
import { getOpfsRoot } from './opfs-availability.js';
import { assertSafeCoursePath } from './paths.js';
import type { CourseWorkspace, FileStat, WorkspaceEntry } from './types.js';

const TEXT_DECODER = new TextDecoder();
const TEXT_ENCODER = new TextEncoder();

function normalizePath(path: string): string {
  if (path === '') return '';
  return assertSafeCoursePath(path);
}

function isNotFoundError(err: unknown): boolean {
  return (err as { name?: string }).name === 'NotFoundError';
}

function isTypeMismatchError(err: unknown): boolean {
  return (err as { name?: string }).name === 'TypeMismatchError';
}

export function opfsToWorkspaceError(err: unknown, context: string): Error {
  if (isNotFoundError(err)) {
    return new WorkspaceNotFoundError(context);
  }
  if (isTypeMismatchError(err)) {
    return new WorkspaceConflictError(context);
  }
  if ((err as { name?: string }).name === 'QuotaExceededError') {
    return new WorkspaceUnavailableError(`${context}: storage quota exceeded`, { cause: err });
  }
  return new WorkspaceError(`${context}: ${err instanceof Error ? err.message : String(err)}`);
}

/**
 * OPFS-backed CourseWorkspace. The constructor takes a per-course workspace
 * root handle so tests can inject an in-memory fake; production code obtains
 * the root via {@link OPFSWorkspace.open}. All logical paths are validated and
 * normalized before descending into OPFS, so a path can never escape the
 * workspace root (SPEC §14).
 */
export class OPFSWorkspace implements CourseWorkspace {
  private readonly root: FileSystemDirectoryHandle;

  constructor(root: FileSystemDirectoryHandle) {
    this.root = root;
  }

  static async open(courseId: string): Promise<OPFSWorkspace> {
    const root = await getOpfsRoot();
    const openedu = await root.getDirectoryHandle('openedu', { create: true });
    const courses = await openedu.getDirectoryHandle('courses', { create: true });
    const courseDir = await courses.getDirectoryHandle(courseId, { create: true });
    return new OPFSWorkspace(courseDir);
  }

  private async downDir(
    dir: FileSystemDirectoryHandle,
    name: string,
    create: boolean,
  ): Promise<FileSystemDirectoryHandle> {
    try {
      return await dir.getDirectoryHandle(name, { create });
    } catch (err) {
      throw opfsToWorkspaceError(err, `Directory not found: ${name}`);
    }
  }

  private async parentDirAndName(
    path: string,
    createDirs: boolean,
  ): Promise<{ dir: FileSystemDirectoryHandle; name: string }> {
    const p = normalizePath(path);
    if (p === '') {
      throw new WorkspacePathError('Path must not be empty');
    }
    const segments = p.split('/');
    const name = segments.pop()!;
    let current = this.root;
    for (const segment of segments) {
      current = await this.downDir(current, segment, createDirs);
    }
    return { dir: current, name };
  }

  private async getFile(
    parent: FileSystemDirectoryHandle,
    name: string,
  ): Promise<FileSystemFileHandle> {
    try {
      return await parent.getFileHandle(name);
    } catch (err) {
      throw opfsToWorkspaceError(err, `File not found: ${name}`);
    }
  }

  private async entryExists(dir: FileSystemDirectoryHandle, name: string): Promise<boolean> {
    try {
      await dir.getFileHandle(name);
      return true;
    } catch (err) {
      if (isNotFoundError(err)) {
        try {
          await dir.getDirectoryHandle(name);
          return true;
        } catch (inner) {
          return isNotFoundError(inner) ? false : true;
        }
      }
      return true;
    }
  }

  private async resolveHandle(path: string): Promise<FileSystemHandle> {
    const { dir, name } = await this.parentDirAndName(path, false);
    try {
      const file = await dir.getFileHandle(name);
      return file;
    } catch {
      // Fall through: the entry (if present) is not a file, or it is missing.
    }
    try {
      return await dir.getDirectoryHandle(name);
    } catch {
      throw new WorkspaceNotFoundError(`File not found: ${path}`);
    }
  }

  private async copyEntry(
    source: FileSystemHandle,
    destDir: FileSystemDirectoryHandle,
    destName: string,
  ): Promise<void> {
    if (source.kind === 'file') {
      const dest = await destDir.getFileHandle(destName, { create: true });
      const blob = await (source as FileSystemFileHandle).getFile();
      const writable = await dest.createWritable();
      await writable.write(new Uint8Array(await blob.arrayBuffer()));
      await writable.close();
      return;
    }
    const dest = await destDir.getDirectoryHandle(destName, { create: true });
    const srcDir = source as FileSystemDirectoryHandle;
    for await (const [childName, child] of srcDir.entries()) {
      await this.copyEntry(child, dest, childName);
    }
  }

  async list(path: string): Promise<WorkspaceEntry[]> {
    const p = normalizePath(path);
    let handle: FileSystemDirectoryHandle;
    if (p === '') {
      handle = this.root;
    } else {
      const segments = p.split('/');
      let current = this.root;
      for (const segment of segments) {
        current = await this.downDir(current, segment, false);
      }
      handle = current;
    }
    const entries: WorkspaceEntry[] = [];
    for await (const [name, child] of handle.entries()) {
      entries.push({
        name,
        path: p === '' ? name : `${p}/${name}`,
        kind: child.kind,
      });
    }
    return entries.sort((a, b) => a.name.localeCompare(b.name));
  }

  async exists(path: string): Promise<boolean> {
    const p = normalizePath(path);
    if (p === '') return true;
    try {
      const { dir, name } = await this.parentDirAndName(p, false);
      return await this.entryExists(dir, name);
    } catch {
      return false;
    }
  }

  async read(path: string): Promise<Uint8Array> {
    const { dir, name } = await this.parentDirAndName(path, false);
    const file = await this.getFile(dir, name);
    const blob = await file.getFile();
    return new Uint8Array(await blob.arrayBuffer());
  }

  async readText(path: string): Promise<string> {
    const data = await this.read(path);
    const text = TEXT_DECODER.decode(data);
    if (text.includes('\uFFFD')) {
      throw new WorkspaceError(`File is binary and cannot be opened as text: ${path}`);
    }
    return text;
  }

  async write(path: string, data: Uint8Array): Promise<void> {
    const { dir, name } = await this.parentDirAndName(path, true);
    let file: FileSystemFileHandle;
    try {
      file = await dir.getFileHandle(name, { create: true });
    } catch (err) {
      throw opfsToWorkspaceError(err, `Cannot write file: ${name}`);
    }
    const writable = await file.createWritable();
    await writable.write(new Uint8Array(data));
    await writable.close();
  }

  async writeText(path: string, content: string): Promise<void> {
    await this.write(path, TEXT_ENCODER.encode(content));
  }

  async delete(path: string): Promise<void> {
    const p = normalizePath(path);
    if (p === '') {
      throw new WorkspacePathError('Cannot delete the workspace root');
    }
    const { dir, name } = await this.parentDirAndName(p, false);
    try {
      await dir.removeEntry(name, { recursive: true });
    } catch (err) {
      throw opfsToWorkspaceError(err, `File not found: ${p}`);
    }
  }

  async move(from: string, to: string): Promise<void> {
    const f = normalizePath(from);
    const t = normalizePath(to);
    if (f === '' || t === '') {
      throw new WorkspacePathError('Cannot move the workspace root');
    }
    if (f === t) return;
    if (t.startsWith(`${f}/`)) {
      throw new WorkspacePathError(`Cannot move a path into itself: ${from} -> ${to}`);
    }
    const source = await this.resolveHandle(f);
    const { dir: srcParent, name: srcName } = await this.parentDirAndName(f, false);
    const { dir: destParent, name: destName } = await this.parentDirAndName(t, true);

    if (await this.entryExists(destParent, destName)) {
      throw new WorkspaceConflictError(`Destination already exists: ${to}`);
    }

    if (srcParent === destParent && typeof source.move === 'function') {
      await source.move(destName);
      return;
    }

    await this.copyEntry(source, destParent, destName);
    await srcParent.removeEntry(srcName, { recursive: true });
  }

  async copy(from: string, to: string): Promise<void> {
    const f = normalizePath(from);
    const t = normalizePath(to);
    if (f === '' || t === '') {
      throw new WorkspacePathError('Cannot copy the workspace root');
    }
    if (f === t) {
      throw new WorkspaceConflictError(`Cannot copy a path onto itself: ${from}`);
    }
    if (t.startsWith(`${f}/`)) {
      throw new WorkspacePathError(`Cannot copy a path into itself: ${from} -> ${to}`);
    }
    const source = await this.resolveHandle(f);
    const { dir: destParent, name: destName } = await this.parentDirAndName(t, true);
    if (await this.entryExists(destParent, destName)) {
      throw new WorkspaceConflictError(`Destination already exists: ${to}`);
    }
    await this.copyEntry(source, destParent, destName);
  }

  async stat(path: string): Promise<FileStat> {
    const p = normalizePath(path);
    if (p === '') {
      return { path: '', kind: 'directory', size: 0, modifiedAt: 0 };
    }
    const { dir, name } = await this.parentDirAndName(p, false);
    try {
      const file = await dir.getFileHandle(name);
      const blob = await file.getFile();
      return {
        path: p,
        kind: 'file',
        size: blob.size,
        modifiedAt: blob.lastModified,
        ...(blob.type ? { mimeType: blob.type } : {}),
      };
    } catch (err) {
      if (isNotFoundError(err)) {
        try {
          await dir.getDirectoryHandle(name);
          return { path: p, kind: 'directory', size: 0, modifiedAt: 0 };
        } catch {
          throw new WorkspaceNotFoundError(`File not found: ${p}`);
        }
      }
      throw opfsToWorkspaceError(err, `File not found: ${p}`);
    }
  }
}
