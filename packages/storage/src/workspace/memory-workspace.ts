import {
  WorkspaceConflictError,
  WorkspaceError,
  WorkspaceNotFoundError,
  WorkspacePathError,
} from './errors.js';
import { assertSafeCoursePath } from './paths.js';
import type { CourseWorkspace, FileStat, WorkspaceEntry } from './types.js';

const TEXT_DECODER = new TextDecoder();
const TEXT_ENCODER = new TextEncoder();

/**
 * Normalize an entry path for the workspace address space. The empty string is
 * reserved for the workspace root; every other path must satisfy the course
 * path-safety rules before it touches the filesystem.
 */
function normalizeEntryPath(path: string): string {
  if (path === '') return '';
  return assertSafeCoursePath(path);
}

function parentPath(path: string): string {
  const idx = path.lastIndexOf('/');
  return idx === -1 ? '' : path.slice(0, idx);
}

function mimeTypeOf(path: string): string | undefined {
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  switch (ext) {
    case 'md':
    case 'markdown':
      return 'text/markdown';
    case 'json':
      return 'application/json';
    case 'txt':
      return 'text/plain';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'svg':
      return 'image/svg+xml';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'html':
      return 'text/html';
    default:
      return undefined;
  }
}

export interface MemoryWorkspaceOptions {
  /** Optional initial file set keyed by normalized path. */
  initialFiles?: Map<string, Uint8Array>;
}

export class MemoryWorkspace implements CourseWorkspace {
  private readonly files = new Map<string, Uint8Array>();
  private readonly dirs = new Set<string>();
  private readonly modifiedAt = new Map<string, number>();
  private clock = 0;

  constructor(options: MemoryWorkspaceOptions = {}) {
    if (options.initialFiles) {
      for (const [path, data] of options.initialFiles) {
        const p = normalizeEntryPath(path);
        this.files.set(p, new Uint8Array(data));
        this.touch(p);
        this.ensureParents(p);
      }
    }
  }

  private touch(path: string): void {
    this.clock += 1;
    this.modifiedAt.set(path, this.clock);
  }

  private ensureParents(path: string): void {
    let parent = parentPath(path);
    while (parent !== '') {
      this.dirs.add(parent);
      parent = parentPath(parent);
    }
  }

  private isDirectory(path: string): boolean {
    if (path === '') return true;
    if (this.dirs.has(path)) return true;
    const prefix = `${path}/`;
    for (const key of this.files.keys()) {
      if (key.startsWith(prefix)) return true;
    }
    return false;
  }

  private assertWritable(path: string): void {
    if (path === '') {
      throw new WorkspacePathError('Path must not be empty');
    }
    if (this.isDirectory(path)) {
      throw new WorkspaceConflictError(`Path is a directory: ${path}`);
    }
    let parent = parentPath(path);
    while (parent !== '') {
      if (this.files.has(parent)) {
        throw new WorkspaceConflictError(`Path conflict: ${parent} is a file`);
      }
      parent = parentPath(parent);
    }
  }

  private assertNoDestination(path: string): void {
    if (this.files.has(path)) {
      throw new WorkspaceConflictError(`Destination already exists: ${path}`);
    }
    if (this.isDirectory(path)) {
      throw new WorkspaceConflictError(`Destination already exists: ${path}`);
    }
  }

  private requireFile(path: string): string {
    const p = normalizeEntryPath(path);
    if (!this.files.has(p)) {
      throw new WorkspaceNotFoundError(`File not found: ${p === '' ? '/' : p}`);
    }
    return p;
  }

  async list(path: string): Promise<WorkspaceEntry[]> {
    const dir = normalizeEntryPath(path);
    if (!this.isDirectory(dir)) {
      throw new WorkspaceNotFoundError(`Directory not found: ${dir === '' ? '/' : dir}`);
    }
    const found = new Map<string, WorkspaceEntry['kind']>();
    const prefix = dir === '' ? '' : `${dir}/`;

    for (const d of this.dirs) {
      if (dir === '') {
        if (!d.includes('/')) {
          found.set(d, 'directory');
        }
      } else if (d.startsWith(prefix)) {
        const rel = d.slice(prefix.length);
        if (rel && !rel.includes('/')) {
          found.set(rel, 'directory');
        }
      }
    }
    for (const key of this.files.keys()) {
      if (dir === '') {
        if (!key.includes('/')) {
          found.set(key, 'file');
        }
      } else if (key.startsWith(prefix)) {
        const rel = key.slice(prefix.length);
        if (rel) {
          const first = rel.split('/')[0]!;
          found.set(first, rel.includes('/') ? 'directory' : 'file');
        }
      }
    }

    return Array.from(found.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, kind]) => ({ name, path: dir === '' ? name : `${dir}/${name}`, kind }));
  }

  async exists(path: string): Promise<boolean> {
    const p = normalizeEntryPath(path);
    return this.files.has(p) || this.isDirectory(p);
  }

  async read(path: string): Promise<Uint8Array> {
    const p = this.requireFile(path);
    return new Uint8Array(this.files.get(p)!);
  }

  async readText(path: string): Promise<string> {
    const p = this.requireFile(path);
    const text = TEXT_DECODER.decode(this.files.get(p)!);
    if (text.includes('\uFFFD')) {
      throw new WorkspaceError(`File is binary and cannot be opened as text: ${p}`);
    }
    return text;
  }

  async write(path: string, data: Uint8Array): Promise<void> {
    const p = normalizeEntryPath(path);
    this.assertWritable(p);
    this.files.set(p, new Uint8Array(data));
    this.ensureParents(p);
    this.touch(p);
  }

  async writeText(path: string, content: string): Promise<void> {
    await this.write(path, TEXT_ENCODER.encode(content));
  }

  async delete(path: string): Promise<void> {
    const p = normalizeEntryPath(path);
    if (p === '') {
      throw new WorkspacePathError('Cannot delete the workspace root');
    }
    if (this.files.has(p)) {
      this.files.delete(p);
      this.modifiedAt.delete(p);
      return;
    }
    if (this.isDirectory(p)) {
      const prefix = `${p}/`;
      for (const key of Array.from(this.files.keys())) {
        if (key.startsWith(prefix)) {
          this.files.delete(key);
          this.modifiedAt.delete(key);
        }
      }
      for (const d of Array.from(this.dirs)) {
        if (d === p || d.startsWith(prefix)) {
          this.dirs.delete(d);
        }
      }
      return;
    }
    throw new WorkspaceNotFoundError(`File not found: ${p}`);
  }

  async move(from: string, to: string): Promise<void> {
    const f = normalizeEntryPath(from);
    const t = normalizeEntryPath(to);
    if (f === '' || t === '') {
      throw new WorkspacePathError('Cannot move the workspace root');
    }
    if (f === t) return;
    if (t.startsWith(`${f}/`)) {
      throw new WorkspacePathError(`Cannot move a path into itself: ${from} -> ${to}`);
    }
    if (this.files.has(f)) {
      this.assertWritable(t);
      if (this.files.has(t)) {
        throw new WorkspaceConflictError(`Destination already exists: ${to}`);
      }
      this.files.set(t, this.files.get(f)!);
      this.touch(t);
      const stamp = this.modifiedAt.get(f) ?? 0;
      this.modifiedAt.set(t, stamp);
      this.files.delete(f);
      this.modifiedAt.delete(f);
      this.ensureParents(t);
      return;
    }
    if (this.isDirectory(f)) {
      this.assertWritable(t);
      this.assertNoDestination(t);
      const movedDirs = new Set<string>();
      for (const d of Array.from(this.dirs)) {
        if (d === f || d.startsWith(`${f}/`)) {
          const rel = d === f ? '' : d.slice(f.length + 1);
          const dest = rel ? `${t}/${rel}` : t;
          movedDirs.add(dest);
          this.dirs.add(dest);
          this.dirs.delete(d);
        }
      }
      const prefix = `${f}/`;
      const moved = new Map<string, Uint8Array>();
      for (const key of Array.from(this.files.keys())) {
        if (key.startsWith(prefix)) {
          const rel = key.slice(prefix.length);
          const dest = `${t}/${rel}`;
          if (this.files.has(dest)) {
            throw new WorkspaceConflictError(`Destination already exists: ${dest}`);
          }
          moved.set(dest, this.files.get(key)!);
        }
      }
      for (const [dest, data] of moved) {
        this.files.set(dest, data);
        this.modifiedAt.set(dest, this.modifiedAt.get(dest) ?? 0);
      }
      for (const key of Array.from(this.files.keys())) {
        if (key.startsWith(prefix)) {
          this.files.delete(key);
          this.modifiedAt.delete(key);
        }
      }
      return;
    }
    throw new WorkspaceNotFoundError(`File not found: ${from}`);
  }

  async copy(from: string, to: string): Promise<void> {
    const f = normalizeEntryPath(from);
    const t = normalizeEntryPath(to);
    if (f === '' || t === '') {
      throw new WorkspacePathError('Cannot copy the workspace root');
    }
    if (f === t) {
      throw new WorkspaceConflictError(`Cannot copy a path onto itself: ${from}`);
    }
    if (t.startsWith(`${f}/`)) {
      throw new WorkspacePathError(`Cannot copy a path into itself: ${from} -> ${to}`);
    }
    this.assertWritable(t);

    if (this.files.has(f)) {
      this.assertNoDestination(t);
      this.files.set(t, new Uint8Array(this.files.get(f)!));
      this.touch(t);
      this.ensureParents(t);
      return;
    }
    if (this.isDirectory(f)) {
      this.assertNoDestination(t);
      this.dirs.add(t);
      this.ensureParents(t);
      for (const d of this.dirs) {
        if (d.startsWith(`${f}/`)) {
          this.dirs.add(`${t}/${d.slice(f.length + 1)}`);
        }
      }
      const prefix = `${f}/`;
      for (const key of this.files.keys()) {
        if (key.startsWith(prefix)) {
          const rel = key.slice(prefix.length);
          const dest = `${t}/${rel}`;
          this.files.set(dest, new Uint8Array(this.files.get(key)!));
          this.modifiedAt.set(dest, this.modifiedAt.get(key) ?? 0);
        }
      }
      return;
    }
    throw new WorkspaceNotFoundError(`File not found: ${from}`);
  }

  async stat(path: string): Promise<FileStat> {
    const p = normalizeEntryPath(path);
    if (p === '') {
      return { path: '', kind: 'directory', size: 0, modifiedAt: 0 };
    }
    if (this.files.has(p)) {
      const data = this.files.get(p)!;
      return {
        path: p,
        kind: 'file',
        size: data.byteLength,
        modifiedAt: this.modifiedAt.get(p) ?? 0,
        mimeType: mimeTypeOf(p),
      };
    }
    if (this.isDirectory(p)) {
      return { path: p, kind: 'directory', size: 0, modifiedAt: 0 };
    }
    throw new WorkspaceNotFoundError(`File not found: ${p}`);
  }
}
