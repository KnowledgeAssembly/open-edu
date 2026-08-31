import type { CourseWorkspace } from './types.js';

export interface WorkspaceFile {
  path: string;
  data: Uint8Array;
}

export interface WalkWorkspaceOptions {
  /** Prefixes (e.g. `.openu/`) whose files should be excluded from the result. */
  excludePrefixes?: string[];
}

/**
 * Recursively walk a workspace collecting file paths and bytes. Used to
 * materialize a whole course for loading/validation and to compute the file
 * index; derived data (`.openu/`) is excluded by default.
 */
export async function walkWorkspace(
  workspace: CourseWorkspace,
  options: WalkWorkspaceOptions = {},
): Promise<WorkspaceFile[]> {
  const exclude = options.excludePrefixes ?? ['.openu/'];
  const out: WorkspaceFile[] = [];

  async function visit(dir: string): Promise<void> {
    const entries = await workspace.list(dir);
    for (const entry of entries) {
      const excluded = exclude.some((prefix) => entry.path.startsWith(prefix));
      if (excluded) continue;
      if (entry.kind === 'file') {
        out.push({ path: entry.path, data: await workspace.read(entry.path) });
      } else {
        await visit(entry.path);
      }
    }
  }

  await visit('');
  return out.sort((a, b) => a.path.localeCompare(b.path));
}
