import type { IndexedFile } from '../db.js';
import { clearFileIndex, putFileIndexRecord } from '../file-index-store.js';
import { hashBytes } from './hash.js';
import type { CourseWorkspace } from './types.js';
import { walkWorkspace } from './walk.js';

function recordId(workspaceId: string, path: string): string {
  return `${workspaceId}:${path}`;
}

/**
 * Walk a workspace and produce metadata-only `IndexedFile` records. No content
 * is copied into the records — bytes are read solely to compute size and hash
 * (SPEC §25, §26).
 */
export async function buildFileIndexFromWorkspace(
  workspace: CourseWorkspace,
  workspaceId: string,
): Promise<IndexedFile[]> {
  const files = await walkWorkspace(workspace);
  const records: IndexedFile[] = [];
  for (const file of files) {
    let hash: string | undefined;
    try {
      hash = await hashBytes(file.data);
    } catch {
      // Environments without WebCrypto record size/modifiedAt only.
    }
    const stat = await workspace.stat(file.path).catch(() => undefined);
    records.push({
      id: recordId(workspaceId, file.path),
      workspaceId,
      path: file.path,
      size: file.data.byteLength,
      hash,
      ...(stat?.mimeType ? { mimeType: stat.mimeType } : {}),
      modifiedAt: stat?.modifiedAt ?? 0,
    });
  }
  return records.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Clear and rewrite the persistent `files` store for a workspace. Deleting or
 * rebuilding the index never invalidates the course (SPEC §26).
 */
export async function rebuildFileIndex(
  workspace: CourseWorkspace,
  workspaceId: string,
): Promise<IndexedFile[]> {
  const records = await buildFileIndexFromWorkspace(workspace, workspaceId);
  await clearFileIndex(workspaceId);
  for (const record of records) {
    await putFileIndexRecord(record);
  }
  return records;
}
